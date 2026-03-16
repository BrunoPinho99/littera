// api/webhook.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { event, payment } = req.body;

        const subscriptionId = payment?.subscription;
        const paymentLinkId = payment?.paymentLink;
        const schoolIdToUpdate = payment?.externalReference; // ID da escola enviado na criação

        if (!subscriptionId) {
            return res.status(200).json({ message: 'Ignored: Not a subscription payment' });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseServiceKey) {
            console.error('ALERTA CRÍTICO: SUPABASE_SERVICE_ROLE_KEY ausente no webhook. As de atualizações de banco de dados falharão (RLS).');
            return res.status(500).json({ message: 'Server configuration error: missing service role key' });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let nsStatus = 'active';

        // Mapeando os eventos do Asaas para o status da sua escola
        switch (event) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
                nsStatus = 'active';
                break;
            case 'PAYMENT_OVERDUE':
            case 'PAYMENT_REJECTED':
                nsStatus = 'past_due';
                break;
            case 'PAYMENT_DELETED':
            case 'PAYMENT_REFUNDED':
                nsStatus = 'canceled';
                break;
            default:
                return res.status(200).json({ message: 'Ignored event' });
        }

        // Atualiza a escola no Supabase (procura primeiro pelo externalReference, depois pelos IDs)
        let query = supabase.from('schools').select('id, subscription_id, payment_link_id');

        if (schoolIdToUpdate) {
            query = query.eq('id', schoolIdToUpdate);
        } else {
            query = query.or(`subscription_id.eq.${subscriptionId},payment_link_id.eq.${paymentLinkId || 'null'}`);
        }

        const { data: schools, error: searchError } = await query;

        if (searchError || !schools || schools.length === 0) {
            console.error('School not found for this payment in Supabase', searchError);
            return res.status(200).json({ message: 'School not found, ignored.' });
        }

        const school = schools[0]; // Pega a primeira que achou

        const { error } = await supabase
            .from('schools')
            .update({
                subscription_status: nsStatus,
                subscription_id: subscriptionId // Salva/atualiza o ID da assinatura
            })
            .eq('id', school.id);

        if (error) {
            console.error('Error updating Supabase:', error);
            return res.status(500).json({ message: 'Database Error' });
        }

        return res.status(200).json({ message: 'Asaas Webhook Processed' });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}