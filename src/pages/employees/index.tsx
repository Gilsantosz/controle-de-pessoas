import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { getEmployees, getCells, getTeams } from '../../services/databaseServices';
import type { Employee, ProductionCell, Team } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { UserPlus, FileEdit, CalendarPlus, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const EmployeesPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros locais
  const [cellFilter, setCellFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [empData, cellData, teamData] = await Promise.all([
          getEmployees(currentUser),
          getCells(currentUser),
          getTeams(currentUser)
        ]);
        setEmployees(empData);
        setCells(cellData);
        setTeams(teamData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  // Aplicar filtros
  const filteredEmployees = employees.filter(emp => {
    const matchCell = !cellFilter || emp.cell_id === cellFilter;
    const matchTeam = !teamFilter || emp.team_id === teamFilter;
    const matchShift = !shiftFilter || emp.shift === shiftFilter;
    const matchStatus = !statusFilter || emp.status === statusFilter;
    return matchCell && matchTeam && matchShift && matchStatus;
  });

  const columns = [
    {
      header: "Matrícula",
      accessor: "registration" as const,
      sortable: true
    },
    {
      header: "Colaborador",
      accessor: (row: Employee) => (
        <div>
          <p className="font-bold text-[#0F172A]">{row.name}</p>
          <p className="text-[10px] text-[#8A94A6]">{row.role}</p>
        </div>
      )
    },
    {
      header: "Célula / Equipe",
      accessor: (row: Employee) => (
        <div>
          <p className="font-semibold text-slate-700">{row.cell_name}</p>
          <p className="text-[10px] text-[#8A94A6]">
            {teams.find(t => t.id === row.team_id)?.name || 'Sem Equipe'}
          </p>
        </div>
      )
    },
    {
      header: "Turno / Carga",
      accessor: (row: Employee) => (
        <div>
          <p className="capitalize text-slate-700">{row.shift === 'morning' ? 'Manhã' : row.shift === 'afternoon' ? 'Tarde' : row.shift === 'night' ? 'Noite' : 'Adm'}</p>
          <p className="text-[10px] text-[#8A94A6]">{row.weekly_hours}h semanais</p>
        </div>
      )
    },
    {
      header: "Saldo Férias",
      accessor: (row: Employee) => (
        <div className="flex items-center gap-1.5 font-bold">
          <span className={row.vacation_balance_days >= 30 ? 'text-[#B27B00]' : 'text-[#0EAD98]'}>
            {row.vacation_balance_days} dias
          </span>
          {row.vacation_balance_days >= 30 && (
            <span className="text-xs" title="Saldo limite atingido (necessário planejar férias!)">⚠️</span>
          )}
        </div>
      )
    },
    {
      header: "Período Aquisitivo",
      accessor: (row: Employee) => (
        <div>
          <p className="text-slate-700 font-medium">
            {format(parseISO(row.acquisition_period_start), 'dd/MM/yy')} - {format(parseISO(row.acquisition_period_end), 'dd/MM/yy')}
          </p>
          <p className="text-[9px] text-[#E04F6F] font-bold">
            Limite: {format(parseISO(row.concession_deadline), 'dd/MM/yyyy')}
          </p>
        </div>
      )
    },
    {
      header: "Status",
      accessor: (row: Employee) => <RiskBadge level={row.status} />
    },
    {
      header: "Ações",
      accessor: (row: Employee) => (
        <div className="flex items-center gap-2">
          {currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/employees/${row.id}`);
              }}
              className="p-1.5 rounded-lg border border-[#E8ECF2] hover:bg-[#F6F8FB] text-[#8A94A6] hover:text-[#0F172A] transition-all"
              title="Editar colaborador"
            >
              <FileEdit size={14} />
            </button>
          )}
          {currentUser && ['admin', 'hr', 'supervisor'].includes(currentUser.role) && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/vacations/request', { state: { employeeId: row.id } });
                }}
                className="p-1.5 rounded-lg border border-[#E8ECF2] hover:bg-[#F6F8FB] text-[#8A94A6] hover:text-[#6254E8] transition-all"
                title="Lançar Solicitação de Férias"
              >
                <CalendarPlus size={14} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/absences', { state: { employeeId: row.id } });
                }}
                className="p-1.5 rounded-lg border border-[#E8ECF2] hover:bg-[#F6F8FB] text-[#8A94A6] hover:text-[#E04F6F] transition-all"
                title="Registrar Falta/Atraso"
              >
                <AlertTriangle size={14} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Colaboradores</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Gerenciamento de fichas cadastrais, saldos de férias acumulados e prazos legais de concessão.
          </p>
        </div>
        {currentUser && ['admin', 'hr'].includes(currentUser.role) && (
          <button 
            onClick={() => navigate('/employees/new')}
            className="premium-button-primary shrink-0 self-start sm:self-auto"
          >
            <UserPlus size={16} />
            <span>Novo Colaborador</span>
          </button>
        )}
      </div>

      {/* PAINEL DE FILTROS */}
      <div className="bg-white premium-card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Célula</label>
          <select 
            value={cellFilter} 
            onChange={(e) => {
              setCellFilter(e.target.value);
              setTeamFilter(''); // Reset team when cell changes
            }}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Todas as Células</option>
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

        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Turno</label>
          <select 
            value={shiftFilter} 
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Todos os Turnos</option>
            <option value="morning">Manhã</option>
            <option value="afternoon">Tarde</option>
            <option value="night">Noite</option>
            <option value="administrative">Administrativo</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="vacation">Em Férias</option>
            <option value="leave">Afastado</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>

      {/* TABELA DE COLABORADORES */}
      <DataTable 
        columns={columns}
        data={filteredEmployees}
        loading={loading}
        searchPlaceholder="Buscar por colaborador..."
        searchKey="name"
      />
    </div>
  );
};
