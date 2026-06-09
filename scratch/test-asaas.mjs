import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key) {
    envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  }
});

const ASAAS_KEY = envVars.ASAAS_API_KEY;
const ASAAS_BASE = ASAAS_KEY.includes('hmlg') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_KEY,
};

async function run() {
  console.log('Testing Asaas API...');
  
  // Valid random CPF (not validated by receita, just algorithmic)
  // Let's just use the Asaas sandbox generic valid CNPJ format or ignore cpfCnpj validation by using a valid one.
  const validCnpj = '00000000000191'; 
  
  // 1. Create a customer
  const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
    method: 'POST',
    headers: asaasHeaders,
    body: JSON.stringify({
      name: 'Test Customer',
      cpfCnpj: validCnpj,
      email: `test${Date.now()}@example.com`
    })
  });
  
  const customerData = await customerRes.json();
  if (!customerRes.ok) {
    console.log('Customer Error:', customerData);
    return;
  }
  const customerId = customerData.id;
  console.log('Customer Created:', customerId);
  
  // 2. Create Subscription
  const today = new Date().toISOString().split('T')[0];
  const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
    method: 'POST',
    headers: asaasHeaders,
    body: JSON.stringify({
      customer: customerId,
      billingType: 'UNDEFINED',
      value: 100,
      nextDueDate: today,
      cycle: 'MONTHLY',
      description: 'Test Subscription'
    })
  });
  
  const subData = await subRes.json();
  if (!subRes.ok) {
    console.log('Subscription Error:', subData);
    return;
  }
  const subscriptionId = subData.id;
  console.log('Subscription Created:', subscriptionId);
  
  // 3. Get Payments
  const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`, {
    headers: asaasHeaders
  });
  const paymentsData = await paymentsRes.json();
  console.log('Payments Data:', JSON.stringify(paymentsData, null, 2));
}

run();
