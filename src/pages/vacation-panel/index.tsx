import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  getEmployees, getCells, getTeams, getVacationRequests, 
  getBlockedPeriods, saveVacationRequest 
} from '../../services/databaseServices';
import type { Employee, ProductionCell, Team, VacationRequest, BlockedPeriod } from '../../types';
import { suggestVacationSchedule } from '../../services/schedulerEngine';
import type { SuggestedPlanItem } from '../../services/schedulerEngine';
import { KpiCard } from '../../components/cards/KpiCard';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { 
  Calendar, Award, ShieldAlert, Sparkles, 
  Loader, Play, CheckCircle2, AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const VacationPanelPage: React.FC = () => {
  const { currentUser } = useAppStore();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto Plan form states
  const [isPlanning, setIsPlanning] = useState(false);
  const [planYear, setPlanYear] = useState(2026);
  const [planStrategy, setPlanStrategy] = useState<'balance' | 'legal' | 'production' | 'collective'>('balance');
  const [suggestions, setSuggestions] = useState<SuggestedPlanItem[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [empData, cellData, teamData, reqData, blockData] = await Promise.all([
        getEmployees(currentUser),
        getCells(currentUser),
        getTeams(currentUser),
        getVacationRequests(currentUser),
        getBlockedPeriods(currentUser)
      ]);
      setEmployees(empData);
      setCells(cellData);
      setTeams(teamData);
      setRequests(reqData);
      setBlockedPeriods(blockData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // KPIs
  const highBalanceCount = employees.filter(e => e.vacation_balance_days >= 30).length;
  
  // Férias vencendo (concession_deadline menor que 3 meses a partir de hoje)
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + 3);
  const expiringCount = employees.filter(e => {
    if (e.vacation_balance_days <= 0) return false;
    const deadline = parseISO(e.concession_deadline);
    return deadline <= limitDate;
  }).length;

  const noVacationsPlanned = employees.filter(e => {
    const hasRequests = requests.some(r => r.employee_id === e.id && r.status !== 'cancelled' && r.status !== 'rejected');
    return !hasRequests && e.vacation_balance_days > 0;
  }).length;

  const handleGeneratePlan = () => {
    setIsPlanning(true);
    setPlanSaved(false);
    
    // Simular processamento por 1 segundo do motor local
    setTimeout(() => {
      const plan = suggestVacationSchedule(
        planYear,
        employees,
        cells,
        teams,
        requests,
        blockedPeriods,
        planStrategy
      );
      setSuggestions(plan);
      setIsPlanning(false);
    }, 1000);
  };

  const handleSavePlan = async () => {
    if (!currentUser) return;
    setSavingPlan(true);
    try {
      // Salvar as sugestões aceitas no Firestore
      for (const sug of suggestions) {
        const reqObj = {
          employee_id: sug.employee_id,
          employee_name: sug.employee_name,
          employee_registration: sug.employee_registration,
          cell_id: sug.cell_id,
          cell_name: sug.cell_name,
          team_id: sug.team_id,
          start_date: sug.start_date,
          end_date: sug.end_date,
          days_count: sug.days_count,
          vacation_type: 'individual' as const,
          origin: 'automatic_suggestion' as const,
          status: 'pending' as const,
          impact_level: sug.risk_level,
          impact_percentage: sug.risk_level === 'low' ? 10 : (sug.risk_level === 'medium' ? 25 : 45),
          approval_level: 1,
          current_approval_level: 0,
          requester_notes: `Sugestão gerada pelo motor automático. Estratégia: ${planStrategy}`,
          approval_history: [],
          company_id: currentUser.company_id,
          business_unit_id: currentUser.business_unit_ids[0] || 'bu_industrial',
          requester_user_id: 'system',
          requester_role: 'admin' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: currentUser.email,
          updated_by: currentUser.email
        };
        await saveVacationRequest(reqObj, currentUser);
      }
      setPlanSaved(true);
      setSuggestions([]);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar plano de férias.');
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando painel de férias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Painel Analítico de Férias</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Relatórios consolidados de saldos de férias acumulados e motor heurístico de sugestão de cronogramas.
        </p>
      </div>

      {/* KPIs DE CONTROLE LEGAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard 
          title="Férias Vencendo (3 meses)" 
          value={expiringCount} 
          icon={<ShieldAlert size={18} className="text-[#E04F6F]" />} 
          description="Ações legais imediatas"
        />
        <KpiCard 
          title="Saldos Altos (>= 30 Dias)" 
          value={highBalanceCount} 
          icon={<Award size={18} />} 
          description="Acúmulos pendentes"
        />
        <KpiCard 
          title="Sem Férias Planejadas" 
          value={noVacationsPlanned} 
          icon={<Calendar size={18} />} 
          description="Operadores sem agendamentos"
        />
        <KpiCard 
          title="Taxa de Risco de Concessão" 
          value={`${employees.length > 0 ? Math.round((expiringCount / employees.length) * 100) : 0}%`} 
          icon={<AlertCircle size={18} />} 
          description="Percentual de passivo trabalhista"
        />
      </div>

      {/* MOTOR DE CRONOGRAMA AUTOMÁTICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PARÂMETROS DO PLANO */}
        <div className="bg-white premium-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[#6254E8]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Gerador de Plano Automático</h3>
            </div>
            <p className="text-xs text-[#8A94A6] leading-relaxed mb-6">
              O motor heurístico analisa as admissões, saldos de férias, restrições operacionais e períodos bloqueados para sugerir a melhor distribuição de férias.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Ano Operacional</label>
                <select
                  value={planYear}
                  onChange={(e) => setPlanYear(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="2026">Ano 2026</option>
                  <option value="2027">Ano 2027</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Estratégia de Distribuição</label>
                <select
                  value={planStrategy}
                  onChange={(e) => setPlanStrategy(e.target.value as any)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="balance">Equilíbrio Operacional (Balanceado)</option>
                  <option value="legal">Prioridade Legal (Férias Vencendo)</option>
                  <option value="production">Menor Impacto Produtivo</option>
                  <option value="collective">Férias Coletivas (Dez/Jan)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={isPlanning}
            className="w-full premium-button-primary mt-8 shadow-sm flex items-center justify-center gap-2"
          >
            {isPlanning ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Calculando Viabilidade...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Gerar Plano Sugerido</span>
              </>
            )}
          </button>
        </div>

        {/* PROPOSTA DE PLANO */}
        <div className="lg:col-span-2">
          {planSaved && (
            <div className="bg-[#DDFBF5] text-[#0EAD98] p-4 border border-[#DDFBF5] rounded-2xl flex items-center gap-2 mb-6 animate-in fade-in">
              <CheckCircle2 size={18} />
              <span className="text-xs font-semibold">O plano automático foi gerado e integrado à fila de solicitações pendentes com sucesso!</span>
            </div>
          )}

          {suggestions.length > 0 ? (
            <div className="bg-white premium-card overflow-hidden h-[450px] flex flex-col justify-between">
              <div className="p-5 border-b border-[#E8ECF2] bg-[#F7F8FC] flex items-center justify-between">
                <h3 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider">Cronograma Sugerido ({suggestions.length} Colaboradores)</h3>
                <button
                  onClick={handleSavePlan}
                  disabled={savingPlan}
                  className="h-8 px-4 rounded-xl bg-[#0EAD98] hover:bg-[#0EAD98]/90 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {savingPlan ? 'Salvando...' : 'Aplicar Lote Completo'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#F6F8FB]">
                {suggestions.map((sug, sIdx) => (
                  <div key={sIdx} className="p-4 flex items-center justify-between hover:bg-[#F7F8FC]/50 transition-all">
                    <div>
                      <p className="font-bold text-xs text-[#0F172A]">{sug.employee_name}</p>
                      <p className="text-[10px] text-[#8A94A6] mt-0.5">
                        Célula: {sug.cell_name} | Período: {format(parseISO(sug.start_date), 'dd/MM/yyyy')} a {format(parseISO(sug.end_date), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-[9px] text-slate-500 italic mt-1">"{sug.reason}"</p>
                    </div>
                    <div className="text-right shrink-0">
                      <RiskBadge level={sug.risk_level} />
                      <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{sug.priority} Prioridade</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-[#8A94A6] text-xs h-[450px] flex flex-col items-center justify-center gap-3">
              <Calendar size={36} className="opacity-30" />
              <p className="font-semibold">Nenhum plano gerado. Configure os parâmetros e clique em "Gerar Plano Sugerido" no painel ao lado.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
