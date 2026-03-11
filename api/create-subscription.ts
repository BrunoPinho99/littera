// api/webhook.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { schoolId, email, planPrice, returnUrl, frequency, name } = req.body;

        if (!schoolId || !email) {
            return res.status(400).json({ message: 'schoolId and email are required' });
        }

        const amount = planPrice ? parseFloat(planPrice) : 29.90;

        // Configuração do Asaas
        const asaasToken = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';
        // Forçando o ambiente de Sandbox (Homologação) conforme solicitado
        const asaasUrl = 'https://sandbox.asaas.com/api/v3';

        // 1. Criar Link de Pagamento no Asaas
        const billingCycle = frequency === 12 ? 'YEARLY' : (frequency === 6 ? 'SEMIANNUALLY' : 'MONTHLY');
        const planName = frequency === 12 ? 'Anual' : (frequency === 6 ? 'Semestral' : 'Mensal');

        const payRes = await fetch(`${asaasUrl}/paymentLinks`, {
            method: 'POST',
            headers: {
                'access_token': asaasToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                billingType: 'UNDEFINED', // Deixa o cliente escolher PIX, Boleto ou Cartão
                chargeType: 'RECURRENT',
                name: `Assinatura Littera Pro ${planName}`,
                description: `Acesso Corporativo - Littera`,
                value: amount,
                endDate: null,
                cycle: billingCycle,
                dueDateLimitDays: 1, // Exigência do Asaas
                maxInstallmentCount: 1
            })
        });

        const paymentLink = await payRes.json();

        if (paymentLink.errors) {
            console.error('Asaas Link Error:', paymentLink.errors);
            return res.status(400).json({ message: 'Erro ao gerar pagamento no Asaas', error: paymentLink.errors[0]?.description });
        }

        // 2. Salvar o ID do Link no Supabase vinculando à Escola
        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';

        if (supabaseUrl && supabaseKey && schoolId) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error: dbError } = await supabase
                .from('schools')
                .update({ payment_link_id: paymentLink.id })
                .eq('id', schoolId);

            if (dbError) {
                console.error('Supabase update error:', dbError);
                // Não falhamos o pagamento se der erro de DB localmente apenas fazemos log, 
                // mas em produção precisa vincular corretamente.
            }
        }

        // 3. Retornar a URL de checkout
        return res.status(200).json({
            checkoutUrl: paymentLink.url,
            linkId: paymentLink.id
        });

    } catch (error: any) {
        console.error('Error creating Asaas payment:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}