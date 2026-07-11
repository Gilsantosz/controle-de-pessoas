import React, { useState, useEffect } from 'react';
import { Bell, Search, Check, ShieldAlert, Menu, Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getNotifications, markNotificationAsRead } from '../../services/databaseServices';
import type { Notification } from '../../types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const Topbar: React.FC = () => {
  const { currentUser, setMobileSidebarOpen, mobileSidebarOpen } = useAppStore();
  const { isInstallable, isInstalled, install } = usePwaInstall();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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
    
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) return null;

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
    <header className="h-20 bg-white border-b border-[#E8ECF2] flex items-center justify-between px-4 md:px-8 z-20 shrink-0 select-none">
      
      {/* LADO ESQUERDO: HAMBURGUER (MOBILE) + SAUDAÇÃO */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[#5A6A85] hover:text-[#0F172A] hover:bg-[#F6F8FB] border border-[#E8ECF2]/50 active:scale-95 transition-all"
          title="Abrir menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-[10px] md:text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider truncate max-w-[160px] sm:max-w-none">
          VacationPro Célula Industrial
        </span>
      </div>

      {/* LADO DIREITO: PESQUISA E NOTIFICAÇÕES */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* BOTÃO INSTALAR PWA */}
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6254E8] to-[#FF9A3E] text-white text-[10px] font-bold shadow-md hover:shadow-lg hover:opacity-90 active:scale-95 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
            title="Instalar o app VacationPro no seu dispositivo"
          >
            <Download size={13} className="shrink-0" />
            <span className="hidden xs:inline">Instalar App</span>
          </button>
        )}
        
        {/* ÍCONE DE PESQUISA */}
        <button className="w-9 h-9 rounded-full bg-[#F3F4F6]/50 hover:bg-[#F3F4F6] border border-slate-100 flex items-center justify-center text-[#5A6A85] hover:text-[#0F172A] transition-all">
          <Search size={16} />
        </button>

        {/* NOTIFICAÇÕES BELL */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 rounded-full bg-[#F3F4F6]/50 hover:bg-[#F3F4F6] border border-slate-100 flex items-center justify-center text-[#5A6A85] hover:text-[#0F172A] relative transition-all"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF9A3E] rounded-full"></span>
            )}
          </button>

          {/* PAINEL NOTIFICAÇÕES */}
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-[#E8ECF2] shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-4 border-b border-[#E8ECF2] flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-[#0F172A]">Notificações</h3>
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
                            <ShieldAlert size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#0F172A] leading-tight">{not.title}</p>
                            <p className="text-[10px] text-[#8A94A6] mt-1 line-clamp-2 leading-normal">{not.message}</p>
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
                              <Check size={10} />
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

      </div>
    </header>
  );
};
