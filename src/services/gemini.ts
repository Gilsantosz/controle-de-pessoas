const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA7T6tYpwxxk8IGjLq2QZfGAscbYtH6rSc";

export interface GeminiResponse {
  text: string;
  error?: string;
}

/**
 * Envia uma requisição direta para a API do Gemini 2.5 Flash
 */
export async function askGemini(
  prompt: string,
  systemInstruction?: string
): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    ...(systemInstruction ? {
      systemInstruction: {
        parts: [
          { text: systemInstruction }
        ]
      }
    } : {})
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`Gemini API retornou status ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Formato de resposta inválido da API do Gemini.');
    }

    return { text: generatedText };
  } catch (error: any) {
    console.error('Erro na chamada do Gemini:', error);
    return { 
      text: '', 
      error: error.message || 'Erro desconhecido na API do Gemini.' 
    };
  }
}

/**
 * Fallback inteligente em caso de falha de chave do Gemini (comportamento simulado offline)
 */
export function getLocalAiFallback(
  question: string,
  context: {
    employees: any[];
    cells?: any[];
    teams?: any[];
    uploadedText?: string;
    casesDescription?: string;
    vacationRequests?: any[];
  }
): string {
  const q = question.toLowerCase();
  const emps = context.employees || [];
  
  // Buscar se o usuário perguntou sobre colaboradores específicos ou regras básicas
  if (q.includes('férias') || q.includes('saldo')) {
    const limitEmps = emps.filter(e => e.vacation_balance_days >= 30);
    const listHtml = limitEmps.slice(0, 5).map(e => `- ${e.name} (${e.vacation_balance_days} dias, limite: ${e.concession_deadline})`).join('\n');
    return `### [Análise Local de Saldos de Férias]
Identifiquei ${limitEmps.length} colaboradores com limite ou excesso de saldo de férias acumuladas (>= 30 dias).

**Principais colaboradores precisando de atenção imediata:**
${listHtml || 'Nenhum colaborador com saldo acima de 30 dias.'}

*Dica: Planeje o lançamento de férias desses colaboradores para evitar passivos trabalhistas.*`;
  }
  
  if (q.includes('colaborador') || q.includes('operador') || q.includes('quem')) {
    const total = emps.length;
    const inactive = emps.filter(e => e.status === 'inactive').length;
    return `### [Relatório Industrial Local]
Atualmente o sistema conta com **${total}** colaboradores cadastrados.
- Ativos: **${total - inactive}**
- Desligados/Inativos: **${inactive}**

Você pode filtrar a lista na página de Colaboradores ou abrir o detalhe de um cadastro específico para mais informações.`;
  }

  if (context.uploadedText && context.casesDescription) {
    // Busca inteligente básica nas linhas de conferência do RH
    const matches: string[] = [];
    
    emps.forEach(emp => {
      const nameMatch = context.uploadedText?.toLowerCase().includes(emp.name.toLowerCase());
      const regMatch = emp.registration && context.uploadedText?.includes(emp.registration);
      if (nameMatch || regMatch) {
        matches.push(`- **${emp.name}** (Matrícula: ${emp.registration}, Célula: ${emp.cell_name || 'Não informada'})`);
      }
    });

    return `### [Cruzamento de Dados - Motor de Atenção]
Analisando a descrição do caso: "${context.casesDescription}" em relação aos arquivos carregados:

**Colaboradores identificados no texto importado:**
${matches.length > 0 ? matches.join('\n') : '*Nenhum colaborador da sua base foi citado nominalmente nos arquivos carregados.*'}

**Recomendações técnicas:**
1. Verifique as divergências nos nomes e matrículas acima.
2. Certifique-se de que os exames ocupacionais ou folhas de ponto citados batem com os registros do banco de dados.`;
  }

  return `### [Headcout Copilot]
Olá! Estou conectado ao banco de dados industrial do Headcout. 
Posso ajudar você a analisar:
- Colaboradores com férias vencendo ou perto de 30 dias.
- Distribuição de operadores por Célula ou Turno.
- Cruzamento de dados de relatórios e ponto.

*Pergunta recebida:* "${question}"`;
}
