import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Zap, Database } from 'lucide-react';
import { runDatabaseSeed } from '../../utils/seed';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSeed = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    setError(null);
    try {
      await runDatabaseSeed();
      setSeedSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Falha ao rodar Seed. Verifique a conexão com o Firebase.");
    } finally {
      setSeeding(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    let targetEmail = email.trim();
    if (targetEmail.toLowerCase() === 'admin') {
      targetEmail = 'admin@vacationpro.com';
    } else if (targetEmail.toLowerCase() === 'rh') {
      targetEmail = 'rh@vacationpro.local';
    } else if (targetEmail.toLowerCase() === 'gestor') {
      targetEmail = 'gestor@vacationpro.local';
    }

    try {
      await signInWithEmailAndPassword(auth, targetEmail, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      
      // Se falhar porque o usuário não existe no Auth, vamos ver se ele está no allowed_emails.
      // Se sim, criamos a conta no Auth na hora!
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-email'
      ) {
        try {
          const cleanEmail = targetEmail.toLowerCase();
          
          // Verificar se está em allowed_emails
          const allowedCol = collection(db, 'allowed_emails');
          const q = query(allowedCol, where('normalized_email', '==', cleanEmail));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty && password.length >= 6) {
            // E-mail está na whitelist e a senha é válida. Cria no Firebase Auth e loga!
            await createUserWithEmailAndPassword(auth, cleanEmail, password);
            navigate('/dashboard');
            return;
          }
        } catch (innerErr) {
          console.error("Auto-signup failed:", innerErr);
        }
        
        setError('E-mail ou senha incorretos. (Certifique-se de executar o SEED primeiro e usar senha de no mínimo 6 caracteres).');
      } else {
        setError('Falha na autenticação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const cleanEmail = email.toLowerCase().trim();
      
      // 1. Verificar se o e-mail está na lista allowed_emails
      const allowedCol = collection(db, 'allowed_emails');
      const q = query(allowedCol, where('normalized_email', '==', cleanEmail));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        setError('Seu e-mail não está autorizado para acessar o VacationPro. Solicite liberação ao administrador.');
        setLoading(false);
        return;
      }

      // 2. Criar a conta no Firebase Authentication
      await createUserWithEmailAndPassword(auth, cleanEmail, password);
      
      // O AppProviders vai detectar que o usuário foi autenticado,
      // e criará o perfil dele no Firestore automaticamente com base no allowed_emails.
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else {
        setError('Erro ao criar conta. Certifique-se de que a senha tenha pelo menos 6 caracteres.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex">
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-8 md:px-16 lg:px-20 bg-white border-r border-[#E8ECF2] shrink-0">
        
        {/* LOGO */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#6254E8] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
            V
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-none">VacationPro</h1>
            <span className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider">Industrial ERP</span>
          </div>
        </div>

        {/* HEADER TELA */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-2">
            {isSignUp ? 'Criar sua conta' : 'Acesse a plataforma'}
          </h2>
          <p className="text-xs text-[#8A94A6] font-medium">
            {isSignUp 
              ? 'Insira o e-mail previamente autorizado por sua gerência.' 
              : 'Entre com suas credenciais para gerenciar a capacidade industrial.'}
          </p>
        </div>

        {/* ERROR BOX */}
        {error && (
          <div className="mb-6 p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE] text-xs font-semibold rounded-2xl flex items-start gap-2.5">
            <span className="shrink-0 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={isSignUp ? handleRegister : handleLogin} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome Completo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[46px] pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-1 focus:ring-[#6254E8]/20 transition-all"
                />
              </div>
            </div>
          )}

           <div>
             <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">E-mail Corporativo</label>
             <div className="relative">
               <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
                 <Mail size={16} />
               </span>
               <input
                 type="text"
                 required
                 placeholder="nome@empresa.com ou admin"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full h-[46px] pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-1 focus:ring-[#6254E8]/20 transition-all"
               />
             </div>
           </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Senha de Acesso</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[46px] pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-1 focus:ring-[#6254E8]/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full premium-button-primary mt-6 hover:shadow-md"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isSignUp ? 'Registrar Conta' : 'Entrar na Plataforma'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* TABS SWITCH */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#8A94A6] font-medium">
            {isSignUp ? 'Já possui conta?' : 'Primeiro acesso na plataforma?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-[#6254E8] font-bold ml-1.5 hover:underline"
            >
              {isSignUp ? 'Entre aqui' : 'Cadastre-se'}
            </button>
          </p>
        </div>

        {/* UTILITY SEED CARD */}
        <div className="mt-8 pt-6 border-t border-[#E8ECF2] text-center">
          {seedSuccess ? (
            <div className="p-3.5 bg-[#DDFBF5] text-[#0EAD98] border border-[#DDFBF5] rounded-2xl text-[11px] font-bold text-left">
              <p className="font-bold mb-1">✅ Dados de testes carregados!</p>
              <p className="text-[10px] text-slate-500 leading-normal mb-1">
                E-mails liberados cadastrados. Cadastre-se na aba "Cadastre-se" com uma das contas:
              </p>
              <ul className="list-disc pl-4 text-[10px] font-mono text-slate-700 leading-tight">
                <li>admin@vacationpro.local</li>
                <li>rh@vacationpro.local</li>
                <li>gestor@vacationpro.local</li>
              </ul>
            </div>
          ) : (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full h-[42px] rounded-xl border border-[#E8ECF2] hover:bg-[#F6F8FB] text-[#8A94A6] hover:text-[#0F172A] font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Database size={14} className={seeding ? 'animate-spin' : ''} />
              <span>{seeding ? 'Populando Banco...' : 'Executar SEED de Testes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* LADO DIREITO: DEMO PREVIEW DO DASHBOARD (NEXUS STYLE) */}
      <div className="hidden lg:flex lg:flex-1 bg-[#F6F8FB] items-center justify-center p-12 overflow-hidden relative">
        {/* Círculo gradiente de fundo */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#6254E8]/10 to-[#4F9CF9]/5 rounded-full filter blur-3xl -z-10 translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#20C7C9]/10 to-transparent rounded-full filter blur-3xl -z-10 -translate-x-10 translate-y-10"></div>
        
        {/* Mockup do Dashboard */}
        <div className="w-[85%] bg-white rounded-3xl border border-[#E8ECF2] shadow-2xl p-6 space-y-6 transform scale-100 xl:scale-105 transition-all">
          {/* Mock Header */}
          <div className="flex justify-between items-center pb-4 border-b border-[#E8ECF2]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#6254E8]/10 text-[#6254E8] rounded-lg flex items-center justify-center font-bold text-xs">VP</div>
              <div>
                <p className="text-[10px] text-[#8A94A6] font-bold uppercase tracking-wider">Célula Ativa</p>
                <p className="text-xs font-bold text-[#0F172A]">Corte Laser — Turno 1</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#DDFBF5] text-[#0EAD98] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={10} />
                Capacidade Estável
              </span>
            </div>
          </div>

          {/* Mock KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase">Operadores</p>
              <p className="text-lg font-bold text-[#0F172A] mt-1">6 / 6</p>
            </div>
            <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase">Capacidade</p>
              <p className="text-lg font-bold text-[#0EAD98] mt-1">100%</p>
            </div>
            <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2]">
              <p className="text-[9px] text-[#8A94A6] font-bold uppercase">Risco Férias</p>
              <p className="text-lg font-bold text-[#0F172A] mt-1">0%</p>
            </div>
          </div>

          {/* Gráfico Linear Ilustrado */}
          <div className="space-y-2">
            <p className="text-[9px] text-[#8A94A6] font-bold uppercase tracking-wider">Histórico de Capacidade Semanal</p>
            <div className="h-28 bg-[#F7F8FC] rounded-2xl border border-[#E8ECF2] flex items-end justify-between p-4 gap-2">
              <div className="w-full bg-[#6254E8]/20 h-[80%] rounded-md relative group"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-[#0F172A] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">80%</span></div>
              <div className="w-full bg-[#6254E8]/20 h-[90%] rounded-md"></div>
              <div className="w-full bg-[#6254E8] h-[100%] rounded-md"></div>
              <div className="w-full bg-[#6254E8]/20 h-[70%] rounded-md"></div>
              <div className="w-full bg-[#6254E8]/20 h-[85%] rounded-md"></div>
              <div className="w-full bg-[#6254E8]/20 h-[95%] rounded-md"></div>
            </div>
          </div>

          {/* Micro Alertas */}
          <div className="flex items-center gap-3 p-3 bg-[#FFF4D6]/50 border border-[#FFF4D6] rounded-2xl">
            <div className="w-6 h-6 rounded-lg bg-[#FFF4D6] flex items-center justify-center text-[#B27B00]">
              <Zap size={12} />
            </div>
            <p className="text-[10px] text-[#B27B00] font-medium leading-tight">
              Aviso: 2 colaboradores têm saldo de férias próximo do limite legal. Planeje hoje!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
