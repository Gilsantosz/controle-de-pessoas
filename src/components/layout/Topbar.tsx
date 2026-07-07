import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, Search, Check, ShieldAlert, ChevronDown, LogOut,
  LayoutDashboard, Users, Layers, CalendarDays, ClipboardCheck,
  Compass, TrendingUp, Monitor, FileSpreadsheet, UserCheck, Settings
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getNotifications, markNotificationAsRead } from '../../services/databaseServices';
import type { Notification } from '../../types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Topbar: React.FC = () => {
  const { currentUser, logout } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

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
    
    // Polling de 15 segundos para notificações
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) return null;

  const role = currentUser.role;
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

  const canShow = (allowedRoles: string[]) => {
    return allowedRoles.includes(role);
  };

  const isParentActive = (paths: string[]) => {
    return paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
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
      
      {/* BRAND LOGO */}
      <div className="flex items-center gap-3 mr-4 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-tr from-[#6254E8] to-[#4F9CF9] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_12px_rgba(98,84,232,0.25)]">
          V
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-[#0F172A] tracking-tight leading-none">VacationPro</h1>
          <span className="text-[8px] font-bold text-[#8A94A6] uppercase tracking-wider">Industrial ERP</span>
        </div>
      </div>

      {/* HORIZONTAL NAVIGATION BAR */}
      <nav className="hidden lg:flex items-center gap-1.5 flex-1 justify-center px-4">
        {/* Painel */}
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => 
            `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              isActive 
                ? 'bg-[#6254E8]/10 text-[#6254E8]' 
                : 'text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
            }`
          }
        >
          <LayoutDashboard size={14} />
          <span>Painel</span>
        </NavLink>

        {/* Colaboradores Dropdown */}
        {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
          <div className="relative group">
            <button className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              isParentActive(['/employees', '/cells', '/teams']) 
                ? 'bg-[#6254E8]/10 text-[#6254E8]' 
                : 'text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
            }`}>
              <Users size={14} />
              <span>Colaboradores</span>
              <ChevronDown size={12} className="opacity-60 transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <div className="absolute left-0 mt-1 hidden group-hover:block w-48 bg-white border border-[#E8ECF2] shadow-[0_12px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <NavLink to="/employees" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <Users size={14} className="opacity-70" />
                Funcionários
              </NavLink>
              <NavLink to="/cells" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <Layers size={14} className="opacity-70" />
                Células
              </NavLink>
              <NavLink to="/teams" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <Users size={14} className="opacity-70" />
                Times
              </NavLink>
            </div>
          </div>
        )}

        {/* Férias & Absenças Dropdown */}
        <div className="relative group">
          <button className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
            isParentActive(['/vacations', '/calendar', '/vacation-panel', '/absences', '/absence-analysis', '/approvals']) 
              ? 'bg-[#6254E8]/10 text-[#6254E8]' 
              : 'text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
          }`}>
            <CalendarDays size={14} />
            <span>Férias & Absenças</span>
            <ChevronDown size={12} className="opacity-60 transition-transform duration-200 group-hover:rotate-180" />
          </button>
          <div className="absolute left-0 mt-1 hidden group-hover:block w-56 bg-white border border-[#E8ECF2] shadow-[0_12px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <NavLink to="/vacations" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
              <CalendarDays size={14} className="opacity-70" />
              Gestão de Férias
            </NavLink>
            <NavLink to="/calendar" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
              <CalendarDays size={14} className="opacity-70" />
              Calendário de Escalas
            </NavLink>
            <NavLink to="/vacation-panel" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
              <CalendarDays size={14} className="opacity-70" />
              Painel de Escalas
            </NavLink>
            {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
              <NavLink to="/absences" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <CalendarDays size={14} className="opacity-70" />
                Registros de Absenças
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
              <NavLink to="/absence-analysis" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <CalendarDays size={14} className="opacity-70" />
                Análise de Absenteísmo
              </NavLink>
            )}
            {currentUser?.can_approve && (
              <NavLink to="/approvals" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-semibold transition-all border-t border-[#F6F8FB] pt-2.5 mt-1.5">
                <ClipboardCheck size={14} className="opacity-70 text-[#6254E8]" />
                <span className="text-[#6254E8]">Aprovações</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Operações Dropdown */}
        <div className="relative group">
          <button className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
            isParentActive(['/operations', '/capacity', '/simulator', '/alerts']) 
              ? 'bg-[#6254E8]/10 text-[#6254E8]' 
              : 'text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
          }`}>
            <Monitor size={14} />
            <span>Operações</span>
            <ChevronDown size={12} className="opacity-60 transition-transform duration-200 group-hover:rotate-180" />
          </button>
          <div className="absolute left-0 mt-1 hidden group-hover:block w-52 bg-white border border-[#E8ECF2] shadow-[0_12px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink to="/operations" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <Monitor size={14} className="opacity-70" />
                Painel Operacional
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
              <NavLink to="/capacity" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <TrendingUp size={14} className="opacity-70" />
                Capacidade Industrial
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink to="/simulator" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <Compass size={14} className="opacity-70" />
                Simulador de Capacidade
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink to="/alerts" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <ShieldAlert size={14} className="opacity-70" />
                Alertas do Sistema
              </NavLink>
            )}
          </div>
        </div>

        {/* Relatórios */}
        {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
          <NavLink 
            to="/reports"
            className={({ isActive }) => 
              `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#6254E8]/10 text-[#6254E8]' 
                  : 'text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
              }`
            }
          >
            <FileSpreadsheet size={14} />
            <span>Relatórios</span>
          </NavLink>
        )}

        {/* Administrador Dropdown */}
        {canShow(['admin', 'hr']) && (
          <div className="relative group">
            <button className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              isParentActive(['/admin/users', '/settings']) 
                ? 'bg-[#6254E8]/10 text-[#6254E8]' 
                : 'text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
            }`}>
              <Settings size={14} />
              <span>Admin</span>
              <ChevronDown size={12} className="opacity-60 transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <div className="absolute left-0 mt-1 hidden group-hover:block w-48 bg-white border border-[#E8ECF2] shadow-[0_12px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <NavLink to="/admin/users" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                <UserCheck size={14} className="opacity-70" />
                Usuários e Acessos
              </NavLink>
              {canShow(['admin']) && (
                <NavLink to="/settings" className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] rounded-xl font-medium transition-all">
                  <Settings size={14} className="opacity-70" />
                  Configurações
                </NavLink>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* SEARCH, NOTIFICATIONS, PROFILE */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* COMPACT SEARCH */}
        <div className="relative w-48 xl:w-56 hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#8A94A6]">
            <Search size={14} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-1 focus:ring-[#6254E8]/20 transition-all"
          />
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 rounded-xl bg-[#F6F8FB] hover:bg-[#E8ECF2] flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] relative transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E04F6F] rounded-full border border-white"></span>
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

        {/* USER PROFILE & LOGOUT DROPDOWN */}
        <div className="relative group">
          <button className="flex items-center gap-3 border-l border-[#E8ECF2] pl-4">
            <div className="text-right hidden xl:block">
              <p className="text-xs font-semibold text-[#0F172A] leading-tight">{currentUser.name}</p>
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase tracking-wider">{role}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#6254E8]/10 text-[#6254E8] flex items-center justify-center font-bold text-xs border border-[#6254E8]/15 shadow-sm transition-all group-hover:bg-[#6254E8]/20">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
          </button>
          
          <div className="absolute right-0 mt-1.5 hidden group-hover:block w-44 bg-white border border-[#E8ECF2] shadow-[0_12px_30px_rgba(0,0,0,0.08)] rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E04F6F] hover:bg-[#FFE6EE]/40 rounded-xl font-bold transition-all text-left"
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
