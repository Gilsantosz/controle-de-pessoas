import React from 'react';
import { Topbar } from './Topbar';
import { Outlet } from 'react-router-dom';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F3F3F3] p-4 md:p-6 flex flex-col text-[#0F172A]">
      <div className="flex-1 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-[#E8ECF2]/30 flex flex-col overflow-hidden">
        {/* Barra de navegação horizontal no topo do card unificado */}
        <Topbar />
        
        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 animate-in fade-in duration-300">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
