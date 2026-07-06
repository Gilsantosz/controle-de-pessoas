import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { calculateAcquisitionPeriod } from '../services/vacationRules';

export async function hasExistingData(): Promise<boolean> {
  const cellsCol = collection(db, 'production_cells');
  const snapshot = await getDocs(cellsCol);
  return !snapshot.empty;
}

export async function runDatabaseSeed(): Promise<void> {
  const batch = writeBatch(db);
  const companyId = 'empresa_001';
  const buId = 'bu_industrial';
  
  // 1. Criar Empresa
  const companyDoc = doc(db, 'companies', companyId);
  batch.set(companyDoc, {
    id: companyId,
    name: 'VacationPro Corp — Metalúrgica Leste',
    document_number_optional: '12.345.678/0001-99',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 2. Criar Unidade de Negócio
  const buDoc = doc(db, 'business_units', buId);
  batch.set(buDoc, {
    id: buId,
    company_id: companyId,
    name: 'Divisão de Estamparia e Soldagem',
    description: 'Unidade industrial de transformação mecânica',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 3. Criar Células Produtivas
  const cells = [
    { id: 'cell_corte', name: 'Célula de Corte Laser', process_type: 'Corte', is_critical: true, min_op: 4, nom_cap: 6, max_vac: 1 },
    { id: 'cell_dobra', name: 'Célula de Dobra CNC', process_type: 'Conformação', is_critical: false, min_op: 3, nom_cap: 5, max_vac: 2 },
    { id: 'cell_solda', name: 'Célula de Solda Robótica', process_type: 'Soldagem', is_critical: true, min_op: 5, nom_cap: 8, max_vac: 1 },
    { id: 'cell_embalagem', name: 'Linha de Embalagem e Expedição', process_type: 'Logística', is_critical: false, min_op: 2, nom_cap: 4, max_vac: 2 }
  ];

  cells.forEach(c => {
    const cellDoc = doc(db, 'production_cells', c.id);
    batch.set(cellDoc, {
      id: c.id,
      company_id: companyId,
      business_unit_id: buId,
      name: c.name,
      process_type: c.process_type,
      nominal_capacity: c.nom_cap,
      real_capacity: c.nom_cap,
      active_shifts: ['morning', 'afternoon', 'night'],
      expected_output_per_day: c.nom_cap * 100, // ex: 600 pçs
      is_critical: c.is_critical,
      minimum_operators: c.min_op,
      max_vacations_allowed: c.max_vac,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // 4. Criar Equipes
  const teams = [
    { id: 'team_corte_t1', cell_id: 'cell_corte', name: 'Corte Laser — Turno 1 (Manhã)', shift: 'morning', supervisors: ['supervisor_a_id'] },
    { id: 'team_corte_t2', cell_id: 'cell_corte', name: 'Corte Laser — Turno 2 (Tarde)', shift: 'afternoon', supervisors: ['supervisor_a_id'] },
    { id: 'team_dobra_t1', cell_id: 'cell_dobra', name: 'Dobra CNC — Turno 1 (Manhã)', shift: 'morning', supervisors: ['supervisor_b_id'] },
    { id: 'team_solda_t1', cell_id: 'cell_solda', name: 'Solda Robótica — Turno 1 (Manhã)', shift: 'morning', supervisors: ['supervisor_a_id'] },
    { id: 'team_solda_t2', cell_id: 'cell_solda', name: 'Solda Robótica — Turno 2 (Tarde)', shift: 'afternoon', supervisors: ['supervisor_b_id'] },
    { id: 'team_embalagem_t1', cell_id: 'cell_embalagem', name: 'Embalagem — Turno Geral', shift: 'administrative', supervisors: ['supervisor_b_id'] }
  ];

  teams.forEach(t => {
    const teamDoc = doc(db, 'teams', t.id);
    batch.set(teamDoc, {
      id: t.id,
      company_id: companyId,
      business_unit_id: buId,
      cell_id: t.cell_id,
      name: t.name,
      description: `Equipe vinculada à célula ${t.cell_id}`,
      shift: t.shift,
      supervisor_ids: t.supervisors,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // 5. Configurações Globais
  const settingsDoc = doc(db, 'settings', companyId);
  batch.set(settingsDoc, {
    company_name: 'VacationPro Corp',
    business_unit: 'Divisão Industrial',
    default_weekly_hours: 44,
    default_vacation_days: 30,
    vacation_rules: {
      min_days_per_period: 5,
      max_periods_split: 3,
      allow_anticipation: true,
      concession_warning_months: 3
    },
    risk_thresholds: {
      low: 85,
      medium: 70,
      high: 55
    },
    approval_rules: {
      levels_required: 2,
      require_reason_for_override: true
    },
    notification_rules: {
      alert_on_critical_capacity: true,
      notify_supervisor_on_absence: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 6. E-mails Autorizados
  const allowed = [
    { email: 'admin@vacationpro.local', role: 'admin', cells: [], teams: [] },
    { email: 'admin@vacationpro.com', role: 'admin', cells: [], teams: [] },
    { email: 'rh@vacationpro.local', role: 'hr', cells: [], teams: [] },
    { email: 'gestor@vacationpro.local', role: 'manager', cells: [], teams: [] },
    { email: 'supervisor_a@vacationpro.local', role: 'supervisor', cells: ['cell_corte', 'cell_solda'], teams: ['team_corte_t1', 'team_corte_t2', 'team_solda_t1'] },
    { email: 'supervisor_b@vacationpro.local', role: 'supervisor', cells: ['cell_dobra', 'cell_embalagem'], teams: ['team_dobra_t1', 'team_solda_t2', 'team_embalagem_t1'] }
  ];

  allowed.forEach(a => {
    const norm = a.email.toLowerCase().trim();
    const cleanId = norm.replace(/[^a-zA-Z0-9]/g, '_');
    const allowedDoc = doc(db, 'allowed_emails', cleanId);
    batch.set(allowedDoc, {
      email: a.email,
      normalized_email: norm,
      role: a.role,
      status: 'active',
      company_id: companyId,
      allowed_cell_ids: a.cells,
      allowed_team_ids: a.teams,
      created_at: new Date().toISOString(),
      created_by: 'system',
      updated_at: new Date().toISOString(),
      updated_by: 'system'
    });
  });

  // 7. Colaboradores (30 operadores industriais)
  const employeeSeedData = [
    // Cell Corte (Laser)
    { id: 'emp_corte_1', name: 'Adriano Souza', reg: 'MTR-001', team: 'team_corte_t1', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2021-02-10', balance: 30, prod: 1.0 },
    { id: 'emp_corte_2', name: 'Bruno Mendes', reg: 'MTR-002', team: 'team_corte_t1', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2022-05-15', balance: 15, prod: 0.95 },
    { id: 'emp_corte_3', name: 'Carlos Roberto', reg: 'MTR-003', team: 'team_corte_t1', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2023-08-20', balance: 30, prod: 0.9 },
    { id: 'emp_corte_4', name: 'Douglas Santos', reg: 'MTR-004', team: 'team_corte_t2', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2020-11-01', balance: 0, prod: 1.05 },
    { id: 'emp_corte_5', name: 'Eduardo Lima', reg: 'MTR-005', team: 'team_corte_t2', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2021-04-12', balance: 30, prod: 1.0 },
    { id: 'emp_corte_6', name: 'Fábio Silva', reg: 'MTR-006', team: 'team_corte_t2', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2024-01-10', balance: 10, prod: 0.8 },
    { id: 'emp_corte_7', name: 'Gabriel Junior', reg: 'MTR-007', team: 'team_corte_t1', cell: 'cell_corte', cellName: 'Célula de Corte Laser', hire: '2019-06-15', balance: 45, prod: 1.1 }, // Férias vencendo

    // Cell Dobra (CNC)
    { id: 'emp_dobra_1', name: 'Hugo Alencar', reg: 'MTR-011', team: 'team_dobra_t1', cell: 'cell_dobra', cellName: 'Célula de Dobra CNC', hire: '2022-03-01', balance: 20, prod: 1.0 },
    { id: 'emp_dobra_2', name: 'Igor Ferreira', reg: 'MTR-012', team: 'team_dobra_t1', cell: 'cell_dobra', cellName: 'Célula de Dobra CNC', hire: '2021-07-20', balance: 30, prod: 0.95 },
    { id: 'emp_dobra_3', name: 'Jonas Peixoto', reg: 'MTR-013', team: 'team_dobra_t1', cell: 'cell_dobra', cellName: 'Célula de Dobra CNC', hire: '2023-10-15', balance: 30, prod: 1.0 },
    { id: 'emp_dobra_4', name: 'Kleber Oliveira', reg: 'MTR-014', team: 'team_dobra_t1', cell: 'cell_dobra', cellName: 'Célula de Dobra CNC', hire: '2020-05-18', balance: 5, prod: 1.0 },
    { id: 'emp_dobra_5', name: 'Lucas Marques', reg: 'MTR-015', team: 'team_dobra_t1', cell: 'cell_dobra', cellName: 'Célula de Dobra CNC', hire: '2023-01-10', balance: 30, prod: 0.9 },
    { id: 'emp_dobra_6', name: 'Matheus Reis', reg: 'MTR-016', team: 'team_dobra_t1', cell: 'cell_dobra', cellName: 'Célula de Dobra CNC', hire: '2024-02-15', balance: 10, prod: 0.85 },

    // Cell Solda (Robótica)
    { id: 'emp_solda_1', name: 'Nataniel Costa', reg: 'MTR-021', team: 'team_solda_t1', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2021-09-01', balance: 30, prod: 1.0 },
    { id: 'emp_solda_2', name: 'Otávio Martins', reg: 'MTR-022', team: 'team_solda_t1', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2022-12-10', balance: 15, prod: 1.0 },
    { id: 'emp_solda_3', name: 'Paulo Henrique', reg: 'MTR-023', team: 'team_solda_t1', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2018-03-14', balance: 30, prod: 1.15 },
    { id: 'emp_solda_4', name: 'Renato Aragão', reg: 'MTR-024', team: 'team_solda_t1', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2023-05-22', balance: 30, prod: 0.95 },
    { id: 'emp_solda_5', name: 'Samuel Viana', reg: 'MTR-025', team: 'team_solda_t2', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2020-08-11', balance: 0, prod: 1.0 },
    { id: 'emp_solda_6', name: 'Thiago Nogueira', reg: 'MTR-026', team: 'team_solda_t2', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2022-04-19', balance: 30, prod: 1.05 },
    { id: 'emp_solda_7', name: 'Victor Hugo', reg: 'MTR-027', team: 'team_solda_t2', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2021-01-05', balance: 40, prod: 1.0 },
    { id: 'emp_solda_8', name: 'Wagner Lopes', reg: 'MTR-028', team: 'team_solda_t2', cell: 'cell_solda', cellName: 'Célula de Solda Robótica', hire: '2023-11-20', balance: 30, prod: 0.9 },

    // Cell Embalagem (Logística)
    { id: 'emp_emb_1', name: 'Alexandre Magno', reg: 'MTR-031', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2022-06-01', balance: 15, prod: 1.0 },
    { id: 'emp_emb_2', name: 'Daniel Pires', reg: 'MTR-032', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2020-10-10', balance: 30, prod: 1.0 },
    { id: 'emp_emb_3', name: 'Fernando Collor', reg: 'MTR-033', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2023-04-05', balance: 30, prod: 0.95 },
    { id: 'emp_emb_4', name: 'Gustavo Lima', reg: 'MTR-034', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2021-12-15', balance: 25, prod: 1.0 },
    { id: 'emp_emb_5', name: 'Julio Cesar', reg: 'MTR-035', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2024-03-01', balance: 10, prod: 0.8 },
    { id: 'emp_emb_6', name: 'Leonardo Silva', reg: 'MTR-036', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2019-02-10', balance: 30, prod: 1.05 },
    { id: 'emp_emb_7', name: 'Marcos Pontes', reg: 'MTR-037', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2022-09-18', balance: 30, prod: 1.0 },
    { id: 'emp_emb_8', name: 'Rodrigo Faro', reg: 'MTR-038', team: 'team_embalagem_t1', cell: 'cell_embalagem', cellName: 'Linha de Embalagem e Expedição', hire: '2023-07-07', balance: 30, prod: 0.9 }
  ];

  employeeSeedData.forEach(e => {
    const { acquisition_period_start, acquisition_period_end, concession_deadline } = calculateAcquisitionPeriod(e.hire, '2026-06-30');
    const empDoc = doc(db, 'employees', e.id);
    batch.set(empDoc, {
      id: e.id,
      company_id: companyId,
      business_unit_id: buId,
      cell_id: e.cell,
      cell_name: e.cellName,
      team_id: e.team,
      name: e.name,
      registration: e.reg,
      phone: '(11) 98765-4321',
      email: `${e.name.toLowerCase().replace(/\s+/g, '.')}@vacationpro.local`,
      role: 'Operador',
      shift: e.id.includes('t2') ? 'afternoon' : 'morning',
      weekly_hours: 44,
      contract_type: 'clt',
      productivity_rate: e.prod,
      skills: ['Operação de Painel', 'Leitura e Interpretação de Desenho'],
      hire_date: e.hire,
      acquisition_period_start,
      acquisition_period_end,
      concession_deadline,
      vacation_balance_days: e.balance,
      used_vacation_days: e.balance === 0 ? 30 : 0,
      pending_vacation_days: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'system',
      updated_by: 'system'
    });
  });

  // 8. Férias Aprovadas (5 registros)
  const approvedVacations = [
    { id: 'vac_app_1', emp: 'emp_corte_4', start: '2026-01-05', end: '2026-02-03', days: 30 },
    { id: 'vac_app_2', emp: 'emp_solda_5', start: '2026-02-10', end: '2026-03-11', days: 30 },
    { id: 'vac_app_3', emp: 'emp_dobra_4', start: '2026-04-10', end: '2026-04-24', days: 15 },
    { id: 'vac_app_4', emp: 'emp_emb_1', start: '2026-03-01', end: '2026-03-15', days: 15 },
    { id: 'vac_app_5', emp: 'emp_corte_2', start: '2026-05-02', end: '2026-05-16', days: 15 }
  ];

  approvedVacations.forEach(v => {
    const empInfo = employeeSeedData.find(e => e.id === v.emp)!;
    const vacDoc = doc(db, 'vacation_requests', v.id);
    batch.set(vacDoc, {
      id: v.id,
      employee_id: v.emp,
      employee_name: empInfo.name,
      employee_registration: empInfo.reg,
      cell_id: empInfo.cell,
      cell_name: empInfo.cellName,
      team_id: empInfo.team,
      start_date: v.start,
      end_date: v.end,
      days_count: v.days,
      vacation_type: 'individual',
      origin: 'hr_entry',
      status: 'approved',
      impact_level: 'low',
      impact_percentage: 16.6,
      approval_level: 2,
      current_approval_level: 2,
      approver_id: 'rh_user',
      approver_name: 'RH Central',
      approver_notes: 'Férias regulares aprovadas.',
      requester_notes: 'Planejamento anual.',
      approval_history: [
        { level: 1, approver_id: 'supervisor_a_id', approver_name: 'Supervisor A', action: 'approved', timestamp: new Date().toISOString() },
        { level: 2, approver_id: 'rh_user', approver_name: 'RH Central', action: 'approved', timestamp: new Date().toISOString() }
      ],
      company_id: companyId,
      business_unit_id: buId,
      requester_user_id: 'rh_user',
      requester_role: 'hr',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'rh@vacationpro.local',
      updated_by: 'rh@vacationpro.local'
    });
  });

  // 9. Férias Pendentes (4 solicitações com riscos simulados)
  const pendingVacations = [
    // Bruno Mendes de novo tentando sobreposição ou na mesma célula que outro no mesmo turno
    { id: 'vac_pen_1', emp: 'emp_corte_1', start: '2026-07-05', end: '2026-07-24', days: 20, impact: 'medium', percent: 16.6 },
    { id: 'vac_pen_2', emp: 'emp_solda_1', start: '2026-08-10', end: '2026-08-29', days: 20, impact: 'low', percent: 12.5 },
    // Gabriel Junior (Corte Laser) férias vencendo solicitando em período bloqueado fictício
    { id: 'vac_pen_3', emp: 'emp_corte_7', start: '2026-11-01', end: '2026-11-30', days: 30, impact: 'critical', percent: 33.3 }, // Alto impacto devido ao saldo crítico e pouca gente na célula
    { id: 'vac_pen_4', emp: 'emp_emb_2', start: '2026-09-01', end: '2026-09-30', days: 30, impact: 'medium', percent: 12.5 }
  ];

  pendingVacations.forEach(v => {
    const empInfo = employeeSeedData.find(e => e.id === v.emp)!;
    const vacDoc = doc(db, 'vacation_requests', v.id);
    batch.set(vacDoc, {
      id: v.id,
      employee_id: v.emp,
      employee_name: empInfo.name,
      employee_registration: empInfo.reg,
      cell_id: empInfo.cell,
      cell_name: empInfo.cellName,
      team_id: empInfo.team,
      start_date: v.start,
      end_date: v.end,
      days_count: v.days,
      vacation_type: 'individual',
      origin: 'employee_request',
      status: 'pending',
      impact_level: v.impact,
      impact_percentage: v.percent,
      approval_level: 2,
      current_approval_level: 0,
      requester_notes: 'Gostaria de tirar minhas férias nesse período por motivos de viagem familiar.',
      approval_history: [],
      company_id: companyId,
      business_unit_id: buId,
      requester_user_id: 'emp_user_id',
      requester_role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: `${empInfo.name.toLowerCase().replace(/\s+/g, '.')}@vacationpro.local`,
      updated_by: `${empInfo.name.toLowerCase().replace(/\s+/g, '.')}@vacationpro.local`
    });
  });

  // 10. Registros de Ausência (6 registros)
  const absences = [
    { id: 'abs_1', emp: 'emp_corte_3', date: '2026-06-15', type: 'absence', sub: 'medical', delay: 0, notes: 'Apresentou atestado médico de 1 dia.', loss: 450 },
    { id: 'abs_2', emp: 'emp_solda_2', date: '2026-06-18', type: 'delay', sub: 'unjustified', delay: 120, notes: 'Atrasou devido a problemas com transporte particular.', loss: 120 },
    { id: 'abs_3', emp: 'emp_dobra_1', date: '2026-06-20', type: 'absence', sub: 'unjustified', notes: 'Faltou sem justificativa.', loss: 500 },
    { id: 'abs_4', emp: 'emp_emb_5', date: '2026-06-22', type: 'absence', sub: 'justified', notes: 'Acompanhamento familiar justificado.', loss: 300 },
    { id: 'abs_5', emp: 'emp_solda_3', date: '2026-06-25', type: 'delay', sub: 'justified', delay: 45, notes: 'Consulta médica programada.', loss: 50 },
    { id: 'abs_6', emp: 'emp_corte_7', date: '2026-06-27', type: 'absence', sub: 'medical', notes: 'Licença médica de 1 dia.', loss: 480 }
  ];

  absences.forEach(a => {
    const empInfo = employeeSeedData.find(e => e.id === a.emp)!;
    const absDoc = doc(db, 'absence_records', a.id);
    batch.set(absDoc, {
      id: a.id,
      company_id: companyId,
      business_unit_id: buId,
      cell_id: empInfo.cell,
      team_id: empInfo.team,
      employee_id: a.emp,
      employee_name: empInfo.name,
      employee_registration: empInfo.reg,
      type: a.type,
      subtype: a.sub,
      delay_minutes: a.delay || 0,
      date: a.date,
      notes: a.notes,
      estimated_production_loss: a.loss,
      created_at: new Date().toISOString(),
      created_by: 'supervisor_a@vacationpro.local'
    });
  });

  // 11. Períodos Bloqueados (2 registros)
  const blockedPeriods = [
    { id: 'blk_1', name: 'Inventário Geral do Estoque', start: '2026-11-10', end: '2026-11-15', type: 'inventory', cells: ['cell_embalagem', 'cell_corte'] },
    { id: 'blk_2', name: 'Manutenção Preventiva das Máquinas', start: '2026-07-20', end: '2026-07-23', type: 'maintenance', cells: ['cell_corte', 'cell_solda'] }
  ];

  blockedPeriods.forEach(b => {
    const blockDoc = doc(db, 'blocked_periods', b.id);
    batch.set(blockDoc, {
      id: b.id,
      name: b.name,
      reason: 'Bloqueio operacional devido a auditoria/parada técnica anual.',
      start_date: b.start,
      end_date: b.end,
      cell_ids: b.cells,
      block_type: b.type,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // 12. Alertas (5 registros)
  const alerts = [
    { id: 'alt_1', cell: 'cell_corte', lvl: 'warning', type: 'vacation_limit', text: 'Corte Laser no limite de férias permitido (1 operador simultâneo).', loss: 0 },
    { id: 'alt_2', cell: 'cell_solda', lvl: 'critical', type: 'capacity', text: 'Solda Robótica operando abaixo da capacidade mínima em 10/08.', loss: 800 },
    { id: 'alt_3', cell: 'cell_corte', lvl: 'warning', type: 'recurrence', text: 'Adriano Souza apresenta 2 atrasos frequentes nos últimos 15 dias.', loss: 200 },
    { id: 'alt_4', cell: 'cell_dobra', lvl: 'operational', type: 'pattern', text: 'Dobra CNC operando com margem de segurança de 90%.', loss: 0 },
    { id: 'alt_5', cell: 'cell_corte', lvl: 'critical', type: 'impact', text: 'Gabriel Junior possui férias vencendo em menos de 3 meses.', loss: 2400 }
  ];

  alerts.forEach(a => {
    const altDoc = doc(db, 'alerts', a.id);
    batch.set(altDoc, {
      id: a.id,
      company_id: companyId,
      business_unit_id: buId,
      cell_id: a.cell,
      alert_level: a.lvl,
      alert_type: a.type,
      reason: a.text,
      occurrences_count: 1,
      period_days: 15,
      production_impact: a.loss,
      status: 'active',
      created_at: new Date().toISOString()
    });
  });

  // 13. Notificações
  const notifications = [
    { id: 'not_1', type: 'vacation_expiring', title: 'Férias Vencendo', msg: 'Gabriel Junior tem 45 dias de saldo e seu prazo de concessão expira em 15/09/2026.', sev: 'critical' },
    { id: 'not_2', type: 'pending_approval', title: 'Solicitação de Férias Pendente', msg: 'Adriano Souza solicitou 20 dias de férias a partir de 05/07/2026.', sev: 'medium' },
    { id: 'not_3', type: 'operational_risk', title: 'Risco de Capacidade Crítica', msg: 'Corte Laser ficará abaixo do mínimo operacional se a solicitação de Gabriel Junior for aprovada.', sev: 'high' }
  ];

  notifications.forEach(n => {
    const notDoc = doc(db, 'notifications', n.id);
    batch.set(notDoc, {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.msg,
      recipient_role: 'hr',
      severity: n.sev,
      read: false,
      created_at: new Date().toISOString()
    });
  });

  // Executar lote completo
  await batch.commit();
}
