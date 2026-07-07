import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Layers, GitBranch, CalendarDays, 
  ClipboardCheck, Compass, TrendingUp, Monitor, 
  FileSpreadsheet, UserCheck, Settings, LogOut, ShieldAlert
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const { currentUser, logout, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const role = currentUser.role;

  // Função auxiliar para verificar permissões de exibição de itens do menu
  const canShow = (allowedRoles: string[]) => {
    return allowedRoles.includes(role);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`transition-all duration-300 ${sidebarCollapsed ? 'w-[80px]' : 'w-[280px]'} bg-white border-r border-[#E8ECF2] flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden`}>
      {/* LOGO SUPERIOR */}
      <div 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`h-20 border-b border-[#E8ECF2] flex items-center gap-3 cursor-pointer hover:bg-[#F6F8FB]/50 transition-all duration-300 ${sidebarCollapsed ? 'px-5 justify-center' : 'px-8'}`}
        title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
      >
        <div className="w-10 h-10 bg-[#6254E8] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
          V
        </div>
        {!sidebarCollapsed && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-none">VacationPro</h1>
            <span className="text-[10px] font-semibold text-[#8A94A6] tracking-wider uppercase">Industrial ERP</span>
          </div>
        )}
      </div>

      {/* MENU ITENS COM SCROLL */}
      <div className={`flex-1 overflow-y-auto py-6 space-y-7 transition-all duration-300 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
        
        {/* GRUPO GENERAL */}
        <div>
          {sidebarCollapsed ? (
            <hr className="border-[#E8ECF2] my-2 mx-1" />
          ) : (
            <span className="px-4 text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase block mb-3">General</span>
          )}
          <div className="space-y-1">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => 
                `flex items-center rounded-2xl text-sm font-medium transition-all ${
                  sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                } ${
                  isActive 
                    ? 'bg-[#6254E8] text-white shadow-sm shadow-[#6254E8]/20' 
                    : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                }`
              }
              title={sidebarCollapsed ? "Dashboard" : undefined}
            >
              <LayoutDashboard size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Dashboard</span>}
            </NavLink>
          </div>
        </div>

        {/* GRUPO PESSOAS */}
        <div>
          {sidebarCollapsed ? (
            <hr className="border-[#E8ECF2] my-2 mx-1" />
          ) : (
            <span className="px-4 text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase block mb-3">Pessoas</span>
          )}
          <div className="space-y-1">
            {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
              <NavLink 
                to="/employees" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Colaboradores" : undefined}
              >
                <Users size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Colaboradores</span>}
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'viewer']) && (
              <NavLink 
                to="/cells" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Células" : undefined}
              >
                <Layers size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Células</span>}
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'viewer']) && (
              <NavLink 
                to="/teams" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Equipes" : undefined}
              >
                <GitBranch size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Equipes</span>}
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink 
                to="/absences" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Absenteísmo" : undefined}
              >
                <Monitor size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Absenteísmo</span>}
              </NavLink>
            )}
          </div>
        </div>

        {/* GRUPO FÉRIAS */}
        <div>
          {sidebarCollapsed ? (
            <hr className="border-[#E8ECF2] my-2 mx-1" />
          ) : (
            <span className="px-4 text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase block mb-3">Férias</span>
          )}
          <div className="space-y-1">
            <NavLink 
              to="/vacations" 
              className={({ isActive }) => 
                `flex items-center rounded-2xl text-sm font-medium transition-all ${
                  sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                } ${
                  isActive 
                    ? 'bg-[#6254E8] text-white' 
                    : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                }`
              }
              title={sidebarCollapsed ? "Gestão de Férias" : undefined}
            >
              <CalendarDays size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Gestão de Férias</span>}
            </NavLink>
            <NavLink 
              to="/calendar" 
              className={({ isActive }) => 
                `flex items-center rounded-2xl text-sm font-medium transition-all ${
                  sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                } ${
                  isActive 
                    ? 'bg-[#6254E8] text-white' 
                    : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                }`
              }
              title={sidebarCollapsed ? "Calendário" : undefined}
            >
              <CalendarDays size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Calendário</span>}
            </NavLink>
            {currentUser.can_approve && (
              <NavLink 
                to="/approvals" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Aprovações" : undefined}
              >
                <ClipboardCheck size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Aprovações</span>}
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink 
                to="/simulator" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Simulador" : undefined}
              >
                <Compass size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Simulador</span>}
              </NavLink>
            )}
          </div>
        </div>

        {/* GRUPO OPERAÇÃO */}
        <div>
          {sidebarCollapsed ? (
            <hr className="border-[#E8ECF2] my-2 mx-1" />
          ) : (
            <span className="px-4 text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase block mb-3">Operação</span>
          )}
          <div className="space-y-1">
            {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
              <NavLink 
                to="/capacity" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Capacidade" : undefined}
              >
                <TrendingUp size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Capacidade</span>}
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink 
                to="/operations" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Painel Operacional" : undefined}
              >
                <Monitor size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Painel Operacional</span>}
              </NavLink>
            )}
            {canShow(['admin', 'hr', 'manager', 'supervisor']) && (
              <NavLink 
                to="/alerts" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Alertas" : undefined}
              >
                <ShieldAlert size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Alertas</span>}
              </NavLink>
            )}
          </div>
        </div>

        {/* GRUPO RELATÓRIOS */}
        {canShow(['admin', 'hr', 'manager', 'supervisor', 'viewer']) && (
          <div>
            {sidebarCollapsed ? (
              <hr className="border-[#E8ECF2] my-2 mx-1" />
            ) : (
              <span className="px-4 text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase block mb-3">Relatórios</span>
            )}
            <div className="space-y-1">
              <NavLink 
                to="/reports" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Relatórios" : undefined}
              >
                <FileSpreadsheet size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Relatórios</span>}
              </NavLink>
            </div>
          </div>
        )}

        {/* GRUPO ADMIN */}
        {canShow(['admin', 'hr']) && (
          <div>
            {sidebarCollapsed ? (
              <hr className="border-[#E8ECF2] my-2 mx-1" />
            ) : (
              <span className="px-4 text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase block mb-3">Admin</span>
            )}
            <div className="space-y-1">
              <NavLink 
                to="/admin/users" 
                className={({ isActive }) => 
                  `flex items-center rounded-2xl text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-[#6254E8] text-white' 
                      : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                  }`
                }
                title={sidebarCollapsed ? "Usuários e Acessos" : undefined}
              >
                <UserCheck size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Usuários e Acessos</span>}
              </NavLink>
              {canShow(['admin']) && (
                <NavLink 
                  to="/settings" 
                  className={({ isActive }) => 
                    `flex items-center rounded-2xl text-sm font-medium transition-all ${
                      sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                    } ${
                      isActive 
                        ? 'bg-[#6254E8] text-white' 
                        : 'text-[#8A94A6] hover:bg-[#F6F8FB] hover:text-[#0F172A]'
                    }`
                  }
                  title={sidebarCollapsed ? "Configurações" : undefined}
                >
                  <Settings size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span className="animate-in fade-in duration-200">Configurações</span>}
                </NavLink>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RODAPÉ DA SIDEBAR */}
      <div className={`p-4 border-t border-[#E8ECF2] bg-[#F7F8FC] transition-all duration-300`}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-3 p-2 bg-white rounded-2xl border border-[#E8ECF2]">
            <div className="w-8 h-8 rounded-lg bg-[#DDFBF5] flex items-center justify-center text-[#0EAD98] font-bold text-xs shrink-0">
              {role.substring(0, 2).toUpperCase()}
            </div>
            <button 
              onClick={handleLogout}
              className="text-[#8A94A6] hover:text-[#E04F6F] p-1.5 rounded-lg hover:bg-[#FFE6EE] transition-all"
              title="Sair do sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-[#E8ECF2] animate-in fade-in duration-300">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#DDFBF5] flex items-center justify-center text-[#0EAD98] font-bold text-xs shrink-0">
                {role.substring(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[#0F172A] truncate">{currentUser.name}</p>
                <p className="text-[10px] text-[#8A94A6] uppercase font-bold tracking-wider">{role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[#8A94A6] hover:text-[#E04F6F] p-1.5 rounded-lg hover:bg-[#FFE6EE] transition-all"
              title="Sair do sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
