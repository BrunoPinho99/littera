// api/asaas-webhook.ts
import { createClient } from '@supabase/supabase-js';
import { applyCors } from './_cors';

export default async function handler(req: any, res: any) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { event, payment } = req.body;

        const customerId = payment?.customer;
        const paymentLinkId = payment?.paymentLink;
        const subscriptionId = payment?.subscription;
        
        if (!customerId && !paymentLinkId && !subscriptionId) {
            return res.status(200).json({ message: 'Ignored: No identifying ID in payment' });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseServiceKey) {
            console.error('ALERTA CRÍTICO: SUPABASE_SERVICE_ROLE_KEY ausente no webhook.');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let nsStatus = '';

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
            case 'PAYMENT_CHARGEBACK_REQUESTED':
            case 'PAYMENT_CHARGEBACK_DISPUTE':
                nsStatus = 'canceled';
                break;
            default:
                return res.status(200).json({ message: 'Ignored event' });
        }

        if (nsStatus) {
            // Tentar achar a escola por asaas_customer_id, payment_link_id ou subscription_id
            let query = supabase.from('schools').select('id');
            if (customerId) query = query.or(`asaas_customer_id.eq.${customerId},payment_link_id.eq.${paymentLinkId || 'null'},subscription_id.eq.${subscriptionId || 'null'}`);
            else query = query.or(`payment_link_id.eq.${paymentLinkId || 'null'},subscription_id.eq.${subscriptionId || 'null'}`);

            const { data: schools } = await query.limit(1);

            if (schools && schools.length > 0) {
                const { error } = await supabase
                    .from('schools')
                    .update({ 
                        subscription_status: nsStatus,
                        asaas_customer_id: customerId || undefined,
                        subscription_id: subscriptionId || undefined
                    })
                    .eq('id', schools[0].id);

                if (error) {
                    console.error('Error updating Supabase:', error);
                    return res.status(500).json({ message: 'Database Error' });
                }
            } else {
                return res.status(200).json({ message: 'School not found for this payment' });
            }
        }

        return res.status(200).json({ message: 'Asaas Webhook Processed' });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
