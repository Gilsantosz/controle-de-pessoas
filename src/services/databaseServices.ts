import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  or
} from 'firebase/firestore';
import type { 
  DocumentData,
  Query
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  UserProfile, 
  Employee, 
  ProductionCell, 
  Team, 
  VacationRequest, 
  AbsenceRecord, 
  Alert, 
  Notification, 
  BlockedPeriod,
  SystemSettings,
  ERPIntegration,
  AllowedEmail,
  SystemLog
} from '../types';
import { logAction } from './auditService';

// ==========================================
// FILTROS DE ESCOPO (ABAC)
// ==========================================

export function applyScopeFilters(
  collectionName: string,
  user: UserProfile
): Query<DocumentData> {
  const colRef = collection(db, collectionName);
  
  // Admin do sistema vê tudo da empresa
  if (user.role === 'admin') {
    return query(colRef, where('company_id', '==', user.company_id));
  }

  // Manager/HR vê tudo da empresa, a menos que can_view_all_company seja falso
  if (user.role === 'manager' || user.role === 'hr') {
    if (user.can_view_all_company) {
      return query(colRef, where('company_id', '==', user.company_id));
    }
    // Caso contrário, limitar pelas Unidades de Negócio autorizadas
    return query(
      colRef, 
      where('company_id', '==', user.company_id),
      where('business_unit_id', 'in', user.business_unit_ids)
    );
  }

  // Supervisor vê apenas dados relacionados às equipes autorizadas
  if (user.role === 'supervisor') {
    const teams = user.allowed_team_ids && user.allowed_team_ids.length > 0 
      ? user.allowed_team_ids 
      : ['_no_access_'];
      
    const employeesScope = user.allowed_employee_ids && user.allowed_employee_ids.length > 0
      ? user.allowed_employee_ids
      : ['_no_access_'];

    // Coleções específicas que contêm team_id
    if (['employees', 'vacation_requests', 'absence_records'].includes(collectionName)) {
      const isEmployeeCol = collectionName === 'employees';
      const empIdField = isEmployeeCol ? 'id' : 'employee_id';
      return query(
        colRef, 
        where('company_id', '==', user.company_id),
        or(
          where('team_id', 'in', teams),
          where('owner_supervisor_id', '==', user.uid),
          where('supervisor_ids', 'array-contains', user.uid),
          where(empIdField, 'in', employeesScope)
        ) as any
      );
    }
    
    if (collectionName === 'teams') {
      return query(
        colRef,
        where('company_id', '==', user.company_id),
        or(
          where('id', 'in', teams),
          where('owner_supervisor_id', '==', user.uid),
          where('supervisor_ids', 'array-contains', user.uid)
        ) as any
      );
    }
    // Coleções que contêm cell_id
    if (['production_cells', 'capacity_snapshots', 'alerts'].includes(collectionName)) {
      const cells = user.allowed_cell_ids && user.allowed_cell_ids.length > 0 
        ? user.allowed_cell_ids 
        : ['_no_access_'];
      return query(
        colRef,
        where('company_id', '==', user.company_id),
        where('cell_id', 'in', cells)
      );
    }
    // Outros documentos
    return query(colRef, where('company_id', '==', user.company_id));
  }

  // User comum vê apenas seus próprios dados
  if (user.role === 'user') {
    if (collectionName === 'employees') {
      return query(colRef, where('email', '==', user.email));
    }
    if (collectionName === 'vacation_requests') {
      return query(colRef, where('requester_user_id', '==', user.uid));
    }
    return query(colRef, where('company_id', '==', user.company_id), where('id', '==', '_no_access_'));
  }

  // Viewer vê escopo liberado
  return query(colRef, where('company_id', '==', user.company_id));
}

// ==========================================
// HELPERS GENÉRICOS DE CONSULTA
// ==========================================

export async function fetchScopedCollection<T>(
  collectionName: string,
  user: UserProfile
): Promise<T[]> {
  const q = applyScopeFilters(collectionName, user);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as T);
}

// ==========================================
// SERVIÇOS ESPECÍFICOS
// ==========================================

// --- EMPLOYEES ---
export async function getEmployees(user: UserProfile): Promise<Employee[]> {
  return fetchScopedCollection<Employee>('employees', user);
}

export async function saveEmployee(
  employee: Omit<Employee, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'employees');
  const isNew = !employee.id;
  const docId = isNew ? doc(colRef).id : employee.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'employees', docId))).data() : null;
  
  const employeeData = {
    ...employee,
    id: docId,
    updated_at: new Date().toISOString(),
    updated_by: currentUser.email
  };
  
  if (isNew) {
    employeeData.created_at = new Date().toISOString();
    employeeData.created_by = currentUser.email;
  }
  
  await setDoc(doc(db, 'employees', docId), employeeData);
  await logAction(
    isNew ? 'CREATE_EMPLOYEE' : 'UPDATE_EMPLOYEE',
    'employees',
    docId,
    beforeDoc,
    employeeData,
    currentUser
  );
  
  return docId;
}

// --- CELLS ---
export async function getCells(user: UserProfile): Promise<ProductionCell[]> {
  return fetchScopedCollection<ProductionCell>('production_cells', user);
}

export async function saveCell(
  cell: Omit<ProductionCell, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'production_cells');
  const isNew = !cell.id;
  const docId = isNew ? doc(colRef).id : cell.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'production_cells', docId))).data() : null;
  
  const cellData = {
    ...cell,
    id: docId,
    updated_at: new Date().toISOString()
  };
  
  if (isNew) {
    cellData.created_at = new Date().toISOString();
  }
  
  await setDoc(doc(db, 'production_cells', docId), cellData);
  await logAction(
    isNew ? 'CREATE_CELL' : 'UPDATE_CELL',
    'production_cells',
    docId,
    beforeDoc,
    cellData,
    currentUser
  );
  
  return docId;
}

// --- TEAMS ---
export async function getTeams(user: UserProfile): Promise<Team[]> {
  return fetchScopedCollection<Team>('teams', user);
}

export async function saveTeam(
  team: Omit<Team, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'teams');
  const isNew = !team.id;
  const docId = isNew ? doc(colRef).id : team.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'teams', docId))).data() : null;
  
  const teamData = {
    ...team,
    id: docId,
    updated_at: new Date().toISOString()
  };
  
  if (isNew) {
    teamData.created_at = new Date().toISOString();
  }
  
  await setDoc(doc(db, 'teams', docId), teamData);
  await logAction(
    isNew ? 'CREATE_TEAM' : 'UPDATE_TEAM',
    'teams',
    docId,
    beforeDoc,
    teamData,
    currentUser
  );
  
  return docId;
}

// --- VACATION REQUESTS ---
export async function getVacationRequests(user: UserProfile): Promise<VacationRequest[]> {
  return fetchScopedCollection<VacationRequest>('vacation_requests', user);
}

export async function saveVacationRequest(
  request: Omit<VacationRequest, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'vacation_requests');
  const isNew = !request.id;
  const docId = isNew ? doc(colRef).id : request.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'vacation_requests', docId))).data() : null;
  
  const requestData = {
    ...request,
    id: docId,
    updated_at: new Date().toISOString(),
    updated_by: currentUser.email
  };
  
  if (isNew) {
    requestData.created_at = new Date().toISOString();
    requestData.created_by = currentUser.email;
  }
  
  await setDoc(doc(db, 'vacation_requests', docId), requestData);
  await logAction(
    isNew ? 'CREATE_VACATION_REQUEST' : 'UPDATE_VACATION_REQUEST',
    'vacation_requests',
    docId,
    beforeDoc,
    requestData,
    currentUser
  );
  
  return docId;
}

// --- ABSENCES ---
export async function getAbsenceRecords(user: UserProfile): Promise<AbsenceRecord[]> {
  return fetchScopedCollection<AbsenceRecord>('absence_records', user);
}

export async function saveAbsenceRecord(
  record: Omit<AbsenceRecord, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'absence_records');
  const isNew = !record.id;
  const docId = isNew ? doc(colRef).id : record.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'absence_records', docId))).data() : null;
  
  const recordData = {
    ...record,
    id: docId,
    created_at: isNew ? new Date().toISOString() : beforeDoc?.created_at,
    created_by: isNew ? currentUser.email : beforeDoc?.created_by
  };
  
  await setDoc(doc(db, 'absence_records', docId), recordData);
  await logAction(
    isNew ? 'CREATE_ABSENCE' : 'UPDATE_ABSENCE',
    'absence_records',
    docId,
    beforeDoc,
    recordData,
    currentUser
  );
  
  return docId;
}

// --- ALERTS ---
export async function getAlerts(user: UserProfile): Promise<Alert[]> {
  return fetchScopedCollection<Alert>('alerts', user);
}

export async function saveAlert(
  alert: Omit<Alert, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'alerts');
  const isNew = !alert.id;
  const docId = isNew ? doc(colRef).id : alert.id!;
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'alerts', docId))).data() : null;
  
  const alertData = {
    ...alert,
    id: docId
  };
  
  await setDoc(doc(db, 'alerts', docId), alertData);
  await logAction(
    isNew ? 'CREATE_ALERT' : 'UPDATE_ALERT',
    'alerts',
    docId,
    beforeDoc,
    alertData,
    currentUser
  );
  return docId;
}

// --- NOTIFICATIONS ---
export async function getNotifications(user: UserProfile): Promise<Notification[]> {
  // Admin e RH vêem tudo. Supervisor vê as de supervisor. Outros vêem as suas.
  const colRef = collection(db, 'notifications');
  let q = query(colRef, orderBy('created_at', 'desc'));
  
  if (user.role !== 'admin' && user.role !== 'hr') {
    q = query(
      colRef, 
      where('recipient_user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Notification);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const docRef = doc(db, 'notifications', id);
  await updateDoc(docRef, { read: true });
}

// --- BLOCKED PERIODS ---
export async function getBlockedPeriods(user: UserProfile): Promise<BlockedPeriod[]> {
  const colRef = collection(db, 'blocked_periods');
  const q = query(colRef, where('company_id', '==', user.company_id));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as BlockedPeriod);
}

export async function saveBlockedPeriod(
  period: Omit<BlockedPeriod, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'blocked_periods');
  const isNew = !period.id;
  const docId = isNew ? doc(colRef).id : period.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'blocked_periods', docId))).data() : null;
  
  const periodData = {
    ...period,
    company_id: currentUser.company_id,
    id: docId,
    updated_at: new Date().toISOString()
  };
  if (isNew) {
    periodData.created_at = new Date().toISOString();
  }
  
  await setDoc(doc(db, 'blocked_periods', docId), periodData);
  await logAction(
    isNew ? 'CREATE_BLOCKED_PERIOD' : 'UPDATE_BLOCKED_PERIOD',
    'blocked_periods',
    docId,
    beforeDoc,
    periodData,
    currentUser
  );
  
  return docId;
}

// --- AUDIT SYSTEM LOGS ---
export async function getSystemLogs(user: UserProfile): Promise<SystemLog[]> {
  if (!['admin', 'hr', 'manager'].includes(user.role)) return [];
  const colRef = collection(db, 'system_logs');
  const q = query(colRef, where('company_id', '==', user.company_id), orderBy('created_at', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as SystemLog);
}

// --- SYSTEM SETTINGS ---
export async function getSettings(companyId: string): Promise<SystemSettings | null> {
  const docRef = doc(db, 'settings', companyId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as SystemSettings;
  }
  return null;
}

export async function saveSettings(
  companyId: string,
  settings: SystemSettings,
  currentUser: UserProfile
): Promise<void> {
  const docRef = doc(db, 'settings', companyId);
  const beforeDoc = (await getDoc(docRef)).data();
  
  const settingsData = {
    ...settings,
    updated_at: new Date().toISOString()
  };
  
  await setDoc(docRef, settingsData);
  await logAction('UPDATE_SETTINGS', 'settings', companyId, beforeDoc, settingsData, currentUser);
}

// --- ALLOWED EMAILS ---
export async function getAllowedEmails(user: UserProfile): Promise<AllowedEmail[]> {
  const colRef = collection(db, 'allowed_emails');
  const q = query(colRef, where('company_id', '==', user.company_id));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as AllowedEmail);
}

export async function saveAllowedEmail(
  allowed: Omit<AllowedEmail, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const isNew = !allowed.id;
  const docId = isNew ? allowed.normalized_email : allowed.id!;
  
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'allowed_emails', docId))).data() : null;
  
  const data = {
    ...allowed,
    id: docId,
    updated_at: new Date().toISOString(),
    updated_by: currentUser.email
  };
  if (isNew) {
    data.created_at = new Date().toISOString();
    data.created_by = currentUser.email;
  }
  
  await setDoc(doc(db, 'allowed_emails', docId), data);
  await logAction(
    isNew ? 'ADD_ALLOWED_EMAIL' : 'UPDATE_ALLOWED_EMAIL',
    'allowed_emails',
    docId,
    beforeDoc,
    data,
    currentUser
  );
  return docId;
}

// --- USERS MANAGEMENT ---
export async function getUsersList(user: UserProfile): Promise<UserProfile[]> {
  const colRef = collection(db, 'users');
  const q = query(colRef, where('company_id', '==', user.company_id));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }) as UserProfile);
}

export async function updateUserProfile(
  profile: Partial<UserProfile> & { uid: string },
  currentUser: UserProfile
): Promise<void> {
  const docRef = doc(db, 'users', profile.uid);
  const beforeDoc = (await getDoc(docRef)).data();
  
  const data = {
    ...profile,
    updated_at: new Date().toISOString(),
    updated_by: currentUser.email
  };
  
  await updateDoc(docRef, data);
  await logAction('UPDATE_USER_PROFILE', 'users', profile.uid, beforeDoc, data, currentUser);
}

// --- ERP INTEGRATIONS ---
export async function getERPIntegrations(user: UserProfile): Promise<ERPIntegration[]> {
  const colRef = collection(db, 'erp_integrations');
  const q = query(colRef, where('company_id', '==', user.company_id));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as ERPIntegration);
}

export async function saveERPIntegration(
  integration: Omit<ERPIntegration, 'id'> & { id?: string },
  currentUser: UserProfile
): Promise<string> {
  const colRef = collection(db, 'erp_integrations');
  const isNew = !integration.id;
  const docId = isNew ? doc(colRef).id : integration.id!;
  const beforeDoc = !isNew ? (await getDoc(doc(db, 'erp_integrations', docId))).data() : null;
  
  const data = {
    ...integration,
    id: docId,
    updated_at: new Date().toISOString()
  };
  
  await setDoc(doc(db, 'erp_integrations', docId), data);
  await logAction(
    isNew ? 'CREATE_ERP_INTEGRATION' : 'UPDATE_ERP_INTEGRATION',
    'erp_integrations',
    docId,
    beforeDoc,
    data,
    currentUser
  );
  return docId;
}

export async function createNotification(
  notification: Omit<Notification, 'id' | 'created_at' | 'read'>,
  _currentUser?: UserProfile
): Promise<string> {
  const colRef = collection(db, 'notifications');
  const docId = doc(colRef).id;
  const data = {
    ...notification,
    id: docId,
    read: false,
    created_at: new Date().toISOString()
  };
  await setDoc(doc(db, 'notifications', docId), data);
  return docId;
}

export async function evaluateAbsenceAlerts(
  employeeId: string,
  currentUser: UserProfile
): Promise<void> {
  const absCol = collection(db, 'absence_records');
  const q = query(absCol, where('employee_id', '==', employeeId));
  const snap = await getDocs(q);
  const employeeAbsences = snap.docs.map(d => d.data() as AbsenceRecord);
  
  const empSnap = await getDoc(doc(db, 'employees', employeeId));
  if (!empSnap.exists()) return;
  const emp = empSnap.data() as Employee;
  
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const unexcusedThisMonth = employeeAbsences.filter(a => 
    a.type === 'absence' && 
    a.subtype === 'unjustified' && 
    a.date.startsWith(currentMonthStr)
  );
  
  const unexcusedLast60Days = employeeAbsences.filter(a => 
    a.type === 'absence' && 
    a.subtype === 'unjustified' && 
    new Date(a.date) >= sixtyDaysAgo
  );
  
  const delaysThisMonth = employeeAbsences.filter(a => 
    a.type === 'delay' && 
    (a.delay_minutes || 0) > 15 && 
    a.date.startsWith(currentMonthStr)
  );
  
  if (unexcusedLast60Days.length >= 3) {
    await triggerAlert({
      alert_level: 'critical',
      alert_type: 'recurrence',
      reason: `Recorrência crítica: ${emp.name} possui ${unexcusedLast60Days.length} faltas injustificadas nos últimos 60 dias.`,
      occurrences_count: unexcusedLast60Days.length,
      period_days: 60,
      production_impact: unexcusedLast60Days.length * 400 * (emp.productivity_rate || 1.0),
      related_entity: 'employee',
      related_entity_id: emp.id,
      status: 'active',
      company_id: currentUser.company_id,
      business_unit_id: emp.business_unit_id,
      cell_id: emp.cell_id
    }, currentUser);
  }
  else if (unexcusedThisMonth.length >= 2) {
    await triggerAlert({
      alert_level: 'warning',
      alert_type: 'recurrence',
      reason: `Alerta de absenteísmo: ${emp.name} possui ${unexcusedThisMonth.length} faltas injustificadas neste mês.`,
      occurrences_count: unexcusedThisMonth.length,
      period_days: 30,
      production_impact: unexcusedThisMonth.length * 400 * (emp.productivity_rate || 1.0),
      related_entity: 'employee',
      related_entity_id: emp.id,
      status: 'active',
      company_id: currentUser.company_id,
      business_unit_id: emp.business_unit_id,
      cell_id: emp.cell_id
    }, currentUser);
  }
  
  if (delaysThisMonth.length >= 3) {
    await triggerAlert({
      alert_level: 'operational',
      alert_type: 'pattern',
      reason: `Padrão de atraso: ${emp.name} possui ${delaysThisMonth.length} atrasos superiores a 15 minutos neste mês.`,
      occurrences_count: delaysThisMonth.length,
      period_days: 30,
      production_impact: delaysThisMonth.reduce((sum, d) => sum + (d.estimated_production_loss || 0), 0),
      related_entity: 'employee',
      related_entity_id: emp.id,
      status: 'active',
      company_id: currentUser.company_id,
      business_unit_id: emp.business_unit_id,
      cell_id: emp.cell_id
    }, currentUser);
  }
}

async function triggerAlert(alertData: Omit<Alert, 'id' | 'created_at'>, currentUser: UserProfile) {
  const alertsCol = collection(db, 'alerts');
  const q = query(
    alertsCol, 
    where('related_entity_id', '==', alertData.related_entity_id),
    where('alert_type', '==', alertData.alert_type),
    where('alert_level', '==', alertData.alert_level),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const activeAlert = snap.docs[0].data() as Alert;
    await saveAlert({
      ...activeAlert,
      reason: alertData.reason,
      occurrences_count: alertData.occurrences_count,
      production_impact: alertData.production_impact,
      updated_at: new Date().toISOString()
    } as any, currentUser);
  } else {
    await saveAlert({
      ...alertData,
      created_at: new Date().toISOString()
    }, currentUser);
    
    await createNotification({
      type: alertData.alert_level === 'critical' ? 'operational_risk' : 'system_alert',
      title: `Alerta: ${alertData.alert_level.toUpperCase()}`,
      message: alertData.reason,
      recipient_role: 'supervisor',
      severity: alertData.alert_level === 'critical' ? 'critical' : (alertData.alert_level === 'warning' ? 'medium' : 'low'),
      related_entity: 'employee',
      related_entity_id: alertData.related_entity_id
    }, currentUser);
  }
}
