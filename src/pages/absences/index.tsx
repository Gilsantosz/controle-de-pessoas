import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getAbsenceRecords, getEmployees, saveAbsenceRecord } from '../../services/databaseServices';
import type { AbsenceRecord, Employee, AbsenceType, AbsenceSubtype } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { Plus, Save, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const AbsencesPage: React.FC = () => {
  const { currentUser } = useAppStore();
  
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [type, setType] = useState<AbsenceType>('absence');
  const [subtype, setSubtype] = useState<AbsenceSubtype>('unjustified');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [absData, empData] = await Promise.all([
        getAbsenceRecords(currentUser),
        getEmployees(currentUser)
      ]);
      setAbsences(absData);
      setEmployees(empData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleOpenNew = () => {
    setSelectedEmpId('');
    setType('absence');
    setSubtype('unjustified');
    setDelayMinutes(0);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setIsOpen(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedEmpId) return;
    setLoading(true);
    setError(null);

    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) {
      setError("Colaborador não localizado.");
      setLoading(false);
      return;
    }

    // Calcular perda de produção baseada no fator de produtividade
    // Padrão: Falta = R$ 400 * prod_rate | Atraso = R$ 1.50 por minuto * prod_rate
    const baseDailyLoss = 400;
    const baseMinuteLoss = 1.5;
    const estimatedLoss = type === 'absence'
      ? Math.round(baseDailyLoss * emp.productivity_rate)
      : Math.round(baseMinuteLoss * delayMinutes * emp.productivity_rate);

    const recordObj = {
      company_id: currentUser.company_id,
      business_unit_id: currentUser.business_unit_ids[0] || 'bu_industrial',
      cell_id: emp.cell_id,
      team_id: emp.team_id,
      employee_id: selectedEmpId,
      employee_name: emp.name,
      employee_registration: emp.registration,
      type,
      subtype,
      delay_minutes: type === 'delay' ? Number(delayMinutes) : 0,
      date,
      notes,
      estimated_production_loss: estimatedLoss,
      created_by: currentUser.email,
      created_at: new Date().toISOString()
    };

    try {
      await saveAbsenceRecord(recordObj, currentUser);
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar registro de absenteísmo.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: "Colaborador",
      accessor: (row: AbsenceRecord) => (
        <div>
          <p className="font-bold text-[#0F172A]">{row.employee_name}</p>
          <p className="text-[10px] text-[#8A94A6]">Reg: {row.employee_registration}</p>
        </div>
      ),
      sortable: true,
      sortKey: "employee_name"
    },
    {
      header: "Data",
      accessor: (row: AbsenceRecord) => format(parseISO(row.date), 'dd/MM/yyyy')
    },
    {
      header: "Tipo",
      accessor: (row: AbsenceRecord) => (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          row.type === 'absence' ? 'bg-[#FFE6EE] text-[#E04F6F]' : 'bg-[#FFF4D6] text-[#B27B00]'
        }`}>
          {row.type === 'absence' ? 'Falta Integral' : `Atraso (${row.delay_minutes} min)`}
        </span>
      )
    },
    {
      header: "Classificação",
      accessor: (row: AbsenceRecord) => <RiskBadge level={row.subtype === 'unjustified' ? 'critical' : (row.subtype === 'justified' ? 'medium' : (row.subtype === 'medical' ? 'leave' : 'low'))} />
    },
    {
      header: "Custo Estimado da Perda",
      accessor: (row: AbsenceRecord) => (
        <span className="font-bold text-[#E04F6F]">R$ {row.estimated_production_loss}</span>
      )
    },
    {
      header: "Observações",
      accessor: "notes" as const
    }
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Registro de Absenteísmo</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Controle operacional de atrasos, faltas justificadas/médicas e cálculo de perda produtiva estimada.
          </p>
        </div>
        {currentUser && ['admin', 'hr', 'supervisor'].includes(currentUser.role) && (
          <button 
            onClick={handleOpenNew}
            className="premium-button-primary shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Lançar Ocorrência</span>
          </button>
        )}
      </div>

      {/* LISTA */}
      <DataTable 
        columns={columns}
        data={absences}
        loading={loading}
        searchPlaceholder="Buscar por colaborador..."
        searchKey="employee_name"
      />

      {/* DRAWER FORM */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="w-full max-w-md bg-white h-screen shadow-2xl relative z-50 flex flex-col justify-between border-l border-[#E8ECF2] animate-in slide-in-from-right duration-250">
            {/* Header Drawer */}
            <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-sm">Registrar Ocorrência</h3>
              <button onClick={() => setIsOpen(false)} className="text-[#8A94A6] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F6F8FB]">
                <X size={16} />
              </button>
            </div>

            {/* Form Drawer */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Colaborador</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="">Selecione o Colaborador</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.registration})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Data da Ocorrência</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Tipo Ocorrência</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AbsenceType)}
                    className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                  >
                    <option value="absence">Falta Integral</option>
                    <option value="delay">Atraso Parcial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Justificativa</label>
                  <select
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value as AbsenceSubtype)}
                    className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                  >
                    <option value="unjustified">Injustificado (Desconto)</option>
                    <option value="justified">Justificado</option>
                    <option value="medical">Atestado Médico</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
              </div>

              {type === 'delay' && (
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Minutos de Atraso</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Notas / Detalhes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais da ocorrência..."
                  rows={4}
                  className="w-full p-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] resize-none transition-all"
                />
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
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
