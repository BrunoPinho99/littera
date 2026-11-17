import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Building2, 
  User, 
  Mail, 
  MapPin, 
  RefreshCw, 
  Search,
  Calendar,
  AlertCircle
} from 'lucide-react';

// Suporta tanto Vite (VITE_) quanto Next.js (NEXT_PUBLIC_)
const supabaseUrl = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  '';

const supabaseAnonKey = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type LeadStage = 
  | 'novo_lead' 
  | 'email_1_enviado' 
  | 'email_2_enviado' 
  | 'reuniao_agendada' 
  | 'trial' 
  | 'cliente_ganho';

export interface Lead {
  id: string | number;
  school_name?: string | null;
  name?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  state?: string | null;
  stage?: LeadStage | string;
  status?: string;
  notes?: string | null;
  created_at: string;
}

interface ColumnConfig {
  id: LeadStage;
  title: string;
  badgeColor: string;
  borderColor: string;
}

const STAGES: ColumnConfig[] = [
  {
    id: 'novo_lead',
    title: 'Novos Leads (SDR)',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderColor: 'border-t-blue-500',
  },
  {
    id: 'email_1_enviado',
    title: 'E-mail 1 Enviado',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderColor: 'border-t-indigo-500',
  },
  {
    id: 'email_2_enviado',
    title: 'Follow-up Enviado',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    borderColor: 'border-t-purple-500',
  },
  {
    id: 'reuniao_agendada',
    title: 'Reunião Agendada',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColor: 'border-t-amber-500',
  },
  {
    id: 'trial',
    title: 'Trial na Escola',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    borderColor: 'border-t-cyan-500',
  },
  {
    id: 'cliente_ganho',
    title: 'Fechado (Cliente)',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColor: 'border-t-emerald-500',
  },
];

function isCreatedWithin24Hours(dateString: string): boolean {
  if (!dateString) return false;
  const createdAt = new Date(dateString).getTime();
  const diffInHours = (Date.now() - createdAt) / (1000 * 60 * 60);
  return diffInHours <= 24 && diffInHours >= 0;
}

export default function CRMKanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (err: any) {
      console.error('Erro ao buscar leads:', err);
      setErrorMessage('Não foi possível carregar os leads do Supabase: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Garante que o Google e outros buscadores não indexem a página mesmo se acessada
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', 'noindex, nofollow');

    document.title = 'Littera CRM B2B | Gestão de Leads';
    fetchLeads();
  }, [fetchLeads]);

  const handleStageChange = async (leadId: string | number, nextStage: LeadStage) => {
    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, stage: nextStage } : lead))
    );
    setUpdatingId(leadId);

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: nextStage })
        .eq('id', leadId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao atualizar estágio do lead:', err);
      alert('Erro ao atualizar estágio: ' + (err.message || 'Tente novamente'));
      setLeads(previousLeads);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter((lead) => {
      const school = lead.school_name || '';
      const contact = lead.contact_name || lead.name || '';
      const email = lead.email || '';
      const city = lead.city || '';
      return (
        school.toLowerCase().includes(term) ||
        contact.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        city.toLowerCase().includes(term)
      );
    });
  }, [leads, searchTerm]);

  const columnsData = useMemo(() => {
    return STAGES.map((col) => ({
      ...col,
      leads: filteredLeads.filter((lead) => {
        // Normaliza caso venha vazio ou nulo (cai em novo_lead por padrão)
        const currentStage = lead.stage || 'novo_lead';
        return currentStage === col.id;
      }),
    }));
  }, [filteredLeads]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-lg text-white">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Littera CRM B2B</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                  Pipeline de Vendas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhamento e funil de vendas para Escolas & Cursinhos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar escola, contato, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={fetchLeads}
              disabled={loading}
              title="Atualizar lista de leads"
              className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="max-w-[1800px] mx-auto w-full px-6 pt-4">
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Grid Kanban */}
      <main className="flex-1 overflow-x-auto p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div className="flex gap-5 min-w-max pb-6 items-start">
          {columnsData.map((column) => (
            <div
              key={column.id}
              className={`w-[340px] flex flex-col bg-slate-900/40 border border-slate-800/90 rounded-2xl p-3 border-t-4 ${column.borderColor} backdrop-blur-sm shadow-xl`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-200">{column.title}</h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${column.badgeColor}`}
                  >
                    {column.leads.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-h-[500px]">
                {column.leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-800/80 rounded-xl text-slate-600 text-xs text-center p-4">
                    <span>Nenhum lead neste estágio</span>
                  </div>
                ) : (
                  column.leads.map((lead) => {
                    const isNewSDR = isCreatedWithin24Hours(lead.created_at);
                    const isUpdating = updatingId === lead.id;
                    const contact = lead.contact_name || lead.name || 'Contato não informado';

                    return (
                      <div
                        key={lead.id}
                        className={`relative group bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 shadow-sm transition-all flex flex-col justify-between ${
                          isUpdating ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            {isNewSDR ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                NOVO SDR
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {lead.created_at
                                  ? new Date(lead.created_at).toLocaleDateString('pt-BR')
                                  : 'Data n/d'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start gap-2.5 mb-2.5">
                            <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                            <h3 className="text-sm font-semibold text-slate-100 leading-snug group-hover:text-indigo-300 transition-colors">
                              {lead.school_name || 'Escola sem nome'}
                            </h3>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span className="truncate text-slate-300 font-medium">
                                {contact}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <a
                                href={`mailto:${lead.email}`}
                                className="truncate hover:text-indigo-400 hover:underline"
                                title={lead.email}
                              >
                                {lead.email || 'E-mail não informado'}
                              </a>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span className="truncate">
                                {lead.city || 'Cidade n/d'}
                                {lead.state ? ` - ${lead.state}` : ''}
                              </span>
                            </div>
                          </div>

                          {lead.notes && (
                            <div className="text-[11px] text-slate-500 line-clamp-2 italic mb-3">
                              "{lead.notes}"
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <label className="text-[11px] text-slate-500 font-medium">Estágio:</label>
                          <select
                            value={lead.stage || 'novo_lead'}
                            onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                            disabled={isUpdating}
                            className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:border-slate-700 transition"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
