import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Building2, 
  User, 
  Mail, 
  Phone,
  MapPin, 
  RefreshCw, 
  Search,
  Calendar,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  FileText,
  DollarSign,
  Users,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  Bell,
  MessageSquare,
  Clock,
  Sparkles,
  MoreHorizontal,
  X
} from 'lucide-react';

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
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}

const STAGES: ColumnConfig[] = [
  {
    id: 'novo_lead',
    title: 'Prospecção (SDR)',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-600',
  },
  {
    id: 'email_1_enviado',
    title: 'Qualificação (Email 1)',
    dotColor: 'bg-sky-500',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-600',
  },
  {
    id: 'email_2_enviado',
    title: 'Follow-up (Email 2)',
    dotColor: 'bg-indigo-500',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-600',
  },
  {
    id: 'reuniao_agendada',
    title: 'Proposta / Demo',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-600',
  },
  {
    id: 'trial',
    title: 'Negociação (Trial)',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-600',
  },
  {
    id: 'cliente_ganho',
    title: 'Fechado / Ganho',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-600',
  }
];

export default function CRMKanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'tabela'>('kanban');
  const [activeMenu, setActiveMenu] = useState<'vendas' | 'dashboard' | 'clientes'>('vendas');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  // Formulário de novo lead manual
  const [newLeadForm, setNewLeadForm] = useState({
    school_name: '',
    contact_name: '',
    email: '',
    whatsapp: '',
    city: '',
    state: '',
    stage: 'novo_lead' as LeadStage,
    notes: ''
  });

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar leads:', err);
      setError(err.message || 'Falha ao sincronizar leads.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Atualizar estágio no banco
  const handleMoveStage = async (leadId: string | number, newStage: LeadStage) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, stage: newStage } : null);
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.school_name || !newLeadForm.email) return;

    try {
      const payload = {
        name: newLeadForm.contact_name || newLeadForm.school_name,
        school_name: newLeadForm.school_name,
        contact_name: newLeadForm.contact_name,
        email: newLeadForm.email,
        phone: newLeadForm.whatsapp,
        whatsapp: newLeadForm.whatsapp,
        city: newLeadForm.city,
        state: newLeadForm.state,
        stage: newLeadForm.stage,
        status: 'pending',
        notes: newLeadForm.notes
      };

      const { data, error } = await supabase.from('leads').insert([payload]).select();
      if (error) throw error;

      if (data && data[0]) {
        setLeads(prev => [data[0], ...prev]);
        setIsNewLeadOpen(false);
        setNewLeadForm({
          school_name: '',
          contact_name: '',
          email: '',
          whatsapp: '',
          city: '',
          state: '',
          stage: 'novo_lead',
          notes: ''
        });
      }
    } catch (err: any) {
      alert('Erro ao criar lead: ' + err.message);
    }
  };

  const openWhatsApp = (lead: Lead) => {
    const rawNumber = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    if (!rawNumber) return;

    const contact = lead.contact_name || 'Coordenação';
    const school = lead.school_name || 'sua escola';
    const message = encodeURIComponent(
      `Olá, ${contact}! Tudo bem? Sou do Littera. Vi o trabalho de excelência do ${school} e gostaria de apresentar nossa tecnologia de correção e mentoria de redações ENEM com IA para seus professores. Teria 10 minutos esta semana?`
    );

    const intlNumber = rawNumber.length <= 11 ? `55${rawNumber}` : rawNumber;
    window.open(`https://wa.me/${intlNumber}?text=${message}`, '_blank');
  };

  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return leads.filter(l => 
      (l.school_name && l.school_name.toLowerCase().includes(term)) ||
      (l.contact_name && l.contact_name.toLowerCase().includes(term)) ||
      (l.email && l.email.toLowerCase().includes(term)) ||
      (l.city && l.city.toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  // Contadores para os Cards de KPI superiores
  const totalLeads = leads.length;
  const emNegociacao = leads.filter(l => l.stage === 'trial' || l.stage === 'reuniao_agendada').length;
  const fechados = leads.filter(l => l.stage === 'cliente_ganho').length;
  const valorTotalPipeline = leads.length * 7500; // Ticket médio institucional estimado

  return (
    <div className="bg-[#f0f2f6] font-sans antialiased text-slate-800 p-2 sm:p-5 lg:p-7 flex items-center justify-center min-h-screen">
      {/* Shell estilo janela moderna do mockup */}
      <div className="w-full max-w-[1520px] bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[920px] border border-slate-100">
        
        {/* SIDEBAR ESQUERDA */}
        <aside className="w-full lg:w-[250px] bg-white border-r border-slate-100 flex flex-col justify-between p-6 shrink-0">
          <div>
            {/* Logo Littera & Tag B2B */}
            <div className="flex items-center justify-between pb-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
                  L
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                    Littera
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    B2B Sales
                  </span>
                </div>
              </div>
              <button 
                onClick={fetchLeads}
                className="text-slate-400 hover:text-slate-600 p-1" 
                title="Atualizar Dados"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
              </button>
            </div>

            {/* Menu Geral */}
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3 px-3">
                  Menu Geral
                </p>
                <nav className="space-y-1.5">
                  <button
                    onClick={() => setActiveMenu('dashboard')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                      activeMenu === 'dashboard'
                        ? 'text-indigo-600 bg-indigo-50/70 border border-indigo-100 font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutGrid size={18} className={activeMenu === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => setActiveMenu('clientes')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                      activeMenu === 'clientes'
                        ? 'text-indigo-600 bg-indigo-50/70 border border-indigo-100 font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Users size={18} className={activeMenu === 'clientes' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Escolas</span>
                  </button>

                  <button
                    onClick={() => setActiveMenu('vendas')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                      activeMenu === 'vendas'
                        ? 'text-indigo-600 bg-indigo-50/70 border border-indigo-100 font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FileText size={18} className={activeMenu === 'vendas' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Vendas</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Rodapé da Sidebar */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 px-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SDR Online
            </span>
            <span className="font-mono text-[11px]">v2.4.0</span>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <main className="flex-1 flex flex-col bg-[#f8fafd] overflow-x-hidden min-w-0">
          
          {/* HEADER SUPERIOR */}
          <header className="bg-white border-b border-slate-100 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full sm:w-auto gap-8">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Vendas & Prospecção
              </h1>

              {/* Barra de Busca com atalho */}
              <div className="relative hidden md:block w-72 lg:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar colégio, cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#f8fafd] border border-slate-200/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Ações Topo Direito */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <button 
                onClick={fetchLeads}
                className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center relative transition-colors"
                title="Notificações / Atualizações"
              >
                <Bell size={18} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              <div className="flex items-center gap-2 pl-2">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs ring-2 ring-slate-100">
                  BP
                </div>
              </div>
            </div>
          </header>

          {/* CONTEÚDO SCROLLÁVEL */}
          <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
            
            {/* LINHA DE AÇÕES: Período e Botão Nova Venda */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Visão Geral do Mês
                </p>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Pipeline Educacional
                </h2>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-2xs transition-all">
                  <Calendar size={16} className="text-slate-500" />
                  <span>Este Mês</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                <button 
                  onClick={() => setIsNewLeadOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/25 transition-all"
                >
                  <Plus size={16} />
                  <span>Novo Lead</span>
                </button>
              </div>
            </div>

            {/* GRID DOS 4 CARDS DE KPI (Idêntico ao Stitch) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              
              {/* KPI 1: Novas Vendas / Leads */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Total Leads SDR</span>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">{totalLeads}</p>
                  <p className="text-[11px] font-medium text-slate-400">
                    <span className="text-emerald-500 font-semibold">+100%</span> | No funil ativo
                  </p>
                </div>
              </div>

              {/* KPI 2: Reuniões & Trials */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Propostas / Trials</span>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">{emNegociacao}</p>
                  <p className="text-[11px] font-medium text-slate-400">
                    <span className="text-indigo-500 font-semibold">{emNegociacao} ativas</span> | Em negociação
                  </p>
                </div>
              </div>

              {/* KPI 3: Pipeline de Receita Estimada */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <DollarSign size={16} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Pipeline Total</span>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {`R$ ${valorTotalPipeline.toLocaleString('pt-BR')}`}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    <span className="text-emerald-500 font-semibold">Valor pot.</span> | Anual estimado
                  </p>
                </div>
              </div>

              {/* KPI 4: Escolas Fechadas */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Contratos Ganhos</span>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">{fechados}</p>
                  <p className="text-[11px] font-medium text-slate-400">
                    <span className="text-emerald-500 font-semibold">100%</span> | Conversão
                  </p>
                </div>
              </div>

            </section>

            {/* SELETOR DE VISUALIZAÇÃO: KANBAN vs TABELA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-800 tracking-tight">
                  Oportunidades & Colégios
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {filteredLeads.length} ativas
                </span>
              </div>

              {/* Toggle Kanban / Tabela */}
              <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 self-start sm:self-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={14} className={viewMode === 'kanban' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>Kanban</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('tabela')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === 'tabela'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TableIcon size={14} className={viewMode === 'tabela' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>Tabela</span>
                </button>
              </div>
            </div>

            {/* VIEW 1: KANBAN BOARD */}
            {viewMode === 'kanban' && (
              <section className="space-y-4">
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-2 px-2 scroll-smooth">
                  {STAGES.map((col) => {
                    const colLeads = filteredLeads.filter(l => (l.stage || 'novo_lead') === col.id);
                    const estimatedVal = colLeads.length * 7500;

                    return (
                      <div 
                        key={col.id} 
                        className="w-[290px] shrink-0 flex flex-col bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70"
                      >
                        {/* Cabeçalho da Coluna */}
                        <div className="flex items-center justify-between px-1.5 py-1.5 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                            <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                              {col.title}
                            </h3>
                            <span className="text-[11px] font-semibold text-slate-400 bg-white border border-slate-200/80 rounded-full px-2 py-0.5 shadow-2xs">
                              {colLeads.length}
                            </span>
                          </div>
                        </div>

                        {/* Valor da Coluna */}
                        <div className="px-1.5 text-[11px] font-semibold text-slate-400 mb-3">
                          {`R$ ${estimatedVal.toLocaleString('pt-BR')}`}
                        </div>

                        {/* Cards Stack */}
                        <div className="space-y-3 flex-1 min-h-[300px]">
                          {colLeads.map((lead) => {
                            const initials = (lead.contact_name || lead.school_name || 'LE')
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map(n => n[0].toUpperCase())
                              .join('');

                            return (
                              <div
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[11px] font-semibold text-slate-400">
                                    {lead.city ? `${lead.city} - ${lead.state || ''}` : 'DF'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${col.badgeBg} ${col.badgeText}`}>
                                    {col.title.split(' ')[0]}
                                  </span>
                                </div>

                                <p className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                  {lead.school_name || lead.name || 'Escola sem nome'}
                                </p>

                                <p className="text-sm font-bold text-slate-900 mb-2">
                                  R$ 7.500 <span className="text-xs font-normal text-slate-400">/ano</span>
                                </p>

                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                      {initials}
                                    </div>
                                    <span className="text-slate-600 font-medium truncate max-w-[110px]">
                                      {lead.contact_name || 'Coordenação'}
                                    </span>
                                  </div>

                                  {(lead.whatsapp || lead.phone) ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsApp(lead);
                                      }}
                                      className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                                    >
                                      <MessageSquare size={12} />
                                      WhatsApp
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">
                                      {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {colLeads.length === 0 && (
                            <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                              Nenhum lead
                            </div>
                          )}
                        </div>

                        {/* Botão Adicionar Lead na Coluna */}
                        <button
                          type="button"
                          onClick={() => {
                            setNewLeadForm(prev => ({ ...prev, stage: col.id }));
                            setIsNewLeadOpen(true);
                          }}
                          className="mt-3 w-full py-2 border border-dashed border-slate-300 hover:border-indigo-500 rounded-xl text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white/60 hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Plus size={14} />
                          <span>Adicionar Lead</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* VIEW 2: TABELA DE LEADS */}
            {viewMode === 'tabela' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Escola / Cursinho</th>
                      <th className="py-3.5 px-4">Contato</th>
                      <th className="py-3.5 px-4">Local</th>
                      <th className="py-3.5 px-4">Estágio</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => (
                      <tr 
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-bold text-slate-800 group-hover:text-indigo-600">
                          {lead.school_name || lead.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{lead.contact_name || 'Coordenação'}</div>
                          <div className="text-xs text-slate-400">{lead.email}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {lead.city ? `${lead.city} - ${lead.state || ''}` : 'DF'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {lead.stage || 'novo_lead'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(lead.whatsapp || lead.phone) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(lead);
                              }}
                              className="px-3 py-1 bg-emerald-50 text-emerald-600 font-semibold text-xs rounded-lg hover:bg-emerald-100 transition"
                            >
                              WhatsApp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MODAL DETALHES DO LEAD */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Oportunidade Escolar
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {selectedLead.school_name || selectedLead.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Mudar Estágio do Funil
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleMoveStage(selectedLead.id, s.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition ${
                        selectedLead.stage === s.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {s.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Responsável:</span>
                  <span className="font-semibold text-slate-700">{selectedLead.contact_name || 'Coordenação'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">E-mail:</span>
                  <span className="font-semibold text-slate-700">{selectedLead.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span className="font-semibold text-slate-700">{selectedLead.whatsapp || selectedLead.phone || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cidade:</span>
                  <span className="font-semibold text-slate-700">{selectedLead.city ? `${selectedLead.city} - ${selectedLead.state}` : 'DF'}</span>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="text-xs text-slate-500 bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                  <strong className="block text-amber-800 mb-1">Notas:</strong>
                  {selectedLead.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {(selectedLead.whatsapp || selectedLead.phone) ? (
                <button
                  onClick={() => openWhatsApp(selectedLead)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-emerald-600/20"
                >
                  <MessageSquare size={14} />
                  Chamar no WhatsApp
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO LEAD */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-xl font-extrabold text-slate-900 mb-4">
              Cadastrar Oportunidade
            </h3>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Colégio / Cursinho *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Colégio Bernoulli"
                  value={newLeadForm.school_name}
                  onChange={e => setNewLeadForm({ ...newLeadForm, school_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Contato</label>
                  <input
                    type="text"
                    placeholder="Ex: Prof. Helena"
                    value={newLeadForm.contact_name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(61) 99999-9999"
                    value={newLeadForm.whatsapp}
                    onChange={e => setNewLeadForm({ ...newLeadForm, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="coordenacao@escola.com.br"
                  value={newLeadForm.email}
                  onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Brasília"
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">UF</label>
                  <input
                    type="text"
                    placeholder="DF"
                    value={newLeadForm.state}
                    onChange={e => setNewLeadForm({ ...newLeadForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLeadOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition"
                >
                  Salvar Oportunidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
