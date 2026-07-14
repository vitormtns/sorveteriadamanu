# Sorveteria da Manu

MVP responsivo para funcionários registrarem pedidos de balcão ou WhatsApp e acompanharem pagamentos pendentes.

## Recursos

- Dashboard diário com vendas, recebimentos e pendências
- Cadastro e edição de produtos
- Lançamento rápido de pedidos com total automático
- Busca, filtros e ações rápidas nos pedidos
- Edição, pagamento e cancelamento de pedidos
- Dados de demonstração persistidos no `localStorage`
- Login e banco preparados para integração com Supabase

## Como executar

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) para abrir a landing page pública.

Rotas principais:

- `/` — site público da Sorveteria da Manu
- `/delivery` — espaço reservado para o cardápio online
- `/sistema` — painel interno da equipe
- `/login` — autenticação da equipe

No modo de demonstração, a tela de login aceita qualquer e-mail e senha.

## Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com).
2. Execute as migrations em `supabase/migrations` ou use `supabase db push`.
3. Revise e execute `supabase/seed.sql` para carregar configurações, horários e catálogo inicial.
4. Em Authentication, habilite o acesso por e-mail e senha e crie os usuários da equipe.
5. Crie o primeiro perfil `owner` em `public.profiles` usando o UUID do usuário criado.
6. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ser usada no navegador e respeita RLS.

`SUPABASE_SERVICE_ROLE_KEY` é somente para servidor. Nunca importe em Client Components e nunca exponha essa chave no navegador.

O login passa a usar o Supabase automaticamente quando as variáveis públicas existem. O MVP mantém produtos e pedidos no adaptador local para funcionar sem infraestrutura; os repositórios em `src/data/repositories` foram criados para a migração gradual das telas.

Veja detalhes em [`supabase/README.md`](supabase/README.md).

## Comandos

```bash
npm run dev
npm run lint
npm run build
```

O projeto está pronto para deploy na Vercel. Cadastre as mesmas variáveis de ambiente no painel do projeto antes do deploy.
