import { 
  parseISO, 
  format, 
  addDays, 
  isBefore, 
  isAfter, 
  endOfYear
} from 'date-fns';
import type { Employee, ProductionCell, Team, VacationRequest, BlockedPeriod, RiskLevel } from '../types';
import { detectVacationOverlap, validateBlockedPeriod } from './vacationRules';
import { analyzeCellAvailability } from './capacityEngine';

export interface SuggestedPlanItem {
  employee_id: string;
  employee_name: string;
  employee_registration: string;
  cell_id: string;
  cell_name: string;
  team_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  risk_level: RiskLevel;
  priority: 'low' | 'medium' | 'high'; // Prioridade legal (alta se perto de vencer)
  reason: string;
  vacation_type: 'individual' | 'split';
  split_suggestion?: { start_date: string; end_date: string; days_count: number }[];
}

/**
 * Motor heurístico para sugerir períodos de férias de forma inteligente para os colaboradores.
 */
export function suggestVacationSchedule(
  year: number,
  employees: Employee[],
  cells: ProductionCell[],
  _teams: Team[],
  approvedRequests: VacationRequest[],
  blockedPeriods: BlockedPeriod[],
  strategy: 'balance' | 'legal' | 'production' | 'collective'
): SuggestedPlanItem[] {
  const suggestions: SuggestedPlanItem[] = [];
  
  // 1. Filtrar colaboradores ativos com saldo disponível
  const eligibleEmployees = employees.filter(emp => emp.status === 'active' && emp.vacation_balance_days > 0);
  
  // 2. Ordenar de acordo com a estratégia:
  // Se legal, priorizar quem tem o prazo de concessão mais antigo/próximo
  if (strategy === 'legal') {
    eligibleEmployees.sort((a, b) => {
      return a.concession_deadline.localeCompare(b.concession_deadline);
    });
  } else {
    // Equilíbrio operacional ou outro: priorizar saldo maior e depois prazo
    eligibleEmployees.sort((a, b) => {
      const balanceDiff = b.vacation_balance_days - a.vacation_balance_days;
      if (balanceDiff !== 0) return balanceDiff;
      return a.concession_deadline.localeCompare(b.concession_deadline);
    });
  }
  
  // Variável para rastrear férias sugeridas nesta simulação (para evitar sugerir ao mesmo tempo na mesma célula)
  const simulatedRequests: VacationRequest[] = [...approvedRequests];
  
  // Iterar por colaborador elegível e tentar encontrar o melhor período do ano
  for (const emp of eligibleEmployees) {
    const cell = cells.find(c => c.id === emp.cell_id);
    if (!cell) continue;
    
    const cellEmployees = employees.filter(e => e.cell_id === cell.id);
    
    // Determinar se o prazo está crítico (concession_deadline é menor que o fim do ano de simulação)
    const deadlineDate = parseISO(emp.concession_deadline);
    const endOfSimYear = endOfYear(new Date(year, 0, 1));
    const isCloseToDeadline = isBefore(deadlineDate, endOfSimYear);
    
    const priority = isCloseToDeadline ? 'high' : (emp.vacation_balance_days >= 30 ? 'medium' : 'low');
    
    // Decidir dias a agendar
    const totalDaysToSchedule = emp.vacation_balance_days;
    
    // Estratégia de Férias Coletivas: Período fixo (ex: fim do ano)
    if (strategy === 'collective') {
      const startCollect = format(new Date(year, 11, 20), 'yyyy-MM-dd'); // 20 de Dezembro
      const endCollect = format(new Date(year, 11, 20 + totalDaysToSchedule - 1), 'yyyy-MM-dd');
      
      const isBlocked = validateBlockedPeriod(startCollect, endCollect, cell.id, blockedPeriods);
      
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        employee_registration: emp.registration,
        cell_id: cell.id,
        cell_name: cell.name,
        team_id: emp.team_id,
        start_date: startCollect,
        end_date: endCollect,
        days_count: totalDaysToSchedule,
        risk_level: isBlocked ? 'critical' : 'low',
        priority,
        vacation_type: 'individual',
        reason: isBlocked 
          ? `Sugerido coletivo, porém coincide com período bloqueado: ${isBlocked.name}`
          : 'Sugerido período padrão de férias coletivas de fim de ano.'
      });
      continue;
    }
    
    // Procurar por meses livres no ano
    let bestStart: string | null = null;
    let bestEnd: string | null = null;
    let lowestRisk: RiskLevel = 'critical';
    let bestReason = '';
    
    // Testar datas de início em diferentes meses do ano (dia 1 ou dia 15 de cada mês)
    const possibleStartMonths = [2, 3, 4, 7, 8, 9, 10, 0, 1, 5, 6, 11]; // Ordenados para balancear (meses de baixa e alta produção misturados)
    
    for (const monthIdx of possibleStartMonths) {
      // Testar dia 1 e dia 15
      const testDates = [
        new Date(year, monthIdx, 2),
        new Date(year, monthIdx, 16)
      ];
      
      for (const baseTestDate of testDates) {
        const startStr = format(baseTestDate, 'yyyy-MM-dd');
        const endStr = format(addDays(baseTestDate, totalDaysToSchedule - 1), 'yyyy-MM-dd');
        
        // 1. Validar prazo legal do colaborador (não pode iniciar depois do prazo de concessão)
        if (isAfter(baseTestDate, deadlineDate)) {
          continue;
        }
        
        // 2. Validar contra períodos bloqueados
        const blocked = validateBlockedPeriod(startStr, endStr, cell.id, blockedPeriods);
        if (blocked) continue;
        
        // 3. Validar se o próprio colaborador já tem férias planejadas
        const overlap = detectVacationOverlap(startStr, endStr, simulatedRequests.filter(r => r.employee_id === emp.id));
        if (overlap) continue;
        
        // 4. Analisar capacidade produtiva na célula
        const capacityAnalysis = analyzeCellAvailability(
          cell,
          startStr,
          endStr,
          cellEmployees,
          simulatedRequests
        );
        
        // Encontrou um período viável (baixo risco)
        if (capacityAnalysis.maxRiskLevel === 'low') {
          bestStart = startStr;
          bestEnd = endStr;
          lowestRisk = 'low';
          bestReason = 'Período com excelente capacidade operacional da célula e sem restrições.';
          break;
        }
        
        // Se for médio, serve como fallback secundário
        if (capacityAnalysis.maxRiskLevel === 'medium' && (lowestRisk === 'critical' || lowestRisk === 'high')) {
          bestStart = startStr;
          bestEnd = endStr;
          lowestRisk = 'medium';
          bestReason = 'Período viável com leve redução de capacidade na célula.';
        }
        
        // Se for alto e não tivermos nada melhor
        if (capacityAnalysis.maxRiskLevel === 'high' && lowestRisk === 'critical') {
          bestStart = startStr;
          bestEnd = endStr;
          lowestRisk = 'high';
          bestReason = 'Único período disponível no prazo. Exige remanejamento de equipe.';
        }
      }
      
      if (lowestRisk === 'low') break;
    }
    
    // Se não encontrou período, tenta fracionar (sugerir split de 15 dias)
    if (!bestStart && totalDaysToSchedule >= 20) {
      const halfDays = Math.floor(totalDaysToSchedule / 2);
      // Tentaremos agendar o primeiro período em Abril e o segundo em Outubro
      const p1Start = format(new Date(year, 3, 15), 'yyyy-MM-dd'); // 15 de Abril
      const p1End = format(addDays(new Date(year, 3, 15), halfDays - 1), 'yyyy-MM-dd');
      
      const p2Start = format(new Date(year, 9, 15), 'yyyy-MM-dd'); // 15 de Outubro
      const p2End = format(addDays(new Date(year, 9, 15), (totalDaysToSchedule - halfDays) - 1), 'yyyy-MM-dd');
      
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        employee_registration: emp.registration,
        cell_id: cell.id,
        cell_name: cell.name,
        team_id: emp.team_id,
        start_date: p1Start,
        end_date: p1End,
        days_count: totalDaysToSchedule,
        risk_level: 'medium',
        priority,
        vacation_type: 'split',
        reason: 'Fracionamento sugerido para reduzir impacto na célula produtiva.',
        split_suggestion: [
          { start_date: p1Start, end_date: p1End, days_count: halfDays },
          { start_date: p2Start, end_date: p2End, days_count: totalDaysToSchedule - halfDays }
        ]
      });
      continue;
    }
    
    // Adicionar sugestão encontrada
    if (bestStart && bestEnd) {
      // Adicionar aos simulados para a próxima iteração não ocupar o mesmo intervalo na célula
      simulatedRequests.push({
        id: `sim-${emp.id}`,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_registration: emp.registration,
        cell_id: cell.id,
        cell_name: cell.name,
        team_id: emp.team_id,
        start_date: bestStart,
        end_date: bestEnd,
        days_count: totalDaysToSchedule,
        vacation_type: 'individual',
        origin: 'automatic_suggestion',
        status: 'approved', // Simular aprovado para efeito de cálculo
        impact_level: lowestRisk,
        impact_percentage: 0,
        approval_level: 1,
        current_approval_level: 1,
        approval_history: [],
        company_id: emp.company_id,
        business_unit_id: emp.business_unit_id,
        requester_user_id: 'system',
        requester_role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system',
        updated_by: 'system'
      });
      
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        employee_registration: emp.registration,
        cell_id: cell.id,
        cell_name: cell.name,
        team_id: emp.team_id,
        start_date: bestStart,
        end_date: bestEnd,
        days_count: totalDaysToSchedule,
        risk_level: lowestRisk,
        priority,
        vacation_type: 'individual',
        reason: bestReason
      });
    } else {
      // Caso extremo: sugerir de qualquer forma a partir da data atual
      const fallbackStart = format(new Date(year, 0, 15), 'yyyy-MM-dd');
      const fallbackEnd = format(addDays(new Date(year, 0, 15), totalDaysToSchedule - 1), 'yyyy-MM-dd');
      
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        employee_registration: emp.registration,
        cell_id: cell.id,
        cell_name: cell.name,
        team_id: emp.team_id,
        start_date: fallbackStart,
        end_date: fallbackEnd,
        days_count: totalDaysToSchedule,
        risk_level: 'critical',
        priority,
        vacation_type: 'individual',
        reason: 'Aviso: Célula operando no limite absoluto. Período crítico sugerido por falta de datas livres.'
      });
    }
  }
  
  return suggestions;
}
