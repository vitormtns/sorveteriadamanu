# Sorveteria da Manu

Sistema responsivo para catálogo público, delivery e operação interna da Sorveteria da Manu.

## Estado da migração

Já usam Supabase:

- autenticação e profile único `owner`;
- produtos, configurações e horários;
- promoções, adicionais e sabores;
- catálogo público da landing e do delivery.

Ainda usam `localStorage`:

- pedidos e acompanhamento;
- filas operacionais e fechamento;
- impressão existente.

## Como executar

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=sua-chave-privada
```

Em desenvolvimento, a ausência das variáveis públicas ativa um modo de demonstração explícito. Em produção, a aplicação mostra erro de configuração e não usa catálogo local silenciosamente.

## Usuário administrativo

Crie um usuário em **Authentication > Users**, copie o UUID e execute:

```sql
insert into public.profiles (id, name, role, active)
values ('UUID_DO_AUTH_USER', 'Nome do responsável', 'owner', true);
```

Uma conta Auth sem profile `owner` ativo não acessa as rotas internas.

## Recuperação de senha

Configure a **Site URL** no Supabase e adicione às **Redirect URLs**:

```text
http://localhost:3000/auth/callback
https://seu-dominio.com/auth/callback
```

O fluxo usa `/recuperar-senha` e `/redefinir-senha`.

## Rotas

- Públicas: `/`, `/delivery`, `/acompanhar/*`, `/login`, `/recuperar-senha`, `/redefinir-senha`.
- Protegidas: `/sistema`, `/pedidos/*`, `/produtos`, `/configuracoes`.

Mais detalhes estão em [`supabase/README.md`](supabase/README.md).

## Validação

```bash
npm run lint
npm run build
```
