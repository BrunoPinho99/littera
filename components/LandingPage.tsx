import React from 'react';

interface LandingPageProps {
    onLoginClick: () => void;
    onDemoClick: (type: 'student' | 'teacher') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onDemoClick }) => {
    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark antialiased transition-colors duration-300">
            <style>{`
        .glass-panel {
            background-color: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .hero-gradient {
            background: linear-gradient(135deg, #8648ED 0%, #8B5CF6 50%, #A78BFA 100%);
        }
        .feature-icon {
            background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
        }
        .dark .feature-icon {
            background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
      `}</style>

            <nav className="fixed w-full z-50 top-0 transition-all duration-300 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-gray-100 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-primary text-3xl">auto_stories</span>
                            <span className="font-bold text-xl text-gray-900 dark:text-white">Littera</span>
                        </div>
                        <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <a className="hover:text-primary transition-colors" href="#features">Funcionalidades</a>
                            <a className="hover:text-primary transition-colors" href="#solutions">Soluções</a>
                            <a className="hover:text-primary transition-colors" href="#pricing">Preços</a>
                            <a className="hover:text-primary transition-colors" href="#resources">Recursos</a>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onLoginClick}
                                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => onDemoClick('student')}
                                className="bg-primary hover:bg-violet-700 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-lg hover:shadow-primary/30"
                            >
                                Agendar Demo
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-violet-100/50 via-purple-50/30 to-transparent dark:from-violet-900/20 dark:via-slate-900/0 dark:to-transparent -z-10"></div>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-primary text-xs font-semibold mb-6 border border-violet-200 dark:border-violet-800 opacity-0 animate-fade-in-up">
                        <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                        Versão 2.0 com IA Generativa
                    </div>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-gray-900 dark:text-white leading-tight max-w-4xl mx-auto opacity-0 animate-fade-in-up delay-100">
                        Sua escola com aprovação máxima no ENEM <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">através da redação</span>
                    </h1>
                    <p className="mt-4 text-xl text-muted-light dark:text-muted-dark max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in-up delay-200">
                        Littera é a plataforma completa baseada em nuvem para gerenciar correções de redações, feedback instantâneo e evolução pedagógica — de forma segura e perfeita.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 opacity-0 animate-fade-in-up delay-300">
                        <button
                            onClick={() => onDemoClick('student')}
                            className="bg-primary hover:bg-violet-700 text-white px-8 py-4 rounded-full text-base font-semibold transition-all shadow-xl hover:shadow-primary/40 flex items-center justify-center gap-2"
                        >
                            Agendar Demonstração
                            <span className="material-icons text-sm">arrow_forward</span>
                        </button>
                        <button
                            onClick={() => onDemoClick('student')}
                            className="bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary px-8 py-4 rounded-full text-base font-semibold transition-all flex items-center justify-center"
                        >
                            Ver Como Funciona
                        </button>
                    </div>

                    <div className="relative mx-auto max-w-5xl opacity-0 animate-fade-in-up delay-500">
                        <div className="absolute -top-12 -left-12 w-24 h-24 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary rounded-full blur-3xl opacity-20"></div>

                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
                            <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="ml-4 bg-white dark:bg-slate-800 px-3 py-1 rounded text-xs text-muted-light dark:text-muted-dark flex-1 max-w-sm text-center">littera.education/dashboard</div>
                            </div>

                            <div className="relative aspect-[16/10] w-full bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 overflow-hidden">
                                <img
                                    src="/dashboard-student.png"
                                    alt="Littera Student Dashboard"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white dark:bg-slate-900" id="features">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Recursos Inteligentes para Simplificar seu Trabalho</h2>
                        <p className="text-lg text-muted-light dark:text-muted-dark">
                            Desbloqueie todo o potencial da sua escola com nossas ferramentas SaaS inteligentes, eficientes e fáceis de usar, economizando horas todos os dias.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-8 transition-all hover:shadow-soft border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm mb-6 flex items-center gap-4">
                                <div className="relative w-16 h-16 flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                                        <path className="text-yellow-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="40, 100" strokeWidth="4"></path>
                                        <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="25, 100" strokeDashoffset="-40" strokeWidth="4"></path>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-light dark:text-muted-dark mb-1">Análise de Competências</div>
                                </div>
                                <div className="ml-auto">
                                    <div className="h-8 w-1 bg-primary/20 rounded-full mx-0.5 inline-block"></div>
                                    <div className="h-12 w-1 bg-primary/40 rounded-full mx-0.5 inline-block"></div>
                                    <div className="h-6 w-1 bg-primary/20 rounded-full mx-0.5 inline-block"></div>
                                    <div className="h-10 w-1 bg-primary rounded-full mx-0.5 inline-block"></div>
                                    <div className="h-7 w-1 bg-primary/30 rounded-full mx-0.5 inline-block"></div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Correção em Larga Escala</h3>
                            <p className="text-muted-light dark:text-muted-dark text-sm mb-4">
                                A automação não precisa ser complicada. Nossa plataforma permite que você corrija milhares de redações mantendo a precisão pedagógica.
                            </p>

                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 transition-all hover:shadow-soft border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm mb-4 w-fit">
                                    <span className="material-icons text-primary">psychology</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Feedback IA Instantâneo</h3>
                                <p className="text-muted-light dark:text-muted-dark text-xs mb-3">
                                    Alunos recebem devolutivas imediatas baseadas nos critérios oficiais do ENEM.
                                </p>
                                <a className="text-primary text-xs font-medium hover:underline" href="#">Explorar</a>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 transition-all hover:shadow-soft border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm mb-4 w-fit">
                                    <span className="material-icons text-primary">security</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Segurança de Dados</h3>
                                <p className="text-muted-light dark:text-muted-dark text-xs mb-3">
                                    Proteção de nível empresarial para os dados dos seus alunos e da sua escola.
                                </p>
                                <a className="text-primary text-xs font-medium hover:underline" href="#">Detalhes</a>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 col-span-1 sm:col-span-2 flex flex-col sm:flex-row gap-6 items-center transition-all hover:shadow-soft border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Escalável e Customizável</h3>
                                    <p className="text-muted-light dark:text-muted-dark text-xs mb-3">
                                        Adapte os critérios de correção conforme a metodologia da sua escola para garantir a melhor preparação.
                                    </p>
                                    <a className="bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:bg-violet-700 transition-colors" href="#pricing">Ver Plano</a>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm w-full sm:w-1/2">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-2/3"></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-3/4"></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-gray-50 dark:bg-slate-900/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-100/50 to-transparent dark:from-violet-900/10 dark:to-transparent pointer-events-none"></div>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-5">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">A Visão do Futuro da Automação Educacional</h2>
                            <p className="text-lg text-muted-light dark:text-muted-dark mb-8">
                                Professores perdem até 40% do seu tempo corrigindo pilhas de papel. Isso gera burnout, atraso no feedback para o aluno e perda de qualidade no ensino.
                            </p>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="feature-icon p-2 rounded-lg text-primary mt-1">
                                        <span className="material-icons text-xl">timer_off</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Correção Lenta</h4>
                                        <p className="text-sm text-muted-light dark:text-muted-dark">Semanas para devolver uma redação atrasam o ciclo de aprendizado.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="feature-icon p-2 rounded-lg text-primary mt-1">
                                        <span className="material-icons text-xl">rule</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Subjetividade</h4>
                                        <p className="text-sm text-muted-light dark:text-muted-dark">Critérios inconsistentes geram insegurança nos alunos para o ENEM.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="feature-icon p-2 rounded-lg text-primary mt-1">
                                        <span className="material-icons text-xl">sentiment_dissatisfied</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Falta de Indicadores</h4>
                                        <p className="text-sm text-muted-light dark:text-muted-dark">Dificuldade em mapear quais competências a escola precisa reforçar.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                            <img alt="Professores colaborando" className="rounded-2xl shadow-lg w-full h-64 object-cover col-span-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvQL6RxfJc0fyRjvVPdRDxAsfkiDNkeBybBZQqDQkWsYhOKbMHS9NVDu3Pz3PWTjqNN8_V4G6Rdvosb1RmHgKr8QpjgmXozWuZgKA1jAaGq-imlSH6I35QP5IAqb2vgbHvLRSO3xftITw4cj962RuMIuRU57buN5K7NJfsKOPfp1XN6bHCVVUoRCsz3U-TXHmJHh2X9D793AR8KCbgzIzHCQp2-JCZM1jIuvzfcPM4YeFiq49N01WsvHBjfrS9SnAfaj6zGaoQLYM" />
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md text-center">
                                <span className="block text-3xl font-bold text-primary mb-1">2M+</span>
                                <span className="text-sm text-muted-light dark:text-muted-dark">Redações Corrigidas</span>
                            </div>
                            <div className="bg-primary p-6 rounded-2xl shadow-md text-center text-white">
                                <span className="block text-3xl font-bold mb-1">50+</span>
                                <span className="text-sm opacity-90">Escolas Parceiras</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-12 bg-primary dark:bg-violet-900">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center opacity-70 text-white font-bold text-xl">
                        <span className="flex items-center gap-2"><span className="material-icons">school</span> EduTech</span>
                        <span className="flex items-center gap-2"><span className="material-icons">menu_book</span> Colégio Alpha</span>
                        <span className="flex items-center gap-2"><span className="material-icons">edit_note</span> Redação1000</span>
                        <span className="flex items-center gap-2"><span className="material-icons">auto_awesome</span> FutureLearn</span>
                        <span className="flex items-center gap-2"><span className="material-icons">public</span> GlobalSchool</span>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white dark:bg-slate-900" id="solutions">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Insights Mais Inteligentes, Melhores Decisões</h2>
                        <p className="text-muted-light dark:text-muted-dark max-w-2xl mx-auto">
                            Acompanhe o desempenho de turmas inteiras ou foque na dificuldade individual de cada aluno para garantir a nota 1000.
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded text-green-600 dark:text-green-400">
                                        <span className="material-icons">check_circle</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">Anti-plágio Integrado</div>
                                        <div className="text-xs text-muted-light dark:text-muted-dark">Segurança no processo</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded text-blue-600 dark:text-blue-400">
                                        <span className="material-icons">auto_graph</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">Evolução Histórica</div>
                                        <div className="text-xs text-muted-light dark:text-muted-dark">Rumo à aprovação máxima</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md text-center relative">
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Média Geral da Escola (ENEM)</h4>
                                <div className="relative w-48 h-48 mx-auto">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                        <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="76, 100" strokeLinecap="round" strokeWidth="3"></path>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-bold text-gray-900 dark:text-white">760</span>
                                        <span className="text-xs text-green-500 font-medium">+15% vs mês anterior</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-center gap-4 text-xs">
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full"></span> Média</div>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 dark:bg-slate-600 rounded-full"></span> Meta</div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Competências Críticas</h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Norma Culta</span>
                                            <span className="font-medium text-gray-900 dark:text-white">82% alunos</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full">
                                            <div className="h-full bg-red-400 w-[82%] rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Proposta Intervenção</span>
                                            <span className="font-medium text-gray-900 dark:text-white">65% alunos</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full">
                                            <div className="h-full bg-orange-400 w-[65%] rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Repertório Sociocult.</span>
                                            <span className="font-medium text-gray-900 dark:text-white">45% alunos</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full">
                                            <div className="h-full bg-yellow-400 w-[45%] rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-gray-50 dark:bg-slate-900/50" id="pricing">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Planos para sua Instituição</h2>
                        <p className="text-xl text-muted-light dark:text-muted-dark max-w-2xl mx-auto">Transforme o desempenho pedagógico da sua escola com uma solução completa e personalizada.</p>
                    </div>
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-primary rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-4 border border-white/30 backdrop-blur-sm">
                                            <span className="flex h-2 w-2 rounded-full bg-yellow-400"></span>
                                            OFERTA INSTITUCIONAL COMPLETA
                                        </div>
                                        <h3 className="text-3xl md:text-4xl font-bold mb-2">Plano Littera Elite</h3>
                                        <p className="text-white/80 text-lg">A solução definitiva para redes de ensino e colégios focados em excelência no ENEM.</p>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <div className="text-sm font-medium text-white/70 mb-1 uppercase tracking-wider">Investimento</div>
                                        <div className="text-5xl md:text-6xl font-extrabold tracking-tight">Sob Consulta</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-12">
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Correções Ilimitadas por Aluno</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">IA Treinada em Competências ENEM</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Dashboard de Evolução em Tempo Real</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Sistema Anti-plágio de Alta Precisão</span>
                                        </li>
                                    </ul>
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Suporte e Consultoria Pedagógica</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Integração Total com Google & MS Teams</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Relatórios Gerenciais para Coordenação</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-white/20 rounded-full p-1"><span className="material-icons text-white text-base">check</span></div>
                                            <span className="text-lg font-medium">Treinamento para Equipe de Professores</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <button
                                        onClick={() => { }}
                                        className="flex-1 bg-white text-primary hover:bg-gray-100 px-8 py-5 rounded-2xl text-center font-bold text-xl transition-all shadow-xl hover:shadow-black/20 flex items-center justify-center gap-3"
                                    >
                                        Falar com um Consultor
                                        <span className="material-icons">arrow_forward</span>
                                    </button>
                                    <button
                                        onClick={() => onDemoClick('student')}
                                        className="sm:w-1/3 border border-white/40 hover:bg-white/10 px-8 py-5 rounded-2xl text-center font-semibold text-lg transition-all flex items-center justify-center"
                                    >
                                        Ver Demo
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 flex items-center justify-center gap-8 opacity-60">
                            <div className="flex items-center gap-2"><span className="material-icons text-sm">lock</span> <span className="text-xs uppercase font-bold tracking-widest">Seguro & Confiável</span></div>
                            <div className="flex items-center gap-2"><span className="material-icons text-sm">verified_user</span> <span className="text-xs uppercase font-bold tracking-widest">LGPD Compliance</span></div>
                            <div className="flex items-center gap-2"><span className="material-icons text-sm">stars</span> <span className="text-xs uppercase font-bold tracking-widest">Premium Support</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white dark:bg-slate-900">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">O que nossos parceiros dizem</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex gap-4">
                            <img alt="Avatar" className="w-12 h-12 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATe7SyQZvXE7OD2j-0mGvt2UAQxhFMAcTQz0H38ugOtm0B53JHQhjklJl0_5vTy6sz8CA8c6JzTfmX4YzU-nBk-RwrZSp2vTFGIzGoPMPTk0PAxTkl9BaTnXwgwn-eKiRPNdsZtjHPdsuuiIJa00uUkgMa5WwPMLmBnIbje7rhqko_n9FH7sfdHSnPzoPTAUGtswllgBhDVV3kum2XXzMCkv7D4GI_S3ysXwgqNsgKPE_0sQUBuerprKBMZzSxEpZ2sL4ESH2QfOU" />
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-2">"A Littera transformou a forma como damos feedback. Nossas notas no ENEM subiram 15% após o primeiro semestre de uso."</p>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Mariana Costa</p>
                                <p className="text-[10px] text-muted-light dark:text-muted-dark">Coordenadora Pedagógica, Colégio Saber</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex gap-4">
                            <img alt="Avatar" className="w-12 h-12 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCasF0HdOnlMMCIDNPtpI0BqpCvBOzHCXEePrM2YXVbPtgDLZI1ugIteNIHF05VnW2LL4G0H1ktWInjGG6mNQ1Q6JscHZBoKOD7p3E7QDAAa3op1EiwkuDZdnhbumL4jo5zz7AduZTdYRjjvxAW3saBNblsiEQ94AKAFeGJ7evAD9PwCVqRpbJYj30qojYvwdBjlUYMXOoyealjnQ2YYGfH8xwtMDnUT_ZGNWCZrqaGw6b6csnPm88emvr5V3l0xPkSp0tLLBJxFS0" />
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-2">"A precisão da IA no modelo ENEM é impressionante. É o suporte que nossos professores precisavam para escalar a correção."</p>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Carlos Mendes</p>
                                <p className="text-[10px] text-muted-light dark:text-muted-dark">Diretor Acadêmico</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="bg-gray-50 dark:bg-slate-900 pt-16 pb-8 border-t border-gray-200 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pronto para elevar a média da sua escola?</h3>
                            <p className="text-muted-light dark:text-muted-dark">Junte-se a dezenas de escolas que já usam IA para garantir aprovação.</p>
                        </div>
                        <div className="flex gap-4">
                            <input className="px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="E-mail corporativo" type="email" />
                            <button
                                onClick={() => { }}
                                className="bg-primary hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Começar Agora
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-icons text-primary">auto_stories</span>
                                <span className="font-bold text-lg text-gray-900 dark:text-white">Littera</span>
                            </div>
                            <p className="text-sm text-muted-light dark:text-muted-dark">
                                Transformando a correção de redações com inteligência artificial ética e focada em resultados reais.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">Produto</h4>
                            <ul className="space-y-2 text-sm text-muted-light dark:text-muted-dark">
                                <li><a className="hover:text-primary" href="#">Funcionalidades</a></li>
                                <li><a className="hover:text-primary" href="#">Correção ENEM</a></li>
                                <li><a className="hover:text-primary" href="#pricing">Preços</a></li>
                                <li><a className="hover:text-primary" href="#">Integrações</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">Empresa</h4>
                            <ul className="space-y-2 text-sm text-muted-light dark:text-muted-dark">
                                <li><a className="hover:text-primary" href="#">Sobre Nós</a></li>
                                <li><a className="hover:text-primary" href="#">Cases de Sucesso</a></li>
                                <li><a className="hover:text-primary" href="#">Blog</a></li>
                                <li><a className="hover:text-primary" href="#">Contato</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-light dark:text-muted-dark">
                                <li><a className="hover:text-primary" href="#">Privacidade</a></li>
                                <li><a className="hover:text-primary" href="#">Termos de Uso</a></li>
                                <li><a className="hover:text-primary" href="#">Segurança</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-muted-light dark:text-muted-dark">© 2023 Littera Education. Todos os direitos reservados.</p>
                        <div className="flex gap-4">
                            <a className="text-muted-light dark:text-muted-dark hover:text-primary" href="#"><span className="sr-only">Twitter</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg></a>
                            <a className="text-muted-light dark:text-muted-dark hover:text-primary" href="#"><span className="sr-only">LinkedIn</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path clipRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" fillRule="evenodd"></path></svg></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;