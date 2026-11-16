import React, { useState, useMemo, useEffect } from 'react';
import { exploreTopics, ExploreTopic } from '../data/exploreTopics';
import { getTopicCover } from '../data/topicCovers';

interface ExploreViewProps {
  onSelectTopic: (topicTitle: string) => void;
}

const categories = [
  'Todos',
  'Sociedade',
  'Meio Ambiente',
  'Tecnologia',
  'Educação',
  'Saúde',
  'Cultura',
  'Política',
  'Economia',
];
const ITEMS_PER_PAGE = 9;

const ExploreView: React.FC<ExploreViewProps> = ({ onSelectTopic }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Resetar para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Desafio em Destaque
  const featuredTopic: ExploreTopic =
    exploreTopics.find((t) => t.difficulty === 'Difícil') || exploreTopics[0];

  const filteredTopics = useMemo(() => {
    return exploreTopics.filter((topic) => {
      const isFeatured =
        topic.id === featuredTopic.id && selectedCategory === 'Todos' && !searchTerm;
      if (isFeatured) return false;

      const matchesSearch = topic.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'Todos' || topic.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, featuredTopic.id]);

  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE);
  const currentTopics = filteredTopics.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="animate-fade-in pb-24 md:pb-20 max-w-7xl mx-auto">
      {/* Header Section — Tipografia Editorial Sólida Sem Gradiente de IA */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          Central de Missões
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium px-2 max-w-xl mx-auto leading-relaxed">
          Temas reais no padrão ENEM para praticar sua redação, repertório sociocultural e proposta de intervenção.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-16 sm:top-20 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8 sm:mb-10">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <span className="material-icons-outlined absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl sm:text-2xl">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar tema (ex: 'Inteligência Artificial', 'Fome', 'Amazônia')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 sm:pl-13 pr-4 sm:pr-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 dark:text-white font-semibold transition-all outline-none text-xs sm:text-sm tracking-wide"
            />
          </div>

          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide items-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desafio da Semana (Foto Documental em Destaque) */}
      {selectedCategory === 'Todos' && !searchTerm && currentPage === 1 && (
        <div
          className="mb-8 sm:mb-10 relative overflow-hidden group rounded-3xl cursor-pointer min-h-[260px] sm:min-h-[320px] p-6 sm:p-10 flex flex-col justify-between shadow-lg border border-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          onClick={() => onSelectTopic(featuredTopic.title)}
        >
          {/* Foto Real de Fundo */}
          <img
            src={getTopicCover(featuredTopic, 0)}
            alt={featuredTopic.title}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none"
          />

          {/* Scrim Escuro Fotográfico para Alto Contraste */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 pointer-events-none group-hover:from-black/90 transition-colors"
          />

          {/* Top: Categoria e Destaque */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
              Tema em Destaque • {featuredTopic.category}
            </span>
            <span className="text-white/80 text-xs font-semibold flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full backdrop-blur-md">
              <span className="material-icons-outlined text-sm">stars</span>
              {featuredTopic.difficulty}
            </span>
          </div>

          {/* Bottom: Título e Ação */}
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight text-white group-hover:text-blue-100 transition-colors drop-shadow-md mb-3">
              {featuredTopic.title}
            </h2>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-200 group-hover:text-white transition-colors">
              <span className="material-icons-outlined text-base">edit_note</span>
              <span>Iniciar Redação sobre este Tema &rarr;</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Cards Temáticos (Fotos Reais que Condizem com a Redação) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 mb-12">
        {currentTopics.map((topic, index) => (
          <div
            key={topic.id}
            onClick={() => onSelectTopic(topic.title)}
            className="group relative rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer h-[320px] sm:h-[360px] p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl border border-slate-200/40 shadow-sm"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {/* Foto Real de Fundo Correspondente ao Tema */}
            <img
              src={getTopicCover(topic, index)}
              alt={topic.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none"
            />

            {/* Scrim Escuro Fotográfico Suave */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25 group-hover:from-black/90 transition-colors pointer-events-none"
            />

            {/* Top: Categoria */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-black/50 backdrop-blur-md text-white/90 border border-white/15">
                {topic.category}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 text-white/90 backdrop-blur-md">
                {topic.difficulty}
              </span>
            </div>

            {/* Bottom: Título e CTA de Escrita */}
            <div className="relative z-10">
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-3 group-hover:text-blue-200 transition-colors drop-shadow-sm mb-3">
                {topic.title}
              </h3>
              <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-xs text-white/80 font-medium">
                <span className="inline-flex items-center gap-1.5 text-blue-300 font-semibold group-hover:text-white transition-colors">
                  <span className="material-icons-outlined text-sm">edit_note</span>
                  <span>Escrever Redação</span>
                </span>
                <span className="material-icons-outlined text-base transform group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
          >
            <span className="material-icons-outlined text-lg">chevron_left</span>
          </button>

          <div className="px-5 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
              Página <span className="text-blue-600">{currentPage}</span> de {totalPages}
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
          >
            <span className="material-icons-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}

      {filteredTopics.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg font-bold">Nenhum tema encontrado.</p>
          <p className="text-sm">Tente buscar por outras palavras-chave.</p>
        </div>
      )}
    </div>
  );
};

export default ExploreView;
