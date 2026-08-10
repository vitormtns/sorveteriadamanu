# Manu Platform

Monorepo da plataforma da Manu. Nesta etapa, a Sorveteria da Manu permanece como a única aplicação implementada; os demais diretórios apenas reservam a estrutura das evoluções futuras.

## Estado atual

- **Sorveteria:** implementada em `apps/sorveteria`.
- **Esfiharia:** futura; ainda sem aplicação.
- **API compartilhada:** futura; as rotas existentes continuam no app da Sorveteria.
- **Pacotes compartilhados:** estrutura preparada, ainda sem extração de código.

## Estrutura

```text
apps/
  sorveteria/   Aplicação Next.js atual
  esfiharia/    Aplicação futura
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

## Variáveis de ambiente

O modelo compartilhado permanece em `.env.example`, na raiz. A configuração usada pelo Next.js deve ficar em:

```text
apps/sorveteria/.env.local
```

Arquivos `.env` e `.env.local` são ignorados pelo Git em qualquer diretório. Não versione chaves reais e não duplique segredos sem necessidade.

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são consumidas também pelo navegador.
- `NEXT_PUBLIC_SITE_URL` deve conter a origem pública da Sorveteria, sem mudar as rotas existentes.
- `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor e nunca deve ser exposta em Client Components, respostas ou logs.
- `PUBLIC_ORDER_RATE_LIMIT_SALT` é exclusiva do servidor e deve ser longa, aleatória e diferente em cada ambiente.

Em desenvolvimento, a ausência das variáveis públicas ativa o modo de demonstração já existente. Em produção, todas as variáveis necessárias devem estar configuradas.

## Comandos principais

```bash
npm run dev:sorveteria
npm run test:sorveteria
npm run lint:sorveteria
npm run build:sorveteria
```

Os comandos anteriores continuam disponíveis na raiz e apontam para a Sorveteria:

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

O deploy não foi migrado nesta etapa. Quando a hospedagem for ajustada para o monorepo, o diretório-base do app da Sorveteria deverá ser `apps/sorveteria`.
