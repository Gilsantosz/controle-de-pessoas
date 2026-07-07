import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, CreditCard, Wallet, Users, Package, 
  CheckSquare, FileText, Settings, LogOut 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const { currentUser, logout } = useAppStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/employees', label: 'Payments', icon: CreditCard },
    { to: '/capacity', label: 'Balances', icon: Wallet },
    { to: '/teams', label: 'Customers', icon: Users },
    { to: '/cells', label: 'Products', icon: Package },
    { to: '/approvals', label: 'Billing', icon: CheckSquare },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Connect', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-[#E8ECF2] flex flex-col z-30 select-none shrink-0">
      
      {/* LOGO ZENTRA */}
      <div className="h-20 border-b border-[#E8ECF2] flex items-center px-6 gap-2.5">
        {/* Caixa Laranja com símbolo Z */}
        <div className="w-7 h-7 bg-[#FF9A3E] rounded-lg flex items-center justify-center text-white relative shadow-sm overflow-hidden shrink-0">
          <span className="font-extrabold text-sm select-none tracking-tighter" style={{ fontFamily: 'system-ui' }}>Z</span>
          {/* Listra diagonal interna */}
          <div className="absolute inset-0 border border-white/20 transform rotate-45 scale-125"></div>
        </div>
        <span className="text-xl font-bold text-[#0F172A] tracking-tighter select-none" style={{ fontFamily: 'system-ui' }}>
          zentra
        </span>
      </div>

      {/* NAV LINKS VERTICAIS */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-[#5A6A85] hover:text-[#0F172A] hover:bg-[#F6F8FB]'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* PROFILE & LOGOUT NO RODAPÉ */}
      <div className="p-4 border-t border-[#E8ECF2] space-y-2 shrink-0">
        <div className="px-3 py-2 bg-[#F6F8FB] rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF9A3E] to-[#6254E8] text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden select-none shrink-0">
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">{currentUser.name}</p>
            <p className="text-[9px] text-[#8A94A6] font-bold uppercase tracking-wider mt-0.5">{currentUser.role}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-[#E04F6F] hover:bg-[#FFE6EE]/40 rounded-xl font-bold transition-all text-left cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sair do Sistema</span>
        </button>
      </div>

    </aside>
  );
};
