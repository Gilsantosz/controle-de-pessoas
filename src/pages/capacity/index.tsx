import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getCells, getEmployees, getVacationRequests } from '../../services/databaseServices';
import type { ProductionCell, Employee, VacationRequest, RiskLevel } from '../../types';
import { analyzeCellAvailability } from '../../services/capacityEngine';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, addDays, parseISO } from 'date-fns';
import { KpiCard } from '../../components/cards/KpiCard';
import { Activity, Layers, ShieldAlert, TrendingUp } from 'lucide-react';

export const CapacityPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de projeção
  const [selectedCellId, setSelectedCellId] = useState('');
  const [forecastDays, setForecastDays] = useState(14); // 14, 30, 60 dias

  useEffect(() => {
    if (!currentUser) return;
    const loadCapacityData = async () => {
      setLoading(true);
      try {
        const [cellData, empData, reqData] = await Promise.all([
          getCells(currentUser),
          getEmployees(currentUser),
          getVacationRequests(currentUser)
        ]);
        setCells(cellData);
        setEmployees(empData);
        setRequests(reqData);

        if (cellData.length > 0) {
          setSelectedCellId(cellData[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCapacityData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Analisando projeções de produção...</p>
      </div>
    );
  }

  const activeCell = cells.find(c => c.id === selectedCellId);
  const cellEmployees = employees.filter(e => e.cell_id === selectedCellId);

  // Projeção diária
  const startDateStr = format(new Date(), 'yyyy-MM-dd');
  const endDateStr = format(addDays(new Date(), forecastDays - 1), 'yyyy-MM-dd');

  let forecastData: any[] = [];
  let minCap = 100;
  let maxRisk: RiskLevel = 'low';

  if (activeCell) {
    const analysis = analyzeCellAvailability(
      activeCell,
      startDateStr,
      endDateStr,
      cellEmployees,
      requests
    );
    minCap = analysis.minCapacityPercentage;
    maxRisk = analysis.maxRiskLevel;
    forecastData = analysis.dailyCapacities.map(day => ({
      name: format(parseISO(day.date), 'dd/MM'),
      Capacidade: day.capacityPercentage,
      Disponíveis: day.active,
      Mínimo: activeCell.minimum_operators
    }));
  }

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Capacidade Produtiva</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Planejamento preditivo de capacidade, previsão de saídas em lote e simulação de turnos.
          </p>
        </div>
      </div>

      {/* FILTROS DE PREVISÃO */}
      <div className="bg-white premium-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Selecionar Célula</label>
          <select 
            value={selectedCellId} 
            onChange={(e) => setSelectedCellId(e.target.value)}
            className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] font-semibold focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
          >
            {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Período de Projeção</label>
          <div className="flex gap-2">
            {[14, 30, 60].map(days => (
              <button
                key={days}
                onClick={() => setForecastDays(days)}
                className={`flex-1 h-10 rounded-xl text-xs font-semibold border transition-all ${
                  forecastDays === days 
                    ? 'bg-[#6254E8] text-white border-[#6254E8]' 
                    : 'bg-white text-[#8A94A6] border-[#E8ECF2] hover:bg-[#F6F8FB]'
                }`}
              >
                {days} Dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeCell && (
        <>
          {/* RESUMO PROJEÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KpiCard 
              title="Operadores Vinculados" 
              value={cellEmployees.length} 
              icon={<Layers size={18} />} 
              description="Total na célula"
            />
            <KpiCard 
              title="Capacidade Mínima Prevista" 
              value={`${minCap}%`} 
              icon={<TrendingUp size={18} className={minCap < 70 ? 'text-[#E04F6F]' : ''} />} 
              description="Menor índice no período"
            />
            <KpiCard 
              title="Risco Operacional Máximo" 
              value={(() => {
                const riskLevelTranslations: Record<string, string> = {
                  low: 'Baixo',
                  medium: 'Médio',
                  high: 'Alto',
                  critical: 'Crítico'
                };
                return (riskLevelTranslations[maxRisk] || maxRisk).toUpperCase();
              })()}
              icon={<ShieldAlert size={18} className={maxRisk === 'critical' ? 'text-[#E04F6F]' : ''} />} 
              description="Pior cenário projetado"
            />
            <KpiCard 
              title="Min Operadores Críticos" 
              value={`${activeCell.minimum_operators} ops`} 
              icon={<Activity size={18} />} 
              description="Mínimo seguro exigido"
            />
          </div>

          {/* GRÁFICO PREDIÇÃO */}
          <div className="bg-white premium-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Projeção Operacional Diária</h3>
              <p className="text-[10px] text-[#8A94A6]">Projeção de operadores disponíveis vs limite crítico exigido.</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6254E8" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6254E8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F6F8FB" />
                  <XAxis dataKey="name" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Capacidade" stroke="#6254E8" strokeWidth={2} fillOpacity={1} fill="url(#colorCap)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
