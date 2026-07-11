import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  getEmployees, getCells, getAlerts, getVacationRequests, getAbsenceRecords
} from '../../services/databaseServices';
import type { Employee, ProductionCell, Alert, VacationRequest, AbsenceRecord } from '../../types';
import {
  Calendar, ChevronDown, Plus, Link2, MoreHorizontal
} from 'lucide-react';
import {
  WidgetCatalogModal, WidgetGrid, useWidgets
} from '../../components/cards/WidgetPanel';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const { activeWidgets, modalOpen, setModalOpen, toggleWidget, removeWidget } = useWidgets();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [empData, cellData, altData, vacData, absData] = await Promise.all([
          getEmployees(currentUser),
          getCells(currentUser),
          getAlerts(currentUser),
          getVacationRequests(currentUser),
          getAbsenceRecords(currentUser),
        ]);
        setEmployees(empData);
        setCells(cellData);
        setAlerts(altData);
        setVacationRequests(vacData);
        setAbsenceRecords(absData);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
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

  // ── MÉTRICAS DE COLABORADORES ─────────────────────────────────
  const totalEmployees  = employees.length;
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Set de IDs dos colaboradores em férias ativas/aprovadas hoje
  const onVacationEmployeeIds = new Set(
    vacationRequests
      .filter(r => ['approved', 'completed'].includes(r.status) && r.start_date <= todayStr && r.end_date >= todayStr)
      .map(r => r.employee_id)
  );

  const activeCount     = employees.filter(e => e.status === 'active' && !onVacationEmployeeIds.has(e.id)).length;
  const onVacationCount = employees.filter(e => onVacationEmployeeIds.has(e.id)).length;
  const onLeaveCount    = employees.filter(e => e.status === 'leave').length;
  const inactiveCount   = employees.filter(e => e.status === 'inactive').length;

  // ── CÉLULAS ───────────────────────────────────────────────────
  const activeCellsCount = cells.filter(c => c.status === 'active').length;

  // ── ALERTAS ───────────────────────────────────────────────────
  const criticalAlertsCount = alerts.filter(a => a.alert_level === 'critical' && a.status === 'active').length;

  // ── SOLICITAÇÕES DE FÉRIAS ────────────────────────────────────
  const totalRequests = vacationRequests.length;
  const pendingCount  = vacationRequests.filter(r => r.status === 'pending').length;
  const approvedCount = vacationRequests.filter(r => ['approved', 'completed'].includes(r.status)).length;
  const rejectedCount = vacationRequests.filter(r => r.status === 'rejected').length;
  const approvalRate  = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;
  const rejectedRate  = totalRequests > 0 ? Math.round((rejectedCount / totalRequests) * 100) : 0;

  // ── CAPACIDADE SEMANAL (HORAS) ────────────────────────────────
  const sumHrs = (arr: Employee[]) => arr.reduce((s, e) => s + (e.weekly_hours || 0), 0);
  const totalWeeklyHours    = sumHrs(employees);
  const activeWeeklyHours   = sumHrs(employees.filter(e => e.status === 'active' && !onVacationEmployeeIds.has(e.id)));
  const vacationWeeklyHours = sumHrs(employees.filter(e => onVacationEmployeeIds.has(e.id)));
  const leaveWeeklyHours    = sumHrs(employees.filter(e => e.status === 'leave'));

  const workedPct = totalWeeklyHours > 0 ? (activeWeeklyHours   / totalWeeklyHours) * 100 : 0;
  const vacPct    = totalWeeklyHours > 0 ? (vacationWeeklyHours / totalWeeklyHours) * 100 : 0;
  const leavePct  = totalWeeklyHours > 0 ? (leaveWeeklyHours    / totalWeeklyHours) * 100 : 0;

  // ── TAXA DE DISPONIBILIDADE ───────────────────────────────────
  const availabilityRate = totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0;

  // ── FORMATADORES ──────────────────────────────────────────────
  const fmt    = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  const fmtHrs = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k hrs` : `${n} hrs`;

  // ── FUNIL SVG ─────────────────────────────────────────────────
  const funnelMax = Math.max(totalEmployees, 1);
  const barH = (val: number) => Math.max(8, Math.round((Math.max(val, 0) / funnelMax) * 130));
  const barY = (val: number) => 180 - barH(val);

  const fCols = [
    { x: 30,  val: totalEmployees   },
    { x: 170, val: activeCount      },
    { x: 310, val: onVacationCount  },
    { x: 450, val: onLeaveCount     },
    { x: 590, val: pendingCount     },
  ];

  const gridSteps = [
    { y: 40,  val: funnelMax },
    { y: 75,  val: Math.round(funnelMax * 0.77) },
    { y: 110, val: Math.round(funnelMax * 0.54) },
    { y: 145, val: Math.round(funnelMax * 0.31) },
    { y: 180, val: 0 },
  ];

  // ── GRÁFICO MENSAL DE FALTAS ──────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const xPositions = [20, 70, 120, 170, 220, 280];

  const rawMonthData = Array.from({ length: 6 }, (_, i) => {
    const d  = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      x: xPositions[i],
      absCount: absenceRecords.filter(a => a.date?.startsWith(ym)).length,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    };
  });

  const maxMonthAbs = Math.max(...rawMonthData.map(p => p.absCount), 1);

  // Menor nº de faltas = maior aderência = posição mais alta no gráfico (menor y SVG)
  const normalizedPoints = rawMonthData.map(p => ({
    ...p,
    y: Math.round(40 + (p.absCount / maxMonthAbs) * 95),
  }));

  const peakPoint  = normalizedPoints.reduce((best, p) => (p.y < best.y ? p : best), normalizedPoints[0]);
  const peakPct    = Math.round(100 - ((peakPoint.y - 40) / 95) * 100);
  const peakLeftPct = Math.round((peakPoint.x / 300) * 100);

  const linePath = `M ${normalizedPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const fillPath =
    `M ${normalizedPoints[0].x},135 ` +
    `L ${normalizedPoints[0].x},${normalizedPoints[0].y} ` +
    normalizedPoints.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${normalizedPoints[normalizedPoints.length - 1].x},135 Z`;

  const insightMsg =
    availabilityRate >= 80
      ? 'Alta disponibilidade operacional registrada.'
      : availabilityRate >= 60
      ? 'Disponibilidade moderada — atenção recomendada.'
      : 'Disponibilidade crítica — ação imediata necessária.';

  return (
    <div className="space-y-6 select-none font-sans">

      {/* SVG DEFS */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <pattern id="diagonal-blue-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#3B82F6" />
            <rect x="8" width="8" height="16" fill="#60A5FA" />
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

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">
            {currentUser?.role === 'supervisor' ? 'Dashboard da Minha Equipe' : 'Dashboard Geral da Operação'}
          </h2>
          <button
            onClick={handleCopyLink}
            title={copied ? 'Link copiado!' : 'Copiar link do dashboard'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all ${
              copied
                ? 'bg-[#DDFBF5] border-[#0EAD98] text-[#0EAD98]'
                : 'bg-white hover:bg-slate-50 border-slate-100 text-[#5A6A85] hover:text-[#0F172A]'
            }`}
          >
            <Link2 size={14} className="transform -rotate-45" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/calendar')}
            title="Ver calendário operacional"
            className="flex items-center gap-1.5 bg-white border border-[#E8ECF2] px-3.5 py-2 rounded-full text-xs font-semibold text-[#0F172A] shadow-sm cursor-pointer hover:bg-slate-50 transition-all"
          >
            <Calendar size={13} className="text-[#5A6A85]" />
            <span>Jan – Dez / {currentYear}</span>
            <ChevronDown size={12} className="text-[#5A6A85]" />
          </button>
          <button
            onClick={() => navigate('/reports')}
            title="Ver relatórios"
            className="flex items-center gap-1.5 bg-white border border-[#E8ECF2] px-3.5 py-2 rounded-full text-xs font-semibold text-[#0F172A] shadow-sm cursor-pointer hover:bg-slate-50 transition-all"
          >
            <span>Mensal</span>
            <ChevronDown size={12} className="text-[#5A6A85]" />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 bg-[#6254E8] hover:bg-[#5145CD] text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span>Adicionar Widget</span>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* STATUS OPERACIONAL */}
      <div className="bg-[#0F172A] rounded-2xl p-4 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></div>
          <span className="text-xs font-semibold tracking-tight">Status Operacional em Tempo Real</span>
        </div>
        <div className="flex items-center gap-6 text-xs flex-wrap">
          <div><span className="text-[#8A94A6]">Ativos:</span> <strong className="text-white ml-1">{activeCount}</strong></div>
          <div><span className="text-[#8A94A6]">Em Férias:</span> <strong className="text-white ml-1">{onVacationCount}</strong></div>
          <div><span className="text-[#8A94A6]">Afastados:</span> <strong className="text-white ml-1">{onLeaveCount}</strong></div>
          <div><span className="text-[#8A94A6]">Células Ativas:</span> <strong className="text-white ml-1">{activeCellsCount}</strong></div>
          {criticalAlertsCount > 0 && (
            <div className="bg-[#FFE6EE] text-[#E04F6F] px-2 py-0.5 rounded-md font-bold text-[10px]">
              ⚠️ {criticalAlertsCount} Alertas Críticos
            </div>
          )}
        </div>
      </div>

      {/* LINHA 1: FUNIL + CAPACIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* DISPONIBILIDADE DA FORÇA DE TRABALHO */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-[#0F172A]">Disponibilidade da Força de Trabalho</h3>
              <button
                onClick={() => navigate('/vacations')}
                title="Ver detalhes de férias"
                className="text-[#8A94A6] hover:text-[#0F172A] transition-all"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 border-b border-[#F6F8FB] pb-4 mb-4">
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Total de Colaboradores</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">{fmt(totalEmployees)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Ativos Operacionais</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">{fmt(activeCount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#0D25D2] leading-tight">Em Férias</p>
                <p className="text-lg font-bold text-[#0D25D2] mt-1">{fmt(onVacationCount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Afastados / Licenças</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">{fmt(onLeaveCount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8A94A6] leading-tight">Solicitações Pendentes</p>
                <p className="text-lg font-bold text-[#0F172A] mt-1">{fmt(pendingCount)}</p>
              </div>
            </div>

            {/* FUNIL SVG */}
            <div className="relative h-56 w-full">
              <div className="absolute top-2 left-[48%] -translate-x-1/2 bg-[#0F172A] text-white text-[10px] font-bold px-3.5 py-2 rounded-full shadow-lg z-10 flex items-center gap-1.5 whitespace-nowrap">
                <span>{fmt(onVacationCount)} em férias</span>
                <span className="text-[#8A94A6]">|</span>
                <span>Aprovações: <strong className="text-white">{approvalRate}%</strong></span>
                <span className="text-[#8A94A6]">|</span>
                <span>Recusadas: <strong className="text-[#E04F6F]">-{rejectedRate}%</strong></span>
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0F172A] transform rotate-45"></div>
              </div>

              <svg viewBox="0 0 700 220" width="100%" height="100%" className="overflow-visible">
                {gridSteps.map((g, idx) => (
                  <g key={idx}>
                    <text x="15" y={g.y + 4} textAnchor="end" fill="#8A94A6" fontSize="10" fontWeight="bold">{fmt(g.val)}</text>
                    <line x1="30" y1={g.y} x2="670" y2={g.y} stroke="#F1F3F5" strokeWidth="1" />
                  </g>
                ))}

                {fCols.slice(0, -1).map((col, idx) => {
                  const next = fCols[idx + 1];
                  return (
                    <path
                      key={idx}
                      d={`M ${col.x + 70},${barY(col.val)} L ${next.x},${barY(next.val)} L ${next.x},180 L ${col.x + 70},180 Z`}
                      fill="url(#blue-gradient-flow)"
                    />
                  );
                })}

                {fCols.map((col, idx) => (
                  <rect
                    key={idx}
                    x={col.x}
                    y={barY(col.val)}
                    width="70"
                    height={barH(col.val)}
                    rx="4"
                    fill={idx === 2 ? '#0D25D2' : 'url(#diagonal-blue-stripes)'}
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* AI COPILOT INPUT */}
          <div className="mt-6 bg-[#F6F8FB] rounded-2xl p-4 border border-[#E8ECF2]/60 flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] shrink-0">
              <span>✨</span>
              <span>O que você gostaria de explorar a seguir?</span>
              <ChevronDown size={14} className="text-[#8A94A6]" />
            </div>
            <div className="flex-1 bg-white border border-[#E8ECF2] px-4 py-2.5 rounded-xl text-xs text-[#0F172A] font-semibold w-full">
              Quero analisar as solicitações pendentes em relação ao{' '}
              <span className="bg-[#FFF4D6] text-[#B27B00] px-1.5 py-0.5 rounded font-mono">/saldo de férias</span>
              <span className="animate-pulse ml-0.5 font-normal">|</span>
            </div>
          </div>
        </div>

        {/* CAPACIDADE PLANEJADA */}
        <div className="bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-[#0F172A]">Capacidade Planejada</h3>
              <button
                onClick={() => navigate('/capacity')}
                title="Ver capacidade planejada"
                className="text-[#8A94A6] hover:text-[#0F172A] transition-all"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-extrabold text-[#0F172A] tracking-tight">{fmtHrs(totalWeeklyHours)}</span>
              <span className="text-xs bg-[#DDFBF5] text-[#0EAD98] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                ▲ {availabilityRate}%
              </span>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8A94A6]">Horas Trabalhadas</span>
                  <span className="text-[#0F172A]">{fmtHrs(activeWeeklyHours)}</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${Math.min(workedPct, 100).toFixed(1)}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8A94A6]">Horas em Férias</span>
                  <span className="text-[#0F172A]">{fmtHrs(vacationWeeklyHours)}</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${Math.min(vacPct, 100).toFixed(1)}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8A94A6]">Afastamentos / Licenças</span>
                  <span className="text-[#0F172A]">{fmtHrs(leaveWeeklyHours)}</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#EC4899]" style={{ width: `${Math.min(leavePct, 100).toFixed(1)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 2: ADERÊNCIA + CARDS + INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* ADERÊNCIA À ESCALA */}
        <div className="lg:col-span-3 bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Aderência à Escala</h3>
              <button
                onClick={() => navigate('/calendar')}
                title="Ver aderência à escala"
                className="text-[#8A94A6] hover:text-[#0F172A] transition-all"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="relative h-48 w-full mt-2">
              <div
                className="absolute top-[28px] bg-[#EC4899] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-md z-10 -translate-x-1/2"
                style={{ left: `${peakLeftPct}%` }}
              >
                {peakPct}%
                <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#EC4899] transform rotate-45"></div>
              </div>

              <svg viewBox="0 0 300 160" width="100%" height="100%" className="overflow-visible">
                <line x1="20" y1="40"  x2="280" y2="40"  stroke="#F8F9FA" strokeWidth="1" />
                <line x1="20" y1="80"  x2="280" y2="80"  stroke="#F8F9FA" strokeWidth="1" />
                <line x1="20" y1="120" x2="280" y2="120" stroke="#F8F9FA" strokeWidth="1" />
                <path d={fillPath} fill="url(#vertical-pink-lines)" />
                <path d={linePath} fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={peakPoint.x} cy={peakPoint.y} r="4.5" fill="#FFFFFF" stroke="#EC4899" strokeWidth="2.5" />
                {normalizedPoints.map((p, idx) => (
                  <text key={idx} x={p.x} y="152" textAnchor="middle" fill="#8A94A6" fontSize="9" fontWeight="bold">{p.label}</text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* SOLICITAÇÕES + COLABORADORES */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Solicitações de Férias */}
          <div className="bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col sm:flex-row items-center justify-between min-h-[163px] sm:h-[163px] gap-4 relative">
            <div>
              <span className="text-xs font-bold text-[#0F172A]">Solicitações de Férias</span>
              <h4 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-2.5">{fmt(totalRequests)}</h4>
              <p className="text-[10px] font-bold text-[#8A94A6] mt-4 flex items-center gap-1 flex-wrap">
                aprovadas: <span className="text-[#10B981] bg-[#DDFBF5] px-1.5 py-0.5 rounded font-mono">{fmt(approvedCount)}</span>
                pendentes: <span className="text-[#F59E0B] bg-amber-50 px-1.5 py-0.5 rounded font-mono">{fmt(pendingCount)}</span>
              </p>
            </div>
            <div className="relative w-36 h-28 flex items-end">
              <div className="absolute top-[-3px] left-[50px] bg-[#0F172A] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                Aprovadas: {approvalRate}%
                <div className="absolute bottom-[-2.5px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0F172A] transform rotate-45"></div>
              </div>
              <svg viewBox="0 0 150 100" className="w-full h-full overflow-visible">
                {[
                  { x: 15,  val: approvedCount, color: '#10B981' },
                  { x: 60,  val: pendingCount,  color: '#F59E0B' },
                  { x: 105, val: rejectedCount, color: '#EF4444' },
                ].map((bar, idx) => {
                  const pct = totalRequests > 0 ? bar.val / totalRequests : 0;
                  const h   = Math.max(4, Math.round(pct * 80));
                  return <rect key={idx} x={bar.x} y={90 - h} width="35" height={h} rx="4" fill={bar.color} opacity="0.85" />;
                })}
              </svg>
            </div>
            <button
              onClick={() => navigate('/approvals')}
              title="Ver solicitações de férias"
              className="absolute top-6 right-6 text-[#8A94A6] hover:text-[#0F172A] transition-all"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Colaboradores por Status */}
          <div className="bg-white rounded-[32px] border border-[#E8ECF2]/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col sm:flex-row items-center justify-between min-h-[163px] sm:h-[163px] gap-4 relative">
            <div>
              <span className="text-xs font-bold text-[#0F172A]">Colaboradores Ativos</span>
              <h4 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-2.5">{fmt(activeCount)}</h4>
              <p className="text-[10px] font-bold text-[#8A94A6] mt-4 flex items-center gap-1">
                de um total de
                <span className="text-[#3B82F6] bg-blue-50 px-1.5 py-0.5 rounded font-mono">{fmt(totalEmployees)}</span>
                colaboradores
              </p>
            </div>
            <div className="relative w-36 h-28 flex items-end">
              <div className="absolute top-[-3px] left-[55px] bg-[#0F172A] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                {availabilityRate}% disponíveis
                <div className="absolute bottom-[-2.5px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0F172A] transform rotate-45"></div>
              </div>
              <svg viewBox="0 0 150 100" className="w-full h-full overflow-visible">
                {[
                  { x: 10,  val: activeCount,     color: '#3B82F6' },
                  { x: 42,  val: onVacationCount, color: '#10B981' },
                  { x: 74,  val: onLeaveCount,    color: '#F59E0B' },
                  { x: 106, val: inactiveCount,   color: '#8A94A6' },
                ].map((bar, idx) => {
                  const pct = totalEmployees > 0 ? bar.val / totalEmployees : 0;
                  const h   = Math.max(4, Math.round(pct * 80));
                  return <rect key={idx} x={bar.x} y={90 - h} width="28" height={h} rx="4" fill={bar.color} opacity="0.75" />;
                })}
              </svg>
            </div>
            <button
              onClick={() => navigate('/employees')}
              title="Ver todos os colaboradores"
              className="absolute top-6 right-6 text-[#8A94A6] hover:text-[#0F172A] transition-all"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* INSIGHTS */}
        <div
          className="lg:col-span-3 rounded-[32px] p-6 text-white flex flex-col justify-between min-h-[350px] shadow-[0_15px_35px_rgba(239,68,68,0.15)] relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 50%, #06B6D4 100%)' }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full filter blur-xl transform translate-x-8 -translate-y-8 pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/25 rounded-full px-3.5 py-1 text-[10px] font-bold backdrop-blur-sm tracking-wide">
              💡 Insights
            </span>
            <h4 className="text-7xl font-extrabold tracking-tighter">{availabilityRate}%</h4>
            <div className="space-y-2">
              <h5 className="text-sm font-bold leading-snug">{insightMsg}</h5>
              <p className="text-white/80 text-[11px] font-medium leading-relaxed">
                {activeCount} de {totalEmployees} colaboradores estão em operação.
                {onVacationCount > 0 ? ` ${onVacationCount} em férias` : ''}
                {onLeaveCount > 0 ? `, ${onLeaveCount} afastados` : ''}.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 relative z-10 mt-6">
            <div className="flex justify-between text-[10px] font-bold text-white/90">
              <span>Disponibilidade geral</span>
              <span>{availabilityRate}%</span>
            </div>
            <div className="w-full bg-white/20 h-1 rounded-full relative overflow-visible">
              <div className="bg-white h-full rounded-full" style={{ width: `${availabilityRate}%` }}></div>
              <div
                className="w-2.5 h-2.5 bg-white rounded-full absolute top-1/2 -translate-y-1/2 shadow-md"
                style={{ left: `calc(${availabilityRate}% - 5px)` }}
              ></div>
            </div>
          </div>
        </div>

      </div>
      {/* WIDGETS PERSONALIZADOS */}
      <WidgetGrid
        activeWidgets={activeWidgets}
        data={{ employees, vacationRequests, absenceRecords, cells, alerts }}
        onRemove={removeWidget}
      />

      {/* MODAL DE SELEÇÃO DE WIDGETS */}
      <WidgetCatalogModal
        open={modalOpen}
        activeWidgets={activeWidgets}
        onClose={() => setModalOpen(false)}
        onToggle={toggleWidget}
      />

    </div>
  );
};
