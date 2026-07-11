// ====================================================================
// TIPOS DE DADOS - VACATIONPRO
// ====================================================================

export type UserRole = 'admin' | 'hr' | 'manager' | 'supervisor' | 'user' | 'viewer';
export type UserStatus = 'active' | 'blocked' | 'pending';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  normalized_email: string;
  role: UserRole;
  status: UserStatus;
  company_id: string;
  business_unit_ids: string[];
  allowed_cell_ids: string[];
  allowed_team_ids: string[];
  allowed_employee_ids?: string[];
  can_view_all_company: boolean;
  can_view_all_business_unit: boolean;
  can_view_all_cells: boolean;
  can_view_all_teams: boolean;
  can_approve: boolean;
  approval_level: number;
  last_login?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AllowedEmail {
  id?: string;
  email: string;
  normalized_email: string;
  role: UserRole;
  status: UserStatus;
  company_id: string;
  allowed_cell_ids: string[];
  allowed_team_ids: string[];
  allowed_employee_ids: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface Company {
  id: string;
  name: string;
  document_number_optional?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'administrative';

export interface Team {
  id: string;
  company_id: string;
  business_unit_id: string;
  cell_id: string;
  name: string;
  description?: string;
  shift: ShiftType;
  supervisor_ids: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type ContractType = 'clt' | 'temporary' | 'intern' | 'outsourced';
export type EmployeeStatus = 'active' | 'vacation' | 'leave' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  registration: string;
  phone?: string;
  email?: string;
  role: string;
  shift: ShiftType;
  weekly_hours: number;
  contract_type: ContractType;
  productivity_rate: number; // e.g. 1.0 = 100% productivity
  cell_id: string;
  cell_name: string;
  team_id: string;
  skills: string[];
  hire_date: string; // YYYY-MM-DD
  acquisition_period_start: string;
  acquisition_period_end: string;
  concession_deadline: string;
  vacation_balance_days: number;
  used_vacation_days: number;
  pending_vacation_days: number;
  status: EmployeeStatus;
  company_id: string;
  business_unit_id: string;
  supervisor_ids?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type CellStatus = 'active' | 'inactive' | 'maintenance';

export interface ProductionCell {
  id: string;
  name: string;
  process_type: string;
  nominal_capacity: number; // em operadores ou peças
  real_capacity: number;
  active_shifts: ShiftType[];
  expected_output_per_day: number;
  is_critical: boolean;
  minimum_operators: number;
  max_vacations_allowed: number;
  status: CellStatus;
  company_id: string;
  business_unit_id: string;
  created_at: string;
  updated_at: string;
}

export type VacationRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
export type VacationType = 'individual' | 'collective' | 'split' | 'anticipated' | 'emergency' | 'manual_adjustment';
export type RequestOrigin = 'automatic_suggestion' | 'manual_entry' | 'employee_request' | 'hr_entry';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ApprovalHistoryItem {
  level: number;
  approver_id: string;
  approver_name: string;
  action: 'approved' | 'rejected';
  notes?: string;
  timestamp: string;
}

export interface VacationRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_registration: string;
  cell_id: string;
  cell_name: string;
  team_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  days_count: number;
  vacation_type: VacationType;
  origin: RequestOrigin;
  status: VacationRequestStatus;
  impact_level: RiskLevel;
  impact_percentage: number;
  approval_level: number; // Nível necessário (ex: 2)
  current_approval_level: number; // Nível atual aprovado (ex: 1)
  approver_id?: string;
  approver_name?: string;
  approver_notes?: string;
  rejection_reason?: string;
  requester_notes?: string;
  approval_history: ApprovalHistoryItem[];
  company_id: string;
  business_unit_id: string;
  requester_user_id: string;
  requester_role: UserRole;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CapacitySnapshot {
  id: string;
  company_id: string;
  business_unit_id: string;
  cell_id: string;
  cell_name: string;
  team_id?: string;
  date: string; // YYYY-MM-DD
  total_employees: number;
  active_employees: number;
  employees_on_vacation: number;
  employees_on_leave: number;
  expected_output: number;
  target_output: number;
  capacity_percentage: number;
  risk_level: RiskLevel;
  max_vacations_allowed: number;
  created_at: string;
}

export type AbsenceType = 'absence' | 'delay';
export type AbsenceSubtype = 'justified' | 'unjustified' | 'medical' | 'other';

export interface AbsenceRecord {
  id: string;
  company_id: string;
  business_unit_id: string;
  cell_id: string;
  team_id: string;
  employee_id: string;
  employee_name: string;
  employee_registration: string;
  type: AbsenceType;
  subtype: AbsenceSubtype;
  delay_minutes?: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  estimated_production_loss: number; // em R$ ou peças
  created_at: string;
  created_by: string;
}

export type AlertLevel = 'warning' | 'critical' | 'operational';
export type AlertType = 'recurrence' | 'pattern' | 'impact' | 'capacity' | 'vacation_limit';

export interface Alert {
  id: string;
  company_id: string;
  business_unit_id: string;
  cell_id: string;
  team_id?: string;
  alert_level: AlertLevel;
  alert_type: AlertType;
  reason: string;
  occurrences_count: number;
  period_days: number;
  production_impact: number;
  related_entity?: 'employee' | 'vacation_request' | 'absence_record' | 'cell';
  related_entity_id?: string;
  status: 'active' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export type NotificationType = 'vacation_expiring' | 'pending_approval' | 'vacation_limit' | 'operational_risk' | 'system_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipient_user_id?: string;
  recipient_role?: UserRole;
  related_entity?: string;
  related_entity_id?: string;
  severity: RiskLevel;
  read: boolean;
  action_url?: string;
  metadata?: any;
  created_at: string;
}

export type BlockType = 'inventory' | 'audit' | 'peak_production' | 'maintenance' | 'collective_vacation' | 'other';

export interface BlockedPeriod {
  id: string;
  name: string;
  reason: string;
  start_date: string;
  end_date: string;
  cell_ids: string[]; // Células afetadas pelo bloqueio
  block_type: BlockType;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ERPIntegration {
  id: string;
  name: string;
  system_type: 'sap' | 'oracle' | 'totvs' | 'senior' | 'other';
  endpoint: string;
  api_key_reference: string;
  last_sync?: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  mappings: Record<string, string>;
  status: 'active' | 'inactive' | 'testing';
  error_log?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: UserRole;
  company_id: string;
  business_unit_id?: string;
  cell_id?: string;
  team_id?: string;
  action: string;
  entity: string;
  entity_id: string;
  before?: any;
  after?: any;
  ip_info_optional?: string;
  created_at: string;
}

export interface SystemSettings {
  company_name: string;
  business_unit: string;
  default_weekly_hours: number;
  default_vacation_days: number;
  vacation_rules: {
    min_days_per_period: number;
    max_periods_split: number;
    allow_anticipation: boolean;
    concession_warning_months: number;
  };
  risk_thresholds: {
    low: number; // ex: 85
    medium: number; // ex: 70
    high: number; // ex: 55
  };
  approval_rules: {
    levels_required: number;
    require_reason_for_override: boolean;
  };
  notification_rules: {
    alert_on_critical_capacity: boolean;
    notify_supervisor_on_absence: boolean;
  };
  created_at: string;
  updated_at: string;
}
