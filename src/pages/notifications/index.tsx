import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getNotifications, markNotificationAsRead } from '../../services/databaseServices';
import type { Notification } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { MailOpen } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getNotifications(currentUser);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentUser]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await markNotificationAsRead(n.id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    return !severityFilter || n.severity === severityFilter;
  });

  const columns = [
    {
      header: "Gravidade",
      accessor: (row: Notification) => <RiskBadge level={row.severity} />
    },
    {
      header: "Título / Mensagem",
      accessor: (row: Notification) => (
        <div className={!row.read ? 'font-bold' : 'opacity-70'}>
          <p className="text-xs text-[#0F172A]">{row.title}</p>
          <p className="text-[10px] text-[#8A94A6] mt-0.5 leading-normal">{row.message}</p>
        </div>
      )
    },
    {
      header: "Criado",
      accessor: (row: Notification) => (
        <span className="text-[10px] text-[#8A94A6]">
          {formatDistanceToNow(parseISO(row.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      )
    },
    {
      header: "Ações",
      accessor: (row: Notification) => (
        !row.read ? (
          <button 
            onClick={() => handleMarkRead(row.id)}
            className="p-1 px-2.5 rounded-lg border border-[#E8ECF2] hover:bg-[#DDFBF5] hover:text-[#0EAD98] text-[#8A94A6] text-[10px] font-bold transition-all"
            title="Marcar como lida"
          >
            Lido
          </button>
        ) : (
          <span className="text-[10px] text-[#8A94A6] font-semibold italic">Lida</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Central de Notificações</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Histórico completo de alertas críticos, convocações de passivo de férias e solicitações de aprovação.
          </p>
        </div>
        
        {notifications.some(n => !n.read) && (
          <button 
            onClick={handleMarkAllRead}
            className="premium-button-secondary shrink-0 self-start sm:self-auto"
          >
            <MailOpen size={16} />
            <span>Marcar Todas como Lidas</span>
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="bg-white premium-card p-5 max-w-xs">
        <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Gravidade do Alerta</label>
        <select 
          value={severityFilter} 
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
        >
          <option value="">Todas as Severidades</option>
          <option value="low">Baixo</option>
          <option value="medium">Médio</option>
          <option value="high">Alto</option>
          <option value="critical">Crítico</option>
        </select>
      </div>

      {/* TABELA */}
      <DataTable 
        columns={columns}
        data={filteredNotifications}
        loading={loading}
        emptyMessage="Nenhuma notificação encontrada."
      />
    </div>
  );
};
