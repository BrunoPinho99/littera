import { GoogleGenerativeAI } from "@google/generative-ai";
import { CorrectionResult, EssayInput, Topic } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("ALERTA: Chave API não encontrada. Verifique as variáveis de ambiente (VITE_GEMINI_API_KEY) no painel da sua hospedagem (ex: Vercel).");
}

const genAI = new GoogleGenerativeAI(apiKey || "missing_key");

const cleanJsonString = (str: string) => {
  if (!str) return "{}";
  let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

// --- GERAÇÃO DE TEMA ---
export const generateCustomTopic = async (userInterest: string): Promise<Topic> => {
  // MUDANÇA 1: Usando "gemini-pro" que é infalível para texto
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    }
  });

  try {
    const prompt = `
      Crie um tema de redação para o ENEM sobre: "${userInterest}".
      Responda APENAS com um JSON válido seguindo exatamente esta estrutura:
      {
        "title": "Título Completo do Tema",
        "supportTexts": [
          { "id": "1", "title": "Texto 1", "content": "Resumo...", "icon": "file-text" },
          { "id": "2", "title": "Texto 2", "content": "Dados...", "icon": "bar-chart" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const data = JSON.parse(cleanJsonString(text));

    // Fallback para ambientes sem crypto.randomUUID (ex: HTTP local)
    const generateId = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    return {
      id: generateId(),
      title: data.title,
      supportTexts: data.supportTexts || []
    };

  } catch (error: any) {
    console.error("Erro no Tema:", error);
    alert(`Erro na IA (Tema): ${error.message}`);
    throw new Error("Erro ao gerar tema.");
  }
};

// --- CORREÇÃO DE REDAÇÃO ---
export const correctEssay = async (topicTitle: string, input: EssayInput): Promise<CorrectionResult> => {
  // MUDANÇA 2: Tentando a versão "latest" para garantir compatibilidade
  const modelName = input.type === 'text' ? "gemini-flash-latest" : "gemini-flash-latest";

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    }
  });

  const promptText = `
    Você é um corretor do ENEM. Corrija esta redação sobre: "${topicTitle}".
    JSON OBRIGATÓRIO:
    {
      "totalScore": number,
      "aiDetected": boolean,
      "aiJustification": string,
      "generalComment": string,
      "competencies": [
        { "name": "Competência 1", "score": number, "feedback": "..." },
        { "name": "Competência 2", "score": number, "feedback": "..." },
        { "name": "Competência 3", "score": number, "feedback": "..." },
        { "name": "Competência 4", "score": number, "feedback": "..." },
        { "name": "Competência 5", "score": number, "feedback": "..." }
      ]
    }
  `;

  try {
    let parts: any[] = [];
    if (input.type === 'text') {
      parts = [{ text: promptText + `\nREDAÇÃO:\n${input.content}` }];
    } else {
      const base64Data = input.base64?.split(',')[1] || input.base64 || "";
      parts = [
        { text: promptText },
        { inlineData: { mimeType: input.mimeType || "image/jpeg", data: base64Data } }
      ];
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(cleanJsonString(text)) as CorrectionResult;

  } catch (error: any) {
    console.error("Erro na Correção:", error);
    alert(`Erro na Correção: ${error.message}`);
    throw new Error("Falha na correção.");
  }
};

export const generateAssignmentTheme = async (prompt: string): Promise<{ title: string; baseText: string }> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const finalPrompt = `
      Crie um tema de redação para alunos do ensino médio com base no seguinte assunto: "${prompt}".
      
      Retorne APENAS um objeto JSON no seguinte formato, sem markdown ou code blocks:
      {
        "title": "Título do Tema (seja criativo e estilo ENEM)",
        "baseText": "Texto de apoio motivador com cerca de 2 parágrafos explicando o contexto e provocando reflexão."
      }
    `;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    // Limpar markdown se houver
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Erro ao gerar tema:", error);
    throw new Error("Falha ao gerar tema com IA.");
  }
};