import React, { useState, useEffect } from 'react';
import { Bell, Search, Check, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getNotifications, markNotificationAsRead } from '../../services/databaseServices';
import type { Notification } from '../../types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Topbar: React.FC = () => {
  const { currentUser } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    const loadNotifications = async () => {
      try {
        const data = await getNotifications(currentUser);
        setNotifications(data);
      } catch (err) {
        console.error("Erro ao carregar notificações:", err);
      }
    };

    loadNotifications();
    
    // Polling de 15 segundos para notificações no MVP
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-[#FFE6EE] text-[#E04F6F] border-[#FFE6EE]';
      case 'high':
        return 'bg-[#FFF4D6] text-[#B27B00] border-[#FFF4D6]';
      case 'medium':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-[#E8ECF2] flex items-center justify-between px-8 sticky top-0 z-40">
      {/* BARRA DE PESQUISA */}
      <div className="relative w-80">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8A94A6]">
          <Search size={18} />
        </span>
        <input 
          type="text" 
          placeholder="Buscar no VacationPro..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-[40px] pl-11 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-sm text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-1 focus:ring-[#6254E8]/20 transition-all"
        />
      </div>

      {/* AÇÕES DA TOPBAR */}
      <div className="flex items-center gap-6">
        
        {/* DROPDOWN DE NOTIFICAÇÕES */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 rounded-xl bg-[#F6F8FB] hover:bg-[#E8ECF2] flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] relative transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E04F6F] rounded-full border border-white"></span>
            )}
          </button>

          {/* PAINEL NOTIFICAÇÕES */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-[#E8ECF2] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-4 border-b border-[#E8ECF2] flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[#0F172A]">Notificações</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-[#FFE6EE] text-[#E04F6F] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>

                <div className="max-h-[300px] overflow-y-auto divide-y divide-[#F6F8FB]">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-[#8A94A6] text-xs">
                      Nenhuma notificação encontrada.
                    </div>
                  ) : (
                    notifications.map(not => (
                      <div 
                        key={not.id} 
                        className={`p-4 transition-all hover:bg-[#F7F8FC] ${!not.read ? 'bg-[#F6F8FB]/50' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getSeverityStyle(not.severity)}`}>
                            <ShieldAlert size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#0F172A] leading-tight">{not.title}</p>
                            <p className="text-[11px] text-[#8A94A6] mt-1 line-clamp-2 leading-normal">{not.message}</p>
                            <p className="text-[9px] text-slate-400 mt-2">
                              {formatDistanceToNow(parseISO(not.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                          {!not.read && (
                            <button 
                              onClick={() => handleMarkAsRead(not.id)}
                              className="w-5 h-5 rounded bg-white hover:bg-emerald-50 border border-[#E8ECF2] flex items-center justify-center text-emerald-600 self-start hover:border-emerald-200 transition-all"
                              title="Marcar como lida"
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* PERFIL / INFORMAÇÕES RESUMIDAS */}
        <div className="flex items-center gap-3 border-l border-[#E8ECF2] pl-6">
          <div className="text-right">
            <p className="text-xs font-semibold text-[#0F172A]">{currentUser?.name}</p>
            <p className="text-[10px] text-[#8A94A6] font-bold uppercase tracking-wider">{currentUser?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#6254E8]/10 text-[#6254E8] flex items-center justify-center font-bold text-sm border border-[#6254E8]/15">
            {currentUser?.name.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
