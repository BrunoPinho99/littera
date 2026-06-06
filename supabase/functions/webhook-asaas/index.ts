import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()
    const event = body.event
    const payment = body.payment

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // A chave para identificar a escola
    const schoolId = payment?.externalReference || payment?.subscription?.externalReference

    if (!schoolId) {
      return new Response('ok', { status: 200 }) // ignorar pagamentos sem vínculo
    }

    const atualizacoes: Record<string, unknown> = {}

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        atualizacoes.status = 'active'
        atualizacoes.plano_ativado_em = new Date().toISOString()
        break
      case 'PAYMENT_OVERDUE':
        atualizacoes.status = 'INADIMPLENTE'
        break
      case 'PAYMENT_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
      case 'PAYMENT_REFUNDED':
        atualizacoes.status = 'INATIVA'
        atualizacoes.plano = 'free'
        break
    }

    if (Object.keys(atualizacoes).length > 0) {
      const { error } = await supabase.from('schools')
        .update(atualizacoes)
        .eq('id', schoolId)

      if (error) {
        console.error('Erro ao atualizar DB:', error)
      }
    }

    // Sempre retornar 200 para o Asaas não reenviar o webhook
    return new Response('ok', { status: 200 })
  } catch (error: any) {
    console.error('Erro no processamento do webhook:', error)
    return new Response('ok', { status: 200 }) // Evitar que Asaas faça retry infinitos
  }
})
