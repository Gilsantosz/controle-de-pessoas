import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getEmployees, getCells, getTeams, getVacationRequests, getBlockedPeriods } from '../../services/databaseServices';
import type { Employee, ProductionCell, Team, VacationRequest, BlockedPeriod } from '../../types';
import { 
  getDaysInMonth, format, parseISO, 
  isWithinInterval, addMonths, subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // Iniciando em Junho de 2026 para os dados de teste
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [cellFilter, setCellFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const loadCalendarData = async () => {
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

        if (cellData.length > 0) {
          setCellFilter(cellData[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCalendarData();
  }, [currentUser]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando calendário de planejamento...</p>
      </div>
    );
  }

  // Obter dias do mês atual
  const daysInMonth = getDaysInMonth(currentDate);
  
  const daysArray = Array.from({ length: daysInMonth }).map((_, i) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return {
      dayNum: i + 1,
      dateStr: format(dayDate, 'yyyy-MM-dd'),
      dayName: format(dayDate, 'eee', { locale: ptBR }).substring(0, 1).toUpperCase()
    };
  });

  // Filtrar colaboradores por célula/equipe
  const cellEmployees = employees.filter(emp => {
    const matchCell = !cellFilter || emp.cell_id === cellFilter;
    const matchTeam = !teamFilter || emp.team_id === teamFilter;
    return matchCell && matchTeam && emp.status !== 'inactive';
  });

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Calendário Operacional</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Visualização em linha de tempo (Gantt) das férias programadas e períodos bloqueados por célula.
          </p>
        </div>

        {/* NAVEGAÇÃO MÊS */}
        <div className="flex items-center gap-3 bg-white p-2 border border-[#E8ECF2] rounded-2xl shrink-0">
          <button 
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg hover:bg-[#F6F8FB] flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-[#0F172A] min-w-[120px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg hover:bg-[#F6F8FB] flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white premium-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Célula</label>
          <select 
            value={cellFilter} 
            onChange={(e) => {
              setCellFilter(e.target.value);
              setTeamFilter('');
            }}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Selecione uma Célula</option>
            {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Equipe</label>
          <select 
            value={teamFilter} 
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Todas as Equipes</option>
            {teams
              .filter(t => !cellFilter || t.cell_id === cellFilter)
              .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* LINHA DE TEMPO GANTT */}
      <div className="bg-white premium-card overflow-hidden">
        
        {/* LEGENDA */}
        <div className="p-4 border-b border-[#E8ECF2] bg-[#F7F8FC] flex flex-wrap gap-4 text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#DDFBF5] border border-[#0EAD98] rounded-md block"></span>
            <span>Férias Aprovadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-50 border border-blue-400 rounded-md block"></span>
            <span>Aguardando Aprovação</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FFE6EE] border border-[#E04F6F] rounded-md block"></span>
            <span>Período Bloqueado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-amber-50 border border-amber-300 rounded-md block"></span>
            <span>Afastado / Licença</span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E8ECF2]">
                {/* Coluna Nome Colaborador */}
                <th className="sticky left-0 bg-white z-10 p-4 text-[10px] font-bold text-[#8A94A6] uppercase border-r border-[#E8ECF2] w-64 text-left shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                  Colaborador
                </th>
                {/* Cabeçalho Dias */}
                {daysArray.map(day => (
                  <th 
                    key={day.dayNum} 
                    className="p-2 text-center border-r border-[#F6F8FB] text-[10px] font-bold text-[#8A94A6] min-w-[28px]"
                  >
                    <div>{day.dayName}</div>
                    <div className="text-[#0F172A] font-extrabold text-[11px] mt-0.5">{day.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F6F8FB]">
              {cellEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="p-8 text-center text-xs text-[#8A94A6] font-medium">
                    Selecione uma célula ou equipe para exibir os colaboradores.
                  </td>
                </tr>
              ) : (
                cellEmployees.map(emp => {
                  return (
                    <tr key={emp.id} className="hover:bg-[#F7F8FC]/30">
                      {/* Nome Colaborador Fixo à esquerda */}
                      <td className="sticky left-0 bg-white z-10 p-4 border-r border-[#E8ECF2] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] text-left">
                        <p className="font-bold text-xs text-[#0F172A]">{emp.name}</p>
                        <p className="text-[9px] text-[#8A94A6] mt-0.5">Saldo: {emp.vacation_balance_days} dias</p>
                      </td>
                      
                      {/* Renderização de cada dia no mês */}
                      {daysArray.map(day => {
                        const cellDate = parseISO(day.dateStr);

                        // 1. Verificar se há férias ativas/aprovadas neste dia
                        const activeVacation = requests.find(r => {
                          if (r.employee_id !== emp.id || r.status !== 'approved') return false;
                          return isWithinInterval(cellDate, { start: parseISO(r.start_date), end: parseISO(r.end_date) });
                        });

                        // 2. Verificar se há férias pendentes de aprovação neste dia
                        const pendingVacation = requests.find(r => {
                          if (r.employee_id !== emp.id || r.status !== 'pending') return false;
                          return isWithinInterval(cellDate, { start: parseISO(r.start_date), end: parseISO(r.end_date) });
                        });

                        // 3. Verificar se há afastamento do colaborador neste dia
                        const isLeave = emp.status === 'leave'; // Simplificado no MVP

                        // 4. Verificar se a célula está bloqueada neste dia
                        const activeBlock = blockedPeriods.find(b => {
                          if (b.status !== 'active') return false;
                          const applies = b.cell_ids.length === 0 || b.cell_ids.includes(emp.cell_id);
                          return applies && isWithinInterval(cellDate, { start: parseISO(b.start_date), end: parseISO(b.end_date) });
                        });

                        // Determinar a classe de cor da célula de calendário
                        let cellClass = 'bg-white';
                        let tooltip = '';

                        if (activeBlock) {
                          cellClass = 'bg-[#FFE6EE] border-[#FFE6EE] text-[#E04F6F]';
                          tooltip = `Bloqueio: ${activeBlock.name}`;
                        } else if (activeVacation) {
                          cellClass = 'bg-[#DDFBF5] border-[#DDFBF5] text-[#0EAD98]';
                          tooltip = 'Férias Aprovadas';
                        } else if (pendingVacation) {
                          cellClass = 'bg-blue-50 border-blue-100 text-blue-600';
                          tooltip = 'Férias Pendentes';
                        } else if (isLeave) {
                          // Apenas demonstrativo de licença
                          cellClass = 'bg-amber-50 border-amber-100 text-amber-600';
                          tooltip = 'Afastado';
                        }

                        return (
                          <td 
                            key={day.dayNum} 
                            className={`p-2 border-r border-[#F6F8FB] text-center select-none text-[9px] font-bold ${cellClass}`}
                            title={tooltip || undefined}
                          >
                            {(activeVacation || pendingVacation || activeBlock) && '•'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
