// api/create-subscription.ts
import { createClient } from '@supabase/supabase-js';
import { applyCors } from './_cors';

export default async function handler(req: any, res: any) {
    // 1. CORS
    if (applyCors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { userId, schoolName, email, cpfCnpj, name, phone, planPrice, frequency, planName } = req.body;

        // Validação básica
        if (!userId || !email || !name) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando (userId, email, name).' });
        }

        // 2. Validar variáveis de ambiente
        const asaasToken = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!asaasToken) {
            console.error('[create-subscription] ASAAS_API_KEY não configurada nas env vars da Vercel');
            return res.status(500).json({ message: 'Configuração do gateway de pagamento ausente. Contate o administrador.' });
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[create-subscription] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada');
            return res.status(500).json({ message: 'Configuração do banco de dados ausente. Contate o administrador.' });
        }

        const asaasBaseUrl = asaasToken.startsWith('$aact_hmlg') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

        // 3. Criar o Cliente no Asaas
        const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
            method: 'POST',
            headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: schoolName || name, email, cpfCnpj, mobilePhone: phone })
        });

        const customerText = await customerRes.text();
        let customerData: any;
        try {
            customerData = JSON.parse(customerText);
        } catch {
            console.error('[create-subscription] Resposta inválida do Asaas (customers):', customerText.substring(0, 500));
            return res.status(502).json({ message: 'Erro na comunicação com o gateway de pagamento. Tente novamente.' });
        }

        if (customerData.errors) {
            console.error('[create-subscription] Erro Asaas (customers):', customerData.errors);
            return res.status(400).json({ message: customerData.errors[0]?.description || 'Erro ao criar cliente no Asaas.' });
        }

        const asaasCustomerId = customerData.id;

        // 4. Criar Link de Pagamento Recorrente no Asaas
        const billingCycle = frequency === 12 ? 'YEARLY' : (frequency === 6 ? 'SEMIANNUALLY' : 'MONTHLY');
        const amount = planPrice ? parseFloat(planPrice) : 29.90;

        const payRes = await fetch(`${asaasBaseUrl}/paymentLinks`, {
            method: 'POST',
            headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                billingType: 'UNDEFINED',
                chargeType: 'RECURRENT',
                name: `Littera - Plano ${planName || 'Pro'}`,
                description: `Assinatura corporativa para ${schoolName || name}`,
                value: amount,
                cycle: billingCycle,
                dueDateLimitDays: 1,
                maxInstallmentCount: 1
            })
        });

        const payText = await payRes.text();
        let paymentLink: any;
        try {
            paymentLink = JSON.parse(payText);
        } catch {
            console.error('[create-subscription] Resposta inválida do Asaas (paymentLinks):', payText.substring(0, 500));
            return res.status(502).json({ message: 'Erro ao gerar link de pagamento. Tente novamente.' });
        }

        if (paymentLink.errors) {
            console.error('[create-subscription] Erro Asaas (paymentLinks):', paymentLink.errors);
            return res.status(400).json({ message: paymentLink.errors[0]?.description || 'Erro ao gerar link de pagamento.' });
        }

        // 5. Salvar no Supabase usando a chave Admin (ignora RLS)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: schoolData, error: schoolError } = await supabaseAdmin
            .from('schools')
            .insert([{
                name: schoolName || name,
                cnpj: cpfCnpj,
                email: email,
                status: 'pending_payment',
                asaas_customer_id: asaasCustomerId,
                asaas_subscription_id: paymentLink.id
            }])
            .select()
            .single();

        if (schoolError) {
            console.error('[create-subscription] Erro Supabase (schools):', schoolError);
            return res.status(500).json({ message: 'Erro ao salvar escola: ' + schoolError.message });
        }

        // O trigger on_auth_user_created já criou o perfil, atualizamos com school_id
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                school_id: schoolData.id,
                role: 'gestor',
                full_name: name,
                email: email
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('[create-subscription] Erro Supabase (profiles):', profileError);
            return res.status(500).json({ message: 'Erro ao salvar perfil: ' + profileError.message });
        }

        // 5b. Atualizar user_metadata com school_id para o frontend
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                user_type: 'school_admin',
                school_id: schoolData.id,
                full_name: name,
            }
        });

        // 6. Retornar URL de pagamento do Asaas + schoolId
        return res.status(200).json({
            checkoutUrl: paymentLink.url,
            schoolId: schoolData.id
        });

    } catch (error: any) {
        console.error('[create-subscription] Erro inesperado:', error);
        return res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    }
}