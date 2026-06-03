export function applyCors(req: any, res: any): boolean {
    const origin = req.headers.origin;
    
    // Se a requisição vem de um browser (possui Origin)
    if (origin) {
        // Regras de domínios permitidos: localhost, vercel preview, ou domínio oficial littera
        const isAllowed = 
            origin.startsWith('http://localhost:') || 
            origin.endsWith('.vercel.app') || 
            origin.includes('littera');

        if (isAllowed) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', 'null');
        }
    } else {
        // Para chamadas server-to-server (ex: Webhooks do Asaas), não há Origin.
        // Opcional: podemos liberar chamadas sem Origin ou focar apenas em proteger contra browsers.
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Responde imediatamente ao preflight do browser
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true; // Indica que a requisição foi finalizada
    }
    
    // Se a origem é um browser não autorizado, bloqueia a requisição principal
    if (origin && !origin.startsWith('http://localhost:') && !origin.endsWith('.vercel.app') && !origin.includes('littera')) {
        res.status(403).json({ error: 'Forbidden: CORS origin not allowed' });
        return true; // Indica que a requisição foi finalizada
    }

    return false; // Continua a execução normal da API
}
