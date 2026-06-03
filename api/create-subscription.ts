// api/create-subscription.ts
import { createClient } from '@supabase/supabase-js';

// --- CORS HELPER INLINED TO AVOID VERCEL ESM RESOLUTION ISSUES ---
function applyCors(req: any, res: any): boolean {
    const origin = req.headers.origin;
    if (origin) {
        const isAllowed = origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app') || origin.includes('littera');
        if (isAllowed) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', 'null');
        }
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    
    if (origin && !origin.startsWith('http://localhost:') && !origin.endsWith('.vercel.app') && !origin.includes('littera')) {
        res.status(403).json({ error: 'Forbidden: CORS origin not allowed' });
        return true;
    }

    return false;
}
// -----------------------------------------------------------------

export default async function handler(req: any, res: any) {
    if (applyCors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { schoolName, email, password, cpfCnpj, name, phone, planPrice, frequency, planName } = req.body;

        if (!email || !name || !password) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando (email, name, password).' });
        }

        const asaasToken = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!asaasToken) {
            console.error('[create-subscription] ASAAS_API_KEY não configurada');
            return res.status(500).json({ message: 'Configuração do gateway de pagamento ausente.' });
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[create-subscription] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada');
            return res.status(500).json({ message: 'Configuração do banco de dados ausente.' });
        }

        const asaasBaseUrl = asaasToken.startsWith('$aact_hmlg') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

        // 3. Criar Cliente no Asaas
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
            return res.status(502).json({ message: 'Erro na comunicação com o gateway de pagamento.' });
        }

        if (customerData.errors) {
            return res.status(400).json({ message: customerData.errors[0]?.description || 'Erro ao criar cliente no Asaas.' });
        }

        const asaasCustomerId = customerData.id;

        // 4. Criar Link de Pagamento no Asaas
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
            return res.status(502).json({ message: 'Erro ao gerar link de pagamento.' });
        }

        if (paymentLink.errors) {
            return res.status(400).json({ message: paymentLink.errors[0]?.description || 'Erro ao gerar link de pagamento.' });
        }

        // 5. Salvar no Supabase (bypassando o Rate Limit com a Service Role Key)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 5.a. Criar o usuário Auth
        let userId;
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                user_type: 'school_admin',
                full_name: name
            }
        });

        if (authError) {
            if (authError.message.includes('already exists') || authError.status === 422) {
                // Usuário já existe (provavelmente uma tentativa falha anterior)
                // Vamos apenas buscar o ID dele e prosseguir
                const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = (listData?.users as any[])?.find(u => u.email === email);
                
                if (existingUser) {
                    userId = existingUser.id;
                } else {
                    return res.status(400).json({ message: 'E-mail já está em uso, e não foi possível localizá-lo.' });
                }
            } else {
                console.error('[create-subscription] Erro ao criar usuário Auth:', authError);
                return res.status(400).json({ message: 'Erro ao criar conta: ' + authError.message });
            }
        } else {
            userId = authData.user.id;
        }

        // 5.b Salvar Escola
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
            return res.status(500).json({ message: 'Erro ao salvar escola: ' + schoolError.message });
        }

        // 5.c Atualizar o Perfil do usuário (que pode ter sido gerado pelo trigger)
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
            return res.status(500).json({ message: 'Erro ao salvar perfil: ' + profileError.message });
        }

        // 5.d Atualizar metadata com school_id
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                user_type: 'school_admin',
                school_id: schoolData.id,
                full_name: name,
            }
        });

        return res.status(200).json({
            checkoutUrl: paymentLink.url,
            schoolId: schoolData.id
        });

    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    }
}