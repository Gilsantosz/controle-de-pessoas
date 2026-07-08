import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { 
  getEmployees, getCells, getBlockedPeriods, 
  getVacationRequests, saveVacationRequest, saveEmployee
} from '../../services/databaseServices';
import type { Employee, ProductionCell, BlockedPeriod, VacationRequest, RiskLevel, VacationRequestStatus } from '../../types';
import { calculateVacationDays, validateBlockedPeriod, detectVacationOverlap } from '../../services/vacationRules';
import { analyzeCellAvailability } from '../../services/capacityEngine';
import { ChevronLeft, Calendar, User, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const VacationRequestPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [existingRequests, setExistingRequests] = useState<VacationRequest[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic simulation results
  const [simDays, setSimDays] = useState(0);
  const [simRisk, setSimRisk] = useState<RiskLevel | null>(null);
  const [simMinCapacity, setSimMinCapacity] = useState<number | null>(null);
  const [simConflictMsg, setSimConflictMsg] = useState<string | null>(null);

  // Pre-fill employee if navigated from employee list
  const stateEmployeeId = location.state?.employeeId;

  useEffect(() => {
    if (!currentUser) return;
    const loadRequestContext = async () => {
      try {
        const [empData, cellData, blockData, reqData] = await Promise.all([
          getEmployees(currentUser),
          getCells(currentUser),
          getBlockedPeriods(currentUser),
          getVacationRequests(currentUser)
        ]);

        setEmployees(empData);
        setCells(cellData);
        setBlockedPeriods(blockData);
        setExistingRequests(reqData);

        if (stateEmployeeId) {
          setSelectedEmpId(stateEmployeeId);
        } else if (currentUser.role === 'user') {
          // Operador comum só solicita para si
          const self = empData.find(e => e.email === currentUser.email);
          if (self) {
            setSelectedEmpId(self.id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadRequestContext();
  }, [currentUser, stateEmployeeId]);

  // Efeito para calcular impacto sob demanda
  useEffect(() => {
    if (!selectedEmpId || !startDate || !endDate) {
      setSimDays(0);
      setSimRisk(null);
      setSimMinCapacity(null);
      setSimConflictMsg(null);
      return;
    }

    const emp = employees.find(e => e.id === selectedEmpId);
    const cell = cells.find(c => c.id === emp?.cell_id);
    
    if (!emp || !cell) return;

    // 1. Calcular quantidade de dias
    const days = calculateVacationDays(startDate, endDate);
    setSimDays(days);

    if (days <= 0) {
      setSimConflictMsg("A data final deve ser igual ou posterior à inicial.");
      setSimRisk(null);
      return;
    }

    // 2. Validar limite de dias
    if (days > emp.vacation_balance_days) {
      setSimConflictMsg(`Saldo insuficiente. Colaborador possui apenas ${emp.vacation_balance_days} dias de saldo.`);
      setSimRisk('critical');
      return;
    }

    // 3. Validar período bloqueado
    const blocked = validateBlockedPeriod(startDate, endDate, cell.id, blockedPeriods);
    if (blocked) {
      setSimConflictMsg(`Período Bloqueado: coincide com "${blocked.name}" (${blocked.reason})`);
      setSimRisk('critical');
      return;
    }

    // 4. Validar sobreposição do mesmo operador
    const empRequests = existingRequests.filter(r => r.employee_id === emp.id);
    const overlap = detectVacationOverlap(startDate, endDate, empRequests);
    if (overlap) {
      setSimConflictMsg(`Conflito: Já existe solicitação lançada para este colaborador (${overlap.start_date} a ${overlap.end_date})`);
      setSimRisk('critical');
      return;
    }

    // 5. Simular impacto na capacidade produtiva da célula
    const cellEmployees = employees.filter(e => e.cell_id === cell.id);
    const simulated = analyzeCellAvailability(cell, startDate, endDate, cellEmployees, existingRequests);
    
    setSimMinCapacity(simulated.minCapacityPercentage);
    setSimRisk(simulated.maxRiskLevel);
    setSimConflictMsg(null);

  }, [selectedEmpId, startDate, endDate, employees, cells, blockedPeriods, existingRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedEmpId || !startDate || !endDate) return;
    setLoading(true);
    setError(null);

    const emp = employees.find(e => e.id === selectedEmpId);
    const cell = cells.find(c => c.id === emp?.cell_id);

    if (!emp || !cell) {
      setError("Erro interno de integridade de dados.");
      setLoading(false);
      return;
    }

    if (simRisk === 'critical' && currentUser.role !== 'admin') {
      setError("Aprovação bloqueada. Solicitação contém riscos críticos (sobreposição, saldo insuficiente ou célula abaixo do mínimo). Apenas administradores podem forçar registro.");
      setLoading(false);
      return;
    }

    const requestObj = {
      employee_id: emp.id,
      employee_name: emp.name,
      employee_registration: emp.registration,
      cell_id: cell.id,
      cell_name: cell.name,
      team_id: emp.team_id,
      start_date: startDate,
      end_date: endDate,
      days_count: simDays,
      vacation_type: 'individual' as const,
      origin: currentUser.role === 'user' ? 'employee_request' as const : 'hr_entry' as const,
      status: 'pending' as VacationRequestStatus,
      impact_level: simRisk || 'low',
      impact_percentage: simMinCapacity !== null ? (100 - simMinCapacity) : 0,
      approval_level: cell.is_critical ? 2 : 1, // Célula crítica exige aprovação nível 2 (RH/Manager)
      current_approval_level: 0,
      requester_notes: notes,
      approval_history: [],
      company_id: currentUser.company_id,
      business_unit_id: currentUser.business_unit_ids[0] || 'bu_industrial',
      requester_user_id: currentUser.uid,
      requester_role: currentUser.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser.email,
      updated_by: currentUser.email
    };

    try {
      await saveVacationRequest(requestObj, currentUser);
      
      const empRef = doc(db, 'employees', emp.id);
      const empSnap = await getDoc(empRef);
      if (empSnap.exists()) {
        const empData = empSnap.data();
        await saveEmployee({
          ...empData,
          pending_vacation_days: (empData.pending_vacation_days || 0) + simDays
        } as any, currentUser);
      }

      navigate('/vacations');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar solicitação de férias. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBoxStyle = (risk: RiskLevel) => {
    switch (risk) {
      case 'critical':
        return 'bg-[#FFE6EE] text-[#E04F6F] border-[#FFE6EE]';
      case 'high':
        return 'bg-[#FFF4D6] text-[#B27B00] border-[#FFF4D6]';
      case 'medium':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'low':
      default:
        return 'bg-[#DDFBF5] text-[#0EAD98] border-[#DDFBF5]';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* VOLTAR */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/vacations')}
          className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF2] flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">Solicitar Férias</h2>
          <p className="text-xs text-[#8A94A6] font-medium">
            Lançamento de nova programação de férias com análise instantânea de impacto produtivo na célula.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CAMPOS DO FORM */}
        <form onSubmit={handleSubmit} className="bg-white premium-card p-6 md:p-8 lg:col-span-2 space-y-6">
          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Colaborador</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
                <User size={16} />
              </span>
              <select
                required
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                disabled={currentUser?.role === 'user'}
                className="w-full h-10 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all disabled:opacity-60"
              >
                <option value="">Selecione o Colaborador</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.registration}) - Saldo: {emp.vacation_balance_days} dias
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Data Inicial</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Data Final</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Observações / Justificativa</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional: insira observações ou notas de agendamento..."
              rows={3}
              className="w-full p-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] resize-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-[#F6F8FB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/vacations')}
              className="h-10 px-4 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !simRisk || simRisk === 'critical' && currentUser?.role !== 'admin'}
              className="premium-button-primary"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Enviar Solicitação'
              )}
            </button>
          </div>
        </form>

        {/* LADO DIREITO: ANALISADOR DE IMPACTO PRODUTIVO */}
        <div className="space-y-6">
          <div className="bg-white premium-card p-6 space-y-4">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Analisador de Impacto
            </h3>
            
            {!selectedEmpId || !startDate || !endDate ? (
              <div className="py-8 text-center text-[#8A94A6] text-xs flex flex-col items-center justify-center gap-2">
                <Calendar size={24} className="opacity-40" />
                <span>Selecione o colaborador e o período para simular o risco na célula.</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* DIAS CALCULADOS */}
                <div className="flex justify-between items-center py-2 border-b border-[#F6F8FB]">
                  <span className="text-xs font-medium text-[#8A94A6]">Dias Calculados:</span>
                  <span className="text-xs font-bold text-[#0F172A]">{simDays} dias</span>
                </div>

                {/* STATUS DE CONFLITO / RESTRIÇÃO */}
                {simConflictMsg ? (
                  <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-[11px] font-semibold rounded-2xl flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{simConflictMsg}</span>
                  </div>
                ) : (
                  <>
                    {/* RISK CARD */}
                    {simRisk && (
                      <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 ${getRiskBoxStyle(simRisk)}`}>
                        <div className="mt-0.5 shrink-0">
                          {simRisk === 'low' || simRisk === 'medium' ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <ShieldAlert size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold">
                            {simRisk === 'low' && 'Risco Baixo'}
                            {simRisk === 'medium' && 'Risco Médio'}
                            {simRisk === 'high' && 'Risco Alto (Aprovação Especial)'}
                            {simRisk === 'critical' && 'Aprovação Bloqueada'}
                          </p>
                          <p className="text-[10px] mt-1 font-normal opacity-90 leading-relaxed">
                            {simRisk === 'low' && 'A célula opera com capacidade segura. Pode prosseguir.'}
                            {simRisk === 'medium' && 'Há uma leve redução de operadores na célula. Requer aprovação.'}
                            {simRisk === 'high' && 'Capacidade da célula ficará crítica. Apenas gerentes podem aprovar.'}
                            {simRisk === 'critical' && 'A célula ficará abaixo do limite seguro de operadores.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CAPACIDADE RESTANTE */}
                    <div className="flex justify-between items-center py-2 border-b border-[#F6F8FB]">
                      <span className="text-xs font-medium text-[#8A94A6]">Capacidade Mínima na Célula:</span>
                      <span className={`text-xs font-bold ${
                        simMinCapacity !== null && simMinCapacity < 55 ? 'text-[#E04F6F]' : 'text-[#0EAD98]'
                      }`}>
                        {simMinCapacity}%
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8A94A6] leading-relaxed">
                      * O motor recalcula a capacidade diária da célula cruzando com todas as outras férias já agendadas e os limites definidos nas configurações.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
