import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { SystemLog, UserProfile } from '../types';

/**
 * Registra uma ação de auditoria no Firestore.
 */
export async function logAction(
  action: string,
  entity: string,
  entityId: string,
  before: any = null,
  after: any = null,
  currentUser: UserProfile | null = null
): Promise<void> {
  try {
    const user = auth.currentUser;
    const logEntry: Omit<SystemLog, 'id'> = {
      user_id: user?.uid || 'system',
      user_email: user?.email || 'system@vacationpro.local',
      user_role: currentUser?.role || 'viewer',
      company_id: currentUser?.company_id || 'system_company',
      business_unit_id: currentUser?.business_unit_ids?.[0] || '',
      action,
      entity,
      entity_id: entityId,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
      created_at: new Date().toISOString()
    };

    const logsCol = collection(db, 'system_logs');
    await addDoc(logsCol, logEntry);
  } catch (error) {
    console.error('Falha ao gravar log de auditoria:', error);
  }
}
