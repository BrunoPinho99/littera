import React, { useState, useEffect, useRef } from 'react';
import SubscriptionView from './SubscriptionView';

interface LandingPageProps {
    onLoginClick: () => void;
    onDemoClick: (type: 'student' | 'teacher') => void;
    onCheckout?: (plan: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onDemoClick, onCheckout }) => {
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, observerOptions);

        const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade');
        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="font-display mesh-bg text-text-light dark:text-text-dark antialiased transition-colors duration-300 min-h-screen">
            <style>{`
        .bg-glass {
            background-color: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(24px) saturate(150%);
            -webkit-backdrop-filter: blur(24px) saturate(150%);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
        }
        .dark .bg-glass {
            background-color: rgba(15, 23, 42, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .text-gradient {
            background: linear-gradient(135deg, #126DFB 0%, #0284C7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .dark .text-gradient {
            background: linear-gradient(135deg, #60A5FA 0%, #38BDF8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .mesh-bg {
            background-color: #f8fafc;
            background-image:
                radial-gradient(at 0% 0%, hsla(217,100%,75%,0.15) 0px, transparent 50%),
                radial-gradient(at 100% 0%, hsla(217,100%,75%,0.1) 0px, transparent 50%),
                radial-gradient(at 100% 100%, hsla(217,100%,75%,0.1) 0px, transparent 50%),
                radial-gradient(at 0% 100%, hsla(217,100%,75%,0.05) 0px, transparent 50%);
        }
        .dark .mesh-bg {
            background-color: #020617;
            background-image:
                radial-gradient(at 0% 0%, hsla(217,100%,60%,0.08) 0px, transparent 50%),
                radial-gradient(at 100% 0%, hsla(217,100%,60%,0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, hsla(217,100%,60%,0.05) 0px, transparent 50%),
                radial-gradient(at 0% 100%, hsla(217,100%,60%,0.02) 0px, transparent 50%);
        }
        .feature-card {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: 32px;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dark .feature-card {
            background: rgba(30, 41, 59, 0.3);
            border-color: rgba(255, 255, 255, 0.05);
        }
        .feature-card:hover {
            transform: translateY(-4px);
            border-color: rgba(18, 109, 251, 0.3);
            box-shadow: 0 30px 60px -20px rgba(18, 109, 251, 0.15);
        }
        .btn-primary {
            background: #126DFB;
            color: white;
            padding: 14px 28px;
            border-radius: 9999px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px 0 rgba(18, 109, 251, 0.39);
        }
        .btn-primary:hover {
            background: #0D59D1;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(18, 109, 251, 0.23);
        }
        /* === MOTION DESIGN === */
        .reveal {
            opacity: 0;
            transform: translateY(32px);
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform, opacity;
        }
        .reveal.revealed {
            opacity: 1;
            transform: translateY(0);
        }
        .reveal-fade {
            opacity: 0;
            transition: opacity 1s ease;
        }
        .reveal-fade.revealed {
            opacity: 1;
        }
        .reveal-left {
            opacity: 0;
            transform: translateX(-32px);
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-left.revealed {
            opacity: 1;
            transform: translateX(0);
        }
        .reveal-right {
            opacity: 0;
            transform: translateX(32px);
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-right.revealed {
            opacity: 1;
            transform: translateX(0);
        }
        .reveal-scale {
            opacity: 0;
            transform: scale(0.94);
            transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-scale.revealed {
            opacity: 1;
            transform: scale(1);
        }
        .reveal-d1 { transition-delay: 100ms; }
        .reveal-d2 { transition-delay: 200ms; }
        .reveal-d3 { transition-delay: 300ms; }
        .reveal-d4 { transition-delay: 400ms; }
        .reveal-d5 { transition-delay: 500ms; }
        /* === MARQUEE === */
        .marquee-track {
            display: flex;
            width: max-content;
            animation: marquee-scroll 28s linear infinite;
        }
        .marquee-track:hover {
            animation-play-state: paused;
        }
        @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .marquee-wrapper {
            overflow: hidden;
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
            mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
        }
      `}</style>

            {/* NAVBAR */}
            <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-glass border-b-0 border-transparent">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                                <span className="material-icons text-xl">auto_stories</span>
                            </div>
                            <span className="font-extrabold text-xl tracking-tighter text-gray-900 dark:text-white">Littera</span>
                        </div>
                        <div className="hidden md:flex space-x-10 text-[13px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            <a className="hover:text-primary transition-colors" href="#features">Recursos</a>
                            <a className="hover:text-primary transition-colors" href="#solutions">Impacto</a>
                            <a className="hover:text-primary transition-colors" href="#pricing">Planos</a>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onLoginClick}
                                className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors px-4 py-2"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => onDemoClick('student')}
                                className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-6 py-2.5 rounded-full text-sm font-bold shadow-xl hover:scale-105 transition-transform"
                            >
                                Iniciar
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative pt-40 pb-20 lg:pt-56 lg:pb-32 overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-glass mb-10 reveal hover:scale-105 transition-transform cursor-pointer shadow-sm">
                        <span className="material-icons text-sm text-primary">arrow_forward</span>
                        <span className="text-gray-700 dark:text-gray-200 text-xs md:text-sm font-semibold tracking-widest uppercase">IA para Correção de Redação</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-8 text-gray-900 dark:text-white leading-[0.95] max-w-5xl mx-auto reveal reveal-d1">
                        I.A que corrige{' '}
                        <span className="text-gradient">Redações</span>{' '}
                        para{' '}
                        <span className="text-gradient">ENEM</span>{' '}
                        em Segundos
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed font-medium reveal reveal-d2">
                        Treinado rigorosamente nas 5 competências do ENEM. Entregue feedback detalhado e instantâneo para os seus alunos.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-24 reveal reveal-d3">
                        <button
                            onClick={() => onDemoClick('student')}
                            className="btn-primary text-base px-10 py-4 shadow-2xl shadow-primary/30 w-full sm:w-auto"
                        >
                            Quero tentar de graça
                        </button>
                        <button
                            onClick={() => onDemoClick('student')}
                            className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 text-gray-900 dark:text-white font-semibold hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 px-10 py-4 rounded-full w-full sm:w-auto shadow-sm"
                        >
                            Demonstração
                        </button>
                    </div>

                    {/* Dashboard Image */}
                    <div className="relative mx-auto max-w-5xl reveal-scale revealed">
                        <div className="relative bg-glass rounded-[2.5rem] shadow-2xl overflow-hidden p-3 transform hover:scale-[1.01] transition-transform duration-700 border border-white/40 dark:border-white/10">
                            <div className="bg-[#f1f5f9] dark:bg-[#020617] rounded-[2rem] overflow-hidden aspect-[16/10] w-full shadow-inner relative group border border-gray-200 dark:border-gray-800">
                                <img
                                    src="/dashboard-student.png"
                                    alt="Littera Dashboard"
                                    className="w-full h-full object-cover object-top opacity-90 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#f1f5f9] dark:from-[#020617] via-transparent to-transparent opacity-60"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section className="py-32 relative z-10" id="features">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20 reveal">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tighter">
                            Recursos que <span className="text-gradient">elevam o padrão</span>
                        </h2>
                        <p className="text-lg md:text-xl font-medium text-gray-600 dark:text-gray-400 leading-relaxed tracking-tight">
                            Desbloqueie todo o potencial da sua escola com ferramentas projetadas para
                            maximizar a eficiência e o engajamento através de análises preditivas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                        {/* Grande Card */}
                        <div className="feature-card p-10 md:p-14 md:col-span-4 flex flex-col justify-between reveal relative overflow-hidden group min-h-[400px]">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-blue-500/20 transition-colors duration-700"></div>
                            <div className="relative z-10 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-primary mb-8 shadow-sm border border-gray-100 dark:border-slate-700">
                                <span className="material-icons text-3xl">fact_check</span>
                            </div>
                            <div className="relative z-10 max-w-md">
                                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Correção Automatizada</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed font-medium">
                                    Redações avaliadas em segundos com critérios rigorosos do ENEM. Análise profunda de coesão, coerência e proposta de intervenção com padronização impecável.
                                </p>
                            </div>
                        </div>

                        {/* Card Pequeno - Segurança */}
                        <div className="feature-card p-10 flex flex-col justify-between md:col-span-2 reveal reveal-d1 min-h-[400px]">
                            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-300 mb-8 shadow-sm border border-gray-100 dark:border-slate-700">
                                <span className="material-icons text-3xl">verified_user</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Segurança Total</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Proteção de nível empresarial. Dados dos alunos criptografados e total conformidade com a LGPD e regulamentações educacionais.
                                </p>
                            </div>
                        </div>

                        {/* Card Pequeno - Performance */}
                        <div className="feature-card p-10 flex flex-col justify-between md:col-span-3 reveal reveal-d2 min-h-[350px]">
                            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 shadow-sm border border-gray-100 dark:border-slate-700">
                                <span className="material-icons text-3xl">insights</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Análise de Performance</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Dashboards preditivos para professores e coordenadores mapearem instantaneamente os pontos fortes e os gargalos das turmas.
                                </p>
                            </div>
                        </div>

                        {/* Card Pequeno - Anti-fraude */}
                        <div className="feature-card p-10 flex flex-col justify-between md:col-span-3 reveal reveal-d3 min-h-[350px] relative overflow-hidden group">
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 group-hover:bg-blue-500/10 transition-colors duration-700"></div>
                            <div className="relative z-10 w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-300 mb-8 shadow-sm border border-gray-100 dark:border-slate-700">
                                <span className="material-icons text-3xl">plagiarism</span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Motor Anti-fraude</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Identificação automática de cópias e textos fora do escopo, garantindo a integridade do processo avaliativo.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VISION SECTION */}
            <section className="py-32 bg-gray-50 dark:bg-slate-900/50 relative overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="reveal-left">
                            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-8 tracking-tight leading-tight">
                                A visão do futuro da <br /><span className="text-primary">educação de elite</span>
                            </h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                                Professores perdem até 40% do seu tempo com burocracia. Nossa missão é
                                devolver esse tempo para o que realmente importa: o ensino.
                            </p>
                            <div className="space-y-8">
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-center text-primary shrink-0">
                                        <span className="material-icons">timer_off</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Fim da Correção Lenta</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Reduza o tempo de devolutiva de semanas para segundos.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-center text-primary shrink-0">
                                        <span className="material-icons">architecture</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Padronização de Critérios</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Elimine a subjetividade e garanta notas precisas no modelo ENEM.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative reveal-right">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 text-center col-span-2">
                                    <span className="block text-5xl font-extrabold text-primary mb-2">2M+</span>
                                    <span className="text-gray-500 dark:text-gray-400 font-semibold tracking-tight uppercase text-xs">Redações Processadas</span>
                                </div>
                                <div className="bg-primary p-8 rounded-3xl shadow-lg shadow-primary/20 text-center text-white">
                                    <span className="block text-4xl font-extrabold mb-1">98%</span>
                                    <span className="text-white/80 text-xs font-medium uppercase tracking-wider">Acurácia vs Humanos</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 text-center">
                                    <span className="block text-4xl font-extrabold text-gray-900 dark:text-white mb-1">50+</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Escolas Parceiras</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PARTNERS SECTION — auto-scroll marquee */}
            <section className="py-20 bg-white dark:bg-slate-950 border-y border-gray-100 dark:border-slate-900 overflow-hidden">
                <p className="text-center text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-[0.25em] mb-12 reveal">
                    Escola que confiam no nosso trabalho
                </p>
                <div className="marquee-wrapper">
                    <div className="marquee-track grayscale opacity-60 dark:invert items-center">
                        {/* Set A */}
                        <div className="flex items-center gap-16 px-8">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-7 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-8 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="h-8 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-7 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg" alt="Notion" className="h-8 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-7 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-8 shrink-0" />
                        </div>
                        {/* Set B — exact duplicate for seamless loop */}
                        <div className="flex items-center gap-16 px-8">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-7 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-8 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="h-8 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-7 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg" alt="Notion" className="h-8 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-7 shrink-0" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-8 shrink-0" />
                        </div>
                    </div>
                </div>
            </section>

            {/* SOLUTIONS SECTION */}
            <section className="py-32 relative z-10" id="solutions">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-24 reveal">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tighter">
                            Decisões baseadas em <span className="text-gradient">dados em tempo real</span>
                        </h2>
                        <p className="text-lg md:text-xl font-medium text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed tracking-tight">
                            Esqueça o achismo. Tenha indicadores absolutos de proficiência por competência,
                            mapas preditivos de evolução e intervenções direcionadas.
                        </p>
                    </div>
                    <div className="bg-glass rounded-[40px] p-8 md:p-14 border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden relative group reveal-scale">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 group-hover:bg-blue-500/10"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center relative z-10">
                            <div className="space-y-6 md:col-span-1">
                                <div className="feature-card p-6 reveal shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-green-100 dark:bg-green-500/20 p-3 rounded-2xl text-green-600 dark:text-green-400 shadow-inner">
                                            <span className="material-icons">check_circle</span>
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-gray-900 dark:text-white text-base tracking-tight">Verificação Avançada</div>
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Garantia absoluta de originalidade</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="feature-card p-6 reveal reveal-d1 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner">
                                            <span className="material-icons">timeline</span>
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-gray-900 dark:text-white text-base tracking-tight">Evolução Preditiva</div>
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Trajetória e projeções por aluno</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800/80 rounded-[2rem] p-10 shadow-sm border border-gray-100 dark:border-slate-700/50 text-center relative reveal reveal-d2 md:col-span-1 min-h-[300px] flex flex-col justify-center items-center">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">Média Preditiva ENEM</h4>
                                <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle className="text-gray-100 dark:text-slate-700" cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6"></circle>
                                        <circle className="text-primary transition-all duration-1000 ease-out" cx="50" cy="50" r="44" fill="none" stroke="url(#gradient)" strokeDasharray="243.3, 276.5" strokeLinecap="round" strokeWidth="6"></circle>
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#126DFB" />
                                                <stop offset="100%" stopColor="#0284C7" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="flex flex-col items-center justify-center relative z-10 mt-1">
                                        <span className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white">880</span>
                                    </div>
                                </div>
                                <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-bold rounded-full">
                                    <span className="material-icons text-[16px]">trending_up</span>
                                    +18% Projeção
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800/80 rounded-[2rem] p-10 shadow-sm border border-gray-100 dark:border-slate-700/50 md:col-span-1 min-h-[300px] flex flex-col justify-center reveal reveal-d3">
                                <h4 className="font-extrabold text-gray-900 dark:text-white mb-8 text-xl tracking-tight">Competências Críticas</h4>
                                <div className="space-y-8">
                                    <div className="group">
                                        <div className="flex justify-between text-sm font-bold mb-3 tracking-tight">
                                            <span className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">C1: Norma Culta</span>
                                            <span className="text-primary font-black">92%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 w-[92%] rounded-full transition-colors"></div>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between text-sm font-bold mb-3 tracking-tight">
                                            <span className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">C5: Proposta</span>
                                            <span className="text-slate-600 dark:text-slate-400 font-black">68%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-slate-400 dark:bg-slate-500 w-[68%] rounded-full transition-colors"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING SECTION */}
            <section className="py-32 relative z-10" id="pricing">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 reveal">
                        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-gray-900 dark:text-white mb-6">
                            Pronto para <span className="text-gradient">evoluir?</span>
                        </h2>
                        <p className="text-lg md:text-xl font-medium text-gray-600 dark:text-gray-400 max-w-2xl mx-auto tracking-tight leading-relaxed">
                            Assuma a vanguarda educacional com uma plataforma SaaS definitiva que se adapta ao tamanho da sua instituição.
                        </p>
                    </div>

                    <div className="bg-glass rounded-[2.5rem] p-2 md:p-6 shadow-2xl border border-white/50 dark:border-white/10 mx-auto max-w-5xl relative overflow-hidden group reveal-scale">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-inner border border-gray-100 dark:border-slate-800">
                            <SubscriptionView
                                onPlanSelected={() => { }}
                                onCancel={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) }}
                                onCheckout={onCheckout}
                            />
                        </div>
                    </div>

                    <div className="mt-16 flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-50 dark:opacity-40 hover:opacity-100 dark:hover:opacity-100 transition-opacity duration-500 reveal reveal-d2">
                        <div className="flex items-center gap-2.5 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700">
                            <span className="material-icons text-[16px] text-emerald-600">lock</span>
                            <span className="text-xs font-extrabold tracking-widest text-gray-900 dark:text-white uppercase">Infra de Elite</span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700">
                            <span className="material-icons text-[16px] text-blue-600">verified_user</span>
                            <span className="text-xs font-extrabold tracking-widest text-gray-900 dark:text-white uppercase">Pronto para LGPD</span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700">
                            <span className="material-icons text-[16px] text-slate-600 dark:text-slate-400">stars</span>
                            <span className="text-xs font-extrabold tracking-widest text-gray-900 dark:text-white uppercase">SLA Garantido</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS SECTION */}
            <section className="py-32 relative z-10" id="testimonials">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-center text-gray-900 dark:text-white mb-16 reveal">
                        O que os <span className="text-gradient">professores estão dizendo</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="feature-card p-10 flex gap-6 items-start group hover:scale-[1.02] reveal reveal-d1">
                            <img alt="Mariana Costa" className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-800 shadow-lg group-hover:border-primary transition-colors" src="https://i.pravatar.cc/150?u=11" />
                            <div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium italic mb-6 leading-relaxed text-lg tracking-tight">
                                    "A Littera transformou a forma como damos feedback. Nossas notas no ENEM subiram 15% após o primeiro semestre de uso. Incomparável."
                                </p>
                                <p className="font-extrabold text-gray-900 dark:text-white tracking-tight">Mariana Costa</p>
                                <p className="text-sm font-semibold text-primary uppercase tracking-widest mt-1">Colégio Saber</p>
                            </div>
                        </div>
                        <div className="feature-card p-10 flex gap-6 items-start group hover:scale-[1.02] reveal reveal-d2">
                            <img alt="Carlos Mendes" className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-800 shadow-lg group-hover:border-slate-400 transition-colors" src="https://i.pravatar.cc/150?u=12" />
                            <div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium italic mb-6 leading-relaxed text-lg tracking-tight">
                                    "A precisão do sistema no modelo ENEM é impressionante. É o suporte de elite que nossos coordenadores precisavam para escalar a correção."
                                </p>
                                <p className="font-extrabold text-gray-900 dark:text-white tracking-tight">Carlos Mendes</p>
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-1">Instituto Futuro</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Diretor Acadêmico</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-white dark:bg-slate-950 pt-20 pb-10 border-t border-gray-100 dark:border-slate-900">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                                    <span className="material-icons text-lg">auto_stories</span>
                                </div>
                                <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">Littera</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">A plataforma definitiva para instituições de ensino que buscam excelência em escrita e performance.</p>
                            <div className="flex gap-4">
                                <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"><span className="material-icons text-sm">facebook</span></a>
                                <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"><span className="material-icons text-sm">alternate_email</span></a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Produto</h4>
                            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                                <li><a href="#" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Soluções</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Empresa</h4>
                            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                                <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Carreiras</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">LGPD</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-gray-100 dark:border-slate-900 gap-4">
                        <p className="text-xs text-gray-400">© 2026 Littera Education. Todos os direitos reservados.</p>
                        <div className="flex gap-8 text-xs text-gray-400">
                            <a href="#" className="hover:text-primary">Status</a>
                            <a href="#" className="hover:text-primary">Ajuda</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
