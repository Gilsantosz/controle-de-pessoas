import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA7T6tYpwxxk8IGjLq2QZfGAscbYtH6rSc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sistema-industrial-81775.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sistema-industrial-81775",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sistema-industrial-81775.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "697017065286",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:697017065286:web:c936e14e5d6bfa25380f47"
};

// Avisar se as chaves não estiverem configuradas
const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE";

if (!isConfigured) {
  console.warn(
    "VacationPro: As chaves de configuração do Firebase não foram encontradas ou são placeholders. " +
    "Crie um arquivo .env na raiz do projeto baseado no .env.example para conectar ao seu Firebase real."
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export { isConfigured };
export default app;
