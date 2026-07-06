import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getAbsenceRecords } from '../../services/databaseServices';
import type { AbsenceRecord } from '../../types';
import { KpiCard } from '../../components/cards/KpiCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays } from 'date-fns';
import { Activity, ShieldAlert, Clock, TrendingUp } from 'lucide-react';

export const AbsenceAnalysisPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const absData = await getAbsenceRecords(currentUser);
        setAbsences(absData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalysis();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando relatórios estatísticos...</p>
      </div>
    );
  }

  // --- STATS ---
  const totalOccurrences = absences.length;
  const totalLoss = absences.reduce((acc, curr) => acc + curr.estimated_production_loss, 0);
  const totalAbsences = absences.filter(a => a.type === 'absence').length;
  const totalDelays = absences.filter(a => a.type === 'delay').length;

  // --- CHART DADA ---
  
  // 1. Ocorrências por dia (últimos 15 dias)
  const last15DaysData = Array.from({ length: 15 }).map((_, idx) => {
    const day = subDays(new Date(), idx);
    const dateStr = format(day, 'yyyy-MM-dd');
    const label = format(day, 'dd/MM');
    const count = absences.filter(a => a.date === dateStr).length;
    return { name: label, Ocorrências: count };
  }).reverse();

  // 2. Ocorrências por colaborador (Top 5)
  const occurrencesByEmployee: Record<string, number> = {};
  absences.forEach(a => {
    occurrencesByEmployee[a.employee_name] = (occurrencesByEmployee[a.employee_name] || 0) + 1;
  });
  const employeeRankingData = Object.entries(occurrencesByEmployee)
    .map(([name, value]) => ({ name: name.substring(0, 15), Ocorrências: value }))
    .sort((a, b) => b.Ocorrências - a.Ocorrências)
    .slice(0, 5);

  // --- ALERTA DE RECORRÊNCIA (Motor de Heurística de Padrão) ---
  const patterns: string[] = [];
  Object.entries(occurrencesByEmployee).forEach(([name, count]) => {
    if (count >= 2) {
      patterns.push(`Fator Recorrência: ${name} apresentou ${count} ocorrências no período ativo. Requer alinhamento de liderança.`);
    }
  });

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Análise de Absenteísmo</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Indicadores de absenteísmo, cálculo do custo de perdas industriais e alertas de padrões de faltas.
        </p>
      </div>

      {/* KPIs DE ABSENTEÍSMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard 
          title="Total de Ocorrências" 
          value={totalOccurrences} 
          icon={<Activity size={18} />} 
          description="Faltas e atrasos consolidados"
        />
        <KpiCard 
          title="Faltas Integrais" 
          value={totalAbsences} 
          icon={<ShieldAlert size={18} className="text-[#E04F6F]" />} 
          description="Ausências completas registradas"
        />
        <KpiCard 
          title="Atrasos Registrados" 
          value={totalDelays} 
          icon={<Clock size={18} />} 
          description="Atrasos parciais de produção"
        />
        <KpiCard 
          title="Perda Produtiva Estimada" 
          value={`R$ ${totalLoss}`} 
          icon={<TrendingUp size={18} className="text-[#E04F6F]" />} 
          description="Custo financeiro estimado da ociosidade"
        />
      </div>

      {/* ÁREA DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRÁFICO 1: TENDÊNCIA ÚLTIMOS 15 DIAS */}
        <div className="bg-white premium-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Linha de Tendência Diária</h3>
            <p className="text-[10px] text-[#8A94A6]">Volume de ocorrências diárias nos últimos 15 dias.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last15DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F6F8FB" />
                <XAxis dataKey="name" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Ocorrências" stroke="#6254E8" strokeWidth={3} dot={{ fill: '#6254E8', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: RANKING COLABORADORES */}
        <div className="bg-white premium-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Ocorrências por Operador (Top 5)</h3>
            <p className="text-[10px] text-[#8A94A6]">Operadores com maior acúmulo de faltas/atrasos.</p>
          </div>
          <div className="h-64">
            {employeeRankingData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8A94A6] font-medium">
                Nenhuma ocorrência registrada no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeRankingData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F6F8FB" horizontal={false} />
                  <XAxis type="number" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="Ocorrências" fill="#20C7C9" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* MOTOR DE ALERTAS DE PADRÃO */}
      <div className="bg-white premium-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#B27B00]" />
          <h3 className="text-sm font-semibold text-[#0F172A]">Padrões e Recorrências Detectadas</h3>
        </div>

        <div className="space-y-3">
          {patterns.length === 0 ? (
            <p className="text-xs text-[#8A94A6] py-4 text-center font-medium">Nenhum padrão crítico de absenteísmo detectado.</p>
          ) : (
            patterns.map((pat, idx) => (
              <div key={idx} className="p-4 bg-[#FFF4D6]/50 border border-[#FFF4D6] rounded-2xl flex items-start gap-3">
                <span className="text-base">🚨</span>
                <p className="text-xs text-[#B27B00] font-semibold">{pat}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
