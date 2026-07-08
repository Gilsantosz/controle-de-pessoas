import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAppStore } from '../store/useAppStore';
import type { UserProfile, AllowedEmail } from '../types';

interface ProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<ProvidersProps> = ({ children }) => {
  const { setCurrentUser, setIsAuthLoading, isAuthLoading } = useAppStore();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);
      setAuthError(null);

      if (!firebaseUser) {
        setCurrentUser(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const email = firebaseUser.email?.toLowerCase().trim() || "";
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          
          if (profile.status !== 'active') {
            setAuthError("Seu acesso está bloqueado. Procure o administrador do sistema.");
            await signOut(auth);
            setCurrentUser(null);
          } else {
            setCurrentUser(profile);
            // Atualizar o last_login
            await setDoc(userDocRef, { last_login: new Date().toISOString() }, { merge: true });
          }
        } else {
          // Usuário não possui documento de perfil no Firestore.
          // Vamos verificar se seu e-mail está na lista allowed_emails
          const allowedDocRef = doc(db, 'allowed_emails', email);
          const allowedDocSnap = await getDoc(allowedDocRef);

          if (allowedDocSnap.exists()) {
            // E-mail autorizado! Cria o perfil inicial no Firestore
            const allowedData = allowedDocSnap.data() as AllowedEmail;
            
            let updatedAllowedTeamIds = [...(allowedData.allowed_team_ids || [])];
            let updatedAllowedCellIds = [...(allowedData.allowed_cell_ids || [])];
            
            if (allowedData.role === 'supervisor' && updatedAllowedTeamIds.length === 0) {
              const supervisorName = firebaseUser.displayName || email.split('@')[0];
              const ownTeamId = `team_own_${firebaseUser.uid}`;
              const teamDocRef = doc(db, 'teams', ownTeamId);
              
              await setDoc(teamDocRef, {
                id: ownTeamId,
                company_id: allowedData.company_id || 'empresa_001',
                business_unit_id: 'bu_industrial',
                cell_id: 'cell_solda',
                name: `Equipe de ${supervisorName}`,
                description: `Equipe própria de ${supervisorName}`,
                shift: 'morning',
                supervisor_ids: [firebaseUser.uid],
                owner_supervisor_id: firebaseUser.uid,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
              updatedAllowedTeamIds.push(ownTeamId);
              if (!updatedAllowedCellIds.includes('cell_solda')) {
                updatedAllowedCellIds.push('cell_solda');
              }
            }

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || email.split('@')[0],
              email: firebaseUser.email || email,
              normalized_email: email,
              role: allowedData.role,
              status: 'active',
              company_id: allowedData.company_id || 'empresa_001',
              business_unit_ids: ['bu_industrial'],
              allowed_cell_ids: updatedAllowedCellIds,
              allowed_team_ids: updatedAllowedTeamIds,
              can_view_all_company: ['admin', 'manager'].includes(allowedData.role),
              can_view_all_business_unit: ['admin', 'manager', 'hr'].includes(allowedData.role),
              can_view_all_cells: ['admin', 'manager', 'hr'].includes(allowedData.role),
              can_view_all_teams: ['admin', 'manager', 'hr'].includes(allowedData.role),
              can_approve: ['admin', 'manager', 'hr', 'supervisor'].includes(allowedData.role),
              approval_level: allowedData.role === 'admin' ? 3 : (allowedData.role === 'manager' ? 2 : 1),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            };

            await setDoc(userDocRef, newProfile);
            setCurrentUser(newProfile);
          } else {
            // E-mail não cadastrado nem autorizado
            setAuthError("Seu e-mail não está autorizado para acessar o sistema. Solicite liberação ao administrador.");
            await signOut(auth);
            setCurrentUser(null);
          }
        }
      } catch (error: any) {
        console.error("Erro durante carregamento do perfil:", error);
        setAuthError("Erro de comunicação com o servidor de dados.");
        await signOut(auth);
        setCurrentUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setCurrentUser, setIsAuthLoading]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] font-medium">Carregando VacationPro...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex flex-col items-center justify-center px-4">
        <div className="bg-white premium-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FFE6EE] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#E04F6F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[#0F172A] font-semibold text-xl mb-2">Acesso Negado</h2>
          <p className="text-[#8A94A6] mb-6">{authError}</p>
          <button 
            onClick={() => setAuthError(null)}
            className="w-full premium-button-primary"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
