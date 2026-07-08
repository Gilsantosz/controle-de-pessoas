import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getEmployees } from '../../services/databaseServices';
import { logAction } from '../../services/auditService';
import type { Employee } from '../../types';
import { 
  FileText, UploadCloud, CheckCircle, AlertTriangle, XCircle, 
  Loader2, Save, AlertCircle
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

declare global {
  interface Window {
    XLSX: any;
    pdfjsLib: any;
    Tesseract: any;
  }
}

interface CrossCheckResult {
  originalText: string;
  status: 'found' | 'partial' | 'not_found';
  confidence: number;
  matchedEmployeeId: string | null;
  matchedEmployeeName: string | null;
  matchedEmployeeReg: string | null;
}

export const RhCrossCheckPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('payroll'); // payroll, medical, attendance, other
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [results, setResults] = useState<CrossCheckResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar Scripts de Terceiros Dinamicamente
  useEffect(() => {
    const scripts = [
      { id: 'sheetjs-script', src: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js' },
      { id: 'pdfjs-script', src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js' },
      { id: 'tesseract-script', src: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js' }
    ];

    scripts.forEach(s => {
      if (!document.getElementById(s.id)) {
        const script = document.createElement('script');
        script.id = s.id;
        script.src = s.src;
        script.async = true;
        document.body.appendChild(script);
      }
    });

    if (currentUser) {
      getEmployees(currentUser)
        .then(data => {
          setEmployees(data);
        })
        .catch(err => {
          console.error(err);
          setError('Erro ao carregar colaboradores do escopo.');
        });
    }
  }, [currentUser]);

  // Algoritmo de Distância de Levenshtein
  const getLevenshteinDistance = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // Deletion
          matrix[i][j - 1] + 1,       // Insertion
          matrix[i - 1][j - 1] + cost  // Substitution
        );
      }
    }
    return matrix[len1][len2];
  };

  const getSimilarityPercentage = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 100;
    
    // Verificação de inclusão direta (ex: sobrenome ou nome completo parcial)
    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(s1.length, s2.length);
      const maxLen = Math.max(s1.length, s2.length);
      return Math.round((minLen / maxLen) * 100);
    }

    const distance = getLevenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 100;
    return Math.round(((maxLength - distance) / maxLength) * 100);
  };

  // Cruza as linhas extraídas com os colaboradores do escopo
  const performCrossCheck = (lines: string[]) => {
    const cleanLines = lines
      .map(l => l.trim())
      .filter(l => l.length > 2); // ignora linhas muito curtas

    const checkResults: CrossCheckResult[] = cleanLines.map(line => {
      let bestMatch: Employee | null = null;
      let highestConfidence = 0;

      // Percorre os funcionários procurando correspondências por nome, matrícula ou e-mail
      employees.forEach(emp => {
        const normalizedLine = line.toLowerCase();
        
        // Match exato de matrícula ou e-mail (100% de confiança)
        const hasReg = emp.registration && normalizedLine.includes(emp.registration.toLowerCase());
        const hasEmail = emp.email && normalizedLine.includes(emp.email.toLowerCase());

        if (hasReg || hasEmail) {
          highestConfidence = 100;
          bestMatch = emp;
          return;
        }

        // Caso contrário, calcula similaridade por similaridade de texto no nome
        const similarity = getSimilarityPercentage(line, emp.name);
        if (similarity > highestConfidence) {
          highestConfidence = similarity;
          bestMatch = emp;
        }
      });

      // Classifica segundo regras de confiança
      let status: 'found' | 'partial' | 'not_found' = 'not_found';
      if (highestConfidence >= 90) {
        status = 'found';
      } else if (highestConfidence >= 80) {
        status = 'partial';
      }

      return {
        originalText: line,
        status,
        confidence: highestConfidence,
        matchedEmployeeId: bestMatch ? (bestMatch as Employee).id : null,
        matchedEmployeeName: bestMatch ? (bestMatch as Employee).name : null,
        matchedEmployeeReg: bestMatch ? (bestMatch as Employee).registration : null
      };
    });

    setResults(checkResults);
  };

  // Upload e Parser do arquivo no cliente
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setFileName(file.name);
    setFileType(file.type || 'text/plain');
    setExtracting(true);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'xlsx' || extension === 'xls') {
        if (!window.XLSX) {
          throw new Error('Biblioteca Excel (SheetJS) ainda não carregada. Tente novamente em instantes.');
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            const textLines = rows.map(r => r.join(' ')).filter(t => t.trim() !== '');
            performCrossCheck(textLines);
          } catch (err: any) {
            setError(`Erro ao ler Excel: ${err.message}`);
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsArrayBuffer(file);

      } else if (extension === 'csv') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const text = evt.target?.result as string;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
            performCrossCheck(lines);
          } catch (err: any) {
            setError(`Erro ao ler CSV: ${err.message}`);
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsText(file, 'UTF-8');

      } else if (extension === 'pdf') {
        if (!window.pdfjsLib) {
          throw new Error('Biblioteca PDF.js ainda não carregada. Tente novamente em instantes.');
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const typedarray = new Uint8Array(evt.target?.result as ArrayBuffer);
            const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
            let extractedTextLines: string[] = [];
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const lines = textContent.items.map((item: any) => item.str);
              extractedTextLines.push(...lines);
            }
            
            performCrossCheck(extractedTextLines.filter(l => l.trim() !== ''));
          } catch (err: any) {
            setError(`Erro ao processar PDF: ${err.message}`);
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsArrayBuffer(file);

      } else if (['png', 'jpg', 'jpeg'].includes(extension || '')) {
        if (!window.Tesseract) {
          throw new Error('Motor de OCR (Tesseract.js) ainda não carregado. Tente novamente em instantes.');
        }
        
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const worker = await window.Tesseract.createWorker();
            await worker.loadLanguage('por');
            await worker.initialize('por');
            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();
            
            const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l !== '');
            performCrossCheck(lines);
          } catch (err: any) {
            setError(`Erro no reconhecimento de imagem (OCR): ${err.message}`);
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsDataURL(file);

      } else {
        throw new Error('Formato de arquivo não suportado. Suba arquivos Excel, CSV, PDF ou Imagens.');
      }

    } catch (err: any) {
      setError(err.message);
      setExtracting(false);
    }
  };

  // Salvar Auditoria no Firestore
  const handleSaveAudit = async () => {
    if (!currentUser || results.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const totalRows = results.length;
    const foundCount = results.filter(r => r.status === 'found').length;
    const partialCount = results.filter(r => r.status === 'partial').length;
    const notFoundCount = results.filter(r => r.status === 'not_found').length;

    const formattedResults = results.map(r => ({
      original_text: r.originalText,
      status: r.status,
      confidence: r.confidence,
      matched_employee_id: r.matchedEmployeeId,
      matched_employee_name: r.matchedEmployeeName
    }));

    try {
      // Salva o relatório consolidado na coleção rh_file_audits
      await addDoc(collection(db, 'rh_file_audits'), {
        file_name: fileName,
        file_type: fileType,
        subject,
        total_rows: totalRows,
        found_count: foundCount,
        partial_count: partialCount,
        not_found_count: notFoundCount,
        results: formattedResults,
        created_at: new Date().toISOString(),
        created_by: currentUser.email,
        company_id: currentUser.company_id,
        business_unit_id: currentUser.business_unit_ids?.[0] || 'bu_industrial'
      });

      // Gravar log no sistema de auditoria
      await logAction(
        'CROSSCHECK_RH_AUDIT_SAVE',
        'rh_file_audits',
        fileName,
        null,
        {
          subject,
          total_rows: totalRows,
          found_count: foundCount,
          partial_count: partialCount,
          not_found_count: notFoundCount,
        },
        currentUser
      );

      setSuccess('Auditoria salva com sucesso e log de segurança registrado.');
      setResults([]);
      setFileName('');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar auditoria no banco de dados.');
    } finally {
      setSaving(false);
    }
  };



  const foundCount = results.filter(r => r.status === 'found').length;
  const partialCount = results.filter(r => r.status === 'partial').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Conferência RH & Cruzamento de Dados</h2>
        <p className="text-xs text-[#8A94A6] font-medium mt-1">
          Suba planilhas, PDFs, CSVs ou imagens de exames/ponto para extrair os nomes no navegador e cruzar com os colaboradores do seu escopo operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PAINEL ESQUERDO: CONTROLES DE UPLOAD */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white premium-card p-5 space-y-4 border border-[#E8ECF2]/60">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Configuração da Conferência</h3>
            
            <div>
              <label className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider block mb-1">Assunto do Arquivo</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-10 px-3 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all font-semibold"
              >
                <option value="payroll">Folha de Pagamento</option>
                <option value="medical">Exame de Saúde Periódico</option>
                <option value="attendance">Lista de Presença / Portaria</option>
                <option value="other">Outros Assuntos RH</option>
              </select>
            </div>

            {/* DROPZONE */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E8ECF2] hover:border-[#6254E8] rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-all flex flex-col items-center justify-center min-h-[160px] space-y-2 group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
              />
              <UploadCloud size={32} className="text-[#8A94A6] group-hover:text-[#6254E8] transition-all" />
              <div className="text-xs font-bold text-[#0F172A]">
                {fileName ? fileName : 'Selecione ou Arraste o arquivo'}
              </div>
              <p className="text-[10px] text-[#8A94A6] font-semibold max-w-[200px] mx-auto leading-relaxed">
                Suporta Excel, CSV, PDF ou Imagens (OCR)
              </p>
            </div>

            {extracting && (
              <div className="flex items-center justify-center gap-2 p-3 bg-[#F6F8FB] rounded-xl text-xs font-bold text-[#6254E8]">
                <Loader2 size={14} className="animate-spin" />
                <span>Processando documento no cliente...</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-[#FFE6EE] rounded-xl text-xs font-semibold text-[#E04F6F] border border-[#FFE6EE]/80">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 p-3 bg-[#EAFBF3] rounded-xl text-xs font-semibold text-[#10B981] border border-[#EAFBF3]/80">
                <CheckCircle size={15} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* RESUMO DOS RESULTADOS */}
          {results.length > 0 && (
            <div className="bg-white premium-card p-5 space-y-4 border border-[#E8ECF2]/60">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Resumo do Cruzamento</h3>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#EAFBF3] p-3 rounded-xl border border-[#EAFBF3]/80">
                  <div className="text-lg font-black text-[#10B981]">{foundCount}</div>
                  <div className="text-[9px] font-bold text-[#10B981]/80 uppercase">Confirmado</div>
                </div>
                <div className="bg-[#FFF9E6] p-3 rounded-xl border border-[#FFF9E6]/80">
                  <div className="text-lg font-black text-[#D97706]">{partialCount}</div>
                  <div className="text-[9px] font-bold text-[#D97706]/80 uppercase">Possível</div>
                </div>
                <div className="bg-[#FFE6EE] p-3 rounded-xl border border-[#FFE6EE]/80">
                  <div className="text-lg font-black text-[#E04F6F]">{notFoundCount}</div>
                  <div className="text-[9px] font-bold text-[#E04F6F]/80 uppercase">Não Encontrado</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveAudit}
                  disabled={saving}
                  className="w-full h-11 premium-button-primary flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Salvar Relatório de Auditoria</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PAINEL DIREITO: TABELA DE RESULTADOS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white premium-card border border-[#E8ECF2]/60 overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b border-[#E8ECF2]/40 bg-[#F7F8FC]/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Correspondências Encontradas</h3>
              {results.length > 0 && (
                <span className="text-[10px] bg-[#6254E8]/10 text-[#6254E8] font-bold px-2 py-0.5 rounded-full">
                  {results.length} registros
                </span>
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center text-[#8A94A6] space-y-2">
                  <FileText size={48} strokeWidth={1} className="text-[#8A94A6]/50" />
                  <div className="text-xs font-bold text-[#0F172A]">Nenhum arquivo processado ainda</div>
                  <p className="text-[10px] max-w-[280px] leading-relaxed">
                    Suba seu arquivo de folha, exames ou lista de ponto ao lado para iniciar a conferência automática.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8FC]/30 text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider border-b border-[#E8ECF2]/30">
                      <th className="px-5 py-3">Texto Extraído</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Correspondente Sugerido</th>
                      <th className="px-5 py-3 text-right">Confiança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F6F8FB]">
                    {results.map((res, idx) => (
                      <tr key={idx} className="hover:bg-[#F7F8FC]/20 transition-colors">
                        <td className="px-5 py-3.5 text-xs font-bold text-[#0F172A] truncate max-w-[200px]" title={res.originalText}>
                          {res.originalText}
                        </td>
                        <td className="px-5 py-3.5">
                          {res.status === 'found' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-[#EAFBF3] px-2 py-0.5 rounded-full border border-[#EAFBF3]/80">
                              <CheckCircle size={10} />
                              <span>Confirmado</span>
                            </span>
                          ) : res.status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FFF9E6] px-2 py-0.5 rounded-full border border-[#FFF9E6]/80">
                              <AlertTriangle size={10} />
                              <span>Possível</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E04F6F] bg-[#FFE6EE] px-2 py-0.5 rounded-full border border-[#FFE6EE]/80">
                              <XCircle size={10} />
                              <span>Incompatível</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {res.matchedEmployeeName ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#0F172A]">{res.matchedEmployeeName}</span>
                              {res.matchedEmployeeReg && (
                                <span className="text-[9px] text-[#8A94A6] font-semibold">Reg: {res.matchedEmployeeReg}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#8A94A6] font-semibold italic">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-extrabold text-[#0F172A] text-right">
                          <span className={
                            res.confidence >= 90 ? 'text-[#10B981]' : 
                            res.confidence >= 80 ? 'text-[#D97706]' : 
                            'text-[#E04F6F]'
                          }>
                            {res.confidence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
