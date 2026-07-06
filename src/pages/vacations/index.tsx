import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { getVacationRequests, getCells, saveVacationRequest } from '../../services/databaseServices';
import type { VacationRequest, ProductionCell, VacationRequestStatus } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { Plus, X, Calendar, ClipboardCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const VacationsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros locais
  const [statusFilter, setStatusFilter] = useState('');
  const [cellFilter, setCellFilter] = useState('');

  const loadRequests = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [reqData, cellData] = await Promise.all([
        getVacationRequests(currentUser),
        getCells(currentUser)
      ]);
      setRequests(reqData);
      setCells(cellData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser]);

  // Cancelar solicitação
  const handleCancelRequest = async (request: VacationRequest) => {
    if (!currentUser) return;
    if (!window.confirm("Deseja realmente cancelar esta solicitação de férias?")) return;
    
    try {
      const updated = {
        ...request,
        status: 'cancelled' as VacationRequestStatus,
        approval_history: [
          ...request.approval_history,
          {
            level: request.current_approval_level,
            approver_id: currentUser.uid,
            approver_name: currentUser.name,
            action: 'rejected' as const,
            notes: 'Cancelado pelo usuário/solicitante',
            timestamp: new Date().toISOString()
          }
        ]
      };
      await saveVacationRequest(updated, currentUser);
      loadRequests();
    } catch (err) {
      console.error(err);
      alert("Erro ao cancelar solicitação.");
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchStatus = !statusFilter || req.status === statusFilter;
    const matchCell = !cellFilter || req.cell_id === cellFilter;
    return matchStatus && matchCell;
  });

  const columns = [
    {
      header: "Colaborador",
      accessor: (row: VacationRequest) => (
        <div>
          <p className="font-bold text-[#0F172A]">{row.employee_name}</p>
          <p className="text-[10px] text-[#8A94A6]">Reg: {row.employee_registration}</p>
        </div>
      ),
      sortable: true,
      sortKey: "employee_name"
    },
    {
      header: "Célula Produtiva",
      accessor: "cell_name" as const
    },
    {
      header: "Período Solicitado",
      accessor: (row: VacationRequest) => (
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Calendar size={12} className="text-[#8A94A6]" />
          <span>{format(parseISO(row.start_date), 'dd/MM/yyyy')}</span>
          <span className="text-[#8A94A6]">até</span>
          <span>{format(parseISO(row.end_date), 'dd/MM/yyyy')}</span>
        </div>
      )
    },
    {
      header: "Dias",
      accessor: (row: VacationRequest) => (
        <span className="font-bold text-slate-700">{row.days_count} dias</span>
      )
    },
    {
      header: "Risco Operacional",
      accessor: (row: VacationRequest) => (
        <div className="flex flex-col gap-1">
          <RiskBadge level={row.impact_level} />
          {row.impact_percentage > 0 && (
            <span className="text-[9px] text-[#8A94A6] font-medium">Impacto: {row.impact_percentage}%</span>
          )}
        </div>
      )
    },
    {
      header: "Origem",
      accessor: (row: VacationRequest) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {row.origin === 'automatic_suggestion' ? 'Sugestão Local' : row.origin === 'employee_request' ? 'Funcionário' : row.origin === 'hr_entry' ? 'RH Lançamento' : 'Manual'}
        </span>
      )
    },
    {
      header: "Status",
      accessor: (row: VacationRequest) => <RiskBadge level={row.status} />
    },
    {
      header: "Ações",
      accessor: (row: VacationRequest) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && currentUser && (currentUser.uid === row.requester_user_id || ['admin', 'hr'].includes(currentUser.role)) && (
            <button
              onClick={() => handleCancelRequest(row)}
              className="p-1.5 rounded-lg border border-[#FFE6EE] hover:bg-[#FFE6EE] text-[#E04F6F] transition-all"
              title="Cancelar solicitação"
            >
              <X size={14} />
            </button>
          )}
          {row.status === 'pending' && currentUser?.can_approve && (
            <button
              onClick={() => navigate('/approvals', { state: { requestId: row.id } })}
              className="p-1.5 rounded-lg border border-[#DDFBF5] hover:bg-[#DDFBF5] text-[#0EAD98] transition-all"
              title="Ir para fila de aprovação"
            >
              <ClipboardCheck size={14} />
            </button>
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
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Gestão de Férias</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Planejamento anual de férias, acompanhamento de solicitações e liberação operacional.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigate('/vacation-panel')}
            className="premium-button-secondary"
          >
            <Calendar size={16} />
            <span>Gerador Plano Automático</span>
          </button>
          <button 
            onClick={() => navigate('/vacations/request')}
            className="premium-button-primary"
          >
            <Plus size={16} />
            <span>Solicitar Férias</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white premium-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Filtrar por Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Reprovado</option>
            <option value="cancelled">Cancelado</option>
            <option value="completed">Concluído</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Filtrar por Célula</label>
          <select 
            value={cellFilter} 
            onChange={(e) => setCellFilter(e.target.value)}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            <option value="">Todas as Células</option>
            {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* TABELA */}
      <DataTable 
        columns={columns}
        data={filteredRequests}
        loading={loading}
        searchPlaceholder="Buscar por colaborador..."
        searchKey="employee_name"
      />
    </div>
  );
};
