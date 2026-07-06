import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getTeams, getCells, getUsersList, saveTeam } from '../../services/databaseServices';
import type { Team, ProductionCell, UserProfile, ShiftType } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { Plus, Save, GitBranch, X } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cellId, setCellId] = useState('');
  const [shift, setShift] = useState<ShiftType>('morning');
  const [description, setDescription] = useState('');
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [teamsData, cellsData, usersData] = await Promise.all([
        getTeams(currentUser),
        getCells(currentUser),
        getUsersList(currentUser)
      ]);
      setTeams(teamsData);
      setCells(cellsData);
      // Filtrar apenas usuários com papel de supervisor
      setSupervisors(usersData.filter(u => u.role === 'supervisor'));
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
    setEditId(null);
    setName('');
    setCellId('');
    setShift('morning');
    setDescription('');
    setSelectedSupervisors([]);
    setStatus('active');
    setIsOpen(true);
    setError(null);
  };

  const handleOpenEdit = (team: Team) => {
    setEditId(team.id);
    setName(team.name);
    setCellId(team.cell_id);
    setShift(team.shift);
    setDescription(team.description || '');
    setSelectedSupervisors(team.supervisor_ids || []);
    setStatus(team.status);
    setIsOpen(true);
    setError(null);
  };

  const handleToggleSupervisor = (supId: string) => {
    if (selectedSupervisors.includes(supId)) {
      setSelectedSupervisors(selectedSupervisors.filter(id => id !== supId));
    } else {
      setSelectedSupervisors([...selectedSupervisors, supId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    const teamObj = {
      company_id: currentUser.company_id,
      business_unit_id: currentUser.business_unit_ids[0] || 'bu_industrial',
      cell_id: cellId,
      name,
      description,
      shift,
      supervisor_ids: selectedSupervisors,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await saveTeam(editId ? { ...teamObj, id: editId } : teamObj, currentUser);
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar equipe. Verifique suas permissões.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: "Nome da Equipe",
      accessor: (row: Team) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#6254E8] flex items-center justify-center font-bold">
            <GitBranch size={16} />
          </div>
          <div>
            <p className="font-bold text-[#0F172A]">{row.name}</p>
            <p className="text-[10px] text-[#8A94A6]">{row.description}</p>
          </div>
        </div>
      ),
      sortable: true,
      sortKey: "name"
    },
    {
      header: "Célula Vinculada",
      accessor: (row: Team) => {
        const cell = cells.find(c => c.id === row.cell_id);
        return cell ? cell.name : 'Nenhuma';
      }
    },
    {
      header: "Turno",
      accessor: (row: Team) => (
        <span className="capitalize font-semibold text-slate-700">
          {row.shift === 'morning' ? 'Manhã' : row.shift === 'afternoon' ? 'Tarde' : row.shift === 'night' ? 'Noite' : 'Administrativo'}
        </span>
      )
    },
    {
      header: "Supervisores Responsáveis",
      accessor: (row: Team) => {
        const sups = supervisors.filter(s => row.supervisor_ids?.includes(s.uid));
        if (sups.length === 0) return <span className="text-slate-400">Sem supervisor</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {sups.map(s => (
              <span key={s.uid} className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                {s.name}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: "Status",
      accessor: (row: Team) => <RiskBadge level={row.status} />
    }
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Equipes</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Gestão de grupos e equipes de operadores industriais, vinculação de turnos e múltiplos supervisores.
          </p>
        </div>
        {currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) && (
          <button 
            onClick={handleOpenNew}
            className="premium-button-primary shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Criar Equipe</span>
          </button>
        )}
      </div>

      {/* LISTA */}
      <DataTable 
        columns={columns}
        data={teams}
        loading={loading}
        onRowClick={currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) ? handleOpenEdit : undefined}
        emptyMessage="Nenhuma equipe cadastrada. Clique em Criar Equipe."
      />

      {/* DRAWER / MODAL FORM */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="w-full max-w-md bg-white h-screen shadow-2xl relative z-50 flex flex-col justify-between border-l border-[#E8ECF2] animate-in slide-in-from-right duration-250">
            {/* Header Drawer */}
            <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-sm">
                {editId ? 'Editar Equipe' : 'Nova Equipe'}
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
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome da Equipe</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Laser — Turno 1"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Célula Produtiva Vinculada</label>
                <select
                  required
                  value={cellId}
                  onChange={(e) => setCellId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="">Selecione uma Célula</option>
                  {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Turno Operacional</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="morning">Manhã</option>
                  <option value="afternoon">Tarde</option>
                  <option value="night">Noite</option>
                  <option value="administrative">Administrativo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Descrição / Detalhes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações adicionais..."
                  rows={3}
                  className="w-full p-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] resize-none transition-all"
                />
              </div>

              {/* SELEÇÃO MÚLTIPLA DE SUPERVISORES */}
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Supervisores Responsáveis</label>
                <div className="border border-[#E8ECF2] rounded-2xl divide-y divide-[#F6F8FB] max-h-48 overflow-y-auto">
                  {supervisors.length === 0 ? (
                    <p className="p-4 text-xs text-[#8A94A6] text-center">Nenhum supervisor cadastrado no sistema.</p>
                  ) : (
                    supervisors.map(sup => {
                      const isSelected = selectedSupervisors.includes(sup.uid);
                      return (
                        <div 
                          key={sup.uid}
                          onClick={() => handleToggleSupervisor(sup.uid)}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#F7F8FC]/50 transition-all"
                        >
                          <span className="text-xs text-[#0F172A] font-semibold">{sup.name}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 text-[#6254E8] rounded border-[#E8ECF2]"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Status da Equipe</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
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
                Salvar Equipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
