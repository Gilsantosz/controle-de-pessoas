import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Calendar, UserMinus, CalendarDays, 
  BarChart3, Sliders, Activity, Network, Layers, 
  ClipboardCheck, FileText, Shield, Settings, LogOut, FileSpreadsheet, X 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const { 
    currentUser, logout, sidebarCollapsed, setSidebarCollapsed, 
    mobileSidebarOpen, setMobileSidebarOpen 
  } = useAppStore();
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

  const roleTranslations: Record<string, string> = {
    admin: 'Administrador',
    hr: 'Recursos Humanos',
    manager: 'Gestão Geral',
    supervisor: 'Supervisor',
    user: 'Colaborador',
    viewer: 'Visualizador'
  };

  return (
    <>
      {/* BACKDROP OVERLAY PARA DISPOSITIVOS MÓVEIS */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-white border-r border-[#E8ECF2] flex flex-col select-none shrink-0 transition-all duration-300 md:relative w-64 ${
        mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      } ${
        sidebarCollapsed ? 'md:w-20' : 'md:w-64'
      }`}>
        
        {/* LOGO ZENTRA */}
        <div 
          className={`h-20 border-b border-[#E8ECF2] flex items-center justify-between transition-all shrink-0 ${
            sidebarCollapsed ? 'md:justify-center md:px-4 px-6' : 'px-6'
          }`}
        >
          <div 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            className="flex items-center gap-2.5 hover:opacity-80 flex-1 cursor-pointer"
          >
            {/* Imagem da Logomarca */}
            <img 
              src={`${import.meta.env.BASE_URL}logo.png?v=2`} 
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-contain shrink-0" 
            />
            <span className={`text-xl font-bold text-[#0F172A] tracking-tighter select-none ${sidebarCollapsed ? 'md:hidden' : 'block'}`} style={{ fontFamily: 'system-ui' }}>
              Headcout
            </span>
          </div>

          {/* BOTÃO FECHAR NO MOBILE */}
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6A85] hover:text-[#0F172A] hover:bg-[#F6F8FB] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAV LINKS VERTICAIS */}
        <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto ${sidebarCollapsed ? 'md:px-2 px-4' : 'px-4'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-bold transition-all ${
                    sidebarCollapsed ? 'md:justify-center md:p-3 p-3 gap-3.5 px-4 py-3' : 'gap-3.5 px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-[#5A6A85] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                <span className={sidebarCollapsed ? 'md:hidden block' : 'block'}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* PROFILE & LOGOUT NO RODAPÉ */}
        <div className={`p-4 border-t border-[#E8ECF2] shrink-0 ${sidebarCollapsed ? 'md:space-y-3 md:flex md:flex-col md:items-center space-y-2' : 'space-y-2'}`}>
          <div 
            className={`rounded-xl flex items-center bg-[#F6F8FB] transition-all duration-300 ${
              sidebarCollapsed ? 'md:justify-center md:p-2 md:w-10 md:h-10 px-3 py-2 gap-2.5 w-full' : 'px-3 py-2 gap-2.5 w-full'
            }`} 
            title={sidebarCollapsed ? `${currentUser.name} (${roleTranslations[currentUser.role] || currentUser.role})` : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF9A3E] to-[#6254E8] text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden select-none shrink-0">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className={`min-w-0 ${sidebarCollapsed ? 'md:hidden block' : 'block'}`}>
              <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">{currentUser.name}</p>
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase tracking-wider mt-0.5">{roleTranslations[currentUser.role] || currentUser.role}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Sair do Sistema' : undefined}
            className={`flex items-center text-[#E04F6F] hover:bg-[#FFE6EE]/40 rounded-xl font-bold transition-all cursor-pointer ${
              sidebarCollapsed ? 'md:justify-center md:w-10 md:h-10 md:p-0 w-full gap-3 px-4 py-2.5 text-xs text-left' : 'w-full gap-3 px-4 py-2.5 text-xs text-left'
            }`}
          >
            <LogOut size={15} className="shrink-0" />
            <span className={sidebarCollapsed ? 'md:hidden block' : 'block'}>Sair do Sistema</span>
          </button>
        </div>

      </aside>
    </>
  );
};
