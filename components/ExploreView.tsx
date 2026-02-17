
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

  const filteredTopics = useMemo(() => {
    return exploreTopics.filter(topic => {
      const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || topic.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

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
    <div className="animate-fade-in pb-20">
      
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
          Explore os principais temas de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">redação do ENEM</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
          Navegue por nossa biblioteca de temas de alta probabilidade, atualizados semanalmente com dados reais.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-24 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium mb-12">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-icons-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary text-2xl">search</span>
            <input
              type="text"
              placeholder="Busque por 'Inteligência Artificial'..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/20 focus:ring-4 focus:ring-primary/10 text-slate-900 dark:text-white font-bold transition-all outline-none"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide items-center">
            {categories.slice(0, 5).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-5 py-3.5 rounded-xl text-sm font-black transition-all border ${
                  selectedCategory === category 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg transform scale-105" 
                    : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
        {currentTopics.map((topic, index) => (
          <div 
            key={topic.id}
            onClick={() => onSelectTopic(topic.title)}
            className="group relative bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-premium overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Decorative Gradient Blob on Hover */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="mb-6 flex justify-between items-start relative z-10">
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(topic.category)}`}>
                {topic.category}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-slate-800 rounded-md">
                <div className={`w-2 h-2 rounded-full ${topic.difficulty === 'Fácil' ? 'bg-green-500' : topic.difficulty === 'Médio' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{topic.difficulty}</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 leading-tight group-hover:text-primary transition-colors relative z-10 line-clamp-3">
              {topic.title}
            </h3>
            
            <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between relative z-10">
               <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 border-2 border-white dark:border-surface-dark"></div>
                 ))}
               </div>
               <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
                 <span className="material-icons-outlined text-lg">arrow_forward</span>
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
            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/30 disabled:opacity-30 disabled:hover:text-gray-500 transition-all shadow-sm"
          >
            <span className="material-icons-outlined">chevron_left</span>
          </button>
          
          <div className="px-6 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <span className="text-sm font-black text-gray-900 dark:text-white">
              Página <span className="text-primary">{currentPage}</span> de {totalPages}
            </span>
          </div>

          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/30 disabled:opacity-30 disabled:hover:text-gray-500 transition-all shadow-sm"
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
    