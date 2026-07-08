import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  getEmployees, getVacationRequests, getAbsenceRecords, getSystemLogs 
} from '../../services/databaseServices';
import { FileSpreadsheet, Download, ShieldAlert, History, Activity } from 'lucide-react';
import { logAction } from '../../services/auditService';

export const ReportsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [exporting, setExporting] = useState<string | null>(null);

  // Helper para baixar CSV
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type: string) => {
    if (!currentUser) return;
    setExporting(type);
    try {
      let csv = '';
      let filename = '';
      let rowCount = 0;

      if (type === 'vacations') {
        const data = await getVacationRequests(currentUser);
        filename = `ferias_export_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Colaborador;Matricula;Celula;Inicio;Fim;Dias;Status;Origem;Risco\n';
        rowCount = data.length;
        data.forEach(v => {
          csv += `"${v.employee_name}";"${v.employee_registration}";"${v.cell_name}";"${v.start_date}";"${v.end_date}";${v.days_count};"${v.status}";"${v.origin}";"${v.impact_level}"\n`;
        });
      } else if (type === 'absences') {
        const data = await getAbsenceRecords(currentUser);
        filename = `absenteismo_export_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Colaborador;Matricula;Data;Tipo;Justificativa;Minutos Atraso;Perda Estimada(R$)\n';
        rowCount = data.length;
        data.forEach(a => {
          csv += `"${a.employee_name}";"${a.employee_registration}";"${a.date}";"${a.type}";"${a.subtype}";${a.delay_minutes || 0};${a.estimated_production_loss}\n`;
        });
      } else if (type === 'expiring') {
        const data = await getEmployees(currentUser);
        filename = `ferias_vencendo_export_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Colaborador;Matricula;Cargo;Saldo Ferias;Admissao;Prazo Concessao;Status\n';
        const filtered = data.filter(e => e.vacation_balance_days > 0);
        rowCount = filtered.length;
        filtered.forEach(e => {
          csv += `"${e.name}";"${e.registration}";"${e.role}";${e.vacation_balance_days};"${e.hire_date}";"${e.concession_deadline}";"${e.status}"\n`;
        });
      } else if (type === 'logs') {
        const data = await getSystemLogs(currentUser);
        filename = `auditoria_logs_export_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Usuario;Email;Papel;Acao;Entidade;Entidade ID;Data/Hora\n';
        rowCount = data.length;
        data.forEach(l => {
          csv += `"${l.user_id}";"${l.user_email}";"${l.user_role}";"${l.action}";"${l.entity}";"${l.entity_id}";"${l.created_at}"\n`;
        });
      }

      downloadCSV(filename, csv);

      // Gravar log de exportação de dados com metadados detalhados
      await logAction(
        `EXPORT_CSV_${type.toUpperCase()}`,
        'reports',
        type,
        null,
        { 
          filename, 
          scope: currentUser.role,
          row_count: rowCount,
          exported_by_email: currentUser.email,
          exported_by_name: currentUser.name,
          timestamp: new Date().toISOString()
        },
        currentUser
      );

    } catch (err) {
      console.error(err);
      alert('Erro ao exportar dados.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER TELA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Relatórios de Exportação</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Exportação de planilhas de gestão, logs do sistema e análises de absenteísmo no formato de arquivos CSV.
        </p>
      </div>

      {/* CARDS DE EXPORTAÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: FÉRIAS */}
        <div className="bg-white premium-card p-6 flex flex-col justify-between min-h-[180px]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6254E8] flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Relatório de Solicitações de Férias</h3>
              <p className="text-xs text-[#8A94A6] mt-1 leading-relaxed">
                Planilha completa contendo todas as solicitações de férias registradas, períodos, saldo descontado e status da liberação.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleExport('vacations')}
            disabled={exporting !== null}
            className="premium-button-secondary w-full mt-6 flex items-center justify-center gap-2"
          >
            {exporting === 'vacations' ? 'Processando...' : (
              <>
                <Download size={14} />
                <span>Exportar Férias (CSV)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: ABSENTEÍSMO */}
        <div className="bg-white premium-card p-6 flex flex-col justify-between min-h-[180px]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFE6EE] text-[#E04F6F] flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Relatório de Absenteísmo</h3>
              <p className="text-xs text-[#8A94A6] mt-1 leading-relaxed">
                Lista detalhada de ocorrências de faltas integrais e atrasos parciais lançados por supervisores, incluindo custos operacionais estimados.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleExport('absences')}
            disabled={exporting !== null}
            className="premium-button-secondary w-full mt-6 flex items-center justify-center gap-2"
          >
            {exporting === 'absences' ? 'Processando...' : (
              <>
                <Download size={14} />
                <span>Exportar Absenteísmo (CSV)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 3: FÉRIAS VENCENDO */}
        <div className="bg-white premium-card p-6 flex flex-col justify-between min-h-[180px]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF4D6] text-[#B27B00] flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Passivo de Férias e Prazos Limites</h3>
              <p className="text-xs text-[#8A94A6] mt-1 leading-relaxed">
                Relação de operadores contendo saldo de férias acumulados e prazos limites de concessão trabalhista para fins de auditoria legal.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleExport('expiring')}
            disabled={exporting !== null}
            className="premium-button-secondary w-full mt-6 flex items-center justify-center gap-2"
          >
            {exporting === 'expiring' ? 'Processando...' : (
              <>
                <Download size={14} />
                <span>Exportar Saldos / Limites (CSV)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 4: LOGS AUDITORIA */}
        {currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role) && (
          <div className="bg-white premium-card p-6 flex flex-col justify-between min-h-[180px]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <History size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Logs e Auditoria do Sistema</h3>
                <p className="text-xs text-[#8A94A6] mt-1 leading-relaxed">
                  Histórico detalhado de alterações cadastrais, logins efetuados e auditorias críticas de segurança realizadas no VacationPro.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExport('logs')}
              disabled={exporting !== null}
              className="premium-button-secondary w-full mt-6 flex items-center justify-center gap-2"
            >
              {exporting === 'logs' ? 'Processando...' : (
                <>
                  <Download size={14} />
                  <span>Exportar Logs de Auditoria (CSV)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
