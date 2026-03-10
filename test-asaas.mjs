import fs from 'fs';

async function testAsaas() {
    const apiKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNkZDFkYzM4LTg2OGYtNGNhOS1iNDZhLWI0YjkyMTBjMzQ4Njo6JGFhY2hfZTZlYzE3MjItYTUwYy00MTQyLTg4YmYtZTUwMDc3ZTgxNGEy';
    const url = 'https://sandbox.asaas.com/api/v3';

    console.log('Creating payment link...');
    const payRes = await fetch(`${url}/paymentLinks`, {
        method: 'POST',
        headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            billingType: 'UNDEFINED',
            chargeType: 'RECURRENT',
            name: 'Assinatura Littera Pro',
            description: 'Acesso Pro Mensal',
            value: 29.90,
            endDate: null,
            cycle: 'MONTHLY',
            dueDateLimitDays: 1
        })
    });
    const paymentLink = await payRes.json();
    console.log('Payment Link:', paymentLink);
}

testAsaas().catch(console.error);
