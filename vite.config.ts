import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const hasEnv = fs.existsSync(path.resolve(__dirname, '.env'));
let useMock = !hasEnv;

if (hasEnv) {
  const envContent = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf-8');
  if (envContent.includes('YOUR_API_KEY_HERE') || !envContent.includes('VITE_FIREBASE_API_KEY')) {
    useMock = true;
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  return {
    base: isProduction ? '/controle-de-pessoas/' : '/',
    plugins: [
      react(),
      tailwindcss()
    ],
    resolve: {
      alias: (useMock ? {
        'firebase/app': path.resolve(__dirname, 'src/services/firebaseMock.ts'),
        'firebase/auth': path.resolve(__dirname, 'src/services/firebaseMock.ts'),
        'firebase/firestore': path.resolve(__dirname, 'src/services/firebaseMock.ts'),
        '../../services/firebase': path.resolve(__dirname, 'src/services/firebaseMock.ts'),
        '../services/firebase': path.resolve(__dirname, 'src/services/firebaseMock.ts')
      } : {}) as Record<string, string>
    }
  };
})
