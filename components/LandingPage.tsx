import React, { useEffect, useState } from 'react';

interface LandingPageProps {
    onLoginClick: () => void;
    onDemoClick: (type: 'student' | 'teacher') => void;
    onCheckout?: (plan: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onDemoClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [isLeadSuccess, setIsLeadSuccess] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('sl-revealed'); }),
            { threshold: 0.08 }
        );
        document.querySelectorAll('.sl-reveal').forEach(el => observer.observe(el));

        return () => { window.removeEventListener('scroll', handleScroll); observer.disconnect(); };
    }, []);

    return (
        <div style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", background: '#faf8ff', minHeight: '100vh', color: '#131b2e', overflowX: 'hidden' }}>

            {/* ─── GLOBAL INLINE CSS ─── */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

                .sl-reveal {
                    opacity: 0;
                    transform: translateY(28px);
                    transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
                }
                .sl-reveal.sl-revealed { opacity: 1; transform: none; }
                .sl-d1 { transition-delay: 100ms; }
                .sl-d2 { transition-delay: 200ms; }
                .sl-d3 { transition-delay: 300ms; }
                .sl-d4 { transition-delay: 400ms; }
                .sl-d5 { transition-delay: 500ms; }

                @keyframes slFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes slScaleIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .sl-nav-scrolled {
                    background: rgba(255,255,255,0.88) !important;
                    backdrop-filter: blur(20px) saturate(180%);
                    box-shadow: 0 1px 0 rgba(0,0,0,0.04);
                }

                .sl-btn-primary {
                    background: linear-gradient(135deg, #004ac6 0%, #2563eb 100%);
                    color: #fff;
                    border: none;
                    border-radius: 9999px;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    letter-spacing: -0.01em;
                }
                .sl-btn-primary:hover {
                    box-shadow: 0 0 28px rgba(0,74,198,0.3);
                    transform: translateY(-1px);
                }

                .sl-btn-secondary {
                    background: transparent;
                    color: #49454f;
                    border: none;
                    font-weight: 600;
                    font-size: 15px;
                    cursor: pointer;
                    transition: color 0.2s;
                    padding: 14px 20px;
                }
                .sl-btn-secondary:hover { color: #004ac6; }

                .sl-card {
                    background: #ffffff;
                    border-radius: 1.5rem;
                    box-shadow: 0px 20px 40px rgba(19, 27, 46, 0.06);
                }

                .sl-intelligence-card {
                    background: linear-gradient(135deg, rgba(91,107,125,0.04) 0%, rgba(0,74,198,0.06) 100%);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(199,197,208,0.15);
                    border-radius: 1.5rem;
                }

                .sl-float-card {
                    background: #ffffff;
                    border-radius: 1rem;
                    padding: 12px 18px;
                    box-shadow: 0 10px 32px rgba(19,27,46,0.07);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: slFloat 4s ease-in-out infinite;
                }

                .sl-headline {
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                    letter-spacing: -0.02em;
                    line-height: 1.08;
                }

                .sl-section-gap {
                    padding-top: 8rem;
                    padding-bottom: 8rem;
                }

                .sl-stat-number {
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                    font-weight: 900;
                    letter-spacing: -0.03em;
                    line-height: 1;
                }
            `}</style>

            {/* ═══════════════════════════════════════════════════════════════════
                NAV — Glassmorphism, minimal
            ═══════════════════════════════════════════════════════════════════ */}
            <nav className={scrolled ? 'sl-nav-scrolled' : ''} style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                transition: 'all 0.4s ease',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="sl-headline" style={{ fontSize: 24, fontWeight: 900, color: '#131b2e', cursor: 'pointer' }}>
                        Littera<span style={{ color: 'rgba(0,74,198,0.3)' }}>.</span>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="sl-btn-secondary" onClick={onLoginClick}>Entrar</button>
                        <button className="sl-btn-primary" onClick={() => onDemoClick('teacher')} style={{ padding: '10px 24px', fontSize: 14 }}>
                            Agendar demo
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════════════════════════
                HERO — Clareza e Proposta
                display-lg headline · High-Low contrast · Floating stat cards
            ═══════════════════════════════════════════════════════════════════ */}
            <section style={{
                paddingTop: 160, paddingBottom: 100, minHeight: '100vh',
                display: 'flex', alignItems: 'center',
                background: '#ffffff',
                backgroundSize: '64px 64px',
                backgroundImage: 'linear-gradient(to right, rgba(0,74,198,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,74,198,0.03) 1px, transparent 1px)',
            }}>
                <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '0 32px', width: '100%' }}>

                    {/* Floating cards — hidden on small screens */}
                    <div className="hidden md:flex sl-float-card" style={{ position: 'absolute', top: -20, left: -10, animationDelay: '0s' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ color: '#3b82f6', fontSize: 18 }}>spellcheck</span>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#131b2e', lineHeight: 1.2 }}>Norma Culta</p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>200/200 pts</p>
                        </div>
                    </div>

                    <div className="hidden md:flex sl-float-card" style={{ position: 'absolute', top: 0, right: 0, animationDelay: '0.6s' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ color: '#8b5cf6', fontSize: 18 }}>trending_up</span>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#131b2e', lineHeight: 1.2 }}>Evolução</p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6' }}>+120 pts/mês</p>
                        </div>
                    </div>

                    <div className="hidden md:flex sl-float-card" style={{ position: 'absolute', bottom: -30, left: 20, animationDelay: '1.2s' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ color: '#eab308', fontSize: 18 }}>lightbulb</span>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#131b2e', lineHeight: 1.2 }}>Proposta (C5)</p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#eab308' }}>180/200 pts</p>
                        </div>
                    </div>

                    <div className="hidden md:flex sl-float-card" style={{ position: 'absolute', bottom: -10, right: 40, animationDelay: '1.8s' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ color: '#10b981', fontSize: 18 }}>emoji_events</span>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#131b2e', lineHeight: 1.2 }}>Média Geral</p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>842 / 1000</p>
                        </div>
                    </div>

                    {/* Central content */}
                    <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>

                        <div className="sl-reveal" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: '#f2f3ff', borderRadius: 9999, padding: '8px 20px', marginBottom: 32,
                            fontSize: 13, fontWeight: 600, color: '#49454f',
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#004ac6' }}></span>
                            Correção inteligente para escolas de excelência
                        </div>

                        <h1 className="sl-headline sl-reveal sl-d1" style={{
                            fontSize: 'clamp(38px, 5.5vw, 64px)',
                            fontWeight: 900, marginBottom: 28, color: '#131b2e',
                        }}>Eleve o nível das redações dos seus alunos com feedback em tempo real

                        </h1>

                        <p className="sl-reveal sl-d2" style={{
                            fontSize: 18, color: '#49454f', lineHeight: 1.7,
                            maxWidth: 600, margin: '0 auto 40px',
                        }}>
                            A tecnologia que eleva as redações da sua escola ao padrão de excelência do Enem.
                        </p>

                        <div className="sl-reveal sl-d3" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button className="sl-btn-primary" onClick={() => setIsLeadModalOpen(true)} style={{ padding: '16px 36px', fontSize: 16 }}>
                                Conheça o Padrão Littera
                            </button>
                            <button className="sl-btn-secondary" onClick={onLoginClick}>
                                Já tenho conta →
                            </button>
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                SOCIAL PROOF — Depoimento centralizado
                surface_container_low background · no borders (No-Line Rule)
            ═══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#f2f3ff', padding: '72px 32px' }}>
                <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }} className="sl-reveal">
                    <p style={{
                        fontSize: 'clamp(18px, 2.5vw, 22px)', fontStyle: 'italic', lineHeight: 1.7,
                        color: '#131b2e', fontWeight: 500, marginBottom: 24,
                    }}>
                        "Com o Littera, conseguimos acompanhar a evolução de 400 alunos em tempo real. Nosso índice de aprovação em redação subiu 31 pontos percentuais em um semestre."
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 9999, background: '#e2e1ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ color: '#49454f', fontSize: 20 }}>person</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#131b2e' }}>Prof.ª Maria Fernanda</p>
                            <p style={{ fontSize: 13, color: '#49454f' }}>Coordenação Pedagógica — Colégio Dom Antônio</p>
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                PROBLEMA vs. SOLUÇÃO — Quebra de objeção
                No-Line Rule: left uses surface, right uses Intelligence Card
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="sl-section-gap" style={{ padding: '8rem 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    <div className="sl-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#004ac6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            O contraste é inevitável
                        </p>
                        <h2 className="sl-headline" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: '#131b2e' }}>
                            Método tradicional vs.<br />Padrão Littera.
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 32 }}>

                        {/* Left — Problema */}
                        <div className="sl-card sl-reveal sl-d1" style={{ padding: '2.5rem', background: '#faf8ff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-icons-outlined" style={{ color: '#ef4444', fontSize: 20 }}>schedule</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Método Tradicional</p>
                            </div>
                            {[
                                { icon: 'hourglass_top', text: 'Até 15 dias para devolver 30 redações corrigidas.' },
                                { icon: 'psychology_alt', text: 'Critérios subjetivos: cada professor avalia de um jeito.' },
                                { icon: 'visibility_off', text: 'Zero visibilidade de evolução para aluno ou coordenação.' },
                                { icon: 'money_off', text: 'Custo alto com bancas externas ou horas extras docentes.' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: i < 3 ? 20 : 0 }}>
                                    <span className="material-icons-outlined" style={{ color: '#c7c5d0', fontSize: 20, marginTop: 2 }}>{item.icon}</span>
                                    <p style={{ fontSize: 15, color: '#49454f', lineHeight: 1.6 }}>{item.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Right — Solução (Intelligence Card) */}
                        <div className="sl-intelligence-card sl-reveal sl-d2" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,74,198,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #004ac6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-icons-outlined" style={{ color: '#fff', fontSize: 20 }}>auto_awesome</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#004ac6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Padrão Littera</p>
                            </div>
                            {[
                                { icon: 'bolt', text: 'Correção completa em segundos — nas 5 competências do ENEM.', color: '#004ac6' },
                                { icon: 'verified', text: 'Padronização absoluta: a mesma régua para 10 ou 10.000 alunos.', color: '#004ac6' },
                                { icon: 'insights', text: 'Dashboard de evolução em tempo real para aluno, professor e escola.', color: '#004ac6' },
                                { icon: 'school', text: 'Seu corpo docente foca no ensino. A IA foca na correção.', color: '#004ac6' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: i < 3 ? 20 : 0, position: 'relative' }}>
                                    <span className="material-icons-outlined" style={{ color: item.color, fontSize: 20, marginTop: 2 }}>{item.icon}</span>
                                    <p style={{ fontSize: 15, color: '#131b2e', lineHeight: 1.6, fontWeight: 500 }}>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                RESULTADOS — As métricas que importam
                surface_container_low bg · Cards with massive stat numbers
            ═══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#f2f3ff', padding: '8rem 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    <div className="sl-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#004ac6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            Resultados reais
                        </p>
                        <h2 className="sl-headline" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: '#131b2e' }}>
                            Os números que nenhuma<br />escola ignora.
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24 }}>
                        {[
                            { stat: '+31pp', label: 'de aumento médio na nota de redação em escolas parceiras no primeiro semestre.', icon: 'trending_up', color: '#10b981' },
                            { stat: '3×', label: 'mais redações praticadas por aluno comparado à média nacional do ENEM.', icon: 'edit_note', color: '#004ac6' },
                            { stat: '-60%', label: 'de redução na carga de correção manual do corpo docente.', icon: 'timer', color: '#8b5cf6' },
                        ].map((item, i) => (
                            <div key={i} className={`sl-card sl-reveal sl-d${i + 1}`} style={{ padding: '2.5rem', textAlign: 'center' }}>
                                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${item.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <span className="material-icons-outlined" style={{ color: item.color, fontSize: 24 }}>{item.icon}</span>
                                </div>
                                <p className="sl-stat-number" style={{ fontSize: 'clamp(48px, 6vw, 72px)', color: item.color, marginBottom: 16 }}>
                                    {item.stat}
                                </p>
                                <p style={{ fontSize: 15, color: '#49454f', lineHeight: 1.65, maxWidth: 280, margin: '0 auto' }}>
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                COMPETÊNCIAS — O que o Littera analisa
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="sl-section-gap" style={{ padding: '8rem 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    <div className="sl-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#004ac6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            Análise nas 5 dimensões
                        </p>
                        <h2 className="sl-headline" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: '#131b2e' }}>
                            A mesma régua da<br />banca do ENEM.
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
                        {[
                            { c: 'C1', title: 'Norma Culta', desc: 'Desvios gramaticais, regência, concordância e convenções da escrita formal.', color: '#3b82f6' },
                            { c: 'C2', title: 'Compreensão do Tema', desc: 'Verificação se o aluno compreendeu o tema proposto e articulou repertório.', color: '#8b5cf6' },
                            { c: 'C3', title: 'Argumentação', desc: 'Seleção, organização e interpretação de informações para defender um ponto de vista.', color: '#f59e0b' },
                            { c: 'C4', title: 'Coesão Textual', desc: 'Uso de mecanismos linguísticos para articular ideias entre parágrafos e períodos.', color: '#10b981' },
                            { c: 'C5', title: 'Proposta de Intervenção', desc: 'Elaboração de proposta detalhada com agente, ação, meio, efeito e detalhamento.', color: '#ef4444' },
                        ].map((item, i) => (
                            <div key={i} className={`sl-card sl-reveal sl-d${Math.min(i + 1, 5)}`} style={{ padding: '2rem 2.5rem', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                                    background: `${item.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 14, color: item.color,
                                }}>
                                    {item.c}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 16, color: '#131b2e', marginBottom: 6 }}>{item.title}</p>
                                    <p style={{ fontSize: 14, color: '#49454f', lineHeight: 1.6 }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                ONBOARDING — Da assinatura ao primeiro texto
                Minimal horizontal steps
            ═══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#f2f3ff', padding: '8rem 32px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>

                    <div className="sl-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#004ac6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            Implementação sem atrito
                        </p>
                        <h2 className="sl-headline" style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, color: '#131b2e' }}>
                            Da assinatura ao primeiro texto<br />em menos de uma semana.
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 32 }}>
                        {[
                            { step: '01', title: 'Contratação', desc: 'Flexível por volume de alunos. Sem surpresas.', icon: 'handshake' },
                            { step: '02', title: 'Onboarding', desc: 'Cadastro da escola e importação de alunos em 1 dia.', icon: 'cloud_upload' },
                            { step: '03', title: 'Ativação', desc: 'Professores e coordenadores treinados em 30 minutos.', icon: 'play_circle' },
                            { step: '04', title: 'Resultados', desc: 'Primeira redação corrigida pela IA no mesmo dia.', icon: 'emoji_events' },
                        ].map((item, i) => (
                            <div key={i} className={`sl-reveal sl-d${i + 1}`} style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 20,
                                    background: '#ffffff', boxShadow: '0px 20px 40px rgba(19,27,46,0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}>
                                    <span className="material-icons-outlined" style={{ color: '#004ac6', fontSize: 28 }}>{item.icon}</span>
                                </div>
                                <p className="sl-headline" style={{ fontSize: 12, fontWeight: 800, color: '#004ac6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Passo {item.step}
                                </p>
                                <p style={{ fontSize: 16, fontWeight: 700, color: '#131b2e', marginBottom: 6 }}>{item.title}</p>
                                <p style={{ fontSize: 14, color: '#49454f', lineHeight: 1.55 }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                BOTTOM CTA — Dark section, urgency
                Primary background, full break from the page
            ═══════════════════════════════════════════════════════════════════ */}
            <section style={{
                background: 'linear-gradient(135deg, #004ac6 0%, #1e3a8a 100%)',
                padding: '8rem 32px',
                textAlign: 'center',
            }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }} className="sl-reveal">
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                        O momento é agora
                    </p>
                    <h2 className="sl-headline" style={{
                        fontSize: 'clamp(32px, 4.5vw, 52px)',
                        fontWeight: 900, color: '#ffffff', marginBottom: 24,
                    }}>
                        O espaço das escolas mais<br />inovadoras está sendo<br />preenchido agora.
                    </h2>
                    <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
                        Enquanto você avalia, sua concorrente já aprovou. O Littera é a diferença entre perder matrículas e liderar rankings.
                    </p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => onDemoClick('teacher')} style={{
                            background: '#ffffff', color: '#004ac6', border: 'none', borderRadius: 9999,
                            fontWeight: 800, fontSize: 16, padding: '16px 36px', cursor: 'pointer',
                            transition: 'all 0.25s', boxShadow: '0 0 32px rgba(255,255,255,0.15)',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.25)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(255,255,255,0.15)'; }}
                        >
                            Garantir minha demonstração →
                        </button>
                        <button className="sl-btn-secondary" onClick={onLoginClick} style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Já tenho conta
                        </button>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════════
                FOOTER — Minimal
            ═══════════════════════════════════════════════════════════════════ */}
            <footer style={{ background: '#131b2e', padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <span className="sl-headline" style={{ fontSize: 20, fontWeight: 900, color: '#ffffff' }}>
                        Littera<span style={{ color: 'rgba(255,255,255,0.2)' }}>.</span>
                    </span>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 12, lineHeight: 1.6 }}>
                        Correção inteligente de redações do ENEM para escolas de excelência.
                    </p>
                    <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.08)', margin: '24px auto' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
                        {['Termos de Uso', 'Política de Privacidade', 'Contato'].map(link => (
                            <a key={link} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                                {link}
                            </a>
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 24 }}>
                        © {new Date().getFullYear()} Littera. Todos os direitos reservados.
                    </p>
                </div>
            </footer>


            {/* ═══════════════════════════════════════════════════════════════════
                LEAD MODAL — Brevo Integration
            ═══════════════════════════════════════════════════════════════════ */}
            {isLeadModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(19, 27, 46, 0.5)', backdropFilter: 'blur(10px)',
                    padding: 20
                }}>
                    <div className="sl-card" style={{ 
                        width: '100%', maxWidth: 480, background: '#fff', 
                        padding: '40px', position: 'relative',
                        boxShadow: '0 32px 64px rgba(0,0,0,0.15)',
                        animation: 'slReveal 0.4s cubic-bezier(0.16,1,0.3,1)'
                    }}>
                        <button 
                            onClick={() => { setIsLeadModalOpen(false); setTimeout(() => setIsLeadSuccess(false), 300); }}
                            style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', cursor: 'pointer', color: '#c7c5d0', padding: 4 }}
                        >
                            <span className="material-icons-outlined">close</span>
                        </button>

                        {isLeadSuccess ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'slReveal 0.4s ease' }}>
                                <div style={{ 
                                    width: 80, height: 80, borderRadius: '50%', background: '#10b981', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    margin: '0 auto 24px', animation: 'slScaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
                                }}>
                                    <span className="material-icons-outlined" style={{ color: '#fff', fontSize: 40 }}>check</span>
                                </div>
                                <h3 className="sl-headline" style={{ fontSize: 28, fontWeight: 900, color: '#131b2e', marginBottom: 12 }}>
                                    Tudo certo!
                                </h3>
                                <p style={{ fontSize: 16, color: '#49454f', lineHeight: 1.6, marginBottom: 32 }}>
                                    Seus dados foram enviados com sucesso. Nossa equipe avaliará seu perfil e entrará em contato em breve.
                                </p>
                                <button onClick={() => { setIsLeadModalOpen(false); setTimeout(() => setIsLeadSuccess(false), 300); }} className="sl-btn-primary" style={{ width: '100%', padding: '16px' }}>
                                    Concluir
                                </button>
                            </div>
                        ) : (
                            <>

                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: '#fff' }}>
                            <span className="material-icons-outlined">auto_awesome</span>
                        </div>

                        <h3 className="sl-headline" style={{ fontSize: 26, fontWeight: 900, color: '#131b2e', marginBottom: 12 }}>
                            Conheça o Padrão Littera
                        </h3>
                        <p style={{ fontSize: 15, color: '#49454f', marginBottom: 28, lineHeight: 1.6 }}>
                            Preencha seus dados para conversarmos sobre como elevar o nível e a performance das redações na sua escola.
                        </p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSubmittingLead(true);
                            const fd = new FormData(e.currentTarget);
                            const data = Object.fromEntries(fd.entries());
                            
                            try {
                                const apiKey = import.meta.env.VITE_BREVO_API_KEY;
                                
                                if (apiKey) {
                                    // Integração REAL com o Brevo (via API v3)
                                    await fetch('https://api.brevo.com/v3/contacts', {
                                        method: 'POST',
                                        headers: {
                                            'accept': 'application/json',
                                            'api-key': apiKey,
                                            'content-type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            email: data.EMAIL,
                                            attributes: {
                                                NOME: data.NOME,
                                                TELEFONE: data.TELEFONE,
                                                ESCOLA: data.ESCOLA
                                            },
                                            updateEnabled: true // Se o contato já existir, atualiza
                                        })
                                    });
                                } else {
                                    // Fallback simulado se não houver chave API. O log exibe os dados para você colar a chave depois.
                                    console.warn("⚠️ VITE_BREVO_API_KEY não configurada no .env.local", data);
                                    await new Promise(r => setTimeout(r, 1500)); 
                                }
                                setIsLeadSuccess(true);
                            } catch (err) {
                                console.error(err);
                                alert("Ocorreu um erro ao enviar. Tente novamente mais tarde.");
                            } finally {
                                setIsSubmittingLead(false);
                            }
                        }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131b2e', marginBottom: 6 }}>Nome completo</label>
                                <input required name="NOME" type="text" placeholder="Nome do responsável" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e1ec', fontSize: 15, background: '#faf8ff', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131b2e', marginBottom: 6 }}>E-mail corporativo</label>
                                <input required name="EMAIL" type="email" placeholder="nome@escola.com.br" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e1ec', fontSize: 15, background: '#faf8ff', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131b2e', marginBottom: 6 }}>Celular / WhatsApp</label>
                                    <input required name="TELEFONE" type="tel" placeholder="(11) 99999-9999" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e1ec', fontSize: 15, background: '#faf8ff', outline: 'none' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131b2e', marginBottom: 6 }}>Nome da Escola</label>
                                    <input required name="ESCOLA" type="text" placeholder="Instituição..." style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e1ec', fontSize: 15, background: '#faf8ff', outline: 'none' }} />
                                </div>
                            </div>
                            <button type="submit" className="sl-btn-primary" disabled={isSubmittingLead} style={{ width: '100%', padding: '16px', marginTop: 12, opacity: isSubmittingLead ? 0.7 : 1 }}>
                                {isSubmittingLead ? 'Enviando...' : 'Agendar Reunião de Descoberta'}
                            </button>
                        </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;