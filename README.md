# Manu Platform

Monorepo da plataforma da Manu, com frontends independentes para a Sorveteria e a Esfiharia sobre o mesmo Supabase multi-store.

## Estado atual

- **Sorveteria:** implementada em `apps/sorveteria`.
- **Esfiharia:** frontend inicial em `apps/esfiharia`, mantido em pré-lançamento enquanto a store estiver inativa.
- **API compartilhada:** futura; cada frontend mantém Route Handlers finos, enquanto as regras críticas permanecem nas mesmas RPCs multi-store do Supabase.
- **Pacotes compartilhados:** estrutura preparada, ainda sem extração de código.

## Estrutura

```text
apps/
  sorveteria/   Aplicação Next.js atual
  esfiharia/    Frontend inicial da Esfiharia
  api/          API compartilhada futura
packages/
  domain/       Tipos e regras de negócio futuros
  database/     Acesso compartilhado a dados no futuro
  validation/   Validações compartilhadas futuras
  shared/       Recursos compartilhados futuros
supabase/
  migrations/   Migrations do banco, mantidas na raiz
  seed.sql       Dados iniciais
```

O repositório usa npm workspaces, com um único `package-lock.json` na raiz. Não há Turborepo, Nx, pnpm ou Yarn nesta estrutura.

## Como executar a Sorveteria

Requisitos: Node.js 20 ou superior e npm.

Na raiz do repositório:

```bash
npm install
cp .env.example apps/sorveteria/.env.local
npm run dev:sorveteria
```

A aplicação estará disponível em `http://localhost:3000`. O comando `npm run dev` foi preservado como atalho para a Sorveteria.

## Como executar a Esfiharia

```bash
cp apps/esfiharia/.env.example apps/esfiharia/.env.local
npm run dev:esfiharia
```

Configure `STORE_SLUG=esfiharia`. A store não é ativada automaticamente pelo frontend.

## Variáveis de ambiente

O modelo compartilhado permanece em `.env.example`, na raiz. A configuração usada por cada aplicação Next.js deve ficar em seu próprio arquivo:

```text
apps/sorveteria/.env.local
apps/esfiharia/.env.local
```

Arquivos `.env` e `.env.local` são ignorados pelo Git em qualquer diretório. Não versione chaves reais e não duplique segredos sem necessidade.

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são consumidas também pelo navegador.
- `NEXT_PUBLIC_SITE_URL` deve conter a origem pública da Sorveteria, sem mudar as rotas existentes.
- `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor e nunca deve ser exposta em Client Components, respostas ou logs.
- `PUBLIC_ORDER_RATE_LIMIT_SALT` é exclusiva do servidor e deve ser longa, aleatória e diferente em cada ambiente.

Em desenvolvimento, a ausência das variáveis públicas ativa o modo de demonstração já existente. Em produção, todas as variáveis necessárias devem estar configuradas.

## Comandos por aplicação

```bash
npm run dev:sorveteria
npm run test:sorveteria
npm run lint:sorveteria
npm run build:sorveteria
npm run dev:esfiharia
npm run test:esfiharia
npm run lint:esfiharia
npm run build:esfiharia
```

Os comandos agregados executam as verificações nas duas aplicações; `dev` e `start` continuam apontando para a Sorveteria por compatibilidade:

```bash
npm test
npm run lint
npm run build
npm start
```

## Supabase

O diretório `supabase` permanece na raiz porque será compartilhado pelas operações da plataforma no futuro. As migrations aplicadas continuam em `supabase/migrations` e não devem ser editadas retroativamente.

Consulte [`supabase/README.md`](supabase/README.md) para implantação, seed, autenticação, RLS e geração de tipos.

## Rotas preservadas

As URLs públicas e internas continuam iguais, incluindo:

- `/`, `/delivery`, `/login`, `/recuperar-senha` e `/redefinir-senha`;
- `/sistema`, `/pedidos`, `/pedidos/novo`, `/produtos` e `/configuracoes`;
- `/acompanhar/[id]`, `/api/orders`, `/api/orders/tracking` e `/auth/callback`.

## Deploy

O deploy não foi alterado automaticamente. No Netlify, use package directory `apps/sorveteria` para a Sorveteria e `apps/esfiharia` para a Esfiharia. Cada site deve possuir `STORE_SLUG`, domínio e variáveis de ambiente próprias.
