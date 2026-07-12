import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  getEmployees, getVacationRequests, getAbsenceRecords, getSystemLogs 
} from '../../services/databaseServices';
import { FileSpreadsheet, Download, ShieldAlert, History, Activity, FileText } from 'lucide-react';
import { logAction } from '../../services/auditService';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const handleExportPDF = async (type: string) => {
    if (!currentUser) return;
    setExporting(`${type}_pdf`);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let reportTitle = '';
      let headers: string[] = [];
      let rows: any[][] = [];
      let filename = '';
      let rowCount = 0;

      // Traduções e Formatadores
      const statusTranslations: Record<string, string> = {
        approved: 'Aprovado',
        pending: 'Pendente',
        rejected: 'Reprovado',
        active: 'Ativo',
        inactive: 'Inativo'
      };
      
      const roleTranslations: Record<string, string> = {
        admin: 'Administrador',
        hr: 'Recursos Humanos',
        manager: 'Gestão Geral',
        supervisor: 'Supervisor',
        user: 'Colaborador',
        viewer: 'Visualizador'
      };

      const originTranslations: Record<string, string> = {
        automatic_suggestion: 'Sugestão',
        manual_entry: 'Manual',
        employee_request: 'Funcionário',
        hr_entry: 'Lançamento RH'
      };

      const riskTranslations: Record<string, string> = {
        low: 'Baixo',
        medium: 'Médio',
        high: 'Alto',
        critical: 'Crítico'
      };

      const formatDateStr = (dateStr: string) => {
        try {
          return format(parseISO(dateStr), 'dd/MM/yyyy');
        } catch {
          return dateStr;
        }
      };

      if (type === 'vacations') {
        const data = await getVacationRequests(currentUser);
        filename = `ferias_export_${new Date().toISOString().slice(0,10)}.pdf`;
        reportTitle = 'Relatório de Solicitações de Férias';
        headers = ['Colaborador', 'Matrícula', 'Célula', 'Período', 'Dias', 'Status', 'Origem', 'Risco'];
        rowCount = data.length;
        rows = data.map(v => [
          v.employee_name,
          v.employee_registration || '—',
          v.cell_name,
          `${formatDateStr(v.start_date)} até ${formatDateStr(v.end_date)}`,
          v.days_count.toString(),
          statusTranslations[v.status] || v.status,
          originTranslations[v.origin] || v.origin,
          riskTranslations[v.impact_level] || v.impact_level || '—'
        ]);
      } else if (type === 'absences') {
        const data = await getAbsenceRecords(currentUser);
        filename = `absenteismo_export_${new Date().toISOString().slice(0,10)}.pdf`;
        reportTitle = 'Relatório de Absenteísmo e Ausências';
        headers = ['Colaborador', 'Matrícula', 'Data', 'Tipo', 'Justificativa', 'Atraso', 'Perda Est.'];
        rowCount = data.length;
        rows = data.map(a => [
          a.employee_name,
          a.employee_registration || '—',
          formatDateStr(a.date),
          a.type === 'absence' ? 'Falta Integral' : 'Atraso Parcial',
          a.subtype || '—',
          a.delay_minutes ? `${a.delay_minutes} min` : '—',
          a.estimated_production_loss ? `R$ ${a.estimated_production_loss.toFixed(2)}` : 'R$ 0,00'
        ]);
      } else if (type === 'expiring') {
        const data = await getEmployees(currentUser);
        const filtered = data.filter(e => e.vacation_balance_days > 0);
        filename = `ferias_vencendo_export_${new Date().toISOString().slice(0,10)}.pdf`;
        reportTitle = 'Passivo de Férias e Prazos Limites';
        headers = ['Colaborador', 'Matrícula', 'Cargo', 'Saldo (Dias)', 'Admissão', 'Prazo Concessão', 'Status'];
        rowCount = filtered.length;
        rows = filtered.map(e => [
          e.name,
          e.registration || '—',
          e.role || '—',
          e.vacation_balance_days.toString(),
          formatDateStr(e.hire_date),
          formatDateStr(e.concession_deadline),
          statusTranslations[e.status] || e.status
        ]);
      } else if (type === 'logs') {
        const data = await getSystemLogs(currentUser);
        filename = `auditoria_logs_export_${new Date().toISOString().slice(0,10)}.pdf`;
        reportTitle = 'Logs de Auditoria e Segurança';
        headers = ['E-mail', 'Papel', 'Ação', 'Entidade', 'Entidade ID', 'Data/Hora'];
        rowCount = data.length;
        rows = data.map(l => [
          l.user_email,
          roleTranslations[l.user_role] || l.user_role || '—',
          l.action,
          l.entity || '—',
          l.entity_id || '—',
          formatDateStr(l.created_at.split('T')[0]) + ' ' + l.created_at.split('T')[1]?.slice(0, 5)
        ]);
      }

      // Draw custom technical header
      // Orange branding box (Zentra)
      doc.setFillColor(255, 154, 62); // #FF9A3E
      doc.rect(14, 12, 10, 10, 'F');
      
      // White bold 'Z' inside box
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Z', 17.5, 19.2);

      // System brand title next to logo
      doc.setTextColor(15, 23, 42); // #0F172A
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('zentra', 27, 18.5);

      // Subtitle
      doc.setTextColor(138, 148, 166); // #8A94A6
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('VacationPro', 27, 22.5);

      // Metadata block on the right
      doc.setTextColor(138, 148, 166);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Emissor: ${currentUser.name}`, 196, 16, { align: 'right' });
      doc.text(`Perfil: ${roleTranslations[currentUser.role] || currentUser.role}`, 196, 20, { align: 'right' });
      doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 196, 24, { align: 'right' });

      // Technical divider line
      doc.setDrawColor(232, 236, 242); // #E8ECF2
      doc.setLineWidth(0.5);
      doc.line(14, 28, 196, 28);

      // Report title
      doc.setTextColor(15, 23, 42); // #0F172A
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(reportTitle, 14, 37);

      // Table footer page placeholder
      const totalPagesExp = '{total_pages_count_string}';

      // Styled table render
      autoTable(doc, {
        startY: 42,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: {
          fillColor: [98, 84, 232], // #6254E8 (primary purple)
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'left',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [15, 23, 42],
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [246, 248, 251] // #F6F8FB
        },
        margin: { left: 14, right: 14 },
        styles: {
          overflow: 'linebreak',
          cellPadding: 2
        },
        didDrawPage: (data) => {
          // Page Footer
          doc.setFontSize(7.5);
          doc.setTextColor(138, 148, 166);
          doc.setFont('helvetica', 'normal');
          
          doc.text(
            `Página ${data.pageNumber} de ${totalPagesExp}`,
            196,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
          );
          doc.text(
            'zentra VacationPro — Relatório Gerencial Confidencial',
            14,
            doc.internal.pageSize.height - 10
          );
        }
      });

      // Replace total pages placeholder
      if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages(totalPagesExp);
      }

      // Save PDF in client
      doc.save(filename);

      // Log action in audit service
      await logAction(
        `EXPORT_PDF_${type.toUpperCase()}`,
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
      alert('Erro ao exportar relatório em PDF.');
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
          Exportação de planilhas de gestão, logs do sistema e análises de absenteísmo nos formatos CSV e PDF.
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
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleExport('vacations')}
              disabled={exporting !== null}
              className="premium-button-secondary flex-1 flex items-center justify-center gap-2 text-xs h-10"
            >
              {exporting === 'vacations' ? '...' : (
                <>
                  <Download size={14} />
                  <span>CSV</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleExportPDF('vacations')}
              disabled={exporting !== null}
              className="premium-button-primary flex-1 flex items-center justify-center gap-2 text-xs h-10 bg-[#6254E8] hover:bg-[#5145CD]"
            >
              {exporting === 'vacations_pdf' ? '...' : (
                <>
                  <FileText size={14} />
                  <span>PDF</span>
                </>
              )}
            </button>
          </div>
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
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleExport('absences')}
              disabled={exporting !== null}
              className="premium-button-secondary flex-1 flex items-center justify-center gap-2 text-xs h-10"
            >
              {exporting === 'absences' ? '...' : (
                <>
                  <Download size={14} />
                  <span>CSV</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleExportPDF('absences')}
              disabled={exporting !== null}
              className="premium-button-primary flex-1 flex items-center justify-center gap-2 text-xs h-10 bg-[#6254E8] hover:bg-[#5145CD]"
            >
              {exporting === 'absences_pdf' ? '...' : (
                <>
                  <FileText size={14} />
                  <span>PDF</span>
                </>
              )}
            </button>
          </div>
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
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleExport('expiring')}
              disabled={exporting !== null}
              className="premium-button-secondary flex-1 flex items-center justify-center gap-2 text-xs h-10"
            >
              {exporting === 'expiring' ? '...' : (
                <>
                  <Download size={14} />
                  <span>CSV</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleExportPDF('expiring')}
              disabled={exporting !== null}
              className="premium-button-primary flex-1 flex items-center justify-center gap-2 text-xs h-10 bg-[#6254E8] hover:bg-[#5145CD]"
            >
              {exporting === 'expiring_pdf' ? '...' : (
                <>
                  <FileText size={14} />
                  <span>PDF</span>
                </>
              )}
            </button>
          </div>
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
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleExport('logs')}
                disabled={exporting !== null}
                className="premium-button-secondary flex-1 flex items-center justify-center gap-2 text-xs h-10"
              >
                {exporting === 'logs' ? '...' : (
                  <>
                    <Download size={14} />
                    <span>CSV</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleExportPDF('logs')}
                disabled={exporting !== null}
                className="premium-button-primary flex-1 flex items-center justify-center gap-2 text-xs h-10 bg-[#6254E8] hover:bg-[#5145CD]"
              >
                {exporting === 'logs_pdf' ? '...' : (
                  <>
                    <FileText size={14} />
                    <span>PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
