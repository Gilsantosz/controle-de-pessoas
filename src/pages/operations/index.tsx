import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getCells, getEmployees, getVacationRequests } from '../../services/databaseServices';
import type { ProductionCell, Employee, VacationRequest } from '../../types';
import { analyzeCellAvailability } from '../../services/capacityEngine';
import { RiskBadge } from '../../components/feedback/RiskBadge';
import { 
  Volume2, VolumeX, AlertOctagon 
} from 'lucide-react';
import { format } from 'date-fns';

export const OperationsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [cells, setCells] = useState<ProductionCell[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const loadOperationsData = async () => {
    if (!currentUser) return;
    try {
      const [cellData, empData, reqData] = await Promise.all([
        getCells(currentUser),
        getEmployees(currentUser),
        getVacationRequests(currentUser)
      ]);
      setCells(cellData);
      setEmployees(empData);
      setRequests(reqData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadOperationsData();
    // Atualização em tempo real (polling de 10s no MVP)
    const interval = setInterval(loadOperationsData, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Verificar se há risco crítico ativo para emitir alerta sonoro/visual
  const hasCriticalRisk = cells.some(cell => {
    const cellEmps = employees.filter(e => e.cell_id === cell.id && e.status !== 'inactive');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const analysis = analyzeCellAvailability(cell, todayStr, todayStr, cellEmps, requests);
    return analysis.maxRiskLevel === 'critical';
  });

  // Tocar som de alerta operacional discreto se ativado
  useEffect(() => {
    if (hasCriticalRisk && soundEnabled) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      // Desliga após 500ms
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 500);
    }
  }, [hasCriticalRisk, soundEnabled]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Sincronizando painel operacional...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Painel Operacional em Tempo Real</h2>
          <p className="text-xs text-[#8A94A6] font-medium mt-1">
            Painel de controle de chão de fábrica. Status de células produtivas e níveis de risco imediatos.
          </p>
        </div>

        {/* ALERTA SONORO CONTROLE */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-xs font-semibold transition-all ${
            soundEnabled 
              ? 'bg-[#FFE6EE] text-[#E04F6F] border-[#FFE6EE]' 
              : 'bg-white text-[#8A94A6] border-[#E8ECF2] hover:bg-[#F6F8FB]'
          }`}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundEnabled ? 'Alarme Sonoro Ativo' : 'Alarme Sonoro Mudo'}</span>
        </button>
      </div>

      {/* RISCO CRÍTICO FLASHER BANNER */}
      {hasCriticalRisk && (
        <div className="bg-[#FFE6EE] border border-[#FFE6EE] text-[#E04F6F] p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon size={24} className="shrink-0" />
            <div>
              <p className="text-xs font-bold">ALERTA OPERACIONAL: Capacidade produtiva crítica detectada!</p>
              <p className="text-[10px] opacity-90 mt-0.5">Alguns setores estão operando abaixo do limite mínimo necessário de colaboradores hoje.</p>
            </div>
          </div>
        </div>
      )}

      {/* GRID DE CÉLULAS PRODUTIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cells.map(cell => {
          const cellEmps = employees.filter(e => e.cell_id === cell.id && e.status !== 'inactive');
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          
          // Análise diária da célula
          const analysis = analyzeCellAvailability(cell, todayStr, todayStr, cellEmps, requests);
          const current = analysis.dailyCapacities[0];
          
          return (
            <div 
              key={cell.id} 
              className={`premium-card p-6 flex flex-col justify-between min-h-[220px] transition-all border ${
                current.riskLevel === 'critical' ? 'border-[#E04F6F]/30 bg-red-50/10' : ''
              }`}
            >
              <div className="flex justify-between items-start pb-3 border-b border-[#F6F8FB]">
                <div>
                  <h3 className="font-bold text-xs text-[#0F172A]">{cell.name}</h3>
                  <span className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-wider">{cell.process_type}</span>
                </div>
                <RiskBadge level={current.riskLevel} />
              </div>

              {/* Métricas de operadores hoje */}
              <div className="py-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Capacidade</span>
                  <span className={`text-lg font-bold ${
                    current.capacityPercentage < 70 ? 'text-[#E04F6F]' : 'text-[#0EAD98]'
                  }`}>{current.capacityPercentage}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Operadores Hoje</span>
                  <span className="text-lg font-bold text-[#0F172A]">{current.active} / {cell.nominal_capacity}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Em Férias</span>
                  <span className="text-sm font-semibold text-slate-700">{current.onVacation} ops</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8A94A6] font-bold uppercase block mb-1">Mínimo Exigido</span>
                  <span className="text-sm font-semibold text-slate-700">{cell.minimum_operators} ops</span>
                </div>
              </div>

              {/* Status footer da célula */}
              <div className="pt-3 border-t border-[#F6F8FB] flex items-center justify-between text-[10px] text-[#8A94A6] font-medium">
                <span>Status: {cell.status === 'active' ? 'Operando' : 'Manutenção'}</span>
                {cell.is_critical && (
                  <span className="text-[#E04F6F] font-bold">Processo Crítico</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
