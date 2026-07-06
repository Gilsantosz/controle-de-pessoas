import { 
  differenceInCalendarDays, 
  parseISO, 
  addYears, 
  addMonths, 
  subDays, 
  format, 
  areIntervalsOverlapping
} from 'date-fns';
import type { Employee, BlockedPeriod, VacationRequest, SystemSettings } from '../types';

/**
 * Calcula a quantidade de dias corridos entre a data inicial e final (inclusive).
 */
export function calculateVacationDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  // inclusive, por isso + 1
  return differenceInCalendarDays(end, start) + 1;
}

/**
 * Detecta se o período solicitado se sobrepõe a alguma solicitação de férias existente (ativa/aprovada/pendente) do mesmo colaborador.
 */
export function detectVacationOverlap(
  startDate: string, 
  endDate: string, 
  existingRequests: VacationRequest[]
): VacationRequest | null {
  if (!startDate || !endDate || !existingRequests.length) return null;
  
  const reqStart = parseISO(startDate);
  const reqEnd = parseISO(endDate);
  
  for (const req of existingRequests) {
    // Apenas verificar se a solicitação não foi cancelada ou rejeitada
    if (req.status === 'cancelled' || req.status === 'rejected') {
      continue;
    }
    
    const exStart = parseISO(req.start_date);
    const exEnd = parseISO(req.end_date);
    
    const overlap = areIntervalsOverlapping(
      { start: reqStart, end: reqEnd },
      { start: exStart, end: exEnd },
      { inclusive: true }
    );
    
    if (overlap) {
      return req;
    }
  }
  
  return null;
}

/**
 * Verifica se o período solicitado contém alguma data dentro de um período bloqueado para a célula do colaborador.
 */
export function validateBlockedPeriod(
  startDate: string, 
  endDate: string, 
  cellId: string, 
  blockedPeriods: BlockedPeriod[]
): BlockedPeriod | null {
  if (!startDate || !endDate || !blockedPeriods.length) return null;
  
  const reqStart = parseISO(startDate);
  const reqEnd = parseISO(endDate);
  
  for (const block of blockedPeriods) {
    if (block.status !== 'active') continue;
    
    // Se o bloqueio se aplica a todas as células ou especificamente à célula informada
    const appliesToCell = block.cell_ids.length === 0 || block.cell_ids.includes(cellId);
    if (!appliesToCell) continue;
    
    const blockStart = parseISO(block.start_date);
    const blockEnd = parseISO(block.end_date);
    
    const overlap = areIntervalsOverlapping(
      { start: reqStart, end: reqEnd },
      { start: blockStart, end: blockEnd },
      { inclusive: true }
    );
    
    if (overlap) {
      return block;
    }
  }
  
  return null;
}

/**
 * Calcula o período aquisitivo atual com base na data de admissão.
 * CLT: Cada período aquisitivo dura 12 meses. O prazo de concessão é de 11 meses após o fim do período.
 */
export function calculateAcquisitionPeriod(
  hireDate: string,
  baseDateStr?: string
): { 
  acquisition_period_start: string; 
  acquisition_period_end: string; 
  concession_deadline: string; 
} {
  const hire = parseISO(hireDate);
  const baseDate = baseDateStr ? parseISO(baseDateStr) : new Date();
  
  let yearsElapsed = baseDate.getFullYear() - hire.getFullYear();
  let currentStart = addYears(hire, yearsElapsed);
  
  // Se o aniversário de admissão deste ano ainda não passou, o período aquisitivo atual começou no ano passado
  if (currentStart > baseDate) {
    yearsElapsed -= 1;
    currentStart = addYears(hire, yearsElapsed);
  }
  
  const currentEnd = subDays(addYears(currentStart, 1), 1);
  // Prazo final de concessão é de 11 meses a partir da data de término do período aquisitivo
  const deadline = addMonths(currentEnd, 11);
  
  return {
    acquisition_period_start: format(currentStart, 'yyyy-MM-dd'),
    acquisition_period_end: format(currentEnd, 'yyyy-MM-dd'),
    concession_deadline: format(deadline, 'yyyy-MM-dd')
  };
}

/**
 * Analisa se a quantidade e parcelamento de férias respeita as regras de negócio
 */
export function validateVacationRules(
  daysCount: number,
  vacationType: string,
  employee: Employee,
  settings: SystemSettings
): { valid: boolean; message?: string } {
  const minDays = settings?.vacation_rules?.min_days_per_period || 5;
  
  if (daysCount < minDays && vacationType !== 'manual_adjustment') {
    return {
      valid: false,
      message: `O período de férias deve ser de no mínimo ${minDays} dias.`
    };
  }
  
  if (daysCount > employee.vacation_balance_days) {
    return {
      valid: false,
      message: `Saldo insuficiente. O colaborador possui apenas ${employee.vacation_balance_days} dias de saldo disponível.`
    };
  }
  
  return { valid: true };
}
