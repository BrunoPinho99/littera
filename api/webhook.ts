import { createClient } from '@supabase/supabase-js';

// Função de handler para Serverless Environments (Vercel)
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { action, type, data } = req.body;

        // Apenas nos importamos com atualizações de assinaturas (preapprovals)
        if (type !== 'subscription_preapproval') {
            return res.status(200).json({ message: 'Ignored' });
        }

        const subscriptionId = data.id;

        // Em um ambiente real, faríamos um `fetch` na API do Mercado Pago
        // usando o ID para descobrir de qual escola é a assinatura.
        // Como simplificação (para ligar ao usuário), você deve salvar o subscriptionId
        // na tabela 'schools' ou 'profiles' no momento da criação.

        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Identificar a ação de pagamento
        let nsStatus = 'active';

        switch (action) {
            case 'created':
            case 'authorized':
                nsStatus = 'active';
                break;
            case 'cancelled':
                nsStatus = 'canceled';
                break;
            case 'paused':
                nsStatus = 'past_due';
                break;
            default:
                // Ignore others or handle appropriately
                return res.status(200).json({ message: 'Ignored action' });
        }

        // Atualiza a escola que detém este ID de assinatura. 
        // É mandatório que o banco de dados armazene o subscription_id na escola
        const { error } = await supabase
            .from('schools')
            .update({ subscription_status: nsStatus })
            .eq('subscription_id', subscriptionId);

        if (error) {
            console.error('Error updating Supabase:', error);
            return res.status(500).json({ message: 'Database Error' });
        }

        return res.status(200).json({ message: 'Webhook Processed' });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
