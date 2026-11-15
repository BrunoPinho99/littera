
import React, { useState, useMemo, useEffect } from 'react';
import { exploreTopics } from '../data/exploreTopics';

interface ExploreViewProps {
  onSelectTopic: (topicTitle: string) => void;
}

const categories = ["Todos", "Sociedade", "Meio Ambiente", "Tecnologia", "Educação", "Saúde", "Cultura", "Política", "Economia"];
const ITEMS_PER_PAGE = 9;

const PROJECT_COVERS = [
  '/assets/covers/cover-1.jpg',
  '/assets/covers/cover-2.jpg',
  '/assets/covers/cover-3.jpg',
  '/assets/covers/cover-4.jpg',
  '/assets/covers/cover-5.jpg',
];

const getProjectCover = (id: string, index: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PROJECT_COVERS[(hash + index) % PROJECT_COVERS.length];
};

const ExploreView: React.FC<ExploreViewProps> = ({ onSelectTopic }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  // Resetar para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Desafio da Semana (simulando um tema em destaque)
  const featuredTopic = exploreTopics.find(t => t.difficulty === 'Difícil') || exploreTopics[0];

  const filteredTopics = useMemo(() => {
    return exploreTopics.filter(topic => {
      // Remover o tópico em destaque do grid se estivermos na visualização 'Todos' sem busca, para não duplicar
      const isFeatured = topic.id === featuredTopic.id && selectedCategory === 'Todos' && !searchTerm;
      if (isFeatured) return false;

      const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || topic.category === selectedCategory;
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
    <div className="animate-fade-in pb-24 md:pb-20">
      
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-on-surface tracking-tighter mb-4">
          Central de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Missões</span>
        </h1>
        <p className="text-sm sm:text-lg text-on-surface-variant font-medium px-2">
          Escolha seu desafio, acumule XP e domine a arte da redação.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-16 sm:top-24 z-40 bg-surface/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-3xl ghost-border shadow-ambient mb-6 sm:mb-12">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-icons-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary text-2xl">search</span>
            <input
              type="text"
              placeholder="Busque por 'Inteligência Artificial'..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-surface-container-low border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/20 focus:ring-4 focus:ring-primary/10 text-on-surface font-bold transition-all outline-none text-sm sm:text-base uppercase tracking-wider"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide items-center">
            {categories.slice(0, 5).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl text-xs sm:text-sm font-black transition-all border ${
                  selectedCategory === category 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg transform scale-105" 
                    : "bg-transparent text-on-surface-variant dark:text-on-surface-variant ghost-border hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desafio da Semana (Hero Banner) */}
      {selectedCategory === 'Todos' && !searchTerm && currentPage === 1 && (
        <div
          className="mb-10 relative overflow-hidden group rounded-[28px] cursor-pointer min-h-[260px] sm:min-h-[300px] p-6 sm:p-10 flex flex-col justify-between shadow-ambient border border-white/10 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
          onClick={() => onSelectTopic(featuredTopic.title)}
        >
          {/* Background Cover Image */}
          <img
            src={getProjectCover(featuredTopic.id, 0)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none"
          />

          {/* Scrim Overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25 pointer-events-none"
          />

          {/* Top: Logo Pequena */}
          <div className="relative z-10 flex items-center">
            <img
              src="/assets/littera-logo.png"
              alt="Littera"
              className="h-4 sm:h-5 w-auto brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Bottom: Apenas o Título */}
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white group-hover:text-blue-100 transition-colors drop-shadow-md">
              {featuredTopic.title}
            </h2>
          </div>
        </div>
      )}

      {/* Grid de Cards (Capas de Projetos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7 mb-12">
        {currentTopics.map((topic, index) => (
          <div 
            key={topic.id}
            onClick={() => onSelectTopic(topic.title)}
            className="group relative rounded-[26px] overflow-hidden cursor-pointer h-[360px] sm:h-[400px] p-6 sm:p-7 flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shadow-ambient border border-white/10"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Background Cover Image */}
            <img
              src={getProjectCover(topic.id, index)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none"
            />

            {/* Scrim Overlay for Contrast */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 group-hover:from-black/90 transition-colors pointer-events-none"
            />

            {/* Top: Logo Pequena */}
            <div className="relative z-10 flex items-center justify-between">
              <img
                src="/assets/littera-logo.png"
                alt="Littera"
                className="h-3.5 sm:h-4 w-auto brightness-0 invert opacity-75 group-hover:opacity-100 transition-opacity"
              />
            </div>

            {/* Bottom: Apenas o Título */}
            <div className="relative z-10">
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-4 group-hover:text-blue-100 transition-colors drop-shadow-md">
                {topic.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-12 h-12 rounded-2xl bg-surface-container-lowest ghost-border flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/30 disabled:opacity-30 disabled:hover:text-on-surface-variant transition-all shadow-sm"
          >
            <span className="material-icons-outlined">chevron_left</span>
          </button>
          
          <div className="px-6 py-3 bg-surface-container-lowest rounded-2xl ghost-border shadow-sm">
            <span className="text-sm font-black text-on-surface">
              Página <span className="text-primary">{currentPage}</span> de {totalPages}
            </span>
          </div>

          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-12 h-12 rounded-2xl bg-surface-container-lowest ghost-border flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/30 disabled:opacity-30 disabled:hover:text-on-surface-variant transition-all shadow-sm"
          >
            <span className="material-icons-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {filteredTopics.length === 0 && (
         <div className="text-center py-20 opacity-50">
           <p className="text-xl font-bold">Nenhum tema encontrado.</p>
           <p className="text-sm">Tente buscar com outros termos.</p>
         </div>
      )}
    </div>
  );
};

export default ExploreView;
    