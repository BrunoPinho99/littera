const apiKey = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjQxYzI4YTc2LTEwNTYtNDk5ZC04YjI3LTc4NzNlOTcyMTlhYTo6JGFhY2hfMjRlZGVlMjItOTg4Yi00ODFkLTljYjAtOTI1MjE2YWU3ZWVl";
const ASAAS_BASE = "https://api.asaas.com/v3";

async function test() {
  const asaasHeaders = { 'Content-Type': 'application/json', 'access_token': apiKey };
  
  const cusRes = await fetch(`${ASAAS_BASE}/customers`, {
    method: 'POST',
    headers: asaasHeaders,
    body: JSON.stringify({ name: "Littera API Test", cpfCnpj: "41103006000109" })
  });
  const customer = await cusRes.json();
  if(!cusRes.ok) { console.error("Cus error:", customer); return; }

  const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
    method: 'POST',
    headers: asaasHeaders,
    body: JSON.stringify({
      customer: customer.id,
      billingType: "BOLETO",
      value: 10,
      nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      cycle: "MONTHLY",
      description: "Test sub"
    })
  });
  const sub = await subRes.json();
  if(!subRes.ok) { console.error("Sub error:", sub); return; }

  const payRes = await fetch(`${ASAAS_BASE}/subscriptions/${sub.id}/payments`, { headers: asaasHeaders });
  const payments = await payRes.json();
  const firstPayment = payments.data[0];
  console.log("First Payment billingType:", firstPayment.billingType);

  const pixRes = await fetch(`${ASAAS_BASE}/payments/${firstPayment.id}/pixQrCode`, { headers: asaasHeaders });
  const pixData = await pixRes.json();
  console.log("Pix QR Code Res:", pixRes.status, pixData);
}
test().catch(console.error);
