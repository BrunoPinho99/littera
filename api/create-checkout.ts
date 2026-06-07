import { applyCors } from './_cors';

export default async function handler(req: any, res: any) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { planId } = req.body;

        const API_KEY = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY;
        if (!API_KEY) {
            throw new Error('ASAAS_API_KEY não configurada no servidor.');
        }

        // Produção ou Sandbox baseado na chave
        const ASAAS_URL = API_KEY.includes('hmlg')
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://api.asaas.com/v3';

        const HEADERS = {
            'Content-Type': 'application/json',
            'access_token': API_KEY
        };

        // Planos disponíveis
        const plans: Record<string, { name: string; value: number; cycle: string; description: string }> = {
            starter: {
                name: 'Littera - Plano Starter',
                value: 29.90,
                cycle: 'MONTHLY',
                description: 'Assinatura mensal do Plano Starter - Littera'
            },
            school: {
                name: 'Littera - Plano School',
                value: 49.90,
                cycle: 'MONTHLY',
                description: 'Assinatura mensal do Plano School - Littera'
            }
        };

        const plan = plans[planId];
        if (!plan) {
            return res.status(400).json({ message: `Plano "${planId}" não encontrado.` });
        }

        // Cria um Payment Link no Asaas (link de pagamento reutilizável)
        const linkRes = await fetch(`${ASAAS_URL}/paymentLinks`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                name: plan.name,
                billingType: 'UNDEFINED',
                chargeType: 'RECURRENT',
                subscriptionCycle: plan.cycle,
                value: plan.value,
                description: plan.description,
                notificationEnabled: true
            })
        });

        const linkData = await linkRes.json();

        if (!linkRes.ok) {
            console.error('Asaas PaymentLink error:', JSON.stringify(linkData));
            throw new Error(
                linkData.errors?.[0]?.description || 'Erro ao criar link de pagamento no Asaas.'
            );
        }

        return res.status(200).json({
            success: true,
            checkoutUrl: linkData.url
        });

    } catch (error: any) {
        console.error('create-checkout error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor.'
        });
    }
}
