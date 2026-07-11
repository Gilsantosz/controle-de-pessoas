import React, { useState, useEffect } from 'react';
import {
  X, LayoutGrid, Users, Calendar, UserMinus,
  Activity, CheckSquare, Shield
} from 'lucide-react';
import type { Employee, VacationRequest, AbsenceRecord, ProductionCell, Alert } from '../../types';

/* ──────────────────────────────────────────────────────────── */
/* TIPOS                                                         */
/* ──────────────────────────────────────────────────────────── */

export type WidgetId =
  | 'headcount_summary'
  | 'vacation_rate'
  | 'absence_heatmap'
  | 'cell_status'
  | 'approval_funnel'
  | 'alert_summary';

export interface WidgetData {
  employees: Employee[];
  vacationRequests: VacationRequest[];
  absenceRecords: AbsenceRecord[];
  cells: ProductionCell[];
  alerts: Alert[];
}

/* ──────────────────────────────────────────────────────────── */
/* CATÁLOGO DE WIDGETS                                          */
/* ──────────────────────────────────────────────────────────── */

const WIDGET_CATALOG: { id: WidgetId; label: string; description: string; icon: React.FC<{ size?: number }> }[] = [
  {
    id: 'headcount_summary',
    label: 'Headcount',
    description: 'Total de colaboradores por status em tempo real.',
    icon: Users,
  },
  {
    id: 'vacation_rate',
    label: 'Taxa de Férias',
    description: 'Percentual de colaboradores em férias vs ativos.',
    icon: Calendar,
  },
  {
    id: 'absence_heatmap',
    label: 'Faltas Recentes',
    description: 'Volume de faltas/ausências nos últimos 6 meses.',
    icon: UserMinus,
  },
  {
    id: 'cell_status',
    label: 'Células Produtivas',
    description: 'Status operacional das células de produção.',
    icon: Activity,
  },
  {
    id: 'approval_funnel',
    label: 'Funil de Aprovações',
    description: 'Taxa de aprovação de solicitações de férias.',
    icon: CheckSquare,
  },
  {
    id: 'alert_summary',
    label: 'Alertas do Sistema',
    description: 'Resumo de alertas críticos e ativos.',
    icon: Shield,
  },
];

/* ──────────────────────────────────────────────────────────── */
/* MODAL DE SELEÇÃO                                             */
/* ──────────────────────────────────────────────────────────── */

interface WidgetCatalogModalProps {
  open: boolean;
  activeWidgets: WidgetId[];
  onClose: () => void;
  onToggle: (id: WidgetId) => void;
}

export const WidgetCatalogModal: React.FC<WidgetCatalogModalProps> = ({
  open, activeWidgets, onClose, onToggle,
}) => {
  if (!open) return null;

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* PAINEL */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-[#E8ECF2] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <LayoutGrid size={16} className="text-[#6254E8]" />
              Biblioteca de Widgets
            </h3>
            <p className="text-[10px] text-[#8A94A6] mt-0.5">Ative ou desative widgets no dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A94A6] hover:text-[#0F172A] hover:bg-[#F6F8FB] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {WIDGET_CATALOG.map((w) => {
            const Icon = w.icon;
            const active = activeWidgets.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => onToggle(w.id)}
                className={`w-full text-left rounded-2xl p-4 border transition-all ${
                  active
                    ? 'border-[#6254E8] bg-[#F0EEFF] shadow-sm'
                    : 'border-[#E8ECF2] bg-white hover:border-[#6254E8]/40 hover:bg-[#F6F8FB]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-[#6254E8] text-white' : 'bg-[#F6F8FB] text-[#5A6A85]'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#0F172A]">{w.label}</p>
                      {/* Toggle pill */}
                      <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                        active ? 'bg-[#6254E8]' : 'bg-[#E8ECF2]'
                      }`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          active ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </div>
                    <p className="text-[10px] text-[#8A94A6] mt-0.5 leading-snug">{w.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-[#E8ECF2] shrink-0">
          <p className="text-[10px] text-[#8A94A6] text-center">
            {activeWidgets.length} de {WIDGET_CATALOG.length} widgets ativos
          </p>
        </div>
      </div>
    </>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WIDGET: HEADCOUNT SUMMARY                                    */
/* ──────────────────────────────────────────────────────────── */

const HeadcountWidget: React.FC<{ data: WidgetData; onRemove: () => void }> = ({ data, onRemove }) => {
  const { employees, vacationRequests } = data;
  const todayStr = new Date().toISOString().split('T')[0];
  const onVacIds = new Set(
    vacationRequests
      .filter(r => ['approved', 'completed'].includes(r.status) && r.start_date <= todayStr && r.end_date >= todayStr)
      .map(r => r.employee_id)
  );

  const total    = employees.length;
  const active   = employees.filter(e => e.status === 'active' && !onVacIds.has(e.id)).length;
  const onVac    = employees.filter(e => onVacIds.has(e.id)).length;
  const onLeave  = employees.filter(e => e.status === 'leave').length;
  const inactive = employees.filter(e => e.status === 'inactive').length;

  const rows = [
    { label: 'Ativos',       val: active,   color: '#10B981', bg: '#DDFBF5', text: '#0EAD98' },
    { label: 'Em Férias',    val: onVac,    color: '#3B82F6', bg: '#EFF6FF', text: '#2563EB' },
    { label: 'Afastados',    val: onLeave,  color: '#F59E0B', bg: '#FFF7ED', text: '#B45309' },
    { label: 'Inativos',     val: inactive, color: '#8A94A6', bg: '#F6F8FB', text: '#5A6A85' },
  ];

  return (
    <WidgetCard title="Headcount" icon={Users} onRemove={onRemove}>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-extrabold text-[#0F172A]">{total}</span>
        <span className="text-xs text-[#8A94A6] font-semibold">colaboradores</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full`} style={{ background: r.bg, color: r.text }}>
              {r.val}
            </span>
            <div className="flex-1 h-1.5 bg-[#F6F8FB] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${total > 0 ? (r.val / total) * 100 : 0}%`, background: r.color }}
              />
            </div>
            <span className="text-[10px] text-[#8A94A6] font-semibold w-14 text-right">{r.label}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WIDGET: TAXA DE FÉRIAS                                       */
/* ──────────────────────────────────────────────────────────── */

const VacationRateWidget: React.FC<{ data: WidgetData; onRemove: () => void }> = ({ data, onRemove }) => {
  const { employees, vacationRequests } = data;
  const todayStr = new Date().toISOString().split('T')[0];
  const onVacIds = new Set(
    vacationRequests
      .filter(r => ['approved', 'completed'].includes(r.status) && r.start_date <= todayStr && r.end_date >= todayStr)
      .map(r => r.employee_id)
  );
  const total  = employees.length;
  const onVac  = employees.filter(e => onVacIds.has(e.id)).length;
  const rate   = total > 0 ? Math.round((onVac / total) * 100) : 0;
  const pending = vacationRequests.filter(r => r.status === 'pending').length;

  // Arco SVG
  const r = 52, cx = 64, cy = 64;
  const circumference = 2 * Math.PI * r;
  const dash = (rate / 100) * circumference;

  return (
    <WidgetCard title="Taxa de Férias" icon={Calendar} onRemove={onRemove}>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0EEFF" strokeWidth="14" />
            <circle
              cx={cx} cy={cy} r={r} fill="none"
              stroke="#6254E8" strokeWidth="14"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-[#0F172A]">{rate}%</span>
            <span className="text-[9px] text-[#8A94A6] font-bold">de férias</span>
          </div>
        </div>
        {/* Métricas */}
        <div className="space-y-3 flex-1">
          <div>
            <p className="text-[10px] text-[#8A94A6] font-semibold">Em férias agora</p>
            <p className="text-lg font-extrabold text-[#6254E8]">{onVac}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8A94A6] font-semibold">Pendentes</p>
            <p className="text-lg font-extrabold text-[#F59E0B]">{pending}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8A94A6] font-semibold">Total equipe</p>
            <p className="text-lg font-extrabold text-[#0F172A]">{total}</p>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WIDGET: FALTAS RECENTES                                      */
/* ──────────────────────────────────────────────────────────── */

const AbsenceHeatmapWidget: React.FC<{ data: WidgetData; onRemove: () => void }> = ({ data, onRemove }) => {
  const { absenceRecords } = data;
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      count: absenceRecords.filter(a => a.date?.startsWith(ym)).length,
    };
  });
  const max = Math.max(...months.map(m => m.count), 1);

  return (
    <WidgetCard title="Faltas / Ausências" icon={UserMinus} onRemove={onRemove}>
      <div className="space-y-2">
        {months.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <span className="text-[10px] text-[#8A94A6] font-bold w-8 capitalize">{m.label}</span>
            <div className="flex-1 h-5 bg-[#F6F8FB] rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(8, (m.count / max) * 100)}%`,
                  background: m.count === 0 ? '#E8ECF2' : m.count < max * 0.4 ? '#DDFBF5' : m.count < max * 0.7 ? '#FFF4D6' : '#FFE6EE',
                }}
              >
                {m.count > 0 && (
                  <span className="text-[9px] font-bold" style={{ color: m.count < max * 0.4 ? '#0EAD98' : m.count < max * 0.7 ? '#B27B00' : '#E04F6F' }}>
                    {m.count}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-[#8A94A6] mt-3 font-semibold">
        Total nos últimos 6 meses: <strong className="text-[#0F172A]">{months.reduce((s, m) => s + m.count, 0)}</strong>
      </p>
    </WidgetCard>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WIDGET: CÉLULAS PRODUTIVAS                                   */
/* ──────────────────────────────────────────────────────────── */

const CellStatusWidget: React.FC<{ data: WidgetData; onRemove: () => void }> = ({ data, onRemove }) => {
  const { cells } = data;
  const active   = cells.filter(c => c.status === 'active').length;
  const inactive = cells.filter(c => c.status === 'inactive').length;
  const total    = cells.length;
  const rate     = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <WidgetCard title="Células Produtivas" icon={Activity} onRemove={onRemove}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="text-2xl font-extrabold text-[#0F172A]">{active}<span className="text-sm text-[#8A94A6] font-semibold ml-1">/ {total}</span></p>
          <p className="text-[10px] text-[#8A94A6] font-semibold mt-0.5">células ativas</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rate >= 70 ? 'bg-[#DDFBF5] text-[#0EAD98]' : rate >= 40 ? 'bg-[#FFF4D6] text-[#B27B00]' : 'bg-[#FFE6EE] text-[#E04F6F]'}`}>
          {rate}% ativas
        </span>
      </div>

      {cells.length === 0 ? (
        <p className="text-[10px] text-[#8A94A6] text-center py-4">Nenhuma célula cadastrada</p>
      ) : (
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
          {cells.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-[#F6F8FB] last:border-0">
              <span className="text-[10px] font-bold text-[#0F172A] truncate max-w-[140px]">{c.name}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-[#DDFBF5] text-[#0EAD98]' : 'bg-[#F6F8FB] text-[#8A94A6]'}`}>
                {c.status === 'active' ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          ))}
          {cells.length > 5 && (
            <p className="text-[9px] text-[#8A94A6] text-center pt-1">+{cells.length - 5} mais</p>
          )}
        </div>
      )}

      {inactive > 0 && (
        <div className="mt-3 bg-[#FFF4D6] rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-[#B27B00] text-[10px] font-bold">⚠️ {inactive} célula{inactive > 1 ? 's' : ''} inativa{inactive > 1 ? 's' : ''}</span>
        </div>
      )}
    </WidgetCard>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WIDGET: FUNIL DE APROVAÇÕES                                  */
/* ──────────────────────────────────────────────────────────── */

const ApprovalFunnelWidget: React.FC<{ data: WidgetData; onRemove: () => void }> = ({ data, onRemove }) => {
  const { vacationRequests } = data;
  const total    = vacationRequests.length;
  const approved = vacationRequests.filter(r => ['approved', 'completed'].includes(r.status)).length;
  const pending  = vacationRequests.filter(r => r.status === 'pending').length;
  const rejected = vacationRequests.filter(r => r.status === 'rejected').length;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const bars = [
    { label: 'Aprovadas',  val: approved, pct: pct(approved), color: '#10B981', bg: '#DDFBF5', text: '#0EAD98' },
    { label: 'Pendentes',  val: pending,  pct: pct(pending),  color: '#F59E0B', bg: '#FFF4D6', text: '#B27B00' },
    { label: 'Recusadas',  val: rejected, pct: pct(rejected), color: '#E04F6F', bg: '#FFE6EE', text: '#E04F6F' },
  ];

  return (
    <WidgetCard title="Funil de Aprovações" icon={CheckSquare} onRemove={onRemove}>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-2xl font-extrabold text-[#0F172A]">{total}</span>
        <span className="text-xs text-[#8A94A6] font-semibold">solicitações</span>
      </div>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-bold text-[#8A94A6]">{b.label}</span>
              <span className="text-[10px] font-bold" style={{ color: b.text }}>
                {b.val} ({b.pct}%)
              </span>
            </div>
            <div className="w-full h-2 bg-[#F6F8FB] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${b.pct}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="text-[10px] text-[#8A94A6] text-center py-4">Nenhuma solicitação encontrada</p>
      )}
    </WidgetCard>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WIDGET: ALERTAS DO SISTEMA                                   */
/* ──────────────────────────────────────────────────────────── */

const AlertSummaryWidget: React.FC<{ data: WidgetData; onRemove: () => void }> = ({ data, onRemove }) => {
  const { alerts } = data;
  const critical    = alerts.filter(a => a.alert_level === 'critical'    && a.status === 'active').length;
  const high        = alerts.filter(a => a.alert_level === 'warning'     && a.status === 'active').length;
  const medium      = alerts.filter(a => a.alert_level === 'operational' && a.status === 'active').length;
  const totalActive = alerts.filter(a => a.status === 'active').length;

  return (
    <WidgetCard title="Alertas do Sistema" icon={Shield} onRemove={onRemove}>
      {totalActive === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="w-10 h-10 rounded-full bg-[#DDFBF5] flex items-center justify-center">
            <Shield size={18} className="text-[#0EAD98]" />
          </div>
          <p className="text-[10px] font-bold text-[#0EAD98]">Sistema sem alertas ativos</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-extrabold text-[#E04F6F]">{totalActive}</span>
            <span className="text-xs text-[#8A94A6] font-semibold">alertas ativos</span>
          </div>
          <div className="space-y-2.5">
            {[
        { label: 'Crítico',     val: critical, bg: '#FFE6EE', text: '#E04F6F' },
            { label: 'Aviso',     val: high,     bg: '#FFF4D6', text: '#B27B00' },
            { label: 'Operacional', val: medium,   bg: '#EFF6FF', text: '#2563EB' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: row.bg }}>
                <span className="text-[10px] font-bold" style={{ color: row.text }}>{row.label}</span>
                <span className="text-sm font-extrabold" style={{ color: row.text }}>{row.val}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* WRAPPER CARD REUTILIZÁVEL                                    */
/* ──────────────────────────────────────────────────────────── */

const WidgetCard: React.FC<{
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  onRemove: () => void;
  children: React.ReactNode;
}> = ({ title, icon: Icon, onRemove, children }) => (
  <div className="bg-white rounded-[24px] border border-[#E8ECF2]/50 shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-5 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 relative group">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#F0EEFF] flex items-center justify-center">
          <Icon size={14} className="text-[#6254E8]" />
        </div>
        <span className="text-xs font-bold text-[#0F172A]">{title}</span>
      </div>
      {/* Botão remover - aparece no hover */}
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-[#FFE6EE] flex items-center justify-center text-[#E04F6F] hover:bg-[#E04F6F] hover:text-white transition-all"
        title="Remover widget"
      >
        <X size={12} />
      </button>
    </div>
    {children}
  </div>
);

/* ──────────────────────────────────────────────────────────── */
/* COMPONENTE PRINCIPAL: GRADE DE WIDGETS                       */
/* ──────────────────────────────────────────────────────────── */

interface WidgetGridProps {
  activeWidgets: WidgetId[];
  data: WidgetData;
  onRemove: (id: WidgetId) => void;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({ activeWidgets, data, onRemove }) => {
  if (activeWidgets.length === 0) return null;

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'headcount_summary': return <HeadcountWidget   key={id} data={data} onRemove={() => onRemove(id)} />;
      case 'vacation_rate':     return <VacationRateWidget key={id} data={data} onRemove={() => onRemove(id)} />;
      case 'absence_heatmap':   return <AbsenceHeatmapWidget key={id} data={data} onRemove={() => onRemove(id)} />;
      case 'cell_status':       return <CellStatusWidget   key={id} data={data} onRemove={() => onRemove(id)} />;
      case 'approval_funnel':   return <ApprovalFunnelWidget key={id} data={data} onRemove={() => onRemove(id)} />;
      case 'alert_summary':     return <AlertSummaryWidget  key={id} data={data} onRemove={() => onRemove(id)} />;
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-[#E8ECF2]" />
        <span className="text-[10px] text-[#8A94A6] font-bold uppercase tracking-widest flex items-center gap-1.5">
          <LayoutGrid size={10} />
          Widgets Personalizados
        </span>
        <div className="h-px flex-1 bg-[#E8ECF2]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeWidgets.map(id => renderWidget(id))}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* HOOK: GERENCIAR WIDGETS COM PERSISTÊNCIA                     */
/* ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'vp_dashboard_widgets';
const DEFAULT_WIDGETS: WidgetId[] = [];

export function useWidgets() {
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWidgets));
  }, [activeWidgets]);

  const toggleWidget = (id: WidgetId) => {
    setActiveWidgets(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const removeWidget = (id: WidgetId) => {
    setActiveWidgets(prev => prev.filter(w => w !== id));
  };

  return { activeWidgets, modalOpen, setModalOpen, toggleWidget, removeWidget };
}
