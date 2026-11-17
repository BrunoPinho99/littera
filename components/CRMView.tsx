import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Trash2,
  Edit2
} from 'lucide-react';

export interface Lead {
  id: string;
  name?: string;
  school_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  stage: 'novo_lead' | 'contato_feito' | 'reuniao_agendada' | 'trial_ativo' | 'ganho' | 'perdido';
  status: string;
  notes?: string;
  created_at: string;
}

const STAGES = [
  { key: 'novo_lead', label: 'Novos Leads', color: 'border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' },
  { key: 'contato_feito', label: 'Contato Feito', color: 'border-amber-500 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' },
  { key: 'reuniao_agendada', label: 'Demo Agendada', color: 'border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' },
  { key: 'trial_ativo', label: 'Trial Ativo', color: 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' },
  { key: 'ganho', label: 'Fechado (Ganho)', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' },
  { key: 'perdido', label: 'Descartado', color: 'border-slate-500 bg-slate-50/50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
] as const;

export const CRMView: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // Form novo lead
  const [formData, setFormData] = useState({
    school_name: '',
    contact_name: '',
    email: '',
    whatsapp: '',
    city: '',
    state: '',
    stage: 'novo_lead' as Lead['stage'],
    notes: '',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
      } else {
        setLeads((data as Lead[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadStage = async (id: string, newStage: Lead['stage']) => {
    // Atualização otimista
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
    if (selectedLead?.id === id) {
      setSelectedLead(prev => prev ? { ...prev, stage: newStage } : null);
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar estágio:', error);
        fetchLeads(); // Rollback em caso de erro
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const updateLeadNotes = async (id: string, notes: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
    if (selectedLead?.id === id) {
      setSelectedLead(prev => prev ? { ...prev, notes } : null);
    }

    await supabase.from('leads').update({ notes }).eq('id', id);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Deseja realmente remover este lead?')) return;

    setLeads(prev => prev.filter(l => l.id !== id));
    if (selectedLead?.id === id) setSelectedLead(null);

    await supabase.from('leads').delete().eq('id', id);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.school_name) return;

    const newLeadPayload = {
      ...formData,
      status: 'pending',
      name: formData.contact_name || formData.school_name,
    };

    const { data, error } = await supabase.from('leads').insert([newLeadPayload]).select();

    if (error) {
      alert('Erro ao salvar lead: ' + error.message);
    } else if (data && data[0]) {
      setLeads(prev => [data[0] as Lead, ...prev]);
      setIsNewLeadModalOpen(false);
      setFormData({
        school_name: '',
        contact_name: '',
        email: '',
        whatsapp: '',
        city: '',
        state: '',
        stage: 'novo_lead',
        notes: '',
      });
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

  const filteredLeads = leads.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.school_name || '').toLowerCase().includes(term) ||
      (l.contact_name || '').toLowerCase().includes(term) ||
      (l.email || '').toLowerCase().includes(term) ||
      (l.city || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 flex flex-col font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                SDR & Vendas B2B
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                CRM de Prospecção Escolar
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pipeline de leads capturados pelo Agente SDR e formulários da Landing Page.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLeads}
              disabled={isLoading}
              className="p-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title="Atualizar lista"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsNewLeadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition shadow-blue-500/20"
            >
              <Plus size={16} />
              Novo Lead Manual
            </button>
          </div>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por escola, contato, e-mail ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total de leads: <strong className="text-slate-900 dark:text-white">{leads.length}</strong>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto w-full flex-1 overflow-x-auto pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-[1100px]">
          {STAGES.map((col) => {
            const colLeads = filteredLeads.filter(l => (l.stage || 'novo_lead') === col.key);

            return (
              <div 
                key={col.key} 
                className="flex flex-col bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 min-h-[500px]"
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color.split(' ')[0].replace('border-', 'bg-')}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-xs">
                    {colLeads.length}
                  </span>
                </div>

                {/* Lista de Cards */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-blue-400 transition cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
                            {lead.school_name || lead.name || 'Escola sem nome'}
                          </h4>
                        </div>

                        {lead.contact_name && lead.contact_name !== lead.school_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {lead.contact_name}
                          </p>
                        )}

                        <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {lead.city && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">{lead.city} - {lead.state || 'UF'}</span>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ações Rápidas no Card */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>

                        {(lead.whatsapp || lead.phone) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(lead);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg transition"
                          >
                            <MessageSquare size={12} />
                            Whats
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                      <span className="text-xs text-slate-400">Nenhum lead</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Lead */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Detalhes do Lead
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedLead.school_name || selectedLead.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Estágio Atual */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mover Estágio no Funil
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => updateLeadStage(selectedLead.id, s.key)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition ${
                        selectedLead.stage === s.key
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contato:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedLead.contact_name || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">E-mail:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedLead.email || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">WhatsApp / Tel:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedLead.whatsapp || selectedLead.phone || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cidade / UF:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {selectedLead.city ? `${selectedLead.city} - ${selectedLead.state || ''}` : 'Não informado'}
                  </span>
                </div>
              </div>

              {/* Notas do Lead */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Notas / Histórico da Conversa
                </label>
                <textarea
                  rows={3}
                  defaultValue={selectedLead.notes || ''}
                  onBlur={(e) => updateLeadNotes(selectedLead.id, e.target.value)}
                  placeholder="Escreva anotações importantes sobre esse contato..."
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 size={14} /> Excluir Lead
              </button>

              <div className="flex items-center gap-2">
                {(selectedLead.whatsapp || selectedLead.phone) && (
                  <button
                    onClick={() => openWhatsApp(selectedLead)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-emerald-600/20"
                  >
                    <MessageSquare size={14} />
                    Chamar WhatsApp
                  </button>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Lead Manual */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Cadastrar Novo Lead
            </h3>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nome da Escola / Cursinho *
                </label>
                <input
                  type="text"
                  required
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  placeholder="Ex: Colégio Anglo Master"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Ex: Prof. Marcos"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(61) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="coordenacao@escola.com.br"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Brasília"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="DF"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMView;
