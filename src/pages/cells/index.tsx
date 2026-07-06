import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getCells, saveCell } from '../../services/databaseServices';
import type { ProductionCell, CellStatus, ShiftType } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { Plus, Save, X } from 'lucide-react';

export const CellsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit / Create fields
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [processType, setProcessType] = useState('');
  const [nominalCap, setNominalCap] = useState(5);
  const [realCap, setRealCap] = useState(5);
  const [minOp, setMinOp] = useState(3);
  const [maxVac, setMaxVac] = useState(1);
  const [isCritical, setIsCritical] = useState(false);
  const [activeShifts, setActiveShifts] = useState<ShiftType[]>(['morning', 'afternoon']);
  const [status, setStatus] = useState<CellStatus>('active');

  const loadCells = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getCells(currentUser);
      setCells(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCells();
  }, [currentUser]);

  const handleOpenNew = () => {
    setEditId(null);
    setName('');
    setProcessType('');
    setNominalCap(5);
    setRealCap(5);
    setMinOp(3);
    setMaxVac(1);
    setIsCritical(false);
    setActiveShifts(['morning', 'afternoon']);
    setStatus('active');
    setIsOpen(true);
    setError(null);
  };

  const handleOpenEdit = (cell: ProductionCell) => {
    setEditId(cell.id);
    setName(cell.name);
    setProcessType(cell.process_type);
    setNominalCap(cell.nominal_capacity);
    setRealCap(cell.real_capacity);
    setMinOp(cell.minimum_operators);
    setMaxVac(cell.max_vacations_allowed);
    setIsCritical(cell.is_critical);
    setActiveShifts(cell.active_shifts);
    setStatus(cell.status);
    setIsOpen(true);
    setError(null);
  };

  const handleToggleShift = (shift: ShiftType) => {
    if (activeShifts.includes(shift)) {
      setActiveShifts(activeShifts.filter(s => s !== shift));
    } else {
      setActiveShifts([...activeShifts, shift]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    const cellObj = {
      name,
      process_type: processType,
      nominal_capacity: Number(nominalCap),
      real_capacity: Number(realCap),
      active_shifts: activeShifts,
      expected_output_per_day: Number(nominalCap) * 100, // Heurística padrão
      is_critical: isCritical,
      minimum_operators: Number(minOp),
      max_vacations_allowed: Number(maxVac),
      status,
      company_id: currentUser.company_id,
      business_unit_id: currentUser.business_unit_ids[0] || 'bu_industrial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await saveCell(editId ? { ...cellObj, id: editId } : cellObj, currentUser);
      setIsOpen(false);
      loadCells();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar dados da célula. Verifique seus privilégios.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: "Nome da Célula",
      accessor: (row: ProductionCell) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
            row.is_critical ? 'bg-[#FFE6EE] text-[#E04F6F]' : 'bg-[#DDFBF5] text-[#0EAD98]'
          }`}>
            {row.name.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#0F172A]">{row.name}</p>
            <p className="text-[10px] text-[#8A94A6]">{row.process_type}</p>
          </div>
        </div>
      ),
      sortable: true,
      sortKey: "name"
    },
    {
      header: "Capacidade Nominal",
      accessor: (row: ProductionCell) => `${row.nominal_capacity} operadores`
    },
    {
      header: "Operadores Mínimo",
      accessor: (row: ProductionCell) => (
        <span className="font-semibold text-slate-700">{row.minimum_operators}</span>
      )
    },
    {
      header: "Férias Permitidas (Max)",
      accessor: (row: ProductionCell) => `${row.max_vacations_allowed} simultâneo`
    },
    {
      header: "Criticidade",
      accessor: (row: ProductionCell) => (
        row.is_critical ? (
          <span className="inline-flex items-center gap-1 text-[10px] bg-[#FFE6EE] text-[#E04F6F] font-bold px-2 py-0.5 rounded-full">
            ⚠️ CRÍTICA
          </span>
        ) : (
          <span className="text-[10px] text-[#8A94A6] font-medium">Padrão</span>
        )
      )
    },
    {
      header: "Turnos Ativos",
      accessor: (row: ProductionCell) => (
        <div className="flex gap-1">
          {row.active_shifts.map(s => (
            <span key={s} className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
              {s.substring(0, 3)}
            </span>
          ))}
        </div>
      )
    },
    {
      header: "Status",
      accessor: (row: ProductionCell) => <RiskBadge level={row.status} />
    }
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Células Produtivas</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Cadastro de células físicas da fábrica, definindo limites de capacidade segura e criticidade de processos.
          </p>
        </div>
        {currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) && (
          <button 
            onClick={handleOpenNew}
            className="premium-button-primary shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Criar Célula</span>
          </button>
        )}
      </div>

      {/* LISTA */}
      <DataTable 
        columns={columns}
        data={cells}
        loading={loading}
        onRowClick={currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) ? handleOpenEdit : undefined}
        emptyMessage="Nenhuma célula cadastrada. Clique em Criar Célula."
      />

      {/* DRAWER / MODAL FORM */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="w-full max-w-md bg-white h-screen shadow-2xl relative z-50 flex flex-col justify-between border-l border-[#E8ECF2] animate-in slide-in-from-right duration-250">
            {/* Header Drawer */}
            <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-sm">
                {editId ? 'Editar Célula Produtiva' : 'Nova Célula Produtiva'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-[#8A94A6] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F6F8FB]">
                <X size={16} />
              </button>
            </div>

            {/* Form Drawer */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-3 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome da Célula</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Célula de Corte Laser"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Tipo de Processo</label>
                <input
                  type="text"
                  required
                  value={processType}
                  onChange={(e) => setProcessType(e.target.value)}
                  placeholder="Ex: Corte, Soldagem, Estamparia"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Capacidade Nominal</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={nominalCap}
                    onChange={(e) => setNominalCap(Number(e.target.value))}
                    className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Operadores Mínimos</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={minOp}
                    onChange={(e) => setMinOp(Number(e.target.value))}
                    className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Férias Simultâneas Permitidas</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={maxVac}
                  onChange={(e) => setMaxVac(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              {/* CHECKBOX CRITICIDADE */}
              <div className="flex items-center gap-3 p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
                <input
                  type="checkbox"
                  id="is_critical"
                  checked={isCritical}
                  onChange={(e) => setIsCritical(e.target.checked)}
                  className="w-4 h-4 text-[#6254E8] bg-[#F6F8FB] border-[#E8ECF2] rounded focus:ring-2 focus:ring-[#6254E8]"
                />
                <label htmlFor="is_critical" className="text-xs font-semibold text-[#0F172A] select-none cursor-pointer flex flex-col">
                  <span>Célula Crítica</span>
                  <span className="text-[9px] text-[#8A94A6] font-normal">Exige alertas mais rígidos de capacidade</span>
                </label>
              </div>

              {/* MULTI-SELECT TURNOS */}
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Turnos Ativos</label>
                <div className="flex gap-2">
                  {(['morning', 'afternoon', 'night'] as ShiftType[]).map(s => {
                    const active = activeShifts.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handleToggleShift(s)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold border uppercase transition-all ${
                          active 
                            ? 'bg-[#6254E8] text-white border-[#6254E8]' 
                            : 'bg-white text-[#8A94A6] border-[#E8ECF2] hover:bg-[#F6F8FB]'
                        }`}
                      >
                        {s === 'morning' ? 'Manhã' : s === 'afternoon' ? 'Tarde' : 'Noite'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Status da Célula</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CellStatus)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="active">Em Operação</option>
                  <option value="inactive">Paralisada</option>
                  <option value="maintenance">Manutenção Técnica</option>
                </select>
              </div>
            </form>

            {/* Footer Drawer */}
            <div className="p-6 bg-[#F7F8FC] border-t border-[#E8ECF2] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-10 px-4 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="h-10 px-4 rounded-xl bg-[#6254E8] hover:bg-[#5145CD] text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Save size={14} className="inline mr-1" />
                Salvar Célula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
