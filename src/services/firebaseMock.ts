// Mock do Firebase para demonstração local sem chaves reais configuradas.
// Armazena dados e autenticação no localStorage.

import type { UserProfile, AllowedEmail } from '../types';

// Event listener para Auth
type AuthListener = (user: any) => void;
const authListeners = new Set<AuthListener>();

const getStoredUser = () => {
  const u = localStorage.getItem('mock_user');
  return u ? JSON.parse(u) : null;
};

const notifyAuthListeners = () => {
  const user = getStoredUser();
  const firebaseUser = user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    emailVerified: true
  } : null;
  authListeners.forEach(listener => listener(firebaseUser));
};

// ==========================================
// MOCK FIREBASE APP / AUTH
// ==========================================
export const initializeApp = () => ({ name: 'mock-app' });
export const getApps = () => [];
export const getApp = () => ({ name: 'mock-app' });

export const getAuth = () => {
  const user = getStoredUser();
  return {
    currentUser: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.name
    } : null
  };
};

export const auth = getAuth();

export const onAuthStateChanged = (_authObj: any, callback: AuthListener) => {
  authListeners.add(callback);
  // Executar callback inicial
  const user = getStoredUser();
  const firebaseUser = user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.name
  } : null;
  setTimeout(() => callback(firebaseUser), 10);

  return () => {
    authListeners.delete(callback);
  };
};

export const signInWithEmailAndPassword = async (_authObj: any, email: string, _password?: string) => {
  const cleanEmail = email.toLowerCase().trim();
  
  let role = 'admin';
  let allowedCellIds: string[] = [];
  let allowedTeamIds: string[] = [];
  
  if (cleanEmail === 'admin' || cleanEmail === 'admin@vacationpro.local' || cleanEmail === 'admin@vacationpro.com') {
    role = 'admin';
  } else if (cleanEmail === 'rh' || cleanEmail === 'rh@vacationpro.local') {
    role = 'hr';
  } else if (cleanEmail === 'gestor' || cleanEmail === 'gestor@vacationpro.local') {
    role = 'manager';
  } else if (cleanEmail === 'supervisor_a' || cleanEmail === 'supervisor_a@vacationpro.local') {
    role = 'supervisor';
    allowedCellIds = ['cell_corte', 'cell_solda'];
    allowedTeamIds = ['team_corte_t1', 'team_corte_t2', 'team_solda_t1'];
  } else if (cleanEmail === 'supervisor_b' || cleanEmail === 'supervisor_b@vacationpro.local') {
    role = 'supervisor';
    allowedCellIds = ['cell_dobra', 'cell_embalagem'];
    allowedTeamIds = ['team_dobra_t1', 'team_solda_t2', 'team_embalagem_t1'];
  } else {
    // Buscar na whitelist ou nos perfis
    const whitelist: AllowedEmail[] = JSON.parse(localStorage.getItem('mock_db_allowed_emails') || '[]');
    const allowed = whitelist.find(e => e.normalized_email === cleanEmail);
    
    if (!allowed) {
      throw { code: 'auth/user-not-found', message: 'E-mail não autorizado.' };
    }
    role = allowed.role;
    allowedCellIds = allowed.allowed_cell_ids || [];
    allowedTeamIds = allowed.allowed_team_ids || [];
  }

  // Obter ou criar perfil do usuário
  const users: UserProfile[] = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
  let user = users.find(u => u.normalized_email === cleanEmail);

  if (!user) {
    const newUser: UserProfile = {
      uid: 'mock_uid_' + Math.random().toString(36).substring(2, 9),
      name: cleanEmail.split('@')[0],
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@vacationpro.local`,
      normalized_email: cleanEmail,
      role: role as any,
      status: 'active',
      allowed_cell_ids: allowedCellIds,
      allowed_team_ids: allowedTeamIds,
      can_view_all_company: role === 'admin' || role === 'manager' || role === 'hr',
      can_view_all_business_unit: role === 'admin' || role === 'manager' || role === 'hr',
      can_view_all_cells: role === 'admin' || role === 'manager' || role === 'hr',
      can_view_all_teams: role === 'admin' || role === 'manager' || role === 'hr',
      can_approve: role === 'admin' || role === 'hr' || role === 'manager',
      approval_level: role === 'admin' ? 3 : (role === 'hr' ? 2 : 1),
      company_id: 'mock_company_1',
      business_unit_ids: ['mock_bu_1'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('mock_db_users', JSON.stringify(users));
    user = newUser;
  }

  localStorage.setItem('mock_user', JSON.stringify(user));
  notifyAuthListeners();
  return { user: user as UserProfile };
};

export const createUserWithEmailAndPassword = async (_authObj: any, email: string, _password?: string) => {
  return signInWithEmailAndPassword(_authObj, email, _password);
};

export const signOut = async (_authObj: any) => {
  localStorage.removeItem('mock_user');
  notifyAuthListeners();
};


// ==========================================
// MOCK FIRESTORE
// ==========================================
export const getFirestore = () => ({ name: 'mock-firestore' });
export const db = getFirestore();

export const collection = (_dbObj: any, collectionName: string) => {
  return { type: 'collection', name: collectionName };
};

export const doc = (parent: any, ...paths: string[]) => {
  if (parent.type === 'collection') {
    return { type: 'document', collectionName: parent.name, id: paths[0] };
  }
  // Se for chamado como doc(db, 'collectionName', 'id')
  return { type: 'document', collectionName: paths[0], id: paths[1] };
};

export const getDoc = async (docRef: any) => {
  const collectionName = docRef.collectionName;
  const id = docRef.id;
  const items: any[] = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '[]');
  const item = items.find(i => (i.id === id || i.uid === id));

  return {
    exists: () => !!item,
    id,
    data: () => item || null
  };
};

export const getDocs = async (queryRef: any) => {
  const collectionName = queryRef.collectionName || queryRef.name;
  let items: any[] = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '[]');

  // Aplicar filtros da query se existirem
  if (queryRef.filters && queryRef.filters.length > 0) {
    items = items.filter(item => {
      return queryRef.filters.every((f: any) => {
        if (f.type === 'where') {
          const val = item[f.field];
          if (f.op === '==') {
            return val === f.value;
          }
          if (f.op === 'in') {
            return Array.isArray(f.value) && f.value.includes(val);
          }
          if (f.op === 'array-contains') {
            return Array.isArray(val) && val.includes(f.value);
          }
          return true;
        }
        if (f.type === 'or') {
          return f.constraints.some((c: any) => {
            const val = item[c.field];
            if (c.op === '==') {
              return val === c.value;
            }
            if (c.op === 'in') {
              return Array.isArray(c.value) && c.value.includes(val);
            }
            if (c.op === 'array-contains') {
              return Array.isArray(val) && val.includes(c.value);
            }
            return false;
          });
        }
        return true;
      });
    });
  }

  return {
    empty: items.length === 0,
    docs: items.map(item => ({
      id: item.id || item.uid,
      data: () => item
    }))
  };
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const collectionName = docRef.collectionName;
  const id = docRef.id;
  const items: any[] = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '[]');
  const idx = items.findIndex(i => (i.id === id || i.uid === id));

  let finalData = { ...data };
  // Garantir campo id ou uid persistido
  if (!finalData.id && !finalData.uid) {
    finalData.id = id;
  }

  if (idx >= 0) {
    if (options?.merge) {
      items[idx] = { ...items[idx], ...finalData };
    } else {
      items[idx] = finalData;
    }
  } else {
    items.push(finalData);
  }

  localStorage.setItem(`mock_db_${collectionName}`, JSON.stringify(items));
};

export const updateDoc = async (docRef: any, data: any) => {
  return setDoc(docRef, data, { merge: true });
};

// Query builders
export const query = (colRef: any, ...constraints: any[]) => {
  const filters: any[] = [];
  constraints.forEach(c => {
    if (c && (c.type === 'where' || c.type === 'or' || c.type === 'and')) {
      filters.push(c);
    }
  });
  return { ...colRef, filters };
};

export const where = (field: string, op: string, value: any) => {
  return { type: 'where', field, op, value };
};

export const or = (...constraints: any[]) => {
  return { type: 'or', constraints };
};

export const and = (...constraints: any[]) => {
  return { type: 'and', constraints };
};

export const orderBy = () => ({ type: 'orderBy' });
export const limit = () => ({ type: 'limit' });

export const writeBatch = () => {
  const operations: Array<() => Promise<void>> = [];
  return {
    set: (docRef: any, data: any) => {
      operations.push(() => setDoc(docRef, data));
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    }
  };
};

export const addDoc = async (colRef: any, data: any) => {
  const collectionName = colRef.name;
  const items: any[] = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '[]');
  const newItem = {
    ...data,
    id: 'mock_doc_' + Math.random().toString(36).substring(2, 9)
  };
  items.push(newItem);
  localStorage.setItem(`mock_db_${collectionName}`, JSON.stringify(items));
  return { id: newItem.id };
};
