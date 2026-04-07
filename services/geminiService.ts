import { GoogleGenerativeAI } from "@google/generative-ai";
import { CorrectionResult, EssayInput, Topic } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("ALERTA: Chave API não encontrada (VITE_GEMINI_API_KEY).");
}

const genAI = new GoogleGenerativeAI(apiKey || "missing_key");

const extractJson = (str: string): string => {
  if (!str) return "{}";
  let cleaned = str.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Extrai o tempo de espera sugerido pelo Google na mensagem de erro (ex: "retry in 33.24s")
const parseRetryDelay = (errorMsg: string): number => {
  const match = errorMsg.match(/retry in (\d+\.?\d*)/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000) + 2000; // +2s de margem
  }
  return 35000; // fallback 35s
};

// Wrapper com retry automático inteligente
const generateWithRetry = async (
  model: any,
  request: any,
  maxRetries: number = 2
): Promise<any> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(request);
      return result;
    } catch (error: any) {
      const msg = error?.message || error?.toString() || "";
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

      if (is429 && attempt < maxRetries) {
        const waitTime = parseRetryDelay(msg);
        console.warn(`[Littera] Quota excedida. Aguardando ${Math.round(waitTime / 1000)}s antes de tentar novamente... (tentativa ${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }

      if (is429) {
        throw new Error(
          "A API do Gemini está temporariamente indisponível (limite de requisições atingido). " +
          "Aguarde 1-2 minutos e tente novamente."
        );
      }

      // Para qualquer outro erro, propaga diretamente
      throw error;
    }
  }
};

// --- GERAÇÃO DE TEMA ---
export const generateCustomTopic = async (userInterest: string): Promise<Topic> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.7 },
  });

  const prompt = `
    Crie um tema de redação para o ENEM sobre: "${userInterest}".
    Responda APENAS com um JSON válido (sem markdown, sem texto extra) seguindo exatamente esta estrutura:
    {
      "title": "Título Completo do Tema",
      "supportTexts": [
        { "id": "1", "title": "Texto 1", "content": "Resumo com pelo menos 3 frases...", "icon": "article" },
        { "id": "2", "title": "Texto 2", "content": "Mais dados e contexto...", "icon": "bar_chart" }
      ]
    }
  `;

  try {
    const result = await generateWithRetry(model, prompt);
    const text = result.response.text();
    const data = JSON.parse(extractJson(text));

    return {
      id: generateId(),
      title: data.title,
      supportTexts: (data.supportTexts || []).map((st: any, i: number) => ({
        ...st,
        id: st.id || String(i + 1),
      })),
    };
  } catch (error: any) {
    console.error("Erro ao gerar tema:", error);
    throw error;
  }
};

// --- CORREÇÃO DE REDAÇÃO ---
export const correctEssay = async (
  topicTitle: string,
  input: EssayInput
): Promise<CorrectionResult> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.2 },
  });

  const systemPrompt = `
Você é um corretor oficial do ENEM altamente especializado. Corrija a redação abaixo sobre o tema: "${topicTitle}".

Avalie pelas 5 competências do ENEM (cada uma de 0 a 200, múltiplos de 40).
Detecte se foi gerada por IA.

Responda APENAS com JSON puro (sem markdown, sem texto antes ou depois):
{
  "totalScore": <soma das 5 competências>,
  "aiDetected": <true ou false>,
  "aiJustification": "<justificativa se aiDetected for true, senão string vazia>",
  "generalComment": "<análise geral>",
  "competencies": [
    { "name": "Competência 1 – Domínio da norma culta", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 2 – Compreensão da proposta", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 3 – Argumentação", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 4 – Coesão textual", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 5 – Proposta de intervenção", "score": <0-200>, "feedback": "..." }
  ]
}
`;

  try {
    let requestContent: any;

    if (input.type === "text") {
      requestContent = systemPrompt + `\n\nREDAÇÃO DO ALUNO:\n${input.content}`;
    } else {
      const base64Data = input.base64?.includes(",")
        ? input.base64.split(",")[1]
        : input.base64 || "";

      requestContent = {
        contents: [{
          role: "user",
          parts: [
            { text: systemPrompt + "\n\nA redação está na imagem a seguir:" },
            { inlineData: { mimeType: input.mimeType || "image/jpeg", data: base64Data } },
          ],
        }],
      };
    }

    const result = await generateWithRetry(model, requestContent);
    const text = result.response.text();

    if (!text || text.trim().length === 0) {
      throw new Error("A IA retornou uma resposta vazia. Tente novamente.");
    }

    const parsed = JSON.parse(extractJson(text)) as CorrectionResult;

    if (typeof parsed.totalScore !== "number" || !Array.isArray(parsed.competencies)) {
      throw new Error("Resposta da IA em formato inesperado. Tente novamente.");
    }

    return parsed;
  } catch (error: any) {
    console.error("Erro na Correção:", error);
    throw error;
  }
};

// --- GERAÇÃO DE TEMA PARA ATIVIDADE ---
export const generateAssignmentTheme = async (
  prompt: string
): Promise<{ title: string; baseText: string }> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const finalPrompt = `
      Crie um tema de redação para alunos do ensino médio com base no seguinte assunto: "${prompt}".
      Retorne APENAS um objeto JSON (sem markdown ou code blocks):
      {
        "title": "Título do Tema (estilo ENEM criativo)",
        "baseText": "Texto de apoio motivador com cerca de 2 parágrafos."
      }
    `;

    const result = await generateWithRetry(model, finalPrompt);
    const text = result.response.text();
    return JSON.parse(extractJson(text));
  } catch (error: any) {
    console.error("Erro ao gerar tema de atividade:", error);
    throw error;
  }
};