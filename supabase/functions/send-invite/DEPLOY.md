# Como Fazer o Deploy da Edge Function

## Pré-requisitos

1. Instalar o Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Fazer login:
   ```bash
   supabase login
   ```

3. Vincular ao projeto:
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   # (o project-ref está na URL do Supabase: https://app.supabase.com/project/SEU_PROJECT_REF)
   ```

## Deploy da Edge Function

```bash
supabase functions deploy send-invite --no-verify-jwt
```

## Configurar Variáveis de Ambiente da Edge Function

No painel do Supabase:
1. Acesse: **Project → Settings → Edge Functions**
2. Adicione:
   - `SUPABASE_URL` = URL do seu projeto
   - `SUPABASE_SERVICE_ROLE_KEY` = Service Role Key (em Settings → API)
   - `SITE_URL` = URL do seu app (ex: `https://littera.vercel.app` ou `http://localhost:3001` para dev)

## Configurar Redirect URL do Supabase Auth

No painel do Supabase:
1. Acesse: **Authentication → URL Configuration**
2. **Site URL**: `http://localhost:3001` (ou a URL de produção)
3. **Redirect URLs**: adicione:
   - `http://localhost:3001/convite`
   - `https://SEU_DOMINIO.com/convite`

## Testar Localmente

Para testar a Edge Function localmente (sem deploy):

```bash
supabase start
supabase functions serve send-invite --env-file .env.local
```

No `.env.local`, adicione:
```
SUPABASE_URL=https://SEU_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_service_role_key
SITE_URL=http://localhost:3001
```
