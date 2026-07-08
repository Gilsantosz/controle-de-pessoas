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
            // E-mail na whitelist e senha válida. Cria no Firebase Auth e loga!
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
        setError('Seu e-mail não está autorizado para acessar o sistema. Solicite liberação ao administrador.');
        setLoading(false);
        return;
      }

      // 2. Criar a conta no Firebase Authentication
      await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
    <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center p-4 md:p-6 select-none font-sans">
      
      {/* CARD CENTRAL DE LOGIN */}
      <div className="max-w-5xl w-full bg-white rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.05)] border border-[#E8ECF2]/40 overflow-hidden flex min-h-[650px] animate-in fade-in zoom-in-95 duration-500">
        
        {/* LADO ESQUERDO: FORMULÁRIO */}
        <div className="w-full md:w-[48%] p-10 md:p-12 flex flex-col justify-between">
          
          <div>
            {/* LOGO */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-tr from-[#6254E8] to-[#4F9CF9] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_12px_rgba(98,84,232,0.25)]">
                V
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-[#0F172A] tracking-tight leading-none">VacationPro</h1>
                <span className="text-[8px] font-bold text-[#8A94A6] uppercase tracking-wider">Industrial ERP</span>
              </div>
            </div>

            {/* HEADER TELA */}
            <div className="mb-8">
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mb-2">
                {isSignUp ? 'Criar sua conta' : 'Acesse a plataforma'}
              </h2>
              <p className="text-xs text-[#8A94A6] font-medium leading-relaxed">
                {isSignUp 
                  ? 'Insira o e-mail previamente autorizado por sua gerência.' 
                  : 'Entre com suas credenciais para gerenciar a capacidade industrial.'}
              </p>
            </div>

            {/* ERROR BOX */}
            {error && (
              <div className="mb-6 p-4 bg-[#FFE6EE] text-[#E04F6F] border border-[#FFE6EE]/50 text-xs font-semibold rounded-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
                <span className="shrink-0">⚠️</span>
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* FORMULÁRIO */}
            <form onSubmit={isSignUp ? handleRegister : handleLogin} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Nome Completo</label>
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
                      className="w-full h-11 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-2 focus:ring-[#6254E8]/10 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">E-mail Corporativo</label>
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
                    className="w-full h-11 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-2 focus:ring-[#6254E8]/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Senha de Acesso</label>
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
                    className="w-full h-11 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#8A94A6] focus:outline-none focus:bg-white focus:border-[#E8ECF2] focus:ring-2 focus:ring-[#6254E8]/10 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-tr from-[#6254E8] to-[#4F9CF9] text-white font-semibold text-xs transition-all hover:shadow-lg hover:shadow-[#6254E8]/15 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-6 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{isSignUp ? 'Registrar Conta' : 'Entrar na Plataforma'}</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* TABS SWITCH */}
            <div className="mt-6 text-center">
              <p className="text-[11px] text-[#8A94A6] font-medium">
                {isSignUp ? 'Já possui conta?' : 'Primeiro acesso na plataforma?'}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-[#6254E8] font-bold ml-1.5 hover:underline cursor-pointer"
                >
                  {isSignUp ? 'Entre aqui' : 'Cadastre-se'}
                </button>
              </p>
            </div>
          </div>

          {/* UTILITY SEED CARD */}
          <div className="mt-8 pt-6 border-t border-[#E8ECF2]/60 text-center shrink-0">
            {seedSuccess ? (
              <div className="p-4 bg-[#DDFBF5] text-[#0EAD98] border border-[#DDFBF5] rounded-2xl text-[11px] font-bold text-left animate-in fade-in duration-300">
                <p className="font-extrabold mb-1">✅ Dados de testes carregados!</p>
                <p className="text-[10px] text-[#8A94A6] leading-normal font-medium mb-1">
                  E-mails liberados para testes rápidos (qualquer senha de 6+ caracteres):
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
                className="w-full h-10 rounded-xl border border-[#E8ECF2] hover:bg-[#F6F8FB] text-[#8A94A6] hover:text-[#0F172A] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Database size={13} className={seeding ? 'animate-spin' : ''} />
                <span>{seeding ? 'Populando Banco...' : 'Executar SEED de Testes'}</span>
              </button>
            )}
          </div>
        </div>

        {/* LADO DIREITO: DEMO PREVIEW DO DASHBOARD (DRIBBBLE STYLE) */}
        <div className="hidden md:flex md:w-[52%] bg-gradient-to-tr from-[#6254E8]/5 via-[#4F9CF9]/5 to-transparent border-l border-[#E8ECF2]/40 p-12 items-center justify-center relative overflow-hidden">
          
          {/* Círculos gradientes desfocados */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#6254E8]/10 rounded-full filter blur-3xl -z-10 translate-x-20 -translate-y-20"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#4F9CF9]/10 rounded-full filter blur-3xl -z-10 -translate-x-10 translate-y-10"></div>
          
          {/* Mockup do Dashboard */}
          <div className="w-full max-w-[420px] bg-white rounded-3xl border border-[#E8ECF2]/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-6 space-y-6 animate-in slide-in-from-right-4 duration-500 delay-100">
            
            {/* Mock Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#E8ECF2]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-tr from-[#6254E8] to-[#4F9CF9] text-white rounded-lg flex items-center justify-center font-bold text-[10px]">VP</div>
                <div>
                  <p className="text-[8px] text-[#8A94A6] font-bold uppercase tracking-wider">Célula Industrial</p>
                  <p className="text-xs font-bold text-[#0F172A]">Corte Laser — Turno 1</p>
                </div>
              </div>
              <div>
                <span className="text-[9px] bg-[#DDFBF5] text-[#0EAD98] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={10} />
                  Estável
                </span>
              </div>
            </div>

            {/* Mock KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E8ECF2]/60">
                <p className="text-[8px] text-[#8A94A6] font-bold uppercase">Operadores</p>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5">6 / 6</p>
              </div>
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E8ECF2]/60">
                <p className="text-[8px] text-[#8A94A6] font-bold uppercase">Capacidade</p>
                <p className="text-sm font-bold text-[#0EAD98] mt-0.5">100%</p>
              </div>
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E8ECF2]/60">
                <p className="text-[8px] text-[#8A94A6] font-bold uppercase">Risco</p>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5">0%</p>
              </div>
            </div>

            {/* Gráfico Linear Ilustrado */}
            <div className="space-y-2">
              <p className="text-[8px] text-[#8A94A6] font-bold uppercase tracking-wider">Capacidade Semanal</p>
              <div className="h-24 bg-[#F7F8FC] rounded-xl border border-[#E8ECF2]/60 flex items-end justify-between p-3 gap-2">
                <div className="w-full bg-[#6254E8]/20 h-[80%] rounded-md"></div>
                <div className="w-full bg-[#6254E8]/20 h-[90%] rounded-md"></div>
                <div className="w-full bg-[#6254E8] h-[100%] rounded-md"></div>
                <div className="w-full bg-[#6254E8]/20 h-[70%] rounded-md"></div>
                <div className="w-full bg-[#4F9CF9] h-[85%] rounded-md"></div>
                <div className="w-full bg-[#6254E8]/20 h-[95%] rounded-md"></div>
              </div>
            </div>

            {/* Micro Alertas */}
            <div className="flex items-center gap-2.5 p-3 bg-[#FFF4D6]/50 border border-[#FFF4D6] rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-[#FFF4D6] flex items-center justify-center text-[#B27B00] shrink-0">
                <Zap size={11} />
              </div>
              <p className="text-[9px] text-[#B27B00] font-semibold leading-normal">
                Férias legais próximas do limite para 2 colaboradores. Planeje escalas!
              </p>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};
