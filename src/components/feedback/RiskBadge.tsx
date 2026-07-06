import React from 'react';
import type { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel | 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'leave' | 'vacation' | 'draft' | 'maintenance' | 'blocked';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const getStyles = () => {
    switch (level) {
      // Níveis de Risco e Status Negativos
      case 'critical':
      case 'rejected':
      case 'cancelled':
      case 'inactive':
      case 'blocked':
        return 'bg-[#FFE6EE] text-[#E04F6F] border-[#FFE6EE]';
      
      // Níveis Médios/Alertas
      case 'high':
      case 'pending':
      case 'leave':
        return 'bg-[#FFF4D6] text-[#B27B00] border-[#FFF4D6]';
      
      case 'medium':
      case 'vacation':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      
      // Rascunho / Draft / Manutenção
      case 'draft':
      case 'maintenance':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      
      // Níveis Positivos/Ativos
      case 'low':
      case 'approved':
      case 'completed':
      case 'active':
      default:
        return 'bg-[#DDFBF5] text-[#0EAD98] border-[#DDFBF5]';
    }
  };

  const getLabel = () => {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Reprovado';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      case 'leave': return 'Afastado';
      case 'vacation': return 'Em Férias';
      case 'draft': return 'Rascunho';
      case 'maintenance': return 'Manutenção';
      case 'blocked': return 'Bloqueado';
      default: return String(level).toUpperCase();
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles()} ${className}`}>
      {getLabel()}
    </span>
  );
};
