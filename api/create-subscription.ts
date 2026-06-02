// api/create-subscription.ts
import { createClient } from '@supabase/supabase-js';
import { applyCors } from './_cors';

export default async function handler(req: any, res: any) {
    // 1. Aplica as regras de CORS originais do seu projeto
    if (applyCors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { userId, schoolName, email, cpfCnpj, name, phone, planPrice, frequency, planName } = req.body;

        const asaasToken = process.env.VITE_ASAAS_API_KEY || process.env.ASAAS_API_KEY || '';
        const asaasUrl = asaasToken.includes('sandbox') || asaasToken.includes('hmlg') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

        // 2. Criar o Cliente no Asaas
        const customerRes = await fetch(`${asaasUrl}/customers`, {
            method: 'POST',
            headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: schoolName, email, cpfCnpj, mobilePhone: phone })
        });

        const customerData = await customerRes.json();
        if (customerData.errors) throw new Error(customerData.errors[0].description);
        const asaasCustomerId = customerData.id;

        // 3. Criar Link de Pagamento Recorrente no Asaas
        const billingCycle = frequency === 12 ? 'YEARLY' : (frequency === 6 ? 'SEMIANNUALLY' : 'MONTHLY');
        const amount = planPrice ? parseFloat(planPrice) : 29.90;

        const payRes = await fetch(`${asaasUrl}/paymentLinks`, {
            method: 'POST',
            headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                billingType: 'UNDEFINED',
                chargeType: 'RECURRENT',
                name: `Littera - Plano ${planName || 'Pro'}`,
                description: `Assinatura corporativa para ${schoolName}`,
                value: amount,
                cycle: billingCycle,
                dueDateLimitDays: 1,
                maxInstallmentCount: 1
            })
        });

        const paymentLink = await payRes.json();
        if (paymentLink.errors) throw new Error(paymentLink.errors[0].description);

        // 4. Salvar no Supabase usando a chave Admin (ignora o RLS)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const { data: schoolData, error: schoolError } = await supabaseAdmin
            .from('schools')
            .insert([{
                name: schoolName,
                cnpj: cpfCnpj,
                email: email,
                status: 'pending_payment',
                asaas_customer_id: asaasCustomerId,
                asaas_subscription_id: paymentLink.id
            }])
            .select()
            .single();

        if (schoolError) throw new Error('Erro ao salvar escola: ' + schoolError.message);

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([{
                id: userId,
                school_id: schoolData.id,
                role: 'gestor',
                full_name: name,
                email: email
            }]);

        if (profileError) throw new Error('Erro ao salvar perfil: ' + profileError.message);

        // 4b. Atualizar o user_metadata com school_id para o frontend funcionar
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                user_type: 'school_admin',
                school_id: schoolData.id,
                full_name: name,
            }
        });

        // 5. Retornar URL de pagamento do Asaas + schoolId
        return res.status(200).json({
            checkoutUrl: paymentLink.url,
            schoolId: schoolData.id
        });

    } catch (error: any) {
        console.error('Erro na assinatura:', error);
        return res.status(500).json({ message: error.message });
    }
}