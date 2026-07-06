import { 
  eachDayOfInterval, 
  parseISO, 
  format, 
  isWithinInterval 
} from 'date-fns';
import type { Employee, ProductionCell, VacationRequest, CapacitySnapshot, RiskLevel } from '../types';

/**
 * Calcula a porcentagem de capacidade da célula com base nos operadores disponíveis.
 */
export function calculateCapacityPercentage(
  activeCount: number,
  nominalCapacity: number
): number {
  if (nominalCapacity <= 0) return 100;
  return Math.round((activeCount / nominalCapacity) * 100);
}

/**
 * Determina o nível de risco operacional baseado na porcentagem de capacidade e no limite mínimo de operadores.
 */
export function calculateRiskLevel(
  capacityPercentage: number,
  activeCount: number,
  minimumOperators: number,
  _isCriticalCell: boolean
): RiskLevel {
  // Regra crítica: se os operadores disponíveis estiverem abaixo do mínimo necessário para a célula
  if (activeCount < minimumOperators) {
    return 'critical';
  }
  
  if (capacityPercentage >= 85) {
    return 'low';
  } else if (capacityPercentage >= 70) {
    return 'medium';
  } else if (capacityPercentage >= 55) {
    return 'high';
  } else {
    return 'critical';
  }
}

interface DateCapacity {
  date: string;
  total: number;
  active: number;
  onVacation: number;
  onLeave: number;
  capacityPercentage: number;
  riskLevel: RiskLevel;
}

/**
 * Analisa a disponibilidade diária de uma célula produtiva ao longo de um intervalo de datas.
 */
export function analyzeCellAvailability(
  cell: ProductionCell,
  startDateStr: string,
  endDateStr: string,
  cellEmployees: Employee[],
  vacationRequests: VacationRequest[]
): {
  dailyCapacities: DateCapacity[];
  minCapacityPercentage: number;
  maxRiskLevel: RiskLevel;
} {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  
  const dates = eachDayOfInterval({ start, end });
  const dailyCapacities: DateCapacity[] = [];
  
  let minCapacityPercentage = 100;
  let maxRiskLevel: RiskLevel = 'low';
  
  const riskPriority = { low: 0, medium: 1, high: 2, critical: 3 };

  for (const date of dates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Contar funcionários em férias nesta data
    let onVacationCount = 0;
    let onLeaveCount = 0;
    
    // Obter funcionários ativos na célula (cujo status geral não seja inativo)
    const activeEmployees = cellEmployees.filter(emp => emp.status !== 'inactive');
    
    for (const emp of activeEmployees) {
      // Verificar se há férias aprovadas para o funcionário que cobrem este dia
      const hasApprovedVacation = vacationRequests.some(req => {
        if (req.employee_id !== emp.id || req.status !== 'approved') return false;
        
        const reqStart = parseISO(req.start_date);
        const reqEnd = parseISO(req.end_date);
        return isWithinInterval(date, { start: reqStart, end: reqEnd });
      });
      
      if (hasApprovedVacation) {
        onVacationCount++;
      } else if (emp.status === 'leave') {
        onLeaveCount++;
      }
    }
    
    const totalCount = activeEmployees.length;
    const availableCount = Math.max(0, totalCount - onVacationCount - onLeaveCount);
    
    // Usar a capacidade nominal da célula como base
    const capacityPercent = calculateCapacityPercentage(availableCount, cell.nominal_capacity);
    const risk = calculateRiskLevel(
      capacityPercent, 
      availableCount, 
      cell.minimum_operators,
      cell.is_critical
    );
    
    dailyCapacities.push({
      date: dateStr,
      total: totalCount,
      active: availableCount,
      onVacation: onVacationCount,
      onLeave: onLeaveCount,
      capacityPercentage: capacityPercent,
      riskLevel: risk
    });
    
    if (capacityPercent < minCapacityPercentage) {
      minCapacityPercentage = capacityPercent;
    }
    
    if (riskPriority[risk] > riskPriority[maxRiskLevel]) {
      maxRiskLevel = risk;
    }
  }
  
  return {
    dailyCapacities,
    minCapacityPercentage,
    maxRiskLevel
  };
}

/**
 * Gera um snapshot instantâneo de capacidade de uma célula para uma data específica.
 */
export function generateCapacitySnapshot(
  cell: ProductionCell,
  dateStr: string,
  cellEmployees: Employee[],
  vacationRequests: VacationRequest[]
): Omit<CapacitySnapshot, 'id'> {
  const result = analyzeCellAvailability(cell, dateStr, dateStr, cellEmployees, vacationRequests);
  const daily = result.dailyCapacities[0];
  
  const expectedOutput = cell.expected_output_per_day;
  // A produção alvo é proporcional à capacidade real disponível
  const targetOutput = Math.round(expectedOutput * (daily.capacityPercentage / 100));

  return {
    company_id: cell.company_id,
    business_unit_id: cell.business_unit_id,
    cell_id: cell.id,
    cell_name: cell.name,
    date: dateStr,
    total_employees: daily.total,
    active_employees: daily.active,
    employees_on_vacation: daily.onVacation,
    employees_on_leave: daily.onLeave,
    expected_output: expectedOutput,
    target_output: targetOutput,
    capacity_percentage: daily.capacityPercentage,
    risk_level: daily.riskLevel,
    max_vacations_allowed: cell.max_vacations_allowed,
    created_at: new Date().toISOString()
  };
}
