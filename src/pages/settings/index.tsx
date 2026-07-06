import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getBlockedPeriods, saveBlockedPeriod, getSettings, saveSettings, getCells } from '../../services/databaseServices';
import type { BlockedPeriod, SystemSettings, BlockType, ProductionCell } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { Plus, Save, Calendar, X, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const SettingsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings states
  const [compName, setCompName] = useState('VacationPro Corp');
  const [minDays, setMinDays] = useState(5);
  const [warnMonths, setWarnMonths] = useState(3);
  const [riskLow, setRiskLow] = useState(85);
  const [riskMed, setRiskMed] = useState(70);

  // Blocked period form states
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockType, setBlockType] = useState<BlockType>('peak_production');
  const [blockCells, setBlockCells] = useState<string[]>([]);

  const loadSettingsData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [blockData, cellData, settingsData] = await Promise.all([
        getBlockedPeriods(currentUser),
        getCells(currentUser),
        getSettings(currentUser.company_id)
      ]);
      setBlockedPeriods(blockData);
      setCells(cellData);
      if (settingsData) {
        setCompName(settingsData.company_name);
        setMinDays(settingsData.vacation_rules.min_days_per_period);
        setWarnMonths(settingsData.vacation_rules.concession_warning_months);
        setRiskLow(settingsData.risk_thresholds.low);
        setRiskMed(settingsData.risk_thresholds.medium);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, [currentUser]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    const newSettings: SystemSettings = {
      company_name: compName,
      business_unit: 'Divisão Industrial',
      default_weekly_hours: 44,
      default_vacation_days: 30,
      vacation_rules: {
        min_days_per_period: Number(minDays),
        max_periods_split: 3,
        allow_anticipation: true,
        concession_warning_months: Number(warnMonths)
      },
      risk_thresholds: {
        low: Number(riskLow),
        medium: Number(riskMed),
        high: 55
      },
      approval_rules: {
        levels_required: 2,
        require_reason_for_override: true
      },
      notification_rules: {
        alert_on_critical_capacity: true,
        notify_supervisor_on_absence: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await saveSettings(currentUser.company_id, newSettings, currentUser);
      alert('Configurações globais salvas com sucesso!');
      loadSettingsData();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    const newBlock = {
      name: blockName,
      reason: blockReason,
      start_date: blockStart,
      end_date: blockEnd,
      cell_ids: blockCells,
      block_type: blockType,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await saveBlockedPeriod(newBlock, currentUser);
      setBlockName('');
      setBlockReason('');
      setBlockStart('');
      setBlockEnd('');
      setBlockCells([]);
      setShowBlockForm(false);
      loadSettingsData();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar período bloqueado.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCell = (cellId: string) => {
    if (blockCells.includes(cellId)) {
      setBlockCells(blockCells.filter(id => id !== cellId));
    } else {
      setBlockCells([...blockCells, cellId]);
    }
  };

  const blockColumns = [
    {
      header: "Bloqueio / Motivo",
      accessor: (row: BlockedPeriod) => (
        <div>
          <p className="font-bold text-[#0F172A]">{row.name}</p>
          <p className="text-[10px] text-[#8A94A6]">{row.reason}</p>
        </div>
      )
    },
    {
      header: "Tipo",
      accessor: (row: BlockedPeriod) => (
        <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
          {row.block_type === 'inventory' ? 'Inventário' : row.block_type === 'maintenance' ? 'Manutenção' : 'Produção'}
        </span>
      )
    },
    {
      header: "Período",
      accessor: (row: BlockedPeriod) => (
        <span className="font-semibold text-slate-700">
          {format(parseISO(row.start_date), 'dd/MM/yyyy')} até {format(parseISO(row.end_date), 'dd/MM/yyyy')}
        </span>
      )
    },
    {
      header: "Células Afetadas",
      accessor: (row: BlockedPeriod) => {
        if (row.cell_ids.length === 0) return <span className="text-[10px] text-[#0EAD98] font-bold">TODAS AS CÉLULAS</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {row.cell_ids.map(cId => {
              const cell = cells.find(c => c.id === cId);
              return (
                <span key={cId} className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {cell ? cell.name : cId}
                </span>
              );
            })}
          </div>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando painel de parametrização...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Configurações Gerais</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Parametrização de regras de férias, limites de risco de capacidade produtiva e bloqueio de calendários operacionais.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* FORMULÁRIO CONFIGURAÇÕES */}
      <form onSubmit={handleSaveSettings} className="bg-white premium-card p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F6F8FB]">
          <Settings size={18} className="text-[#6254E8]" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Configurações de Regras Industriais</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome da Empresa</label>
            <input
              type="text"
              required
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Mínimo de Dias por Período de Férias</label>
            <input
              type="number"
              required
              min="5"
              value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))}
              className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Aviso de Concessão de Férias (Meses Antecedência)</label>
            <input
              type="number"
              required
              min="1"
              value={warnMonths}
              onChange={(e) => setWarnMonths(Number(e.target.value))}
              className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Limite Risco Baixo (%)</label>
              <input
                type="number"
                required
                value={riskLow}
                onChange={(e) => setRiskLow(Number(e.target.value))}
                className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Limite Risco Médio (%)</label>
              <input
                type="number"
                required
                value={riskMed}
                onChange={(e) => setRiskMed(Number(e.target.value))}
                className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#F6F8FB]">
          <button type="submit" className="premium-button-primary">
            <Save size={16} />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>

      {/* SEÇÃO PERÍODOS BLOQUEADOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#6254E8]" />
            <h3 className="text-sm font-semibold text-[#0F172A]">Períodos Bloqueados do Calendário</h3>
          </div>
          
          <button 
            onClick={() => setShowBlockForm(true)}
            className="premium-button-secondary h-10"
          >
            <Plus size={14} />
            <span>Bloquear Período</span>
          </button>
        </div>

        <DataTable 
          columns={blockColumns}
          data={blockedPeriods}
          loading={loading}
          emptyMessage="Nenhum período de bloqueio no calendário operacional."
        />
      </div>

      {/* MODAL CADASTRAR BLOQUEIO */}
      {showBlockForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm" onClick={() => setShowBlockForm(false)} />
          
          <form onSubmit={handleAddBlockedPeriod} className="bg-white rounded-3xl border border-[#E8ECF2] shadow-2xl max-w-md w-full overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-sm">Bloquear Período Operacional</h3>
              <button type="button" onClick={() => setShowBlockForm(false)} className="text-[#8A94A6] hover:text-[#0F172A] p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[400px]">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome do Evento / Bloqueio</label>
                <input
                  type="text"
                  required
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                  placeholder="Ex: Parada Preventiva de Natal"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Motivo do Bloqueio</label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Manutenção de robôs de solda."
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Início</label>
                  <input
                    type="date"
                    required
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Término</label>
                  <input
                    type="date"
                    required
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Tipo do Bloqueio</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as BlockType)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="peak_production">Pico de Produção Industrial</option>
                  <option value="inventory">Inventário Físico de Fábrica</option>
                  <option value="maintenance">Parada Técnica de Manutenção</option>
                  <option value="collective_vacation">Férias Coletivas Obrigatórias</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              {/* SELEÇÃO DE CÉLULAS AFETADAS */}
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Aplicar a Células Específicas (Vazio = Todas)</label>
                <div className="border border-[#E8ECF2] rounded-2xl divide-y divide-[#F6F8FB] max-h-36 overflow-y-auto">
                  {cells.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => handleToggleCell(c.id)}
                      className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#F7F8FC]/50 text-xs font-semibold text-[#0F172A]"
                    >
                      <span>{c.name}</span>
                      <input
                        type="checkbox"
                        checked={blockCells.includes(c.id)}
                        readOnly
                        className="w-4 h-4 text-[#6254E8] rounded border-[#E8ECF2]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#F7F8FC] border-t border-[#E8ECF2] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBlockForm(false)}
                className="h-10 px-4 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-[#6254E8] hover:bg-[#5145CD] text-white text-xs font-semibold shadow-sm"
              >
                Bloquear Período
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
