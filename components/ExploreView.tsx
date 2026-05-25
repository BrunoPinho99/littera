
import React, { useState, useMemo, useEffect } from 'react';
import { exploreTopics, ExploreTopic } from '../data/exploreTopics';

interface ExploreViewProps {
  onSelectTopic: (topicTitle: string) => void;
}

const categories = ["Todos", "Sociedade", "Meio Ambiente", "Tecnologia", "Educação", "Saúde", "Cultura", "Política", "Economia"];
const ITEMS_PER_PAGE = 9;

const ExploreView: React.FC<ExploreViewProps> = ({ onSelectTopic }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  // Resetar para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Lógica gamificada
  const getDifficultyXP = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 500;
      case 'Médio': return 1000;
      case 'Difícil': return 1500;
      default: return 500;
    }
  };

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Sociedade": return "text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/30";
      case "Meio Ambiente": return "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30";
      case "Tecnologia": return "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30";
      case "Educação": return "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30";
      case "Saúde": return "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/30";
      default: return "text-gray-600 bg-gray-50 border-gray-100 dark:bg-slate-800 dark:border-slate-700";
    }
  };

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
        <div className="mb-12 relative overflow-hidden group rounded-[2rem] bg-gradient-to-br from-slate-900 via-black to-slate-900 border-2 border-primary/20 shadow-2xl shadow-primary/20 cursor-pointer"
             onClick={() => onSelectTopic(featuredTopic.title)}>
          {/* Fundo Decorativo */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/30 rounded-full blur-[80px] group-hover:bg-primary/50 transition-colors duration-700"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          
          <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-white">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-black uppercase tracking-widest">
                  <span className="material-icons-outlined text-sm">local_fire_department</span>
                  Desafio da Semana
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 text-xs font-black uppercase tracking-widest">
                  +{getDifficultyXP(featuredTopic.difficulty)} XP
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors">
                {featuredTopic.title}
              </h2>
              
              <div className="flex items-center gap-4 pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/30 transform group-hover:scale-105 transition-all">
                  <span className="material-icons-outlined">sports_esports</span>
                  Aceitar Missão
                </button>
                <div className="text-sm font-bold text-gray-400 flex items-center gap-2">
                  <span className="material-icons-outlined text-gray-500">group</span>
                  2.450 alunos na arena
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8 mb-12">
        {currentTopics.map((topic, index) => (
          <div 
            key={topic.id}
            onClick={() => onSelectTopic(topic.title)}
            className="group relative bg-surface-container-lowest rounded-card p-5 sm:p-8 border border-gray-100 dark:border-slate-800 cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-ambient overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Decorative Gradient Blob on Hover */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="mb-6 flex justify-between items-start relative z-10">
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(topic.category)}`}>
                {topic.category}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-low rounded-md">
                <div className={`w-2 h-2 rounded-full ${topic.difficulty === 'Fácil' ? 'bg-green-500' : topic.difficulty === 'Médio' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">{topic.difficulty}</span>
              </div>
            </div>
            
            <h3 className="text-base sm:text-xl font-bold text-on-surface mb-3 sm:mb-4 leading-tight group-hover:text-primary transition-colors relative z-10 line-clamp-3">
              {topic.title}
            </h3>
            
            <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between relative z-10">
               <div className="flex items-center gap-2">
                 <span className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-black tracking-widest uppercase">
                   <span className="material-icons-outlined text-sm">stars</span>
                   +{getDifficultyXP(topic.difficulty)} XP
                 </span>
               </div>
               <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm transform group-hover:rotate-12">
                 <span className="material-icons-outlined text-lg">flight_takeoff</span>
               </div>
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
    