import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { getCells, getTeams, saveEmployee, deleteEmployee } from '../../services/databaseServices';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { ProductionCell, Team, ShiftType, ContractType, EmployeeStatus } from '../../types';
import { calculateAcquisitionPeriod } from '../../services/vacationRules';
import { ChevronLeft, Save } from 'lucide-react';

export const EmployeeDetailPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Campos do formulário
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Operador');
  const [shift, setShift] = useState<ShiftType>('morning');
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [contractType, setContractType] = useState<ContractType>('clt');
  const [productivityRate, setProductivityRate] = useState(1.0);
  const [cellId, setCellId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [skills, setSkills] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [acqStart, setAcqStart] = useState('');
  const [acqEnd, setAcqEnd] = useState('');
  const [concessionDeadline, setConcessionDeadline] = useState('');
  const [vacationBalance, setVacationBalance] = useState(30);
  const [ownerSupervisorId, setOwnerSupervisorId] = useState('');
  const [supervisorIds, setSupervisorIds] = useState<string[]>([]);
  const [createdByUserId, setCreatedByUserId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const loadSelectData = async () => {
      try {
        const [cellData, teamData] = await Promise.all([
          getCells(currentUser),
          getTeams(currentUser)
        ]);
        setCells(cellData);
        setTeams(teamData);
        if (!isEdit && currentUser.role === 'supervisor' && teamData.length === 1) {
          setTeamId(teamData[0].id);
          setCellId(teamData[0].cell_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSelectData();
  }, [currentUser]);

  useEffect(() => {
    if (isEdit && currentUser) {
      const loadEmployee = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'employees', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            
            // Check scope for supervisor
            if (currentUser.role === 'supervisor') {
              const isAllowed = 
                data.owner_supervisor_id === currentUser.uid ||
                (data.supervisor_ids && data.supervisor_ids.includes(currentUser.uid)) ||
                (currentUser.allowed_team_ids && currentUser.allowed_team_ids.includes(data.team_id)) ||
                (currentUser.allowed_employee_ids && currentUser.allowed_employee_ids.includes(data.id));
              
              if (!isAllowed) {
                setError("Acesso negado. Este colaborador está fora do seu escopo operacional.");
                setLoading(false);
                return;
              }
            }

            setName(data.name || '');
            setRegistration(data.registration || '');
            setPhone(data.phone || '');
            setEmail(data.email || '');
            setRole(data.role || '');
            setShift(data.shift || 'morning');
            setWeeklyHours(data.weekly_hours || 44);
            setContractType(data.contract_type || 'clt');
            setProductivityRate(data.productivity_rate || 1.0);
            setCellId(data.cell_id || '');
            setTeamId(data.team_id || '');
            setSkills(data.skills?.join(', ') || '');
            setHireDate(data.hire_date || '');
            setAcqStart(data.acquisition_period_start || '');
            setAcqEnd(data.acquisition_period_end || '');
            setConcessionDeadline(data.concession_deadline || '');
            setVacationBalance(data.vacation_balance_days || 30);
            setStatus(data.status || 'active');
            setOwnerSupervisorId(data.owner_supervisor_id || '');
            setSupervisorIds(data.supervisor_ids || []);
            setCreatedByUserId(data.created_by_user_id || '');
          }
        } catch (err) {
          console.error(err);
          setError('Erro ao carregar os dados do colaborador.');
        } finally {
          setLoading(false);
        }
      };
      loadEmployee();
    }
  }, [id, isEdit, currentUser]);

  // Ao alterar data de contratação, recalcula datas aquisitivas
  const handleHireDateChange = (dateVal: string) => {
    setHireDate(dateVal);
    if (dateVal) {
      const { acquisition_period_start, acquisition_period_end, concession_deadline } = calculateAcquisitionPeriod(dateVal);
      setAcqStart(acquisition_period_start);
      setAcqEnd(acquisition_period_end);
      setConcessionDeadline(concession_deadline);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    const cellObj = cells.find(c => c.id === cellId);
    
    const skillsArray = skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '');

    const employeeObj = {
      name,
      registration,
      phone,
      email,
      role,
      shift,
      weekly_hours: Number(weeklyHours),
      contract_type: contractType,
      productivity_rate: Number(productivityRate),
      cell_id: cellId,
      cell_name: cellObj ? cellObj.name : 'Sem Célula',
      team_id: teamId,
      skills: skillsArray,
      hire_date: hireDate,
      acquisition_period_start: acqStart,
      acquisition_period_end: acqEnd,
      concession_deadline: concessionDeadline,
      vacation_balance_days: Number(vacationBalance),
      used_vacation_days: isEdit ? 0 : 0, 
      pending_vacation_days: 0,
      status,
      company_id: currentUser.company_id,
      business_unit_id: currentUser.business_unit_ids[0] || 'bu_industrial',
      owner_supervisor_id: isEdit ? (ownerSupervisorId || currentUser.uid) : (currentUser.role === 'supervisor' ? currentUser.uid : (ownerSupervisorId || currentUser.uid)),
      supervisor_ids: isEdit ? (supervisorIds.length > 0 ? supervisorIds : [currentUser.uid]) : (currentUser.role === 'supervisor' ? [currentUser.uid] : (supervisorIds.length > 0 ? supervisorIds : [currentUser.uid])),
      created_by_user_id: isEdit ? (createdByUserId || currentUser.uid) : currentUser.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser.email,
      updated_by: currentUser.email
    };

    try {
      await saveEmployee(isEdit ? { ...employeeObj, id } : employeeObj, currentUser);
      navigate('/employees');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar os dados. Verifique as permissões de acesso.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !id || !currentUser) return;
    if (window.confirm(`Tem certeza que deseja excluir o colaborador ${name}? Esta ação não pode ser desfeita.`)) {
      setLoading(true);
      setError(null);
      try {
        await deleteEmployee(id, currentUser);
        navigate('/employees');
      } catch (err: any) {
        console.error(err);
        setError('Erro ao excluir colaborador. Verifique seus privilégios.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (error && error.startsWith("Acesso negado")) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="bg-white premium-card p-8 max-w-md w-full text-center mx-auto mt-12 border border-[#E8ECF2]/60">
          <div className="w-16 h-16 bg-[#FFE6EE] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#E04F6F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[#0F172A] font-semibold text-xl mb-2">Acesso Negado</h2>
          <p className="text-[#8A94A6] mb-6 text-xs font-medium">{error}</p>
          <button 
            onClick={() => navigate('/employees')}
            className="w-full premium-button-primary"
          >
            Voltar para Colaboradores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* HEADER E VOLTAR */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/employees')}
          className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF2] flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            {isEdit ? `Editar: ${name}` : 'Cadastrar Novo Colaborador'}
          </h2>
          <p className="text-xs text-[#8A94A6] font-medium">
            Preencha a ficha cadastral operacional e configure a célula e turno de atuação.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* FORMULÁRIO */}
      <form onSubmit={handleSubmit} className="bg-white premium-card overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          {/* SEÇÃO 1: DADOS BÁSICOS */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F6F8FB] pb-2">
              1. Identificação Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Matrícula (Única)</label>
                <input
                  type="text"
                  required
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  disabled={isEdit}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] disabled:opacity-60 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">E-mail Corporativo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Cargo</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ALOCAÇÃO INDUSTRIAL */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F6F8FB] pb-2">
              2. Alocação Industrial & Produtividade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Célula Produtiva</label>
                <select
                  required
                  value={cellId}
                  onChange={(e) => {
                    setCellId(e.target.value);
                    setTeamId('');
                  }}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="">Selecione uma Célula</option>
                  {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Equipe</label>
                <select
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="">Selecione uma Equipe</option>
                  {teams
                    .filter(t => t.cell_id === cellId)
                    .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Turno de Trabalho</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="morning">Manhã</option>
                  <option value="afternoon">Tarde</option>
                  <option value="night">Noite</option>
                  <option value="administrative">Administrativo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Carga Horária Semanal</label>
                <input
                  type="number"
                  required
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Tipo de Contrato</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as ContractType)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="clt">CLT (Efetivo)</option>
                  <option value="temporary">Temporário</option>
                  <option value="intern">Estagiário</option>
                  <option value="outsourced">Terceirizado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Fator Produtividade (x nominal)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={productivityRate}
                  onChange={(e) => setProductivityRate(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Habilidades (Separadas por vírgula)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Corte Laser, Solda Robô, Leitura de Projetos"
                className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
              />
            </div>
          </div>

          {/* SEÇÃO 3: REGRAS LEGAIS E FÉRIAS */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F6F8FB] pb-2">
              3. Data de Admissão, Período Aquisitivo e Saldo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Data de Admissão</label>
                <input
                  type="date"
                  required
                  value={hireDate}
                  onChange={(e) => handleHireDateChange(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Início Período Aquisitivo</label>
                <input
                  type="date"
                  required
                  value={acqStart}
                  onChange={(e) => setAcqStart(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Fim Período Aquisitivo</label>
                <input
                  type="date"
                  required
                  value={acqEnd}
                  onChange={(e) => setAcqEnd(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Prazo Limite Concessão</label>
                <input
                  type="date"
                  required
                  value={concessionDeadline}
                  onChange={(e) => setConcessionDeadline(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] border-red-100 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Saldo de Férias Acumulado (Dias)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="60"
                  value={vacationBalance}
                  onChange={(e) => setVacationBalance(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Status Geral</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="active">Ativo</option>
                  <option value="vacation">Em Férias</option>
                  <option value="leave">Afastado (Médico/Licença)</option>
                  <option value="inactive">Inativo / Desligado</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div className="px-6 py-4 bg-[#F7F8FC] border-t border-[#E8ECF2] flex items-center justify-between gap-3">
          {isEdit && currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) ? (
            <button
              type="button"
              onClick={handleDelete}
              className="h-[46px] px-6 rounded-xl border border-[#FFE6EE] text-xs font-semibold text-[#E04F6F] bg-white hover:bg-[#FFE6EE] transition-all cursor-pointer"
            >
              Excluir Colaborador
            </button>
          ) : <div />}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="h-[46px] px-6 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB] transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="premium-button-primary cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salvar Cadastro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
