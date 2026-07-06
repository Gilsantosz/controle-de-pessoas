import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getEmployees, getCells, getVacationRequests, getBlockedPeriods } from '../../services/databaseServices';
import type { Employee, ProductionCell, VacationRequest, BlockedPeriod, RiskLevel } from '../../types';
import { calculateVacationDays, validateBlockedPeriod, detectVacationOverlap } from '../../services/vacationRules';
import { analyzeCellAvailability } from '../../services/capacityEngine';
import { Compass, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { RiskBadge } from '../../components/feedback/RiskBadge';

export const SimulatorPage: React.FC = () => {
  const { currentUser } = useAppStore();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation inputs
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Simulation outputs
  const [daysCount, setDaysCount] = useState(0);
  const [minCapacity, setMinCapacity] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [availableOperators, setAvailableOperators] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const loadSimulatorData = async () => {
      setLoading(true);
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
        setRequests(reqData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSimulatorData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando simulador operacional...</p>
      </div>
    );
  }

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRecommendation(null);
    setRiskLevel(null);
    setMinCapacity(null);

    if (!selectedEmpId || !startDate || !endDate) {
      setErrorMsg("Selecione o colaborador e o período de simulação.");
      return;
    }

    const emp = employees.find(e => e.id === selectedEmpId);
    const cell = cells.find(c => c.id === emp?.cell_id);

    if (!emp || !cell) {
      setErrorMsg("Erro: Colaborador ou célula não localizados.");
      return;
    }

    const days = calculateVacationDays(startDate, endDate);
    setDaysCount(days);

    if (days <= 0) {
      setErrorMsg("A data final deve ser igual ou posterior à inicial.");
      return;
    }

    // 1. Validar contra saldo
    if (days > emp.vacation_balance_days) {
      setErrorMsg(`Saldo Insuficiente: colaborador possui saldo de ${emp.vacation_balance_days} dias.`);
      setRiskLevel('critical');
      setRecommendation("REPROVAR: Saldo do colaborador é insuficiente para cobrir o período solicitado.");
      return;
    }

    // 2. Validar contra períodos bloqueados
    const blocked = validateBlockedPeriod(startDate, endDate, cell.id, blockedPeriods);
    if (blocked) {
      setErrorMsg(`Período Bloqueado: o intervalo coincide com o bloqueio "${blocked.name}" na célula.`);
      setRiskLevel('critical');
      setRecommendation(`REPROVAR: Período bloqueado por motivo de "${blocked.reason}".`);
      return;
    }

    // 3. Validar sobreposição do colaborador
    const overlap = detectVacationOverlap(startDate, endDate, requests.filter(r => r.employee_id === emp.id));
    if (overlap) {
      setErrorMsg(`Sobreposição Detectada: Colaborador já possui férias aprovadas/pendentes de ${overlap.start_date} a ${overlap.end_date}.`);
      setRiskLevel('critical');
      setRecommendation("REPROVAR: Colaborador já possui programação ativa de férias nesse período.");
      return;
    }

    // 4. Calcular capacidade e risco na célula
    const cellEmployees = employees.filter(e => e.cell_id === cell.id);
    const simulated = analyzeCellAvailability(cell, startDate, endDate, cellEmployees, requests);

    setMinCapacity(simulated.minCapacityPercentage);
    setRiskLevel(simulated.maxRiskLevel);

    // Calcular quantidade mínima de operadores ativos no pior dia
    const minActive = Math.round(cellEmployees.length * (simulated.minCapacityPercentage / 100));
    setAvailableOperators(minActive);

    // Definir recomendações do motor heurístico
    if (simulated.maxRiskLevel === 'low') {
      setRecommendation("APROVAR: A célula possui excelente margem de segurança operacional no período.");
    } else if (simulated.maxRiskLevel === 'medium') {
      setRecommendation("REVISAR: Capacidade estável, mas requer atenção devido a outras ausências programadas.");
    } else if (simulated.maxRiskLevel === 'high') {
      setRecommendation("REQUER GERÊNCIA: Risco alto de desabastecimento da célula. Exige remanejamento ou override de gerente.");
    } else {
      setRecommendation("REPROVAR/BLOQUEAR: Operadores disponíveis abaixo do mínimo operacional seguro exigido pela célula.");
    }
  };

  const getRiskStyle = (lvl: RiskLevel) => {
    switch (lvl) {
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
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Simulador de Impacto</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Simule solicitações de férias e calcule em tempo real o impacto produtivo e o risco operacional diário da fábrica.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PARÂMETROS SIMULADOR */}
        <form onSubmit={handleSimulate} className="bg-white premium-card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F6F8FB]">
            <Compass size={18} className="text-[#6254E8]" />
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Simular Programação</h3>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Colaborador</label>
            <select
              required
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            >
              <option value="">Selecione o Colaborador</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.registration})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Data Inicial</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Data Final</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full premium-button-primary shadow-sm flex items-center justify-center gap-2 mt-4"
          >
            <RefreshCw size={16} />
            <span>Executar Simulação</span>
          </button>
        </form>

        {/* LADO DIREITO: PROJEÇÃO OPERACIONAL */}
        <div className="lg:col-span-2">
          {errorMsg && (
            <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl flex items-start gap-2 mb-6">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {riskLevel ? (
            <div className="bg-white premium-card p-6 md:p-8 space-y-6">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F6F8FB] pb-4">
                Resultado da Simulação Operacional
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Duração Férias</span>
                  <span className="text-lg font-bold text-[#0F172A]">{daysCount} dias</span>
                </div>
                
                <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Capacidade Célula</span>
                  <span className={`text-lg font-bold ${minCapacity && minCapacity < 70 ? 'text-[#E04F6F]' : 'text-[#0EAD98]'}`}>
                    {minCapacity}%
                  </span>
                </div>

                <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Ops Disponíveis</span>
                  <span className="text-lg font-bold text-[#0F172A]">{availableOperators} ops</span>
                </div>

                <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Nível de Risco</span>
                  <RiskBadge level={riskLevel} className="mt-1" />
                </div>
              </div>

              {/* RECOMENDAÇÃO BOX */}
              {recommendation && (
                <div className={`p-4 rounded-2xl border text-xs font-semibold flex gap-3 ${getRiskStyle(riskLevel)}`}>
                  {riskLevel === 'low' || riskLevel === 'medium' ? (
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">Recomendação do Sistema:</p>
                    <p className="font-normal opacity-90 mt-1 leading-relaxed">{recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-[#8A94A6] text-xs h-full min-h-[350px] flex flex-col items-center justify-center gap-3">
              <Compass size={36} className="opacity-30" />
              <p className="font-semibold">Nenhuma simulação ativa. Insira os parâmetros ao lado e simule.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
