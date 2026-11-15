import React, { useState } from 'react';

export interface LegalContentProps {
  initialTab?: 'termos' | 'privacidade' | 'lgpd' | 'seguranca';
  onClose?: () => void;
  isModal?: boolean;
}

export const LegalContent: React.FC<LegalContentProps> = ({
  initialTab = 'termos',
  onClose,
  isModal = false,
}) => {
  const [activeTab, setActiveTab] = useState<'termos' | 'privacidade' | 'lgpd' | 'seguranca'>(initialTab);

  return (
    <div className={`flex flex-col h-full ${isModal ? 'max-h-[90vh]' : 'min-h-screen'} bg-white dark:bg-surface-dark text-gray-900 dark:text-gray-100 font-sans`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
            <span className="material-icons-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-gray-900 dark:text-white">
              Governança, Termos & LGPD
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Littera Tecnologia Educacional • Atualizado em Novembro de 2026
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <span className="material-icons-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 dark:border-white/10 px-6 gap-2 shrink-0 bg-gray-50/60 dark:bg-white/[0.02]">
        <button
          onClick={() => setActiveTab('termos')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'termos'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="material-icons-outlined text-base">gavel</span>
          Termos de Uso
        </button>
        <button
          onClick={() => setActiveTab('privacidade')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'privacidade'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="material-icons-outlined text-base">policy</span>
          Política de Privacidade
        </button>
        <button
          onClick={() => setActiveTab('lgpd')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'lgpd'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="material-icons-outlined text-base">shield</span>
          Adequação à LGPD (Dados de Menores)
        </button>
        <button
          onClick={() => setActiveTab('seguranca')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'seguranca'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="material-icons-outlined text-base">lock</span>
          Segurança da IA & Não-Treinamento
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        
        {/* ABA: TERMOS DE USO */}
        {activeTab === 'termos' && (
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-xs text-primary font-medium">
              💡 <strong>Resumo Comercial:</strong> O Littera é uma plataforma B2B fornecida sob licença de software (SaaS) para escolas, colégios e cursos pré-vestibular. Cobrança previsível por aluno contratado, sem custo extra por folha corrigida dentro da franquia.
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">1. Objeto e Licença de Uso</h3>
              <p>
                Estes Termos de Uso regulam o fornecimento da plataforma de inteligência artificial especializada na avaliação, leitura manuscrita (OCR) e devolutivas pedagógicas de redações no padrão oficial do Exame Nacional do Ensino Médio (ENEM). A licença concedida à Instituição de Ensino é temporária, não exclusiva e intransferível, vinculada à vigência da assinatura ativa no gateway de pagamentos.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">2. Papéis e Responsabilidade das Partes</h3>
              <p>
                <strong>A Instituição de Ensino (Escola):</strong> É responsável pela veracidade dos dados cadastrais inseridos, pela gestão de acesso de seus professores e alunos, e pela mediação pedagógica final dos resultados fornecidos pela ferramenta.
              </p>
              <p>
                <strong>A Littera:</strong> Garante a disponibilidade operacional do serviço em regime de melhores esforços (SLA de 99.5%), a manutenção dos algoritmos calibrados segundo a Matriz de Referência do INEP e a segurança da infraestrutura em nuvem.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">3. Franquia Mensal, Anti-Spam e Políticas de Uso Justo</h3>
              <p>
                Cada licença institucional inclui um pacote de até <strong>12 correções de redação mensais por aluno contratado</strong> em regime de <em>pool</em> compartilhado entre as turmas da escola.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Intervalo mínimo (Cooldown):</strong> O sistema estabelece um intervalo obrigatório de 10 minutos entre envios do mesmo estudante para garantir a absorção pedagógica da devolutiva e evitar disparos automatizados de scripts.</li>
                <li><strong>Limite diário de segurança:</strong> Teto máximo de 3 envios por aluno por dia, protegendo a cota da instituição contra abuso.</li>
                <li><strong>Deduplicação Inteligente:</strong> Fotos duplicadas de uma mesma redação já avaliada não consomem novos créditos da escola.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">4. Pagamentos e Cancelamento</h3>
              <p>
                Toda a gestão de cobrança, emissão de faturas, parcelamento e renovação automática é processada pelo parceiro bancário homologado <strong>Asaas Gestão Financeira Instituição de Pagamento S.A.</strong> O Littera não armazena números de cartões de crédito. O cancelamento pode ser efetuado a qualquer momento com efeito ao final do ciclo contratado, sem multas ocultas.
              </p>
            </section>
          </div>
        )}

        {/* ABA: POLÍTICA DE PRIVACIDADE */}
        {activeTab === 'privacidade' && (
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              🔒 <strong>Compromisso de Privacidade:</strong> A Littera não comercializa, não aluga e não compartilha dados de estudantes ou métricas de escolas com anunciantes, parceiros comerciais ou birôs de crédito.
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">1. Dados Coletados e Princípio da Minimização</h3>
              <p>
                Em estrita observância ao princípio da necessidade (Art. 6º, III da LGPD), coletamos apenas os dados imprescindíveis para a prestação do serviço educacional:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Gestores e Professores:</strong> Nome, e-mail institucional e identificador de turma.</li>
                <li><strong>Estudantes:</strong> Nome completo, e-mail para acesso (ou código de matrícula fornecido pela coordenação) e as fotos/textos das redações submetidas.</li>
                <li><strong>Metadados Técnicos:</strong> Endereço IP e registros de data/hora de submissão estritamente para auditoria de segurança e cumprimento do Marco Civil da Internet (Lei nº 12.965/2014).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">2. Isolamento de Dados Multitenant e Sigilo Institucional</h3>
              <p>
                A arquitetura da Littera utiliza isolamento lógico por banco de dados relacional com <strong>Row Level Security (RLS)</strong>. Isso significa que as notas, estatísticas de evolução, índices de desempenho e nomes de alunos de uma escola são 100% inacessíveis para outras escolas, usuários públicos ou motores de busca.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">3. Retenção e Exclusão de Registros</h3>
              <p>
                Os dados são mantidos durante a vigência do contrato escolar. Ao término do ano letivo ou mediante solicitação expressa do administrador da escola, a Littera realiza a anonimização definitiva ou o expurgo completo das imagens de redações e registros de alunos.
              </p>
            </section>
          </div>
        )}

        {/* ABA: ADEQUAÇÃO À LGPD (MENORES) */}
        {activeTab === 'lgpd' && (
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
              ⚖️ <strong>Conformidade Legal:</strong> Tratamento de dados de crianças e adolescentes estruturado de acordo com o <strong>Art. 14 da Lei Federal nº 13.709/2018 (LGPD)</strong>, pautado exclusivamente no melhor interesse do aluno.
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">1. Definição Formal de Papéis Legais</h3>
              <p>
                <strong>A Instituição de Ensino Contratante é a CONTROLADORA (Art. 5º, VI):</strong> É quem toma as decisões pedagógicas e disciplinares sobre o uso da plataforma em suas turmas, possuindo a base legal originária (legítimo interesse educacional e execução de contrato de prestação de serviços educacionais) junto aos responsáveis legais.
              </p>
              <p>
                <strong>A Littera é a OPERADORA (Art. 5º, VII):</strong> Realiza o tratamento de dados pessoais estritamente sob as ordens, parâmetros e instruções da Controladora, executando o processamento computacional das correções.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">2. Tratamento no Melhor Interesse do Estudante</h3>
              <p>
                Todas as operações de tratamento de dados de estudantes pelo Littera visam exclusivamente o aprimoramento pedagógico e a evolução na escrita do aluno para os vestibulares e o ENEM. Não há perfilamento comportamental comercial, publicidade direcionada ou pontuação de crédito.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">3. Direitos dos Titulares (Estudantes e Pais)</h3>
              <p>
                Os estudantes ou seus responsáveis legais podem exercer a qualquer momento os direitos previstos no Art. 18 da LGPD (confirmação de tratamento, acesso aos textos, correção de dados incompletos ou eliminação) diretamente pelo canal da coordenação escolar ou através do nosso Encarregado de Proteção de Dados (DPO).
              </p>
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                <strong>Canal DPO / Encarregado LGPD:</strong> <span className="font-mono text-primary">privacidade@littera.app.br</span>
              </div>
            </section>
          </div>
        )}

        {/* ABA: SEGURANÇA DA IA & NÃO-TREINAMENTO */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 font-medium">
              🛡️ <strong>Garantia de Não-Treinamento (Zero Data Retention for Training):</strong> As fotos e os textos dos seus alunos NUNCA treinam modelos públicos de terceiros.
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">1. Política Estrita da API de Inteligência Artificial</h3>
              <p>
                O processamento das redações do Littera é realizado através da interface comercial corporativa oficial do <strong>Google Gemini API (Vertex AI / Paid Tier)</strong>. Nos termos de serviço corporativos desta API:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Sem uso para treino:</strong> Os dados de entrada (fotos, transcrições e textos) e saída (notas e devolutivas) <em>não são utilizados para treinar, retreinar ou aprimorar os modelos fundacionais de IA do Google</em>.
                </li>
                <li>
                  <strong>Processamento Efêmero:</strong> O payload da imagem é processado em tempo de execução via túnel TLS 1.3 criptografado e descartado da memória da IA imediatamente após a geração do JSON de competências.
                </li>
                <li>
                  <strong>Propriedade Intelectual:</strong> A autoria, direitos autorais e propriedade moral dos textos pertencem exclusivamente ao estudante autor e à instituição de ensino.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">2. Não Exposição de Informações Sensíveis da Escola</h3>
              <p>
                Caso um aluno escreva involuntariamente dados confidenciais na folha de redação (ex.: telefone, endereço pessoal ou comentários particulares), o pipeline de IA avalia apenas o conteúdo gramatical e argumentativo conforme os critérios objetivos do ENEM. Tais dados não são indexados, não são categorizados e não constam em nenhum relatório público.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-display">3. Criptografia e Infraestrutura Segura</h3>
              <p>
                Todos os dados em trânsito são protegidos com criptografia HTTPS/TLS 1.3. Os bancos de dados PostgreSQL gerenciados pelo Supabase contam com criptografia em repouso (AES-256) e backups diários com redundância geográfica em datacenters com certificações ISO 27001 e SOC 2 Tipo II.
              </p>
            </section>
          </div>
        )}

      </div>

      {/* Footer Modal CTA */}
      {isModal && onClose && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md"
          >
            Entendido e Ciente
          </button>
        </div>
      )}
    </div>
  );
};
