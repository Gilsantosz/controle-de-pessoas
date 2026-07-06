import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  getUsersList, getAllowedEmails, saveAllowedEmail, 
  updateUserProfile, getTeams 
} from '../../services/databaseServices';
import type { UserProfile, AllowedEmail, Team, UserRole, UserStatus } from '../../types';
import { DataTable } from '../../components/tables/DataTable';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { Plus, X, Shield, Users } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { currentUser } = useAppStore();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Whitelist Form states
  const [showAddWhitelist, setShowAddWhitelist] = useState(false);
  const [wEmail, setWEmail] = useState('');
  const [wRole, setWRole] = useState<UserRole>('supervisor');
  const [wCellIds, setWCellIds] = useState<string[]>([]);
  const [wTeamIds, setWTeamIds] = useState<string[]>([]);

  // User Edit Form states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editCellIds, setEditCellIds] = useState<string[]>([]);
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editCanApprove, setEditCanApprove] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [usersData, allowedData, teamsData] = await Promise.all([
        getUsersList(currentUser),
        getAllowedEmails(currentUser),
        getTeams(currentUser)
      ]);
      setUsers(usersData);
      setAllowedEmails(allowedData);
      setTeams(teamsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Whitelist submit
  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const norm = wEmail.toLowerCase().trim();
    if (allowedEmails.some(a => a.normalized_email === norm)) {
      setError('Este e-mail já está autorizado na lista.');
      return;
    }

    const newAllowed = {
      email: wEmail,
      normalized_email: norm,
      role: wRole,
      status: 'active' as const,
      company_id: currentUser.company_id,
      allowed_cell_ids: wCellIds,
      allowed_team_ids: wTeamIds,
      created_at: new Date().toISOString(),
      created_by: currentUser.email,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.email
    };

    try {
      await saveAllowedEmail(newAllowed, currentUser);
      setWEmail('');
      setWCellIds([]);
      setWTeamIds([]);
      setShowAddWhitelist(false);
      loadData();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar autorização de e-mail.');
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditCellIds(user.allowed_cell_ids || []);
    setEditTeamIds(user.allowed_team_ids || []);
    setEditCanApprove(user.can_approve || false);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUser) return;
    setError(null);

    // Regra: Impedir admin de bloquear a si mesmo
    if (selectedUser.uid === currentUser.uid && editStatus === 'blocked') {
      setError('Operação bloqueada: você não pode bloquear seu próprio acesso administrativo.');
      return;
    }

    try {
      const updatedProfile = {
        uid: selectedUser.uid,
        role: editRole,
        status: editStatus,
        allowed_cell_ids: editCellIds,
        allowed_team_ids: editTeamIds,
        can_approve: editCanApprove,
        approval_level: editRole === 'admin' ? 3 : (editRole === 'manager' ? 2 : 1)
      };

      await updateUserProfile(updatedProfile, currentUser);
      setSelectedUser(null);
      loadData();
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar papel do usuário.');
    }
  };

  const handleToggleTeam = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, teamId: string) => {
    if (list.includes(teamId)) {
      setList(list.filter(id => id !== teamId));
    } else {
      setList([...list, teamId]);
    }
  };

  const userColumns = [
    {
      header: "Nome do Usuário",
      accessor: (row: UserProfile) => (
        <div>
          <p className="font-bold text-[#0F172A]">{row.name}</p>
          <p className="text-[10px] text-[#8A94A6]">{row.email}</p>
        </div>
      ),
      sortable: true,
      sortKey: "name"
    },
    {
      header: "Nível / Alçada",
      accessor: (row: UserProfile) => (
        <span className="capitalize font-semibold text-slate-700">
          {row.role === 'admin' ? 'Administrador' : row.role === 'hr' ? 'Recursos Humanos' : row.role === 'manager' ? 'Gestão Geral' : row.role === 'supervisor' ? 'Supervisor' : 'Operador'}
        </span>
      )
    },
    {
      header: "Aprova Férias?",
      accessor: (row: UserProfile) => (
        row.can_approve ? (
          <span className="text-[#0EAD98] font-bold text-xs">Sim (Lvl {row.approval_level})</span>
        ) : (
          <span className="text-slate-400 text-xs">Não</span>
        )
      )
    },
    {
      header: "Status",
      accessor: (row: UserProfile) => <RiskBadge level={row.status} />
    }
  ];

  const whitelistColumns = [
    {
      header: "E-mail Autorizado",
      accessor: "email" as const
    },
    {
      header: "Papel Pré-Definido",
      accessor: (row: AllowedEmail) => (
        <span className="capitalize font-semibold text-slate-700">{row.role}</span>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Controle de Usuários e Acessos</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Libere e-mails corporativos autorizados e configure níveis de visualização (ABAC) e aprovação de férias (RBAC).
          </p>
        </div>
        
        <button
          onClick={() => setShowAddWhitelist(true)}
          className="premium-button-primary shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Autorizar E-mail</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* DASHBOARD DUPLO: CONTROLE ATIVOS VS WHITELIST */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* TABELA DE USUÁRIOS ATIVOS */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#6254E8]" />
            <h3 className="text-sm font-semibold text-[#0F172A]">Usuários Registrados</h3>
          </div>
          <DataTable 
            columns={userColumns}
            data={users}
            loading={loading}
            onRowClick={handleEditUser}
            emptyMessage="Nenhum usuário cadastrado."
          />
        </div>

        {/* LISTA WHITELIST */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#6254E8]" />
            <h3 className="text-sm font-semibold text-[#0F172A]">Whitelist de E-mails</h3>
          </div>
          <DataTable 
            columns={whitelistColumns}
            data={allowedEmails}
            loading={loading}
            emptyMessage="Nenhum e-mail autorizado na whitelist."
          />
        </div>

      </div>

      {/* MODAL / DRAWER AUTORIZAR EMAIL */}
      {showAddWhitelist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm" onClick={() => setShowAddWhitelist(false)} />
          
          <form onSubmit={handleAddWhitelist} className="bg-white rounded-3xl border border-[#E8ECF2] shadow-2xl max-w-md w-full overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-sm">Autorizar E-mail na Whitelist</h3>
              <button type="button" onClick={() => setShowAddWhitelist(false)} className="text-[#8A94A6] hover:text-[#0F172A] p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={wEmail}
                  onChange={(e) => setWEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Papel Padrão (Role)</label>
                <select
                  value={wRole}
                  onChange={(e) => setWRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="admin">Administrador</option>
                  <option value="hr">Recursos Humanos</option>
                  <option value="manager">Gestão Geral</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="user">Colaborador Comum</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>

              {wRole === 'supervisor' && (
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Vincular Equipes Permitidas</label>
                  <div className="border border-[#E8ECF2] rounded-2xl divide-y divide-[#F6F8FB] max-h-36 overflow-y-auto">
                    {teams.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => handleToggleTeam(wTeamIds, setWTeamIds, t.id)}
                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#F7F8FC]/50 text-xs font-semibold text-[#0F172A]"
                      >
                        <span>{t.name}</span>
                        <input
                          type="checkbox"
                          checked={wTeamIds.includes(t.id)}
                          readOnly
                          className="w-4 h-4 text-[#6254E8] rounded border-[#E8ECF2]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-[#F7F8FC] border-t border-[#E8ECF2] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddWhitelist(false)}
                className="h-10 px-4 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-[#6254E8] hover:bg-[#5145CD] text-white text-xs font-semibold shadow-sm"
              >
                Autorizar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DRAWER EDITAR DADOS E NÍVEL DE PERMISSÃO (USERS) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          
          <form onSubmit={handleSaveUserEdit} className="w-full max-w-md bg-white h-screen shadow-2xl relative z-50 flex flex-col justify-between border-l border-[#E8ECF2] animate-in slide-in-from-right duration-250">
            <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-sm">Editar Acesso de Usuário</h3>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-[#8A94A6] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F6F8FB]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-1">Nome do Usuário</label>
                <p className="text-xs font-semibold text-[#0F172A]">{selectedUser.name}</p>
                <p className="text-[10px] text-[#8A94A6]">{selectedUser.email}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Papel do Usuário (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="admin">Administrador</option>
                  <option value="hr">Recursos Humanos</option>
                  <option value="manager">Gestão Geral</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="user">Colaborador Comum</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Status da Conta</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
                >
                  <option value="active">Ativo (Liberado)</option>
                  <option value="blocked">Bloqueado</option>
                  <option value="pending">Aguardando Confirmação</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
                <input
                  type="checkbox"
                  id="can_approve"
                  checked={editCanApprove}
                  onChange={(e) => setEditCanApprove(e.target.checked)}
                  className="w-4 h-4 text-[#6254E8] bg-[#F6F8FB] border-[#E8ECF2] rounded focus:ring-2 focus:ring-[#6254E8]"
                />
                <label htmlFor="can_approve" className="text-xs font-semibold text-[#0F172A] select-none cursor-pointer flex flex-col">
                  <span>Pode Aprovar Férias</span>
                  <span className="text-[9px] text-[#8A94A6] font-normal">Habilita liberação operacional de férias</span>
                </label>
              </div>

              {editRole === 'supervisor' && (
                <div>
                  <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Vincular Equipes Permitidas</label>
                  <div className="border border-[#E8ECF2] rounded-2xl divide-y divide-[#F6F8FB] max-h-48 overflow-y-auto">
                    {teams.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => handleToggleTeam(editTeamIds, setEditTeamIds, t.id)}
                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#F7F8FC]/50 text-xs font-semibold text-[#0F172A]"
                      >
                        <span>{t.name}</span>
                        <input
                          type="checkbox"
                          checked={editTeamIds.includes(t.id)}
                          readOnly
                          className="w-4 h-4 text-[#6254E8] rounded border-[#E8ECF2]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-[#F7F8FC] border-t border-[#E8ECF2] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="h-10 px-4 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-[#6254E8] hover:bg-[#5145CD] text-white text-xs font-semibold shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
