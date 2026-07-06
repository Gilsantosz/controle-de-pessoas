import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { getVacationRequests, saveVacationRequest, saveEmployee } from '../../services/databaseServices';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { VacationRequest, VacationRequestStatus } from '../../types';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { Check, X, ClipboardCheck, ShieldAlert, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const ApprovalsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();

  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<VacationRequest | null>(null);
  
  // Action inputs
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-selected ID if navigated from another page
  const stateRequestId = location.state?.requestId;

  const loadRequests = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getVacationRequests(currentUser);
      // Filtrar apenas solicitações com status 'pending' que o usuário pode aprovar
      const pending = data.filter(r => r.status === 'pending');
      setRequests(pending);
      
      if (stateRequestId) {
        const found = pending.find(r => r.id === stateRequestId);
        if (found) setSelectedReq(found);
      } else if (pending.length > 0) {
        setSelectedReq(pending[0]);
      } else {
        setSelectedReq(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser]);

  const handleApprove = async () => {
    if (!currentUser || !selectedReq) return;
    setActionLoading(true);
    setError(null);

    try {
      const nextLevel = selectedReq.current_approval_level + 1;
      const isFullyApproved = nextLevel >= selectedReq.approval_level || currentUser.role === 'admin';
      
      const newStatus: VacationRequestStatus = isFullyApproved ? 'approved' : 'pending';

      const approvalHistoryItem = {
        level: nextLevel,
        approver_id: currentUser.uid,
        approver_name: currentUser.name,
        action: 'approved' as const,
        notes: notes,
        timestamp: new Date().toISOString()
      };

      const updatedRequest: VacationRequest = {
        ...selectedReq,
        status: newStatus,
        current_approval_level: nextLevel,
        approver_id: currentUser.uid,
        approver_name: currentUser.name,
        approver_notes: notes,
        approval_history: [...selectedReq.approval_history, approvalHistoryItem]
      };

      // Gravar atualização da solicitação
      await saveVacationRequest(updatedRequest, currentUser);

      // Se aprovado definitivamente, descontar do saldo de férias do colaborador
      if (isFullyApproved) {
        const empRef = doc(db, 'employees', selectedReq.employee_id);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          const empData = empSnap.data();
          const currentBalance = empData.vacation_balance_days || 0;
          const currentUsed = empData.used_vacation_days || 0;
          
          await saveEmployee({
            ...empData,
            vacation_balance_days: Math.max(0, currentBalance - selectedReq.days_count),
            used_vacation_days: currentUsed + selectedReq.days_count,
            status: 'vacation' // Coloca em férias futuramente se for o caso ou apenas atualiza saldo
          } as any, currentUser);
        }
      }

      setNotes('');
      await loadRequests();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao aprovar solicitação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser || !selectedReq) return;
    if (!rejectReason) {
      setError('Por favor, informe a justificativa da reprovação.');
      return;
    }
    setActionLoading(true);
    setError(null);

    try {
      const approvalHistoryItem = {
        level: selectedReq.current_approval_level + 1,
        approver_id: currentUser.uid,
        approver_name: currentUser.name,
        action: 'rejected' as const,
        notes: rejectReason,
        timestamp: new Date().toISOString()
      };

      const updatedRequest: VacationRequest = {
        ...selectedReq,
        status: 'rejected',
        rejection_reason: rejectReason,
        approval_history: [...selectedReq.approval_history, approvalHistoryItem]
      };

      await saveVacationRequest(updatedRequest, currentUser);
      setRejectReason('');
      await loadRequests();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao reprovar solicitação.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando fila de aprovações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Fila de Aprovação</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Liberação e avaliações operacionais de férias por supervisores e gerentes industriais.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white premium-card p-12 text-center text-[#8A94A6] text-xs flex flex-col items-center justify-center gap-3">
          <ClipboardCheck size={36} className="text-[#8A94A6] opacity-40" />
          <p className="font-semibold">Nenhuma solicitação aguardando sua aprovação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PAINEL ESQUERDO: LISTA */}
          <div className="bg-white premium-card overflow-hidden h-[600px] flex flex-col">
            <div className="p-5 border-b border-[#E8ECF2] bg-[#F7F8FC]">
              <h3 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider">Aguardando Avaliação ({requests.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F6F8FB]">
              {requests.map(req => {
                const active = selectedReq?.id === req.id;
                return (
                  <div 
                    key={req.id}
                    onClick={() => {
                      setSelectedReq(req);
                      setError(null);
                      setNotes('');
                      setRejectReason('');
                    }}
                    className={`p-5 cursor-pointer transition-all ${
                      active ? 'bg-indigo-50/40 border-l-4 border-[#6254E8]' : 'hover:bg-[#F7F8FC]/50'
                    }`}
                  >
                    <p className="font-bold text-xs text-[#0F172A]">{req.employee_name}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#8A94A6]">
                      <span>{req.cell_name}</span>
                      <span>•</span>
                      <span>{req.days_count} dias</span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] text-[#8A94A6]">
                        {format(parseISO(req.start_date), 'dd/MM/yy')} - {format(parseISO(req.end_date), 'dd/MM/yy')}
                      </span>
                      <RiskBadge level={req.impact_level} className="text-[9px]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL DIREITO: DETALHES E AÇÃO */}
          <div className="lg:col-span-2 space-y-6">
            {selectedReq && (
              <div className="bg-white premium-card p-6 md:p-8 space-y-6">
                
                {/* Cabeçalho do Colaborador */}
                <div className="pb-5 border-b border-[#F6F8FB] flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">{selectedReq.employee_name}</h3>
                    <p className="text-xs text-[#8A94A6] mt-0.5">
                      Matrícula: {selectedReq.employee_registration} | Célula: {selectedReq.cell_name}
                    </p>
                  </div>
                  <RiskBadge level={selectedReq.impact_level} />
                </div>

                {/* Info do Período */}
                <div className="grid grid-cols-2 gap-6 bg-[#F7F8FC] p-4 rounded-2xl border border-[#E8ECF2]">
                  <div>
                    <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Período de Férias</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                      <Calendar size={14} className="text-[#8A94A6]" />
                      <span>{format(parseISO(selectedReq.start_date), 'dd/MM/yyyy')}</span>
                      <span className="text-[#8A94A6]">a</span>
                      <span>{format(parseISO(selectedReq.end_date), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Total de Dias</span>
                    <span className="text-xs font-bold text-[#0F172A]">{selectedReq.days_count} dias corridos</span>
                  </div>
                </div>

                {/* Alerta de Impacto */}
                <div className={`p-4 rounded-2xl border text-xs font-semibold flex gap-3 ${
                  selectedReq.impact_level === 'critical' ? 'bg-[#FFE6EE] text-[#E04F6F] border-[#FFE6EE]' : 'bg-[#DDFBF5] text-[#0EAD98] border-[#DDFBF5]'
                }`}>
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Análise de Impacto: {selectedReq.impact_level === 'critical' ? 'Crítico' : 'Estável'}</p>
                    <p className="font-normal opacity-90 mt-1">
                      {selectedReq.impact_level === 'critical' 
                        ? 'Aprovação desta solicitação deixará a célula abaixo do limite mínimo de segurança.' 
                        : 'A capacidade da célula permanecerá estável durante o período programado.'}
                    </p>
                  </div>
                </div>

                {/* Notas do Solicitante */}
                {selectedReq.requester_notes && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-[#8A94A6] font-bold uppercase block">Notas do Solicitante</span>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed italic">
                      "{selectedReq.requester_notes}"
                    </div>
                  </div>
                )}

                {/* Histórico de Aprovações Anteriores */}
                {selectedReq.approval_history && selectedReq.approval_history.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[9px] text-[#8A94A6] font-bold uppercase block">Histórico de Alçadas</span>
                    <div className="space-y-2">
                      {selectedReq.approval_history.map((hist, hIdx) => (
                        <div key={hIdx} className="text-xs p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-[#0F172A]">{hist.approver_name}</p>
                            <p className="text-[10px] text-[#8A94A6] mt-0.5">Nível {hist.level} | {hist.notes || 'Sem comentários'}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            hist.action === 'approved' ? 'text-[#0EAD98]' : 'text-[#E04F6F]'
                          }`}>
                            {hist.action === 'approved' ? 'Aprovou' : 'Reprovou'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FORMULÁRIO DE AÇÃO */}
                <div className="pt-6 border-t border-[#F6F8FB] space-y-6">
                  
                  {/* Comentários */}
                  <div>
                    <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Comentários de Aprovação</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Insira anotações ou override de justificativa operacional..."
                      rows={3}
                      className="w-full p-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] resize-none transition-all"
                    />
                  </div>

                  {/* Justificativa de Reprovação */}
                  <div>
                    <label className="text-[10px] font-bold text-[#E04F6F] uppercase tracking-wider block mb-2">Motivo da Reprovação (Obrigatório para Reprovar)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Escreva detalhadamente o motivo do indeferimento..."
                      rows={2}
                      className="w-full p-3.5 bg-[#F6F8FB] border border-[#FFE6EE] rounded-xl text-xs text-[#E04F6F] placeholder-[#E04F6F]/60 focus:outline-none focus:bg-white focus:border-[#E04F6F] resize-none transition-all"
                    />
                  </div>

                  {/* BOTOES */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={handleReject}
                      disabled={actionLoading || !rejectReason}
                      className="h-[46px] px-6 rounded-xl border border-[#FFE6EE] text-xs font-semibold text-[#E04F6F] bg-white hover:bg-[#FFE6EE]/30 disabled:opacity-55 transition-all flex items-center gap-2"
                    >
                      <X size={16} />
                      <span>Reprovar Solicitação</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="premium-button-primary"
                    >
                      <Check size={16} />
                      <span>Aprovar Período</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
