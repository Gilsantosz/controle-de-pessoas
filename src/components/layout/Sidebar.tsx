import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Calendar, UserMinus, CalendarDays, 
  BarChart3, Sliders, Activity, Network, Layers, 
  ClipboardCheck, FileText, Shield, Settings, LogOut, FileSpreadsheet 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const { currentUser, logout, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Início', icon: Home },
    { to: '/employees', label: 'Colaboradores', icon: Users },
    { to: '/vacations', label: 'Férias', icon: Calendar },
    { to: '/absences', label: 'Ausências / Faltas', icon: UserMinus },
    { to: '/vacation-panel', label: 'Escala de Férias', icon: CalendarDays },
    { to: '/capacity', label: 'Capacidade Operacional', icon: BarChart3 },
    { to: '/simulator', label: 'Simulador de Escala', icon: Sliders },
    { to: '/operations', label: 'Monitor Operacional', icon: Activity },
    { to: '/teams', label: 'Equipes / Times', icon: Network },
    { to: '/cells', label: 'Células Produtivas', icon: Layers },
    { to: '/approvals', label: 'Aprovações', icon: ClipboardCheck },
    { to: '/rh-crosscheck', label: 'Conferência RH', icon: FileSpreadsheet },
    { to: '/reports', label: 'Relatórios', icon: FileText },
    ...(currentUser?.role === 'admin' ? [{ to: '/admin/users', label: 'Usuários Admin', icon: Shield }] : []),
    { to: '/settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className={`h-screen bg-white border-r border-[#E8ECF2] flex flex-col z-30 select-none shrink-0 transition-all duration-300 ${
      sidebarCollapsed ? 'w-20' : 'w-64'
    }`}>
      
      {/* LOGO ZENTRA */}
      <div 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        className={`h-20 border-b border-[#E8ECF2] flex items-center gap-2.5 cursor-pointer hover:bg-[#F6F8FB] transition-all shrink-0 ${
          sidebarCollapsed ? 'justify-center px-4' : 'px-6'
        }`}
      >
        {/* Caixa Laranja com símbolo Z */}
        <div className="w-7 h-7 bg-[#FF9A3E] rounded-lg flex items-center justify-center text-white relative shadow-sm overflow-hidden shrink-0">
          <span className="font-extrabold text-sm select-none tracking-tighter" style={{ fontFamily: 'system-ui' }}>Z</span>
          {/* Listra diagonal interna */}
          <div className="absolute inset-0 border border-white/20 transform rotate-45 scale-125"></div>
        </div>
        {!sidebarCollapsed && (
          <span className="text-xl font-bold text-[#0F172A] tracking-tighter select-none" style={{ fontFamily: 'system-ui' }}>
            zentra
          </span>
        )}
      </div>

      {/* NAV LINKS VERTICAIS */}
      <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-xs font-bold transition-all ${
                  sidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'
                } ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-[#5A6A85] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* PROFILE & LOGOUT NO RODAPÉ */}
      <div className={`p-4 border-t border-[#E8ECF2] shrink-0 ${sidebarCollapsed ? 'space-y-3 flex flex-col items-center' : 'space-y-2'}`}>
        <div 
          className={`rounded-xl flex items-center bg-[#F6F8FB] transition-all duration-300 ${
            sidebarCollapsed ? 'justify-center p-2 w-10 h-10' : 'px-3 py-2 gap-2.5 w-full'
          }`} 
          title={sidebarCollapsed ? `${currentUser.name} (${currentUser.role})` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF9A3E] to-[#6254E8] text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden select-none shrink-0">
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">{currentUser.name}</p>
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase tracking-wider mt-0.5">{currentUser.role}</p>
            </div>
          )}
        </div>

        <button 
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Sair do Sistema' : undefined}
          className={`flex items-center text-[#E04F6F] hover:bg-[#FFE6EE]/40 rounded-xl font-bold transition-all cursor-pointer ${
            sidebarCollapsed ? 'justify-center w-10 h-10 p-0' : 'w-full gap-3 px-4 py-2.5 text-xs text-left'
          }`}
        >
          <LogOut size={15} className="shrink-0" />
          {!sidebarCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>

    </aside>
  );
};
