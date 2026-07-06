import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getERPIntegrations, saveERPIntegration } from '../../services/databaseServices';
import type { ERPIntegration } from '../../types';
import { Link2, Save, RefreshCw, History } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [integrations, setIntegrations] = useState<ERPIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<'sap' | 'oracle' | 'totvs' | 'senior' | 'other'>('sap');
  const [endpoint, setEndpoint] = useState('https://api.sap.empresa.com/v1/rh/employees');
  const [syncFreq, setSyncFreq] = useState<'manual' | 'hourly' | 'daily' | 'weekly'>('daily');
  const [status, setStatus] = useState<'active' | 'inactive' | 'testing'>('testing');
  
  // Simulated logs
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadIntegrations = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getERPIntegrations(currentUser);
      setIntegrations(data);
      if (data.length > 0) {
        const active = data[0];
        setSelectedSystem(active.system_type);
        setEndpoint(active.endpoint);
        setSyncFreq(active.sync_frequency);
        setStatus(active.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
    
    // Seed logs iniciais
    setSyncLogs([
      `[${new Date().toISOString().slice(0, 19)}] Inicializando canal de comunicação ERP...`,
      `[${new Date().toISOString().slice(0, 19)}] Autenticação efetuada com sucesso via OAuth2.`,
      `[${new Date().toISOString().slice(0, 19)}] Última sincronização efetuada: importados 30 colaboradores.`
    ]);
  }, [currentUser]);

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    const integrationObj = {
      company_id: currentUser.company_id,
      name: `${selectedSystem.toUpperCase()} Link`,
      system_type: selectedSystem,
      endpoint,
      api_key_reference: `vault:erp_${selectedSystem}_key`,
      sync_direction: 'bidirectional' as const,
      sync_frequency: syncFreq,
      mappings: { name: 'FullName', registration: 'EmpID', hire_date: 'AdmissionDate' },
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Obter id se já houver registro anterior para sobrescrever
      const existingId = integrations[0]?.id;
      await saveERPIntegration(existingId ? { ...integrationObj, id: existingId } : integrationObj, currentUser);
      alert('Configuração de Integração ERP salva!');
      loadIntegrations();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar parametrizações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = () => {
    setSyncing(true);
    setSyncLogs(prev => [
      `[${new Date().toISOString().slice(0, 19)}] Iniciando sincronização sob demanda com ERP...`,
      ...prev
    ]);

    setTimeout(() => {
      setSyncing(false);
      setSyncLogs(prev => [
        `[${new Date().toISOString().slice(0, 19)}] Sucesso: Sincronização concluída. 0 conflitos identificados.`,
        `[${new Date().toISOString().slice(0, 19)}] Importados dados de saldo de 30 colaboradores.`,
        ...prev
      ]);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#6254E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#8A94A6] text-xs font-semibold">Carregando painel de integrações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Integrações ERP</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Configure a conexão do VacationPro com o ERP corporativo (SAP, Oracle, Totvs, Senior) para sync automático de colaboradores e saldos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORM CONFIGURAÇÃO */}
        <form onSubmit={handleSaveIntegration} className="bg-white premium-card p-6 md:p-8 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F6F8FB]">
            <Link2 size={18} className="text-[#6254E8]" />
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Parametrização do Canal API</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Sistema de ERP</label>
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value as any)}
                className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
              >
                <option value="sap">SAP ERP Core</option>
                <option value="totvs">TOTVS Protheus</option>
                <option value="oracle">Oracle NetSuite</option>
                <option value="senior">Senior HCM</option>
                <option value="other">Outros (REST API / JSON)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Endpoint de Integração (URL)</label>
              <input
                type="url"
                required
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full h-10 px-3.5 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Frequência Sincronização</label>
                <select
                  value={syncFreq}
                  onChange={(e) => setSyncFreq(e.target.value as any)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white"
                >
                  <option value="manual">Manual (Sob Demanda)</option>
                  <option value="hourly">De hora em hora</option>
                  <option value="daily">Diário (Madrugada)</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-2">Status do Canal</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white"
                >
                  <option value="testing">Homologação (Testes)</option>
                  <option value="active">Produção (Ativo)</option>
                  <option value="inactive">Suspenso (Desativado)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#F6F8FB]">
            <button type="submit" className="premium-button-primary">
              <Save size={16} />
              <span>Salvar Canal</span>
            </button>
          </div>
        </form>

        {/* LOGS DE SINCRONIZAÇÃO */}
        <div className="space-y-6">
          <div className="bg-white premium-card p-6 flex flex-col justify-between h-[380px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F6F8FB] mb-4">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-[#6254E8]" />
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Monitor de Sync</h3>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="p-1.5 rounded-lg border border-[#E8ECF2] hover:bg-[#F6F8FB] text-[#8A94A6] hover:text-[#6254E8] transition-all"
                  title="Sincronizar Agora"
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="bg-[#0F172A] text-emerald-400 font-mono text-[10px] p-4 rounded-2xl h-[260px] overflow-y-auto space-y-2 select-text">
                {syncLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed">{log}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
