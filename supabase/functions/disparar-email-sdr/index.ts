import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { leadId, customSubject, customBody } = await req.json();

    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Busca os dados do lead
    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchErr || !lead) {
      return new Response(JSON.stringify({ error: 'Lead não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const schoolName = lead.school_name || lead.name || 'sua escola';
    const contactName = lead.contact_name || 'Coordenação Pedagógica';
    const recipientEmail = lead.email;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return new Response(JSON.stringify({ error: 'Lead não possui um e-mail válido cadastrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Monta o E-mail de Cold Outreach com copywriting de alta conversão
    const subject = customSubject || `Redações ENEM no ${schoolName} / Bruno - Littera`;

    const htmlContent = customBody ? customBody.replace(/\n/g, '<br/>') : `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px;">
  <p>Olá, <strong>${contactName}</strong>, tudo bem?</p>

  <p>Acompanho de perto a preparação de excelência dos estudantes do <strong>${schoolName}</strong> para o ENEM e os vestibulares mais concorridos aqui em Brasília.</p>

  <p>Desenvolvemos em Brasília o <strong>Littera</strong>, uma tecnologia que corrige redações no padrão oficial do ENEM em 10 segundos, entregando devolutivas pedagógicas completas nas 5 competências.</p>

  <p>Colégios privados estão utilizando a plataforma para:</p>
  <ul>
    <li><strong>Duplicar a frequência</strong> de redações dos alunos do Ensino Médio;</li>
    <li><strong>Aliviar a sobrecarga</strong> dos professores titulares de linguagens;</li>
    <li><strong>Economizar até 70%</strong> do custo atual com bancas corretoras terceirizadas.</li>
  </ul>

  <p>Gostaria de liberar <strong>3 redações cortesia de alunos reais da sua escola</strong>, sem qualquer custo, apenas para que sua equipe pedagógica possa avaliar a precisão e o detalhamento dos relatórios.</p>

  <p>Você teria 10 a 15 minutos nesta <strong>quinta ou sexta-feira</strong> para uma breve demonstração online?</p>

  <br/>
  <p style="margin-bottom: 2px;">Atenciosamente,</p>
  <p style="margin: 0; font-weight: bold; color: #0f172a;">Bruno Pinho</p>
  <p style="margin: 0; color: #475569; font-size: 13px;">Fundador | Littera Tecnologia Educacional</p>
  <p style="margin: 0; color: #475569; font-size: 13px;">Brasília - DF | <a href="https://littera.app.br" style="color: #2563eb; text-decoration: none;">littera.app.br</a></p>
</div>
`;

    // 3. Envia via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bruno Pinho <bruno@littera.app.br>',
        to: [recipientEmail],
        reply_to: 'bruno.pinho.brasilia@hotmail.com',
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Erro Resend:', resendData);
      return new Response(JSON.stringify({ error: resendData.message || 'Erro no Resend' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Atualiza o status do lead no Supabase para 'email_1_enviado'
    await supabase
      .from('leads')
      .update({
        stage: 'email_1_enviado',
        notes: (lead.notes ? lead.notes + '\n' : '') + `[${new Date().toLocaleDateString('pt-BR')}] E-mail 1 enviado com sucesso via Resend (ID: ${resendData.id})`,
      })
      .eq('id', leadId);

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Erro ao processar envio:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
