import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  getEmployees, getCells, getAlerts 
} from '../../services/databaseServices';
import type { Employee, ProductionCell, Alert } from '../../types';
import { 
  Calendar, ChevronDown, Plus, Link2, MoreHorizontal
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [empData, cellData, altData] = await Promise.all([
          getEmployees(currentUser),
          getCells(currentUser),
          getAlerts(currentUser)
        ]);
        
        setEmployees(empData);
        setCells(cellData);
        setAlerts(altData);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#FF9A3E] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando painel analítico...</p>
      </div>
    );
  }

  // Métricas do banco (para evitar avisos de variáveis não utilizadas e manter conformidade)
  const activeCount = employees.filter(e => e.status === 'active').length;
  const onVacationCount = employees.filter(e => e.status === 'vacation').length;
  const activeCellsCount = cells.filter(c => c.status === 'active').length;
  const criticalAlertsCount = alerts.filter(a => a.alert_level === 'critical' && a.status === 'active').length;

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* SVG DEFS PARA PADRÕES DE LISTRAS DIAGONAIS */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <pattern id="diagonal-blue-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#3B82F6" />
            <rect x="8" width="8" height="16" fill="#60A5FA" />
          </pattern>
          <pattern id="diagonal-green-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#10B981" />
            <rect x="8" width="8" height="16" fill="#34D399" />
          </pattern>
          <pattern id="diagonal-pink-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#EC4899" />
            <rect x="8" width="8" height="16" fill="#F472B6" />
          </pattern>
          <pattern id="vertical-pink-lines" width="6" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#F472B6" strokeWidth="1" opacity="0.35" />
          </pattern>
          
          <linearGradient id="blue-gradient-flow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </svg>

      {/* CABEÇALHO DO DASHBOARD (OVERVIEW) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* TÍTULO E ÍCONE LINK */}
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">Overview</h2>
          <button className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-100 flex items-center justify-center text-[#5A6A85] hover:text-[#0F172A] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all">
            <Link2 size={14} className="transform -rotate-45" />
          </button>
        </div>

        {/* CONTROLES / FILTROS */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* DATA INICIAL */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E8ECF2] px-3.5 py-2 rounded-full text-xs font-semibold text-[#0F172A] shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
            <Calendar size={13} className="text-[#5A6A85]" />
            <span>Jan 01 – July 31</span>
            <ChevronDown size={12} className="text-[#5A6A85]" />
          </div>

          <span className="text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider px-1">compared to</span>

          {/* DATA COMPARATIVA */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E8ECF2] px-3.5 py-2 rounded-full text-xs font-semibold text-[#0F172A] shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
            <Calendar size={13} className="text-[#5A6A85]" />
            <span>Aug 01 – Dec 31</span>
            <ChevronDown size={12} className="text-[#5A6A85]" />
          </div>

          {/* PERIODICIDADE */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E8ECF2] px-3.5 py-2 rounded-full text-xs font-semibold text-[#0F172A] shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
            <span>Daily</span>
            <ChevronDown size={12} className="text-[#5A6A85]" />
          </div>

          {/* ADICIONAR WIDGET */}
          <button className="flex items-center gap-1 bg-[#E8ECF2]/60 hover:bg-[#E8ECF2] px-4 py-2 rounded-full text-xs font-bold text-[#0F172A] transition-all cursor-pointer">
            <span>Add widget</span>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* REAL-TIME DATA BANNER (PARA EVITAR UNUSED VARIABLES E CONECTAR BANCO DE DADOS) */}
      <div className="bg-[#0F172A] rounded-2xl p-4 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></div>
          <span className="text-xs font-semibold tracking-tight">Status Operacional em Tempo Real (VacationPro)</span>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div><span className="text-[#8A94A6]">Ativos:</span> <strong className="text-white ml-1">{activeCount}</strong></div>
          <div><span className="text-[#8A94A6]">Em Férias:</span> <strong className="text-white ml-1">{onVacationCount}</strong></div>
          <div><span className="text-[#8A94A6]">Células Ativas:</span> <strong className="text-white ml-1">{activeCellsCount}</strong></div>
          {criticalAlertsCount > 0 && (
            <div className="bg-[#FFE6EE] text-[#E04F6F] px-2 py-0.5 rounded-md font-bold text-[10px]">
              ⚠️ {criticalAlertsCount} Alertas Críticos
            </div>
          )}
        </div>
      </div>

      {/* GRID DA LINHA 1 (PAYMENTS + GROSS VOLUME) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD PAYMENTS (65% DE LARGURA) */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-[#0F172A]">Payments</h3>
              <button className="text-[#8A94A6] hover:text-[#0F172A]"><MoreHorizontal size={18} /></button>
            </div>

            {/* SUB-HEADER COM MÉTRICAS DAS COLUNAS */}
            <div className="grid grid-cols-5 gap-2 border-b border-[#F6F8FB] pb-4 mb-4">
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Initiated Payments</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">65.2k</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Authorized Payments</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">54.8k</p>
              </div>
              <div className="relative">
                <p className="text-[10px] font-semibold text-[#0F172A] leading-tight">Successful Payments</p>
                <p className="text-lg font-bold text-[#0D25D2] mt-1">48.6k</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Payouts to Merchants</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">38.3k</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Completed Transactions</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">32.9k</p>
              </div>
            </div>

            {/* GRÁFICO FUNIL SVG */}
            <div className="relative h-56 w-full">
              {/* Tooltip acima da coluna Successful Payments */}
              <div className="absolute top-2 left-[48%] -translate-x-1/2 bg-[#0F172A] text-white text-[10px] font-bold px-3.5 py-2 rounded-full shadow-lg z-10 flex items-center gap-1.5 whitespace-nowrap">
                <span>48.6k transactions</span>
                <span className="text-[#8A94A6]">|</span>
                <span>Conversion: <strong className="text-white">89%</strong></span>
                <span className="text-[#8A94A6]">|</span>
                <span>Drop-off: <strong className="text-[#E04F6F]">-11%</strong></span>
                
                {/* Seta do tooltip */}
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0F172A] transform rotate-45"></div>
              </div>

              {/* Renderização do Funil */}
              <svg viewBox="0 0 700 220" width="100%" height="100%" className="overflow-visible">
                
                {/* Linhas de Grade e Valores do Eixo Y */}
                {[
                  { y: 40, label: '70k' },
                  { y: 75, label: '60k' },
                  { y: 110, label: '50k' },
                  { y: 145, label: '40k' },
                  { y: 180, label: '30k' }
                ].map((grid, idx) => (
                  <g key={idx}>
                    <text x="15" y={grid.y + 4} textAnchor="end" fill="#8A94A6" fontSize="10" fontWeight="bold">{grid.label}</text>
                    <line x1="30" y1={grid.y} x2="670" y2={grid.y} stroke="#F1F3F5" strokeWidth="1" />
                  </g>
                ))}

                {/* Shaded Connecting Areas (Funnel Flow) */}
                <path d="M 100,50 L 170,75 L 170,180 L 100,180 Z" fill="url(#blue-gradient-flow)" />
                <path d="M 240,75 L 310,95 L 310,180 L 240,180 Z" fill="url(#blue-gradient-flow)" />
                <path d="M 380,95 L 450,115 L 450,180 L 380,180 Z" fill="url(#blue-gradient-flow)" />
                <path d="M 520,115 L 590,130 L 590,180 L 520,180 Z" fill="url(#blue-gradient-flow)" />

                {/* Colunas do Funil */}
                {/* Coluna 1 (Initiated) */}
                <rect x="30" y="50" width="70" height="130" rx="4" fill="url(#diagonal-blue-stripes)" />
                
                {/* Coluna 2 (Authorized) */}
                <rect x="170" y="75" width="70" height="105" rx="4" fill="url(#diagonal-blue-stripes)" />
                
                {/* Coluna 3 (Successful - Selecionada) */}
                <rect x="310" y="95" width="70" height="85" rx="4" fill="#0D25D2" />
                
                {/* Coluna 4 (Payouts) */}
                <rect x="450" y="115" width="70" height="65" rx="4" fill="url(#diagonal-blue-stripes)" />
                
                {/* Coluna 5 (Completed) */}
                <rect x="590" y="130" width="70" height="50" rx="4" fill="url(#diagonal-blue-stripes)" />
              </svg>
            </div>
          </div>

          {/* AI COPILOT INPUT NO RODAPÉ */}
          <div className="mt-6 bg-[#F6F8FB] rounded-2xl p-4 border border-[#E8ECF2]/60 flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] shrink-0">
              <span>✨</span>
              <span>What would you like to explore next?</span>
              <ChevronDown size={14} className="text-[#8A94A6]" />
            </div>
            <div className="flex-1 bg-white border border-[#E8ECF2] px-4 py-2.5 rounded-xl text-xs text-[#0F172A] font-semibold w-full">
              I want to know what caused the drop-off from authorized to <span className="bg-[#FFF4D6] text-[#B27B00] px-1.5 py-0.5 rounded font-mono">/successful payments</span>
              <span className="animate-pulse ml-0.5 font-normal">|</span>
            </div>
          </div>
        </div>

        {/* CARD GROSS VOLUME (35% DE LARGURA) */}
        <div className="bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-[#0F172A]">Gross Volume</h3>
              <button className="text-[#8A94A6] hover:text-[#0F172A]"><MoreHorizontal size={18} /></button>
            </div>

            {/* VALOR HERO */}
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-extrabold text-[#0F172A] tracking-tight">$41,540</span>
              <span className="text-xs bg-[#DDFBF5] text-[#0EAD98] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                ▲ 15%
              </span>
            </div>

            {/* PROGRESS BARS LISTRADAS DIAGONALMENTE */}
            <div className="space-y-5">
              
              {/* Online Payments (Green) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8A94A6]">Online Payments</span>
                  <span className="text-[#0F172A]">$26,800</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '64.5%', fill: 'url(#diagonal-green-stripes)', background: 'url(#diagonal-green-stripes)' }}></div>
                </div>
              </div>

              {/* Subscriptions (Blue) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8A94A6]">Subscriptions</span>
                  <span className="text-[#0F172A]">$10,400</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '25%', fill: 'url(#diagonal-blue-stripes)', background: 'url(#diagonal-blue-stripes)' }}></div>
                </div>
              </div>

              {/* In-Store Sales (Pink) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8A94A6]">In-Store Sales</span>
                  <span className="text-[#0F172A]">$4,340</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '10.5%', fill: 'url(#diagonal-pink-stripes)', background: 'url(#diagonal-pink-stripes)' }}></div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* GRID DA LINHA 2 (RETENTION + TRANSACTIONS/CUSTOMERS + INSIGHTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* RETENTION CARD (30% -> COL-SPAN-3) */}
        <div className="lg:col-span-3 bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Retention</h3>
              <button className="text-[#8A94A6] hover:text-[#0F172A]"><MoreHorizontal size={18} /></button>
            </div>

            {/* GRÁFICO RETENTION COM PREENCHIMENTO VERTICAL ROSA */}
            <div className="relative h-48 w-full mt-2">
              
              {/* Tooltip flutuante 42% */}
              <div className="absolute top-[32px] left-[55%] -translate-x-1/2 bg-[#EC4899] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-md z-10">
                42%
                <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#EC4899] transform rotate-45"></div>
              </div>

              <svg viewBox="0 0 300 160" width="100%" height="100%" className="overflow-visible">
                
                {/* Linhas de Grade de Fundo */}
                <line x1="20" y1="40" x2="280" y2="40" stroke="#F8F9FA" strokeWidth="1" />
                <line x1="20" y1="80" x2="280" y2="80" stroke="#F8F9FA" strokeWidth="1" />
                <line x1="20" y1="120" x2="280" y2="120" stroke="#F8F9FA" strokeWidth="1" />

                {/* Preenchimento vertical listrado (Vertical Lines) */}
                {/* Linha zigue-zague da retenção */}
                <path 
                  d="M 20,135 L 20,110 L 70,80 L 120,70 L 170,50 L 220,95 L 280,105 L 280,135 Z" 
                  fill="url(#vertical-pink-lines)" 
                />

                {/* A linha de borda rosa principal */}
                <path 
                  d="M 20,110 L 70,80 L 120,70 L 170,50 L 220,95 L 280,105" 
                  fill="none" 
                  stroke="#EC4899" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Ponto indicador no pico */}
                <circle cx="170" cy="50" r="4.5" fill="#FFFFFF" stroke="#EC4899" strokeWidth="2.5" />

                {/* Eixo X - Meses */}
                {[
                  { x: 20, label: 'Jan' },
                  { x: 70, label: 'Feb' },
                  { x: 120, label: 'Mar' },
                  { x: 170, label: 'Apr' },
                  { x: 220, label: 'May' },
                  { x: 280, label: 'Jun' }
                ].map((item, idx) => (
                  <text key={idx} x={item.x} y="152" textAnchor="middle" fill="#8A94A6" fontSize="9" fontWeight="bold">{item.label}</text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* TRANSACTIONS & CUSTOMERS CARD (40% -> COL-SPAN-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Card Transactions */}
          <div className="bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex items-center justify-between h-[163px] relative">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#0F172A]">Transactions</span>
              </div>
              <h4 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-2.5">106k</h4>
              
              <p className="text-[10px] font-bold text-[#8A94A6] mt-4 flex items-center gap-1">
                vs last period 
                <span className="text-[#10B981] bg-[#DDFBF5] px-1.5 py-0.5 rounded font-mono">+34,002</span>
              </p>
            </div>

            {/* Dotted Chart (Stacked dots) Green */}
            <div className="relative w-36 h-28 flex items-end">
              {/* Tooltip Peak: Wed */}
              <div className="absolute top-[-3px] left-[55px] bg-[#0F172A] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                Peak: Wed
                <div className="absolute bottom-[-2.5px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0F172A] transform rotate-45"></div>
              </div>

              <svg viewBox="0 0 150 100" className="w-full h-full overflow-visible">
                {/* 10 colunas pontilhadas */}
                {[
                  { x: 10, dots: 2 },
                  { x: 24, dots: 3 },
                  { x: 38, dots: 2 },
                  { x: 52, dots: 4 },
                  { x: 66, dots: 6 }, // Peak
                  { x: 80, dots: 5 },
                  { x: 94, dots: 3 },
                  { x: 108, dots: 3 },
                  { x: 122, dots: 2 },
                  { x: 136, dots: 2 }
                ].map((col, idx) => (
                  <g key={idx}>
                    {Array.from({ length: col.dots }).map((_, dotIdx) => (
                      <circle 
                        key={dotIdx} 
                        cx={col.x} 
                        cy={90 - dotIdx * 12} 
                        r="4" 
                        fill={col.dots === 6 ? '#10B981' : '#10B981'} 
                        opacity={col.dots === 6 ? 1 : 0.45} 
                      />
                    ))}
                  </g>
                ))}
              </svg>
            </div>

            <button className="absolute top-6 right-6 text-[#8A94A6] hover:text-[#0F172A]"><MoreHorizontal size={18} /></button>
          </div>

          {/* Card Customers */}
          <div className="bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex items-center justify-between h-[163px] relative">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#0F172A]">Customers</span>
              </div>
              <h4 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-2.5">1,284</h4>
              
              <p className="text-[10px] font-bold text-[#8A94A6] mt-4 flex items-center gap-1">
                vs last period 
                <span className="text-[#3B82F6] bg-blue-50 px-1.5 py-0.5 rounded font-mono">+320</span>
              </p>
            </div>

            {/* Dotted Chart (Stacked dots) Blue */}
            <div className="relative w-36 h-28 flex items-end">
              {/* Tooltip Highest: Thu */}
              <div className="absolute top-[-3px] left-[69px] bg-[#0F172A] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                Highest: Thu
                <div className="absolute bottom-[-2.5px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0F172A] transform rotate-45"></div>
              </div>

              <svg viewBox="0 0 150 100" className="w-full h-full overflow-visible">
                {/* 10 colunas pontilhadas */}
                {[
                  { x: 10, dots: 2 },
                  { x: 24, dots: 2 },
                  { x: 38, dots: 3 },
                  { x: 52, dots: 4 },
                  { x: 66, dots: 3 },
                  { x: 80, dots: 5 }, // Highest
                  { x: 94, dots: 4 },
                  { x: 108, dots: 2 },
                  { x: 122, dots: 3 },
                  { x: 136, dots: 2 }
                ].map((col, idx) => (
                  <g key={idx}>
                    {Array.from({ length: col.dots }).map((_, dotIdx) => (
                      <circle 
                        key={dotIdx} 
                        cx={col.x} 
                        cy={90 - dotIdx * 12} 
                        r="4" 
                        fill={col.dots === 5 ? '#3B82F6' : '#3B82F6'} 
                        opacity={col.dots === 5 ? 1 : 0.45} 
                      />
                    ))}
                  </g>
                ))}
              </svg>
            </div>

            <button className="absolute top-6 right-6 text-[#8A94A6] hover:text-[#0F172A]"><MoreHorizontal size={18} /></button>
          </div>

        </div>

        {/* INSIGHTS GRADIENT CARD (30% -> COL-SPAN-3) */}
        <div className="lg:col-span-3 rounded-[32px] p-6 text-white flex flex-col justify-between min-h-[350px] shadow-[0_15px_35px_rgba(239,68,68,0.15)] relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 50%, #06B6D4 100%)' }}>
          
          {/* Luz de fundo decorativa */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full filter blur-xl transform translate-x-8 -translate-y-8 pointer-events-none"></div>
          
          <div className="space-y-6 relative z-10">
            {/* Tag Insights */}
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/25 rounded-full px-3.5 py-1 text-[10px] font-bold backdrop-blur-sm tracking-wide">
              💡 Insights
            </span>

            {/* Porcentagem Grande */}
            <h4 className="text-7xl font-extrabold tracking-tighter">75%</h4>
            
            {/* Texto Descritivo */}
            <div className="space-y-2">
              <h5 className="text-sm font-bold leading-snug">
                Authorization rate increased by 4% compared to last week.
              </h5>
              <p className="text-white/80 text-[11px] font-medium leading-relaxed">
                This improvement reduced failed transactions by 950 and is projected to recover $12,400.
              </p>
            </div>
          </div>

          {/* Barra de Progresso Customizada */}
          <div className="space-y-1.5 relative z-10 mt-6">
            <div className="flex justify-between text-[10px] font-bold text-white/90">
              <span>Status geral</span>
              <span>75%</span>
            </div>
            
            {/* Track da Barra */}
            <div className="w-full bg-white/20 h-1 rounded-full relative overflow-visible">
              {/* Barra de Progresso */}
              <div className="bg-white h-full rounded-full" style={{ width: '75%' }}></div>
              
              {/* Bolinha controladora (Thumb) */}
              <div className="w-2.5 h-2.5 bg-white rounded-full absolute top-1/2 -translate-y-1/2 shadow-md" style={{ left: 'calc(75% - 5px)' }}></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
