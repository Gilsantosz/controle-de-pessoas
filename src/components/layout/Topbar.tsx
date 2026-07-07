import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Search, Check, ShieldAlert, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getNotifications, markNotificationAsRead } from '../../services/databaseServices';
import type { Notification } from '../../types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Topbar: React.FC = () => {
  const { currentUser, logout } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();


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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
    <header className="h-20 bg-white border-b border-[#E8ECF2] flex items-center justify-between px-8 z-40 relative select-none">
      
      {/* LADO ESQUERDO: LOGO ZENTRA */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Caixa Laranja com símbolo Z */}
        <div className="w-7 h-7 bg-[#FF9A3E] rounded-lg flex items-center justify-center text-white relative shadow-sm overflow-hidden">
          <span className="font-extrabold text-sm select-none tracking-tighter" style={{ fontFamily: 'system-ui' }}>Z</span>
          {/* Listra diagonal interna */}
          <div className="absolute inset-0 border border-white/20 transform rotate-45 scale-125"></div>
        </div>
        <span className="text-xl font-bold text-[#0F172A] tracking-tighter select-none" style={{ fontFamily: 'system-ui' }}>
          zentra
        </span>
      </div>

      {/* CENTRO: LINKS DE NAVEGAÇÃO ZENTRA */}
      <nav className="hidden lg:flex items-center gap-1">
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Home
        </NavLink>
        <NavLink 
          to="/employees"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Payments
        </NavLink>
        <NavLink 
          to="/capacity"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Balances
        </NavLink>
        <NavLink 
          to="/teams"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Customers
        </NavLink>
        <NavLink 
          to="/cells"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Products
        </NavLink>
        <NavLink 
          to="/approvals"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Billing
        </NavLink>
        <NavLink 
          to="/reports"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Reports
        </NavLink>
        <NavLink 
          to="/settings"
          className={({ isActive }) => 
            `px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-[#0F172A] text-white rounded-full' 
                : 'text-[#5A6A85] hover:text-[#0F172A]'
            }`
          }
        >
          Connect
        </NavLink>
      </nav>

      {/* LADO DIREITO: PESQUISA, NOTIFICAÇÃO E AVATAR */}
      <div className="flex items-center gap-3 shrink-0">
        
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

        {/* AVATAR COM DROPDOWN LOGOUT */}
        <div className="relative group">
          <button className="flex items-center gap-2 pl-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF9A3E] to-[#6254E8] text-white flex items-center justify-center font-bold text-xs border border-white shadow-sm overflow-hidden select-none">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
          </button>
          
          <div className="absolute right-0 mt-1.5 hidden group-hover:block w-44 bg-white border border-[#E8ECF2] shadow-[0_12px_30px_rgba(0,0,0,0.08)] rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-2 border-b border-[#F6F8FB] mb-1 text-left">
              <p className="text-xs font-semibold text-[#0F172A] truncate">{currentUser.name}</p>
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase tracking-wider">{currentUser.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E04F6F] hover:bg-[#FFE6EE]/40 rounded-xl font-bold transition-all text-left cursor-pointer"
            >
              <LogOut size={14} />
              Sair do Sistema
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
