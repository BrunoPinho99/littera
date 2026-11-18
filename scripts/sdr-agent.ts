import { createClient } from '@supabase/supabase-js';
import { appendFileSync, writeFileSync } from 'node:fs';

/**
 * 🤖 Agente SDR Littera
 * Pipeline: Prospecção (Google Places) → Investigação (site da escola) → Qualificação (sinais + Gemini)
 *           → Priorização (Tier A/B/C) → Abordagem personalizada → CRM (public.crm_prospects) + relatório diário.
 * ⚠️ Grava SOMENTE em public.crm_prospects. Nunca em public.leads (tabela do produto).
 */

const CRM_TABLE = 'crm_prospects';
const env = (k: string, d = '') => process.env[k] || d;
const supabaseUrl = env('SUPABASE_URL');
const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY');
const geminiApiKey = env('GEMINI_API_KEY');
const placesApiKey = env('GOOGLE_PLACES_API_KEY');
const resendApiKey = env('RESEND_API_KEY');
const reportEmail = env('SDR_REPORT_EMAIL');
const GEMINI_MODEL = env('GEMINI_MODEL', 'gemini-2.5-flash');
const MAX_NEW_PER_DAY = Number(env('SDR_MAX_NEW_PER_DAY', '60'));
const MIN_SCORE = Number(env('SDR_MIN_SCORE', '55'));
const REENRICH_LIMIT = Number(env('SDR_REENRICH_LIMIT', '80'));

if (!supabaseUrl || !supabaseKey) { console.error('❌ Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
if (!placesApiKey) { console.error('❌ Falta GOOGLE_PLACES_API_KEY.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ───────────────────────── 1. PROSPECÇÃO ─────────────────────────

interface Candidate {
  place_id: string; name: string; address: string; neighborhood: string; city: string; state: string;
  phone: string; website: string; rating: number; user_ratings_total: number; types: string[];
  primary_type: string; summary: string; maps_url: string;
}

const REGIONS = [
  'Asa Sul', 'Asa Norte', 'Lago Sul', 'Lago Norte', 'Sudoeste', 'Noroeste', 'Cruzeiro',
  'Guará', 'Águas Claras', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Vicente Pires',
  'Sobradinho', 'Planaltina DF', 'Gama', 'Santa Maria DF', 'Recanto das Emas',
  'Riacho Fundo', 'Núcleo Bandeirante', 'Park Way', 'Jardim Botânico DF', 'São Sebastião DF',
  'Paranoá', 'Itapoã', 'Brazlândia', 'Valparaíso de Goiás', 'Luziânia', 'Formosa GO',
  'Águas Lindas de Goiás', 'Cidade Ocidental', 'Novo Gama',
];
const QUERY_TEMPLATES = [
  'colégio particular ensino médio {r}',
  'escola particular ensino médio e fundamental {r}',
  'cursinho pré-vestibular ENEM {r}',
  'colégio preparatório PAS UnB {r}',
];

// Descartes óbvios pelo nome (economiza chamadas)
const NAME_BLOCK = ['infantil', 'creche', 'baby', 'bercario', 'kids', 'maternal', 'idiomas', 'english', 'ingles',
  'faculdade', 'universidade', 'centro universitario', 'autoescola', 'auto escola', 'musica', 'natacao', 'ballet', 'danca',
  'escola estadual', 'centro de ensino fundamental', 'centro de ensino medio', 'cef ', 'cem ', 'caic', 'escola classe',
  'publica', 'tecnico', 'senai', 'senac', 'pos-graduacao', 'concurso', 'profissionalizante', 'reforco', 'aulas particulares',
  'kumon', 'robotica', 'informatica', 'futebol', 'judo', 'jiu', 'cmdf', 'colegio militar', 'gisno', 'ifb'];

function regionsForToday(): string[] {
  const perDay = 8;
  const day = Math.floor(Date.now() / 86_400_000);
  const start = (day * perDay) % REGIONS.length;
  return Array.from({ length: perDay }, (_, i) => REGIONS[(start + i) % REGIONS.length]);
}

async function searchPlaces(textQuery: string, region: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 3; page++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': placesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.primaryType,places.businessStatus,places.editorialSummary,places.googleMapsUri,nextPageToken',
      },
      body: JSON.stringify({ textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
    });
    if (!res.ok) { console.warn(`⚠️ Places ${res.status} "${textQuery}": ${(await res.text()).slice(0, 160)}`); break; }
    const data: any = await res.json();
    for (const p of data.places || []) {
      if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
      const name: string = p.displayName?.text || '';
      if (!name || NAME_BLOCK.some(t => norm(name).includes(t))) continue;
      const address: string = p.formattedAddress || '';
      const isGO = /\bGO\b|Goiás/i.test(address);
      out.push({
        place_id: p.id, name, address, neighborhood: region,
        city: isGO ? region.replace(/ GO$/, '').replace(/ de Goiás$/, ' de Goiás') : 'Brasília',
        state: isGO ? 'GO' : 'DF',
        phone: p.nationalPhoneNumber || '', website: p.websiteUri || '',
        rating: p.rating || 0, user_ratings_total: p.userRatingCount || 0,
        types: p.types || [], primary_type: p.primaryType || '',
        summary: p.editorialSummary?.text || '', maps_url: p.googleMapsUri || '',
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await sleep(1500);
  }
  return out;
}

// ───────────────────────── 2. INVESTIGAÇÃO DO SITE ─────────────────────────

interface SiteIntel {
  reachable: boolean; text: string; emails: string[]; whatsapp: string; instagram: string;
  has_ensino_medio: boolean; has_cursinho: boolean; only_early: boolean; enem_focus: boolean;
  redacao_focus: boolean; competitor: string; edtech: boolean; units: number; approvals: boolean; bilingual: boolean;
}

const COMPETITORS = ['imaginie', 'redacao online', 'redacaonline', 'corrigeai', 'corrige ai', 'projeto redacao',
  'redigir', 'letrus', 'educacross', 'plurall', 'geekie', 'arco educacao', 'sas plataforma', 'bernoulli', 'poliedro',
  'eleva', 'positivo on', 'ftd digital', 'layers', 'sponte', 'agenda edu'];
// Sistemas de ensino/plataformas = escola já compra tecnologia (sinal de orçamento). Ferramentas de redação = concorrente direto.
const DIRECT_COMPETITORS = ['imaginie', 'redacao online', 'redacaonline', 'corrigeai', 'corrige ai', 'projeto redacao', 'redigir', 'letrus'];

async function fetchText(url: string, ms = 8000): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LitteraSDR/1.0)' } });
    clearTimeout(t);
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return '';
    return (await res.text()).slice(0, 400_000);
  } catch { return ''; }
}

async function investigateSite(website: string): Promise<SiteIntel> {
  const empty: SiteIntel = { reachable: false, text: '', emails: [], whatsapp: '', instagram: '', has_ensino_medio: false,
    has_cursinho: false, only_early: false, enem_focus: false, redacao_focus: false, competitor: '', edtech: false,
    units: 0, approvals: false, bilingual: false };
  if (!website || /instagram\.com|facebook\.com|linktr\.ee|wa\.me/i.test(website)) {
    if (/instagram\.com/i.test(website)) empty.instagram = website;
    return empty;
  }
  const base = website.replace(/\/$/, '');
  const home = await fetchText(base);
  if (!home) return empty;
  const subLinks = [...home.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1])
    .filter(h => /contato|fale|ensino-?medio|medio|pre-?vestibular|sobre|quem-somos|segmentos/i.test(h))
    .map(h => h.startsWith('http') ? h : `${base}/${h.replace(/^\//, '')}`)
    .filter(h => h.includes(new URL(base).hostname)).slice(0, 3);
  const pages = [home, ...(await Promise.all(subLinks.map(l => fetchText(l, 6000))))];
  const html = pages.join('\n');
  const text = norm(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  const host = new URL(base).hostname.replace(/^www\./, '');

  const emails = [...new Set((html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map(e => e.toLowerCase())
    .filter(e => !/\.(png|jpg|jpeg|gif|svg|webp)$/.test(e) && !/sentry|wixpress|example|domain|email@|seuemail|exemplo/.test(e)))]
    .sort((a, b) => score(b) - score(a));
  function score(e: string) { return (e.endsWith(host) ? 10 : 0) + (/pedagog|coord|medio|direc|diret|secretaria/.test(e) ? 5 : 0) + (/contato|atendimento/.test(e) ? 2 : 0); }

  const wa = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/i);
  const ig = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9_.]+/i);
  const has = (re: RegExp) => re.test(text);
  const competitorHit = COMPETITORS.find(c => text.includes(c)) || '';
  const unitsMatch = text.match(/(\d{1,2})\s+unidades/);

  const has_ensino_medio = has(/ensino medio|novo ensino medio|1a serie|3a serie|3o ano do ensino|terceirao|pre-?vestibular integrado/);
  const has_cursinho = has(/pre-?vestibular|cursinho|preparatorio para o enem|extensivo enem|intensivo enem/);
  const has_fund = has(/fundamental/);
  return {
    reachable: true, text: text.slice(0, 6000), emails: emails.slice(0, 5),
    whatsapp: wa ? wa[1] : '', instagram: ig ? ig[0] : '',
    has_ensino_medio, has_cursinho,
    only_early: !has_ensino_medio && !has_cursinho && (has(/educacao infantil|bercario|maternal/) || has_fund),
    enem_focus: has(/\benem\b|\bpas\b|vestibular|unb|aprovad/),
    redacao_focus: has(/redacao|producao textual|nota 1000|nota mil/),
    competitor: competitorHit, edtech: !!competitorHit || has(/plataforma digital|ambiente virtual|app da escola|sistema de ensino/),
    units: unitsMatch ? Number(unitsMatch[1]) : (has(/nossas unidades|unidade [a-z]+ e unidade/) ? 2 : 1),
    approvals: has(/aprovados|aprovacoes|listao|1o lugar|primeiro lugar/),
    bilingual: has(/bilingue|bilingual|internacional/),
  };
}

// ───────────────────────── 3. QUALIFICAÇÃO / SCORE ─────────────────────────

interface Scored {
  score: number; tier: 'A' | 'B' | 'C' | 'X'; segment: string; breakdown: Record<string, number>;
  reasons: string[]; disqualified?: string;
}

function scoreLead(c: Candidate, s: SiteIntel): Scored {
  const b: Record<string, number> = {};
  const reasons: string[] = [];
  const nm = norm(c.name);
  const nameSaysMedio = /colegio|ensino medio|pre-?vestibular|cursinho|preparatorio|\bcem\b/.test(nm);
  const nameSaysCursinho = /pre-?vestibular|cursinho|preparatorio/.test(nm);

  if (s.reachable && s.only_early && !nameSaysMedio) return { score: 0, tier: 'X', segment: 'infantil/fundamental', breakdown: {}, reasons: [], disqualified: 'site não menciona Ensino Médio' };

  // Fit de produto (máx 35)
  let segment = 'indefinido';
  if (s.has_ensino_medio) { b.fit = 35; segment = 'ensino médio'; reasons.push('Ensino Médio confirmado no site'); }
  else if (s.has_cursinho || nameSaysCursinho) { b.fit = 30; segment = 'cursinho/pré-vestibular'; reasons.push('Cursinho/pré-vestibular'); }
  else if (nameSaysMedio) { b.fit = 18; segment = 'provável ensino médio'; }
  else { b.fit = 8; }

  // Porte (máx 20) — avaliações no Google como proxy de nº de alunos/famílias
  b.porte = Math.min(20, Math.round(Math.log10(c.user_ratings_total + 1) * 8));
  if (c.user_ratings_total >= 300) reasons.push(`Escola grande (${c.user_ratings_total} avaliações)`);
  if (s.units > 1) { b.porte = Math.min(25, b.porte + 5); reasons.push(`${s.units} unidades`); }

  // Dor / momento (máx 20)
  b.dor = (s.enem_focus ? 8 : 0) + (s.redacao_focus ? 8 : 0) + (s.approvals ? 4 : 0);
  if (s.redacao_focus) reasons.push('Destaca redação no site');
  if (s.enem_focus) reasons.push('Foco ENEM/PAS/vestibular');

  // Capacidade de compra (máx 15)
  b.orcamento = (s.edtech ? 6 : 0) + (s.bilingual ? 4 : 0) + (c.rating >= 4.5 ? 3 : c.rating >= 4.2 ? 2 : 0) + (/lago sul|lago norte|sudoeste|noroeste|asa sul|asa norte|park way|jardim botanico|aguas claras/.test(norm(c.neighborhood)) ? 2 : 0);
  if (s.competitor) {
    reasons.push(DIRECT_COMPETITORS.includes(s.competitor) ? `Usa concorrente direto (${s.competitor}) — oportunidade de troca` : `Já investe em tecnologia (${s.competitor})`);
  }

  // Contatabilidade (máx 10)
  const realEmail = s.emails.length > 0;
  b.contato = (realEmail ? 5 : 0) + (s.whatsapp || c.phone ? 3 : 0) + (s.reachable ? 2 : 0);
  if (!c.website) b.contato -= 2;

  const score = Math.max(0, Math.min(100, Object.values(b).reduce((a, v) => a + v, 0)));
  const tier = score >= 75 ? 'A' : score >= 60 ? 'B' : score >= MIN_SCORE ? 'C' : 'X';
  return { score, tier, segment, breakdown: b, reasons };
}

// ───────────────────────── 4. IA: VEREDITO + ABORDAGEM ─────────────────────────

let geminiOk = !!geminiApiKey;

interface AIVerdict { is_fit: boolean; adjust: number; segment?: string; decision_maker: string; why: string; message: string; }

async function askGemini(c: Candidate, s: SiteIntel, sc: Scored): Promise<AIVerdict | null> {
  if (!geminiOk) return null;
  const prompt = `Você é um SDR sênior da Littera, SaaS que corrige redações no padrão ENEM com IA em segundos, com devolutiva por competência. Vendemos para colégios particulares com Ensino Médio e cursinhos (ticket anual de alguns milhares de reais). A dor: professores de redação sobrecarregados, correção lenta, poucos treinos de redação por aluno, custo de corretores terceirizados.

Analise o lead abaixo com rigor. Seja cético: só marque is_fit=true se houver evidência real de Ensino Médio ou pré-vestibular PRIVADO.

ESCOLA: ${c.name}
Endereço: ${c.address}
Google: ${c.rating || '-'}★, ${c.user_ratings_total} avaliações, tipo ${c.primary_type}. ${c.summary}
Site: ${c.website || 'sem site'}
Sinais detectados: ${JSON.stringify({ ensino_medio: s.has_ensino_medio, cursinho: s.has_cursinho, enem: s.enem_focus, redacao: s.redacao_focus, unidades: s.units, tecnologia: s.competitor || s.edtech, aprovacoes: s.approvals, bilingue: s.bilingual })}
Score heurístico: ${sc.score}/100 (${sc.reasons.join('; ')})
Trecho do site: """${s.text.slice(0, 3500)}"""

Responda SOMENTE em JSON:
{"is_fit": boolean,
 "adjust": inteiro de -30 a +15 para corrigir o score heurístico com base no que você leu,
 "segment": "ensino médio" | "cursinho/pré-vestibular" | "fundamental/infantil" | "outro",
 "decision_maker": "cargo de quem decide a compra nesta escola",
 "why": "1 frase objetiva: por que esse lead vale (ou não) a ligação",
 "message": "mensagem de primeiro contato para WhatsApp, até 450 caracteres, tom humano e consultivo, cite algo ESPECÍFICO da escola (unidade, foco em PAS/ENEM, aprovações, etc.), termine com uma pergunta simples. Sem emojis em excesso, sem prometer o que não sabemos."}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      if (/api key|permission|billing|quota/i.test(msg)) { geminiOk = false; console.warn(`⚠️ Gemini desativado nesta execução: ${msg}`); }
      return null;
    }
    const p = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    return { is_fit: p.is_fit !== false, adjust: Math.max(-30, Math.min(15, Number(p.adjust) || 0)), segment: p.segment,
      decision_maker: p.decision_maker || '', why: p.why || '', message: p.message || '' };
  } catch (e: any) { console.warn(`⚠️ Gemini erro (${c.name}): ${e.message}`); return null; }
}

function templateMessage(c: Candidate, s: SiteIntel, sc: Scored): string {
  const gancho = s.redacao_focus ? 'vi que vocês dão bastante destaque à redação'
    : s.enem_focus ? 'vi o foco de vocês em ENEM e PAS'
    : sc.segment.startsWith('cursinho') ? 'vi o trabalho de vocês com pré-vestibular'
    : 'conheci o trabalho de vocês com o Ensino Médio';
  return `Olá! Tudo bem? Sou da Littera, aqui de Brasília. ${gancho[0].toUpperCase() + gancho.slice(1)} no ${c.name}. A gente ajuda colégios a corrigir redações no padrão ENEM em segundos, com devolutiva por competência, para os alunos treinarem mais sem sobrecarregar os professores. Faz sentido eu mostrar em 15 minutos para a coordenação do Ensino Médio?`;
}

// ───────────────────────── 5. ORQUESTRAÇÃO ─────────────────────────

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

async function evaluate(c: Candidate) {
  const site = await investigateSite(c.website);
  const sc = scoreLead(c, site);
  if (sc.tier === 'X' && sc.disqualified) return { c, site, sc, ai: null as AIVerdict | null };
  const ai = sc.score >= MIN_SCORE - 15 ? await askGemini(c, site, sc) : null;
  if (ai) {
    sc.score = Math.max(0, Math.min(100, sc.score + ai.adjust));
    if (!ai.is_fit) { sc.tier = 'X'; sc.disqualified = `IA: ${ai.why}`; }
    else sc.tier = sc.score >= 75 ? 'A' : sc.score >= 60 ? 'B' : sc.score >= MIN_SCORE ? 'C' : 'X';
    if (ai.segment) sc.segment = ai.segment;
  }
  return { c, site, sc, ai };
}

function buildRow(c: Candidate, site: SiteIntel, sc: Scored, ai: AIVerdict | null) {
  const email = site.emails[0] || '';
  const why = ai?.why || sc.reasons.slice(0, 3).join(' · ');
  return {
    place_id: c.place_id, school_name: c.name, name: c.name,
    contact_name: ai?.decision_maker || (sc.segment.startsWith('cursinho') ? 'Direção / Coordenação do Pré-Vestibular' : 'Coordenação Pedagógica do Ensino Médio'),
    decision_maker: ai?.decision_maker || null,
    email: email || null, email_source: email ? 'site' : null,
    phone: c.phone || null, whatsapp: site.whatsapp || c.phone || null, instagram: site.instagram || null,
    website: c.website || null, address: c.address, neighborhood: c.neighborhood, city: c.city, state: c.state,
    rating: c.rating || null, user_ratings_total: c.user_ratings_total, maps_url: c.maps_url || null,
    icp_score: sc.score, tier: sc.tier, segment: sc.segment, score_breakdown: sc.breakdown,
    signals: { ensino_medio: site.has_ensino_medio, cursinho: site.has_cursinho, enem: site.enem_focus, redacao: site.redacao_focus,
      unidades: site.units, tecnologia: site.competitor || (site.edtech ? 'sim' : ''), aprovacoes: site.approvals, bilingue: site.bilingual,
      site_ok: site.reachable, ia: !!ai, reasons: sc.reasons },
    outreach_message: ai?.message || templateMessage(c, site, sc),
    notes: `[Tier ${sc.tier} · ${sc.score}] ${why}`,
    stage: 'novo_lead', status: 'pending', source: 'google_places', enriched_at: new Date().toISOString(),
  };
}

async function reenrichExisting() {
  const { data } = await supabase.from(CRM_TABLE).select('*').is('enriched_at', null).limit(REENRICH_LIMIT);
  if (!data?.length) return { updated: 0, removed: 0 };
  console.log(`♻️ Reavaliando ${data.length} leads antigos sem inteligência...`);
  let updated = 0, removed = 0;
  await pool(data, 6, async (r: any) => {
    const c: Candidate = { place_id: r.place_id, name: r.school_name, address: r.address || '', neighborhood: r.neighborhood || '',
      city: r.city || '', state: r.state || '', phone: r.phone || '', website: r.website || '', rating: Number(r.rating) || 0,
      user_ratings_total: r.user_ratings_total || 0, types: [], primary_type: '', summary: '', maps_url: r.maps_url || '' };
    const { site, sc, ai } = await evaluate(c);
    if (sc.tier === 'X' && r.stage === 'novo_lead') {
      await supabase.from(CRM_TABLE).delete().eq('id', r.id); removed++;
      console.log(`🗑️ ${c.name} removido (${sc.disqualified || `score ${sc.score}`})`);
      return;
    }
    const row: any = buildRow(c, site, sc, ai);
    delete row.stage; delete row.status; // não mexe no funil já trabalhado
    await supabase.from(CRM_TABLE).update(row).eq('id', r.id); updated++;
  });
  return { updated, removed };
}

async function run() {
  console.log(`🤖 Agente SDR Littera | IA: ${geminiOk ? GEMINI_MODEL : 'desligada (sem GEMINI_API_KEY)'}`);
  const regions = regionsForToday();
  console.log(`🗺️ Regiões de hoje: ${regions.join(', ')}`);

  // Prospecção
  const found = new Map<string, Candidate>();
  for (const region of regions) for (const tpl of QUERY_TEMPLATES) {
    const q = tpl.replace('{r}', region);
    const list = await searchPlaces(q, region);
    list.forEach(c => { if (!found.has(c.place_id)) found.set(c.place_id, c); });
    await sleep(250);
  }
  console.log(`🔎 ${found.size} instituições únicas encontradas.`);

  // Dedup contra o CRM
  const ids = [...found.keys()];
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from(CRM_TABLE).select('place_id').in('place_id', ids.slice(i, i + 200));
    if (error) { console.error('❌ Erro lendo CRM:', error.message); process.exit(1); }
    data?.forEach(r => existing.add(r.place_id));
  }
  const fresh = [...found.values()].filter(c => !existing.has(c.place_id))
    .sort((a, b) => (b.website ? 1 : 0) - (a.website ? 1 : 0) || b.user_ratings_total - a.user_ratings_total)
    .slice(0, MAX_NEW_PER_DAY * 3);
  console.log(`📋 ${existing.size} já no CRM · ${fresh.length} novas para investigar.`);

  // Investigação + qualificação
  const evaluated = await pool(fresh, 6, evaluate);
  const discarded = evaluated.filter(e => e.sc.tier === 'X');
  discarded.forEach(e => console.log(`⏭️ ${e.c.name}: ${e.sc.disqualified || `score ${e.sc.score}`}`));
  const qualified = evaluated.filter(e => e.sc.tier !== 'X').sort((a, b) => b.sc.score - a.sc.score).slice(0, MAX_NEW_PER_DAY);

  const inserted: any[] = [];
  for (const e of qualified) {
    const row = buildRow(e.c, e.site, e.sc, e.ai);
    const { error } = await supabase.from(CRM_TABLE).insert(row);
    if (error) { console.error(`❌ ${e.c.name}: ${error.message}`); continue; }
    inserted.push(row);
    console.log(`✅ [${row.tier} ${row.icp_score}] ${row.school_name} — ${row.notes}`);
  }

  const re = await reenrichExisting();

  // Relatório
  const tiers = { A: inserted.filter(r => r.tier === 'A'), B: inserted.filter(r => r.tier === 'B'), C: inserted.filter(r => r.tier === 'C') };
  const line = (r: any) => `| **${r.tier}** ${r.icp_score} | ${r.school_name} | ${r.segment} | ${r.neighborhood} | ${r.whatsapp || r.phone || '-'} | ${r.email || '-'} | ${r.notes.replace(/^\[[^\]]+\]\s*/, '')} |`;
  const md = [
    `## 🎯 Lista do dia — ${inserted.length} leads qualificados`,
    `🔥 Tier A: **${tiers.A.length}** · 👍 Tier B: **${tiers.B.length}** · 🧊 Tier C: **${tiers.C.length}** · descartados: ${discarded.length} · IA: ${geminiOk ? 'ativa' : '⚠️ desligada'}`,
    re.updated || re.removed ? `♻️ Reavaliados: ${re.updated} atualizados, ${re.removed} removidos do funil por não serem fit.` : '',
    '', '| Tier | Escola | Segmento | Região | WhatsApp/Tel | E-mail | Por que ligar |', '|---|---|---|---|---|---|---|',
    ...inserted.map(line),
    '', '### 💬 Abordagens sugeridas (Tier A)', ...tiers.A.map(r => `**${r.school_name}** (${r.decision_maker || r.contact_name}):\n> ${r.outreach_message}\n`),
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');

  const csv = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  writeFileSync('sdr-report.csv', ['tier,score,escola,segmento,regiao,cidade,uf,whatsapp,telefone,email,instagram,site,decisor,por_que,mensagem,maps',
    ...inserted.map(r => [r.tier, r.icp_score, r.school_name, r.segment, r.neighborhood, r.city, r.state, r.whatsapp, r.phone, r.email, r.instagram, r.website, r.decision_maker || r.contact_name, r.notes, r.outreach_message, r.maps_url].map(csv).join(','))].join('\n'));

  if (resendApiKey && reportEmail && inserted.length) {
    const esc = (s: string) => String(s ?? '').replace(/</g, '&lt;');
    const html = `<div style="font-family:sans-serif"><h2>🎯 ${inserted.length} leads qualificados hoje</h2>
<p>🔥 A: ${tiers.A.length} · 👍 B: ${tiers.B.length} · 🧊 C: ${tiers.C.length}</p>
${inserted.map(r => `<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin:10px 0">
<b>[${r.tier} · ${r.icp_score}] ${esc(r.school_name)}</b> — ${esc(r.segment)} · ${esc(r.neighborhood)}<br>
📞 ${esc(r.whatsapp || r.phone || '-')} · ✉️ ${esc(r.email || '-')} ${r.website ? `· <a href="${r.website}">site</a>` : ''} ${r.maps_url ? `· <a href="${r.maps_url}">maps</a>` : ''}<br>
<i>${esc(r.notes)}</i><br><small>👤 ${esc(r.decision_maker || r.contact_name)}</small>
<p style="background:#f5f5ff;padding:8px;border-radius:6px">💬 ${esc(r.outreach_message)}</p></div>`).join('')}</div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('SDR_REPORT_FROM', 'Littera SDR <onboarding@resend.dev>'), to: [reportEmail],
        subject: `🎯 ${tiers.A.length} leads quentes + ${tiers.B.length + tiers.C.length} para prospectar — ${new Date().toLocaleDateString('pt-BR')}`, html }),
    });
    console.log(res.ok ? `📧 Relatório enviado para ${reportEmail}` : `⚠️ E-mail falhou: ${await res.text()}`);
  }

  console.log(`\n🎉 ${inserted.length} novos leads (A:${tiers.A.length} B:${tiers.B.length} C:${tiers.C.length}) · ${discarded.length} descartados · reavaliados ${re.updated}/${re.removed} removidos.`);
}

run().catch(err => { console.error(err); process.exit(1); });
