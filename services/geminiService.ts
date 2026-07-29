import { supabase } from "../supabaseClient";
import { CorrectionResult, EssayInput, Topic, HandwrittenCorrectionResult } from "../types";




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

const formatGeminiError = (error: any, defaultMsg: string): Error => {
  const msg = error?.message || error?.toString() || "";
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return new Error("O sistema de IA está temporariamente sobrecarregado ou atingiu o limite de requisições. Por favor, aguarde alguns instantes e tente novamente.");
  }
  if (msg.includes("503") || msg.includes("500") || msg.includes("overloaded")) {
    return new Error("Os servidores da IA estão indisponíveis no momento. Por favor, tente novamente em alguns minutos.");
  }
  if (msg.includes("API key") || msg.includes("missing_key")) {
    return new Error("Configuração da chave de IA inválida ou ausente.");
  }
  return new Error(`${defaultMsg} (${msg.slice(0, 100)})`);
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
      const isRetryable = 
        msg.includes("429") || 
        msg.includes("RESOURCE_EXHAUSTED") || 
        msg.includes("quota") ||
        msg.includes("503") ||
        msg.includes("500") ||
        msg.includes("overloaded");

      if (isRetryable && attempt < maxRetries) {
        // Se a API estiver pedindo para esperar muito, não vamos travar a UX do aluno.
        // Se o delay sugerido for > 3s, falhamos rápido para ativar o fallback.
        const waitTime = parseRetryDelay(msg);
        if (waitTime <= 3000) {
          console.warn(`[Littera] Pequena latência. Aguardando ${Math.round(waitTime / 1000)}s...`);
          await delay(waitTime);
          continue;
        }
      }

      // Falha rápida para acionar o fallback no nível superior sem notificar o usuário
      throw error;
    }
  }
};

const generateStreamWithRetry = async (
  model: any,
  request: any,
  onStream: (text: string) => void,
  maxRetries: number = 2
): Promise<any> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContentStream(request);
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onStream(fullText);
      }
      return { response: await result.response };
    } catch (error: any) {
      const msg = error?.message || error?.toString() || "";
      const isRetryable = 
        msg.includes("429") || 
        msg.includes("RESOURCE_EXHAUSTED") || 
        msg.includes("quota") ||
        msg.includes("503") ||
        msg.includes("500") ||
        msg.includes("overloaded");

      if (isRetryable && attempt < maxRetries) {
        const waitTime = parseRetryDelay(msg);
        if (waitTime <= 3000) {
          await delay(waitTime);
          continue;
        }
      }

      throw error;
    }
  }
};

// --- GERAÇÃO DE TEMA ---
export const generateCustomTopic = async (userInterest: string): Promise<Topic> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase.functions.invoke('generate-theme', {
    body: { action: 'generateCustomTopic', prompt: userInterest }
  });

  if (error || data?.error) {
    throw new Error(error?.message || data?.error || "Erro ao gerar tema");
  }

  const generateId = () => crypto.randomUUID?.() || Math.random().toString(36).substring(2);

  return {
    id: generateId(),
    title: data.title,
    supportTexts: (data.supportTexts || []).map((st: any, i: number) => ({
      ...st,
      id: String(i + 1),
    })),
  };
};

// --- CORREÇÃO DE REDAÇÃO ---
export const correctEssay = async (
  topicTitle: string,
  input: EssayInput,
  _onStream?: (text: string) => void
): Promise<CorrectionResult> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase.functions.invoke('correct-essay', {
    body: {
      topicTitle,
      input,
      classId: session.user.user_metadata?.class_id,
      schoolId: session.user.user_metadata?.school_id,
    }
  });

  if (error) {
    if (error.context && error.context.status === 403) {
       throw new Error(error.context.json()?.message || "Limite atingido ou teste expirado.");
    }
    throw new Error(error.message || "Erro na Edge Function");
  }

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data as CorrectionResult;
};

// --- GERAÇÃO DE TEMA PARA ATIVIDADE ---
export const generateAssignmentTheme = async (prompt: string): Promise<{ title: string; baseText: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase.functions.invoke('generate-theme', {
    body: { action: 'generateAssignmentTheme', prompt }
  });

  if (error || data?.error) {
    throw new Error(error?.message || data?.error || "Erro ao gerar tema de atividade");
  }

  return data;
};

// --- CORREÇÃO DE REDAÇÃO MANUSCRITA (OCR + ENEM) ---
export const correctHandwrittenEssay = async (
  topicTitle: string,
  base64Image: string,
  mimeType: string
): Promise<HandwrittenCorrectionResult> => {
  const input: EssayInput = { type: 'image', base64: base64Image, mimeType };
  const correction = await correctEssay(topicTitle, input);
  
  return {
    ...correction,
    transcribedText: "[Transcrição Oculta - Processado no Backend]"
  } as unknown as HandwrittenCorrectionResult;
};