import React, { useEffect } from 'react';
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
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, observerOptions);

        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="font-sans bg-[#F9FAFB] min-h-screen text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                .font-sans {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .text-gradient {
                    background: linear-gradient(135deg, #2563EB 0%, #60A5FA 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .reveal {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .reveal.revealed {
                    opacity: 1;
                    transform: translateY(0);
                }
                .delay-100 { transition-delay: 100ms; }
                .delay-200 { transition-delay: 200ms; }
                .delay-300 { transition-delay: 300ms; }
                
                .glass-card {
                    background: #ffffff;
                    border: 1px solid #E5E7EB;
                    border-radius: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                }
                .nav-glass {
                    background: rgba(249, 250, 251, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(229, 231, 235, 0.5);
                }
                .btn-primary {
                    background-color: #2563EB;
                    color: white;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    padding: 10px 20px;
                    border-radius: 9999px;
                    font-size: 15px;
                }
                .btn-primary:hover {
                    background-color: #1D4ED8;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                }
                .btn-secondary {
                    background-color: white;
                    color: #0F172A;
                    border: 1px solid #E2E8F0;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    padding: 10px 20px;
                    border-radius: 9999px;
                    font-size: 15px;
                }
                .btn-secondary:hover {
                    background-color: #F1F5F9;
                    border-color: #CBD5E1;
                }
                
                /* Float animation for decorative elements */
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-12px); }
                    100% { transform: translateY(0px); }
                }
                .float-anim {
                    animation: float 3.5s ease-in-out infinite;
                }
                .float-anim-delay {
                    animation: float 4.5s ease-in-out infinite;
                    animation-delay: 2s;
                }

                .soft-shadow {
                    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
                }
                
                .hero-bg {
                    background: radial-gradient(circle at 50% 0%, rgba(219, 234, 254, 0.5) 0%, rgba(249, 250, 251, 0) 70%);
                }
            `}</style>

            {/* Navbar */}
            <nav className="fixed w-full z-50 top-0 transition-all duration-300 nav-glass">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="flex justify-between items-center h-[72px]">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white">
                                <span className="material-icons text-lg">school</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-900">Littera</span>
                        </div>
                        <div className="hidden md:flex space-x-8 text-[15px] font-medium text-slate-600">
                            <a className="hover:text-slate-900 transition-colors" href="#features">Recursos</a>
                            <a className="hover:text-slate-900 transition-colors" href="#impact">Impacto</a>
                            <a className="hover:text-slate-900 transition-colors" href="#pricing">Planos</a>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onLoginClick}
                                className="text-[15px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
                            >
                                Entrar
                            </button>
                            <button
                                onClick={() => onDemoClick('teacher')}
                                className="btn-primary"
                            >
                                Começar
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-[160px] pb-20 lg:pt-[180px] lg:pb-32 hero-bg">
                <div className="max-w-[1000px] mx-auto px-6 relative text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 mb-8 reveal hover:-translate-y-0.5 transition-transform cursor-pointer shadow-sm relative z-20">
                        <span className="bg-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Novo</span>
                        <span className="text-slate-600 text-sm font-medium">Correção Padrão ENEM com IA</span>
                        <span className="material-icons text-sm text-slate-400">arrow_forward</span>
                    </div>

                    {/* 4 Floating Elements Around Title */}
                    <div className="hidden md:flex absolute top-4 -left-4 lg:-left-10 xl:-left-20 bg-white px-3 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 items-center gap-3 float-anim z-10">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <span className="material-icons text-blue-600 text-sm">spellcheck</span>
                        </div>
                        <div className="text-left pr-2">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Norma Culta</div>
                            <div className="text-[13px] font-bold text-slate-800">200 pts</div>
                        </div>
                    </div>

                    <div className="hidden md:flex absolute -top-2 -right-4 lg:-right-10 xl:-right-20 bg-white px-3 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 items-center gap-3 float-anim-delay z-10">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                            <span className="material-icons text-emerald-500 text-sm">trending_up</span>
                        </div>
                        <div className="text-left pr-2">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evolução</div>
                            <div className="text-[13px] font-bold text-slate-800">+15% Desempenho</div>
                        </div>
                    </div>

                    <div className="hidden md:flex absolute top-40 -left-6 lg:-left-16 xl:-left-24 bg-white px-3 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 items-center gap-3 float-anim z-10" style={{ animationDelay: '0.8s' }}>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <span className="material-icons text-indigo-500 text-sm">lightbulb</span>
                        </div>
                        <div className="text-left pr-2">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Proposta (C5)</div>
                            <div className="text-[13px] font-bold text-slate-800">200 pts</div>
                        </div>
                    </div>

                    <div className="hidden md:flex absolute top-44 -right-6 lg:-right-16 xl:-right-24 bg-white px-3 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 items-center gap-3 float-anim-delay z-10" style={{ animationDelay: '2.5s' }}>
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                            <span className="material-icons text-amber-500 text-sm">military_tech</span>
                        </div>
                        <div className="text-left pr-2">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Média Geral</div>
                            <div className="text-[13px] font-bold text-slate-800">880 pts</div>
                        </div>
                    </div>
                    
                    <h1 className="text-[56px] lg:text-[72px] font-extrabold tracking-tight mb-6 text-slate-900 leading-[1.05] reveal delay-100 relative z-20">
                        Padrão ENEM <br />
                        <span className="text-gradient">em Escala</span>
                    </h1>
                    
                    <p className="text-[19px] lg:text-[21px] text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-normal reveal delay-200">
                        Liberte seus professores da burocracia. Devolutivas precisas em segundos. Potencialize o desempenho dos seus alunos com tecnologia educacional.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20 reveal delay-300">
                        <button
                            onClick={() => onDemoClick('teacher')}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium px-8 py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl w-full sm:w-auto text-[16px]"
                        >
                            Começar Gratuitamente
                        </button>
                        <button
                            onClick={() => onDemoClick('student')}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium px-8 py-3.5 rounded-full transition-all shadow-sm w-full sm:w-auto text-[16px]"
                        >
                            Ver demonstração
                        </button>
                    </div>

                    {/* Dashboard Mockup - Alytics style */}
                    <div className="relative mx-auto max-w-[900px] reveal delay-300">
                        {/* Floating elements */}
                        <div className="absolute -left-12 top-20 bg-white p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3 float-anim z-20">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <span className="material-icons text-red-500">trending_down</span>
                            </div>
                            <div className="text-left">
                                <div className="text-[12px] text-slate-500 font-medium">Abaixo da média</div>
                                <div className="text-[15px] font-bold text-slate-800">12%</div>
                            </div>
                        </div>

                        <div className="absolute -right-8 top-40 bg-white p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3 float-anim-delay z-20">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <span className="material-icons text-emerald-500">trending_up</span>
                            </div>
                            <div className="text-left">
                                <div className="text-[12px] text-slate-500 font-medium">C1: Norma Culta</div>
                                <div className="text-[15px] font-bold text-slate-800">920 pts</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[24px] p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-slate-200/60 w-full relative z-10">
                            <div className="bg-slate-50 rounded-[18px] overflow-hidden aspect-[16/9] w-full border border-slate-100 relative">
                                <img
                                    src="/dashboard-student.png"
                                    alt="Littera Dashboard"
                                    className="w-full h-full object-cover object-top opacity-95 transition-all duration-700 hover:scale-[1.02]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Stats Bar */}
                <div className="max-w-[1000px] mx-auto px-6 mt-32 reveal">
                    <div className="pt-10 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
                            <div className="py-2">
                                <div className="text-[40px] font-bold text-slate-900 tracking-tight">2M+</div>
                                <div className="text-[15px] text-slate-500 mt-1 font-medium">Redações Processadas</div>
                            </div>
                            <div className="py-2">
                                <div className="text-[40px] font-bold text-slate-900 tracking-tight">98%</div>
                                <div className="text-[15px] text-slate-500 mt-1 font-medium">Acurácia vs Humanos</div>
                            </div>
                            <div className="py-2">
                                <div className="text-[40px] font-bold text-slate-900 tracking-tight">50+</div>
                                <div className="text-[15px] text-slate-500 mt-1 font-medium">Escolas Parceiras</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Alytics Style Feature Cards Section */}
            <section className="py-24 bg-white" id="features">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <h2 className="text-[40px] lg:text-[48px] font-bold tracking-tight text-slate-900 mb-5">Recursos que elevam o padrão</h2>
                        <p className="text-[18px] text-slate-500 max-w-[600px] mx-auto">
                            Desbloqueie o potencial da sua escola com ferramentas projetadas para maximizar a eficiência educacional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Feature 1: Correção Automatizada (Alytics Gauge Style) */}
                        <div className="bg-[#F8FAFC] rounded-[32px] p-10 lg:p-12 border border-slate-100 overflow-hidden relative reveal min-h-[500px] flex flex-col">
                            <div className="max-w-[340px] mb-10 z-10">
                                <h3 className="text-[28px] font-bold text-slate-900 mb-4 tracking-tight">Correção Automatizada</h3>
                                <p className="text-[16px] text-slate-500 leading-relaxed">
                                    Redações avaliadas em segundos com critérios rigorosos do ENEM. Análise profunda de coesão, coerência e proposta de intervenção.
                                </p>
                            </div>
                            
                            {/* Visual representation - Gauge Graphic */}
                            <div className="flex-1 relative flex items-end justify-center mt-10">
                                <div className="absolute inset-0 bg-blue-50/50 rounded-t-[200px] transform scale-150 translate-y-20 blur-xl"></div>
                                <div className="relative w-[300px] h-[150px] overflow-hidden">
                                    {/* Semi-circle gauge */}
                                    <div className="w-[300px] h-[300px] rounded-full border-[30px] border-blue-100 absolute bottom-0 left-0"></div>
                                    <div className="w-[300px] h-[300px] rounded-full border-[30px] border-blue-500 absolute bottom-0 left-0 rotate-45 transform origin-center transition-transform duration-1000"></div>
                                    
                                    {/* Gauge needle */}
                                    <div className="absolute bottom-0 left-[150px] w-2 h-[120px] bg-slate-800 rounded-full origin-bottom rotate-45 z-10 shadow-lg">
                                        <div className="absolute -bottom-3 -left-2 w-6 h-6 bg-white border-4 border-slate-800 rounded-full"></div>
                                    </div>
                                </div>
                                
                                {/* Floating Tags */}
                                <div className="absolute top-0 right-10 bg-white py-1.5 px-3 rounded-full shadow-sm border border-slate-100 text-[12px] font-bold flex items-center gap-1.5 float-anim">
                                    <span className="text-slate-600">Alta Performance</span>
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">↑ 18%</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2: Análise de Performance (Alytics "Insights" Style) */}
                        <div className="bg-[#F8FAFC] rounded-[32px] p-10 lg:p-12 border border-slate-100 overflow-hidden relative reveal delay-100 min-h-[500px] flex flex-col">
                            <div className="max-w-[340px] mb-10 z-10">
                                <h3 className="text-[28px] font-bold text-slate-900 mb-4 tracking-tight">Vire Insights em Ação</h3>
                                <p className="text-[16px] text-slate-500 leading-relaxed">
                                    Dashboards preditivos para professores mapearem instantaneamente os gargalos das turmas e agirem rápido.
                                </p>
                            </div>

                            {/* Visual representation - Pills/Tags flowing */}
                            <div className="flex-1 relative flex items-center justify-center">
                                <div className="relative w-full h-full min-h-[250px] flex items-center justify-center">
                                    <div className="absolute bg-white px-5 py-2.5 rounded-full shadow-md text-[14px] font-bold text-blue-600 border border-blue-100 -translate-y-12 -translate-x-16 rotate-[-5deg] z-20">
                                        ⚡ Coesão
                                    </div>
                                    <div className="absolute bg-slate-800 px-5 py-2.5 rounded-full shadow-lg text-[14px] font-bold text-white translate-y-4 translate-x-20 rotate-[3deg] z-30">
                                        Intervenção Direta
                                    </div>
                                    <div className="absolute bg-white px-4 py-2 rounded-full shadow text-[13px] font-medium text-slate-500 translate-y-16 -translate-x-10 rotate-[8deg] z-10">
                                        Norma Culta
                                    </div>
                                    <div className="absolute bg-white px-4 py-2 rounded-full shadow text-[13px] font-medium text-slate-500 -translate-y-20 translate-x-24 rotate-[-12deg] z-10">
                                        Proposta
                                    </div>
                                    <div className="w-64 h-64 bg-slate-100 rounded-full blur-[40px] absolute opacity-60"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Integrations Section */}
            <section className="py-24 bg-white border-t border-slate-100 overflow-hidden" id="impact">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2 reveal">
                            <h2 className="text-[40px] font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">Integrações <br/> Perfeitas</h2>
                            <p className="text-[18px] text-slate-500 mb-8 leading-relaxed max-w-[450px]">
                                Conecte a Littera com suas ferramentas favoritas e plataformas de LMS para manter a operação escolar rodando de forma fluida.
                            </p>
                            <button className="btn-primary">
                                Ver integrações
                            </button>
                        </div>
                        
                        <div className="lg:w-1/2 w-full reveal delay-100">
                            <div className="relative">
                                {/* Decorational background */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-slate-50 rounded-full blur-3xl -z-10"></div>
                                
                                <div className="space-y-4 max-w-[400px] mx-auto">
                                    {/* Integration Card 1 */}
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:scale-105 transition-transform">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-5" />
                                            </div>
                                            <span className="font-bold text-slate-900">Google Workspace</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="material-icons text-blue-600 text-[14px]">check</span>
                                        </div>
                                    </div>
                                    
                                    {/* Integration Card 2 */}
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between ml-8 hover:scale-105 transition-transform">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-5" />
                                            </div>
                                            <span className="font-bold text-slate-900">Microsoft Teams</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="material-icons text-blue-600 text-[14px]">check</span>
                                        </div>
                                    </div>
                                    
                                    {/* Integration Card 3 */}
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:scale-105 transition-transform">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg" alt="Notion" className="h-6" />
                                            </div>
                                            <span className="font-bold text-slate-900">Notion for Education</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="material-icons text-blue-600 text-[14px]">check</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-32 bg-[#F8FAFC]" id="testimonials">
                <div className="max-w-[1200px] mx-auto px-6 text-center">
                    <div className="inline-block px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-[13px] font-bold mb-6 reveal">
                        Depoimentos
                    </div>
                    <h2 className="text-[40px] lg:text-[48px] font-bold tracking-tight text-slate-900 mb-6 reveal delay-100">
                        Ouça o que as escolas<br/> dizem sobre nós
                    </h2>
                    <p className="text-[18px] text-slate-500 mb-16 max-w-[500px] mx-auto reveal delay-100">
                        Veja o que coordenadores educacionais falam após adotar a nossa plataforma.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {/* Testimonial 1 */}
                        <div className="bg-white p-10 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow reveal">
                            <h1 className="text-5xl font-serif text-slate-300 mb-4 h-6">"</h1>
                            <p className="text-[17px] text-slate-600 mb-10 leading-relaxed font-medium">
                                A Littera transformou a forma como damos feedback. Nossas notas no ENEM subiram 15% após o primeiro semestre de uso. Incomparável a precisão do modelo perante alternativas antiquadas.
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <img src="https://i.pravatar.cc/150?u=11" alt="Mariana" className="w-12 h-12 rounded-full object-cover" />
                                    <div>
                                        <div className="font-bold text-slate-900 text-[15px]">Mariana Costa</div>
                                        <div className="text-slate-500 text-[13px]">Coordenação Colégio Saber</div>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 text-sm gap-0.5">
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="bg-white p-10 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow reveal delay-100">
                            <h1 className="text-5xl font-serif text-slate-300 mb-4 h-6">"</h1>
                            <p className="text-[17px] text-slate-600 mb-10 leading-relaxed font-medium">
                                A precisão do sistema no modelo ENEM é impressionante. Não foi preciso acionar a equipe de TI: os professores já estavam usando e gerando relatórios em poucas horas na nossa rede.
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <img src="https://i.pravatar.cc/150?u=12" alt="Carlos" className="w-12 h-12 rounded-full object-cover" />
                                    <div>
                                        <div className="font-bold text-slate-900 text-[15px]">Carlos Mendes</div>
                                        <div className="text-slate-500 text-[13px]">Instituto Futuro</div>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 text-sm gap-0.5">
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                    <span className="material-icons">star</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-32 bg-white relative reveal" id="pricing">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-[40px] lg:text-[48px] font-bold tracking-tight text-slate-900 mb-5">Pronto para evoluir?</h2>
                        <p className="text-[18px] text-slate-500 max-w-[600px] mx-auto">
                            Assuma a vanguarda educacional com uma plataforma definitiva que se adapta à sua instituição.
                        </p>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[32px] p-2 md:p-6 border border-slate-100 mx-auto max-w-[1000px]">
                        <div className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm relative z-10">
                            <SubscriptionView
                                onPlanSelected={() => { }}
                                onCancel={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) }}
                                onCheckout={onCheckout}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section (Footer pre-cursor typical in SaaS) */}
            <section className="py-24 bg-slate-900 text-center px-6">
                <div className="max-w-[700px] mx-auto reveal">
                    <h2 className="text-[36px] font-bold text-white mb-6 tracking-tight">Potencialize a educação decolando com a IA hoje.</h2>
                    <p className="text-slate-400 text-[17px] mb-10">Não perca mais tempo com burocracia, entregue o ensino que seus alunos merecem com foco e precisão.</p>
                    <button onClick={() => onDemoClick('teacher')} className="btn-primary px-10 py-4 text-[16px]">
                        Começar gratuitamente
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white pt-20 pb-10 border-t border-slate-100">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white shrink-0">
                                    <span className="material-icons text-[18px]">school</span>
                                </div>
                                <span className="font-bold text-xl text-slate-900 tracking-tight">Littera</span>
                            </div>
                            <p className="text-[14px] text-slate-500 leading-relaxed mb-6 max-w-[300px]">
                                A plataforma definitiva para instituições de ensino que buscam eficiência, automação e sucesso nas padronizações do ENEM.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-5 text-[15px]">Produto</h4>
                            <ul className="space-y-3 text-[14px] text-slate-500 font-medium">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Funcionalidades</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Soluções</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Preços</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-5 text-[15px]">Empresa</h4>
                            <ul className="space-y-3 text-[14px] text-slate-500 font-medium">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Sobre Nós</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Carreiras</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-5 text-[15px]">Legal</h4>
                            <ul className="space-y-3 text-[14px] text-slate-500 font-medium">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacidade</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Termos</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">LGPD</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100 gap-4">
                        <p className="text-[13px] text-slate-400 font-medium">© 2026 Littera Education. Todos os direitos reservados.</p>
                        <div className="flex gap-6 text-[13px] text-slate-400 font-medium">
                            <a href="#" className="hover:text-blue-600">Status</a>
                            <a href="#" className="hover:text-blue-600">Ajuda</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;