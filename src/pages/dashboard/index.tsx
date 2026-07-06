import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  getEmployees, getCells, getVacationRequests, 
  getAbsenceRecords, getAlerts 
} from '../../services/databaseServices';
import type { Employee, ProductionCell, VacationRequest, AbsenceRecord, Alert } from '../../types';
import { KpiCard } from '../../components/cards/KpiCard';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { 
  Users, Calendar, Clock, Layers, ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [empData, cellData, reqData, absData, altData] = await Promise.all([
          getEmployees(currentUser),
          getCells(currentUser),
          getVacationRequests(currentUser),
          getAbsenceRecords(currentUser),
          getAlerts(currentUser)
        ]);
        
        setEmployees(empData);
        setCells(cellData);
        setRequests(reqData);
        setAbsences(absData);
        setAlerts(altData);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando métricas operacionais...</p>
      </div>
    );
  }

  // --- MÉTRIAS CONSOLIDADAS ---
  const activeCount = employees.filter(e => e.status === 'active').length;
  const onVacationCount = employees.filter(e => e.status === 'vacation').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const activeCellsCount = cells.filter(c => c.status === 'active').length;
  const criticalAlertsCount = alerts.filter(a => a.alert_level === 'critical' && a.status === 'active').length;

  // Capacidade Média
  let averageCapacity = 100;
  if (cells.length > 0) {
    const totalCap = cells.reduce((acc, curr) => acc + (curr.real_capacity / (curr.nominal_capacity || 1)), 0);
    averageCapacity = Math.round((totalCap / cells.length) * 100);
  }

  // --- DADOS DOS GRÁFICOS ---

  // 1. Capacidade prevista próximos 14 dias (Area Chart)
  const capacityForecastData = Array.from({ length: 14 }).map((_, index) => {
    const date = addDays(new Date(), index);
    const label = format(date, 'dd/MM');
    
    let totalCapPercent = 0;
    
    if (cells.length === 0) return { name: label, capacidade: 100 };

    cells.forEach(cell => {
      // Obter operadores na célula
      const cellEmps = employees.filter(e => e.cell_id === cell.id && e.status !== 'inactive');
      let onVac = 0;
      let onLeave = 0;
      
      cellEmps.forEach(emp => {
        const hasVacation = requests.some(r => {
          if (r.employee_id !== emp.id || r.status !== 'approved') return false;
          return isWithinInterval(date, { start: parseISO(r.start_date), end: parseISO(r.end_date) });
        });
        if (hasVacation) onVac++;
        else if (emp.status === 'leave') onLeave++;
      });
      
      const available = Math.max(0, cellEmps.length - onVac - onLeave);
      const cellPercent = Math.min(100, Math.round((available / (cell.nominal_capacity || 1)) * 100));
      totalCapPercent += cellPercent;
    });

    return {
      name: label,
      capacidade: Math.round(totalCapPercent / cells.length)
    };
  });

  // 2. Férias por Célula (Bar Chart)
  const vacationsByCellData = cells.map(cell => {
    const cellRequests = requests.filter(r => r.cell_id === cell.id && r.status === 'approved');
    return {
      name: cell.name.replace('Célula de ', '').substring(0, 12),
      quantidade: cellRequests.length
    };
  });

  // 3. Alertas por Severidade (Pie Chart)
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const alertsSeverityData = [
    { name: 'Crítico', value: activeAlerts.filter(a => a.alert_level === 'critical').length, color: '#E04F6F' },
    { name: 'Aviso', value: activeAlerts.filter(a => a.alert_level === 'warning').length, color: '#B27B00' },
    { name: 'Operacional', value: activeAlerts.filter(a => a.alert_level === 'operational').length, color: '#20C7C9' }
  ].filter(item => item.value > 0);

  // 4. Absenteísmo por mês
  const absRecordByMonth = Array.from({ length: 6 }).map((_, index) => {
    const date = addDays(new Date(), -index * 30);
    const label = format(date, 'MMM', { locale: ptBR });
    
    // Obter registros neste mês
    const count = absences.filter(abs => {
      const absDate = parseISO(abs.date);
      return absDate.getMonth() === date.getMonth() && absDate.getFullYear() === date.getFullYear();
    }).length;

    return { name: label, faltas: count };
  }).reverse();

  return (
    <div className="space-y-8">
      {/* HEADER E TÍTULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            {currentUser?.role === 'supervisor' ? 'Painel da Minha Equipe' : 'Dashboard de Capacidade Geral'}
          </h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Resumo em tempo real do planejamento de férias, absenteísmo e produtividade da fábrica.
          </p>
        </div>
      </div>

      {/* CARDS DE KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <KpiCard 
          title="Colaboradores Ativos" 
          value={activeCount} 
          icon={<Users size={18} />} 
          description="Operando no chão de fábrica"
        />
        <KpiCard 
          title="Em Férias Hoje" 
          value={onVacationCount} 
          icon={<Calendar size={18} />} 
          description="Ausências programadas"
        />
        <KpiCard 
          title="Aprovações Pendentes" 
          value={pendingRequestsCount} 
          icon={<Clock size={18} />} 
          description="Aguardando liberação"
        />
        <KpiCard 
          title="Células Ativas" 
          value={activeCellsCount} 
          icon={<Layers size={18} />} 
          description="Setores em operação"
        />
        <KpiCard 
          title="Capacidade Média" 
          value={`${averageCapacity}%`} 
          icon={<TrendingUp size={18} />} 
          description="Eficiência nominal total"
        />
        <KpiCard 
          title="Alertas Críticos" 
          value={criticalAlertsCount} 
          icon={<ShieldAlert size={18} className="text-[#E04F6F]" />} 
          description="Ações urgentes requeridas"
        />
      </div>

      {/* ÁREA DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICO 1: CAPACIDADE PREVISTA */}
        <div className="bg-white premium-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Capacidade Operacional Prevista</h3>
              <p className="text-[10px] text-[#8A94A6]">Previsão da capacidade produtiva nos próximos 14 dias.</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={capacityForecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6254E8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6254E8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F6F8FB" />
                <XAxis dataKey="name" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} domain={[40, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="capacidade" stroke="#6254E8" strokeWidth={2} fillOpacity={1} fill="url(#colorCap)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: SEVERIDADE DOS ALERTAS */}
        <div className="bg-white premium-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Alertas por Gravidade</h3>
            <p className="text-[10px] text-[#8A94A6]">Distribuição dos alertas ativos.</p>
          </div>
          
          <div className="h-48 w-full flex items-center justify-center my-4">
            {alertsSeverityData.length === 0 ? (
              <p className="text-xs text-[#8A94A6] font-medium">Nenhum alerta ativo encontrado.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertsSeverityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {alertsSeverityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2">
            {alertsSeverityData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-[#8A94A6]">{item.name}</span>
                </div>
                <span className="text-[#0F172A]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRÁFICO 3: FÉRIAS POR CÉLULA */}
        <div className="bg-white premium-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Solicitações Aprovadas por Célula</h3>
            <p className="text-[10px] text-[#8A94A6]">Volume acumulado de férias por setor.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vacationsByCellData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F6F8FB" />
                <XAxis dataKey="name" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#6254E8" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 4: ABSENTEÍSMO */}
        <div className="bg-white premium-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Evolução do Absenteísmo</h3>
            <p className="text-[10px] text-[#8A94A6]">Número mensal de ausências/faltas registradas.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={absRecordByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAbs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#20C7C9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#20C7C9" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F6F8FB" />
                <XAxis dataKey="name" stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="faltas" stroke="#20C7C9" strokeWidth={2} fillOpacity={1} fill="url(#colorAbs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* EVENTOS CRÍTICOS INFERIORES */}
      <div className="bg-white premium-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#E04F6F]" />
          <h3 className="text-sm font-semibold text-[#0F172A]">Alertas de Capacidade Crítica & Concessões Legais</h3>
        </div>
        
        <div className="divide-y divide-[#F6F8FB]">
          {activeAlerts.length === 0 ? (
            <p className="text-xs text-[#8A94A6] py-4 text-center font-medium">Nenhum evento crítico detectado no momento.</p>
          ) : (
            activeAlerts.slice(0, 5).map((alt) => (
              <div key={alt.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    alt.alert_level === 'critical' 
                      ? 'bg-[#FFE6EE] text-[#E04F6F]' 
                      : 'bg-[#FFF4D6] text-[#B27B00]'
                  }`}>
                    ⚠️
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">{alt.reason}</p>
                    <p className="text-[10px] text-[#8A94A6] mt-0.5">Célula: {alt.cell_id} | Severidade: {alt.alert_level}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <RiskBadge level={alt.alert_level === 'warning' ? 'high' : (alt.alert_level === 'operational' ? 'low' : 'critical')} />
                  {alt.production_impact > 0 && (
                    <p className="text-[10px] text-[#E04F6F] font-bold mt-1">Perda: R$ {alt.production_impact}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
