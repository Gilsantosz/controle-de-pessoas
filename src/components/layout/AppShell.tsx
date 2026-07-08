import React from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F3F3F3] p-0 md:p-6 flex flex-col text-[#0F172A]">
      <div className="flex-1 bg-white rounded-none md:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border-b border-[#E8ECF2]/30 md:border flex overflow-hidden">
        {/* Barra lateral vertical à esquerda */}
        <Sidebar />
        
        {/* Conteúdo à direita */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar no topo da área direita */}
          <Topbar />
          
          {/* Área de conteúdo da página */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 bg-[#F6F8FB]/30">
            <div className="max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
