import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet } from 'react-router-dom';

export const AppShell: React.FC = () => {
  return (
    <div className="flex bg-[#F6F8FB] min-h-screen text-[#0F172A]">
      {/* Sidebar fixa à esquerda */}
      <Sidebar />
      
      {/* Container principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar no topo */}
        <Topbar />
        
        {/* Conteúdo dinâmico com padding amplo */}
        <main className="flex-1 p-8 overflow-y-auto w-full max-w-[1600px] mx-auto animate-in fade-in duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
