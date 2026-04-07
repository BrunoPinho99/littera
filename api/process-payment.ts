// api/process-payment.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { planId, planPrice, frequency, customer, creditCard, schoolId, password } = req.body;

        const API_KEY = process.env.ASAAS_API_KEY;
        if (!API_KEY) {
            throw new Error('Chave de API do Asaas não configurada.');
        }

        const HEADERS = {
            'Content-Type': 'application/json',
            'access_token': API_KEY
        };

        // Usa Sandbox se a chave tiver 'hmlg' (homologação), senão usa Produção.
        const ASAAS_URL = API_KEY.includes('hmlg') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

        // 1. Procurar ou Criar Cliente no Asaas
        let asaasCustomerId = '';
        const searchCustomerRes = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${customer.cpfCnpj}`, { headers: HEADERS });
        const searchCustomerData = await searchCustomerRes.json();

        if (searchCustomerData.data && searchCustomerData.data.length > 0) {
            asaasCustomerId = searchCustomerData.data[0].id;
        } else {
            // Criar novo cliente
            const createCustomerRes = await fetch(`${ASAAS_URL}/customers`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({
                    name: customer.name,
                    cpfCnpj: customer.cpfCnpj,
                    email: customer.email,
                    phone: customer.phone,
                    postalCode: customer.postalCode,
                    addressNumber: customer.addressNumber,
                    addressComplement: customer.addressComplement
                })
            });
            const createCustomerData = await createCustomerRes.json();

            if (!createCustomerRes.ok) {
                throw new Error(`Erro ao criar cliente local: ${createCustomerData.errors?.[0]?.description || 'Erro desconhecido'}`);
            }
            asaasCustomerId = createCustomerData.id;
        }

        // 2. Definir o ciclo (MONTHLY, SEMIANNUALLY, YEARLY)
        let cycle = 'MONTHLY';
        if (frequency === 6) cycle = 'SEMIANNUALLY';
        if (frequency === 12) cycle = 'YEARLY';

        // 3. Criar a assinatura com Cartão de Crédito

        // Asaas exige que o vencimento (nextDueDate) seja no mínimo amanhã ou hoje. Vamos colocar hoje.
        const today = new Date();
        const nextDueDate = today.toISOString().split('T')[0];

        const subscriptionPayload: any = {
            customer: asaasCustomerId,
            billingType: 'CREDIT_CARD',
            value: planPrice,
            nextDueDate: nextDueDate,
            cycle: cycle,
            description: `Assinatura Littera - Plano ${planId}`,
            creditCard: creditCard,
        };

        if (schoolId) {
            subscriptionPayload.externalReference = schoolId;
        }

        subscriptionPayload.creditCardHolderInfo = {
                name: customer.name,
                email: customer.email,
                cpfCnpj: customer.cpfCnpj,
                postalCode: customer.postalCode,
                addressNumber: customer.addressNumber,
                addressComplement: customer.addressComplement,
                phone: customer.phone
        };

        const createSubRes = await fetch(`${ASAAS_URL}/subscriptions`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(subscriptionPayload)
        });

        const createSubData = await createSubRes.json();

        if (!createSubRes.ok) {
            throw new Error(`Erro no pagamento: ${createSubData.errors?.[0]?.description || 'Erro ao processar cartão'}`);
        }

        const subscriptionId = createSubData.id;

        // 4. Salvar o ID da assinatura no Supabase e/ou Criar a Conta
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseServiceKey) {
            console.error('ALERTA CRÍTICO: Variável SUPABASE_SERVICE_ROLE_KEY ausente no ambiente do servidor.');
            throw new Error('Configuração de servidor incompleta. Contate o suporte técnico.');
        }

        if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            if (schoolId) {
                // Usuário já logado, apenas atualiza
                await supabase
                    .from('schools')
                    .update({
                        subscription_id: subscriptionId,
                        subscription_status: 'active'
                    })
                    .eq('id', schoolId);
            } else if (password) {
                // Novo assinante, cria a escola e o perfil de admin!
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: customer.email,
                    password: password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: customer.name,
                        user_type: 'school_admin'
                    }
                });

                if (authError) {
                    console.error('Erro ao criar usuário Auth no Supabase:', authError);
                } else if (authData.user) {
                    const newUserId = authData.user.id;
                    const cleanName = customer.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                    // Insere a nova escola no BD
                    const { data: schoolData, error: schoolError } = await supabase.from('schools').insert({
                        name: customer.name,
                        slug: cleanName || `escola-${Date.now()}`,
                        city: customer.addressComplement || "Online",
                        subscription_status: 'active',
                        subscription_id: subscriptionId
                    }).select().single();

                    if (schoolData && !schoolError) {
                        const schoolUUID = schoolData.id;

                        // Atualiza meta do usuário
                        await supabase.auth.admin.updateUserById(newUserId, {
                            user_metadata: { school_id: schoolUUID }
                        });

                        // Cria o Perfil
                        await supabase.from('profiles').upsert({
                            id: newUserId,
                            school_id: schoolUUID,
                            role: 'school_admin',
                            full_name: customer.name,
                            email: customer.email,
                            status: 'active'
                        });
                    } else {
                        console.error('Erro ao inserir escola no Supabase:', schoolError);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            subscriptionId: subscriptionId,
            message: 'Assinatura criada e pagamento processado com sucesso.'
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}
