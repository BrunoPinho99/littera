import { supabase } from "../supabaseClient";
import { EssayInput, Topic } from "../types";

// --- GERAÇÃO DE TEMA ---
export const generateCustomTopic = async (userInterest: string): Promise<Topic> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase.functions.invoke('generate-theme', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
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
): Promise<{ success: boolean; essayId: string; cached?: boolean }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado. Faça login para enviar redações.");

  const { data, error } = await supabase.functions.invoke('correct-essay', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      topicTitle,
      input,
      classId: session.user.user_metadata?.class_id,
      schoolId: session.user.user_metadata?.school_id,
    }
  });

  if (error) {
    if (error.context && typeof error.context.json === 'function') {
      const errBody = await error.context.json().catch(() => null);
      if (errBody?.message || errBody?.error) {
        throw new Error(errBody.message || errBody.error);
      }
    }
    throw new Error(error.message || "Erro na Edge Function");
  }

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data as { success: boolean; essayId: string; cached?: boolean };
};

// --- GERAÇÃO DE TEMA PARA ATIVIDADE ---
export const generateAssignmentTheme = async (prompt: string): Promise<{ title: string; baseText: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase.functions.invoke('generate-theme', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
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
): Promise<{ success: boolean; essayId: string; cached?: boolean }> => {
  const input: EssayInput = { type: 'image', base64: base64Image, mimeType };
  return await correctEssay(topicTitle, input);
};

// --- CORREÇÃO DEMO (sem autenticação) ---
export const correctEssayDemo = async (
  topicTitle: string,
  input: EssayInput,
): Promise<{ success: boolean; essayId: string }> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/correct-essay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      topicTitle,
      input,
      demo_mode: true,
    }),
  });

  const data = await res.json();

  if (!res.ok || data?.error) {
    throw new Error(data?.message || data?.error || 'Erro ao corrigir no modo demo.');
  }

  return data as { success: boolean; essayId: string };
};

export const correctHandwrittenEssayDemo = async (
  topicTitle: string,
  base64Image: string,
  mimeType: string
): Promise<{ success: boolean; essayId: string }> => {
  const input: EssayInput = { type: 'image', base64: base64Image, mimeType };
  return await correctEssayDemo(topicTitle, input);
};