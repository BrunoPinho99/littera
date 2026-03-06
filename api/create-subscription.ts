import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { schoolId, email, planPrice, returnUrl, frequency } = req.body;

        if (!schoolId || !email) {
            return res.status(400).json({ message: 'schoolId and email are required' });
        }

        // Se planPrice não vier do frontend, assume um fallback
        const amount = planPrice ? parseFloat(planPrice) : 497.00;

        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
        const preApprovalPlan = new PreApprovalPlan(client);

        const planData = {
            reason: 'Littera B2B Access',
            auto_recurring: {
                frequency: frequency || 1,
                frequency_type: 'months',
                transaction_amount: amount,
                currency_id: 'BRL',
            },
            payment_methods_allowed: {
                payment_types: [
                    { id: 'credit_card' },
                    { id: 'bank_transfer' }, // PIX / Boleto (ajuste conforme necessário pela lib MP atualizada)
                    { id: 'ticket' }
                ],
                payment_methods: [
                    // Opcionais: cartões permitidos, vazios = todos
                ]
            },
            back_url: returnUrl || 'https://www.littera.example.com/dashboard',
        };

        const response = await preApprovalPlan.create({ body: planData });

        return res.status(200).json({
            init_point: response.init_point,
            plan_id: response.id
        });

    } catch (error: any) {
        console.error('Error creating preapproval plan:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
