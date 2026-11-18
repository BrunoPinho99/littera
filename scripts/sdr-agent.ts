import { createClient } from '@supabase/supabase-js';
import { appendFileSync, writeFileSync } from 'node:fs';

/**
 * Agente SDR Diário — Littera
 * Prospecta escolas particulares (Ensino Médio / pré-vestibular) via Google Places API (New),
 * qualifica com Gemini e grava na tabela EXCLUSIVA do CRM: public.crm_prospects.
 * ⚠️ Nunca grava em public.leads (tabela do produto Littera).
 */

const CRM_TABLE = 'crm_prospects';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const placesApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';
const reportEmail = process.env.SDR_REPORT_EMAIL || '';
const MAX_NEW_PER_DAY = Number(process.env.SDR_MAX_NEW_PER_DAY || 80);
const MIN_ICP = Number(process.env.SDR_MIN_ICP || 60);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!placesApiKey) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY — sem ela não há prospecção real. Configure o secret no GitHub.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface Candidate {
  place_id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  rating: number;
  user_ratings_total: number;
  types: string[];
}

// Regiões do DF + entorno. Rotaciona diariamente para cobrir tudo ao longo da semana.
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
  'escola particular {r}',
  'cursinho pré-vestibular ENEM {r}',
];

const EXCLUDE = ['infantil', 'creche', 'baby', 'berçário', 'bercario', 'idiomas', 'english', 'inglês',
  'faculdade', 'universidade', 'autoescola', 'auto escola', 'música', 'musica', 'natação', 'ballet',
  'escola estadual', 'centro universitário', 'centro universitario', 'técnico', 'tecnico', 'sesc', 'senai', 'senac', 'pós-graduação', 'concurso', 'profissionalizante', 'reforço', 'reforco', 'centro de ensino fundamental', 'cef ', 'caic', 'escola classe', 'pública', 'publica'];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function regionsForToday(): string[] {
  const perDay = 10;
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
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.businessStatus,nextPageToken',
      },
      body: JSON.stringify({ textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
    });
    if (!res.ok) {
      console.warn(`⚠️ Places ${res.status} em "${textQuery}": ${(await res.text()).slice(0, 200)}`);
      break;
    }
    const data: any = await res.json();
    for (const p of data.places || []) {
      if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
      const name: string = p.displayName?.text || '';
      const lower = name.toLowerCase();
      if (!name || EXCLUDE.some(t => lower.includes(t))) continue;
      const address: string = p.formattedAddress || '';
      const isGO = /\bGO\b|Goiás/i.test(address);
      out.push({
        place_id: p.id,
        name,
        address,
        neighborhood: region,
        city: isGO ? region.replace(/ GO$/, '') : 'Brasília',
        state: isGO ? 'GO' : 'DF',
        phone: p.nationalPhoneNumber || '',
        website: p.websiteUri || '',
        rating: p.rating || 0,
        user_ratings_total: p.userRatingCount || 0,
        types: p.types || [],
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await sleep(1500);
  }
  return out;
}

interface Qualification { is_fit: boolean; icp_score: number; contact_name: string; email: string; pitch_notes: string; }

async function qualify(c: Candidate): Promise<Qualification> {
  const domain = c.website ? c.website.replace(/https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : '';
  // Heurística base, usada se o Gemini falhar
  const base = Math.min(95, 50 + (c.website ? 10 : 0) + (c.phone ? 5 : 0)
    + Math.min(20, Math.floor(c.user_ratings_total / 25)) + (c.rating >= 4.3 ? 10 : 0));
  const fallback: Qualification = {
    is_fit: true,
    icp_score: base,
    contact_name: 'Coordenação Pedagógica do Ensino Médio',
    email: domain ? `contato@${domain}` : '',
    pitch_notes: `Score heurístico (${c.user_ratings_total} avaliações, nota ${c.rating || '-'}).`,
  };
  if (!geminiApiKey) return fallback;

  const prompt = `Você é SDR B2B da Littera (SaaS de correção de redações ENEM com IA para colégios particulares e cursinhos).
Avalie se a instituição abaixo tem potencial de compra:
Nome: ${c.name}
Endereço: ${c.address}
Site: ${c.website || 'não informado'}
Telefone: ${c.phone || 'não informado'}
Google: nota ${c.rating || '-'} com ${c.user_ratings_total} avaliações; tipos: ${c.types.join(', ')}

ICP: escola PARTICULAR com Ensino Médio, ou cursinho pré-vestibular/ENEM. Porte maior (mais avaliações) = mais alunos = mais redações.
Descarte (is_fit=false): escola pública, só educação infantil/fundamental I, faculdade, idiomas, cursos livres, reforço escolar pequeno.
Responda SOMENTE JSON: {"is_fit": boolean, "icp_score": 0-100, "contact_name": "cargo ideal", "email": "email mais provável${domain ? ` no domínio ${domain}` : ' ou string vazia'}", "pitch_notes": "1-2 frases sobre o fit e o argumento de venda"}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    return {
      is_fit: parsed.is_fit !== false,
      icp_score: Number(parsed.icp_score ?? base),
      contact_name: parsed.contact_name || fallback.contact_name,
      email: parsed.email || fallback.email,
      pitch_notes: parsed.pitch_notes || fallback.pitch_notes,
    };
  } catch (err: any) {
    console.warn(`⚠️ Gemini falhou para ${c.name}: ${err.message}`);
    return fallback;
  }
}

async function sendReport(rows: any[], html: string) {
  if (!resendApiKey || !reportEmail || rows.length === 0) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.SDR_REPORT_FROM || 'Littera SDR <onboarding@resend.dev>',
      to: [reportEmail],
      subject: `🎯 ${rows.length} novas escolas para prospectar — ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    }),
  });
  console.log(res.ok ? `📧 Relatório enviado para ${reportEmail}` : `⚠️ Falha ao enviar e-mail: ${await res.text()}`);
}

async function run() {
  console.log('🤖 Agente SDR Littera iniciado');
  const regions = regionsForToday();
  console.log(`🗺️ Regiões de hoje: ${regions.join(', ')}`);

  // 1. Coleta
  const found = new Map<string, Candidate>();
  for (const region of regions) {
    for (const tpl of QUERY_TEMPLATES) {
      const q = tpl.replace('{r}', region);
      const list = await searchPlaces(q, region);
      list.forEach(c => { if (!found.has(c.place_id)) found.set(c.place_id, c); });
      console.log(`🔎 "${q}" → ${list.length} (total único: ${found.size})`);
      await sleep(300);
    }
  }

  // 2. Remove o que já está no CRM
  const ids = [...found.keys()];
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from(CRM_TABLE).select('place_id').in('place_id', ids.slice(i, i + 200));
    if (error) { console.error('❌ Erro lendo CRM:', error.message); process.exit(1); }
    data?.forEach(r => existing.add(r.place_id));
  }
  const fresh = [...found.values()]
    .filter(c => !existing.has(c.place_id))
    .sort((a, b) => b.user_ratings_total - a.user_ratings_total);
  console.log(`📋 ${found.size} encontradas, ${existing.size} já no CRM, ${fresh.length} novas para qualificar.`);

  // 3. Qualifica e grava
  const inserted: any[] = [];
  for (const c of fresh) {
    if (inserted.length >= MAX_NEW_PER_DAY) break;
    const q = await qualify(c);
    if (!q.is_fit || q.icp_score < MIN_ICP) {
      console.log(`⏭️ ${c.name} descartada (ICP ${q.icp_score}${q.is_fit ? '' : ', fora do perfil'})`);
      continue;
    }
    const row = {
      place_id: c.place_id,
      school_name: c.name,
      name: c.name,
      contact_name: q.contact_name,
      email: q.email || null,
      phone: c.phone || null,
      whatsapp: c.phone || null,
      website: c.website || null,
      address: c.address,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      rating: c.rating || null,
      user_ratings_total: c.user_ratings_total,
      icp_score: q.icp_score,
      stage: 'novo_lead',
      status: 'pending',
      notes: q.pitch_notes,
      source: 'google_places',
    };
    const { error } = await supabase.from(CRM_TABLE).insert(row);
    if (error) { console.error(`❌ ${c.name}: ${error.message}`); continue; }
    inserted.push(row);
    console.log(`✅ [ICP ${q.icp_score}] ${c.name} — ${c.neighborhood}`);
    await sleep(250);
  }

  // 4. Relatório diário (resumo do GitHub Actions + CSV + e-mail opcional)
  inserted.sort((a, b) => b.icp_score - a.icp_score);
  const md = [`## 🎯 ${inserted.length} novas escolas para prospectar`, '',
    '| ICP | Escola | Região | Telefone | Site | Avaliações |', '|---|---|---|---|---|---|',
    ...inserted.map(r => `| ${r.icp_score} | ${r.school_name} | ${r.neighborhood} | ${r.phone || '-'} | ${r.website || '-'} | ${r.user_ratings_total} (${r.rating || '-'}★) |`),
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  const csvEsc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  writeFileSync('sdr-report.csv', ['icp_score,school_name,neighborhood,city,state,phone,email,website,rating,user_ratings_total,notes',
    ...inserted.map(r => [r.icp_score, r.school_name, r.neighborhood, r.city, r.state, r.phone, r.email, r.website, r.rating, r.user_ratings_total, r.notes].map(csvEsc).join(','))].join('\n'));
  const html = `<h2>${inserted.length} novas escolas</h2><table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px"><tr><th>ICP</th><th>Escola</th><th>Região</th><th>Telefone</th><th>Site</th><th>Notas</th></tr>${inserted.map(r => `<tr><td>${r.icp_score}</td><td>${r.school_name}</td><td>${r.neighborhood}</td><td>${r.phone || '-'}</td><td>${r.website ? `<a href="${r.website}">${r.website}</a>` : '-'}</td><td>${r.notes}</td></tr>`).join('')}</table>`;
  await sendReport(inserted, html);

  console.log(`\n🎉 Finalizado: ${inserted.length} novas escolas adicionadas ao CRM (${CRM_TABLE}).`);
}

run().catch(err => { console.error(err); process.exit(1); });
