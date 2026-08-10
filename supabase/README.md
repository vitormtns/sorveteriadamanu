# Supabase

Esta pasta contém a base de produção do Supabase para a Sorveteria da Manu.

O arquivo `schema.sql` antigo foi preservado apenas como referência histórica. A implantação nova deve usar as migrations em `supabase/migrations`.

## Criar o projeto

1. Crie um projeto no Supabase.
2. Habilite autenticação por e-mail e senha em Authentication.
3. Execute a migration:

```bash
supabase db push
```

Ou copie o conteúdo de `migrations/202607130001_initial_production_schema.sql` para o SQL Editor em um projeto novo.

## Executar o seed

Revise `seed.sql` antes do primeiro deploy e ajuste preços, horários, WhatsApp, endereço, chave Pix e textos públicos.

```bash
supabase db seed
```

Ou execute `supabase/seed.sql` no SQL Editor.

O seed não cria pedidos fictícios nem dados pessoais reais. Ele é idempotente e deixa pedidos online fechados/pausados por padrão.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
PUBLIC_ORDER_RATE_LIMIT_SALT=um-segredo-aleatorio-longo-e-exclusivo-do-ambiente
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ser usada no navegador e sempre passa por RLS.

`SUPABASE_SERVICE_ROLE_KEY` é somente para servidor. Nunca use em Client Components, nunca envie ao navegador e nunca exponha em logs.

`PUBLIC_ORDER_RATE_LIMIT_SALT` também é somente servidor. Use um valor aleatório longo, diferente em cada ambiente, para gerar chaves de rate limit sem armazenar IP ou telefone em texto puro.

## Perfis da equipe

Depois de criar usuários em Authentication, crie o primeiro perfil `owner` com SQL administrativo:

```sql
insert into public.profiles (id, name, role, active)
values ('UUID_DO_AUTH_USER', 'Nome do responsável', 'owner', true);
```

Nesta etapa, o sistema aceita somente um perfil `owner` ativo e não possui gestão de usuários pela interface.

## Gerar tipos Supabase

Quando o projeto remoto estiver criado, gere tipos a partir do banco:

```bash
supabase gen types typescript --project-id SEU_PROJECT_ID --schema public > src/data/supabase/database.types.ts
```

O arquivo atual `src/data/supabase/database.types.ts` foi escrito para ser compatível com esta migration e pode ser substituído por tipos gerados quando a CLI estiver configurada.

## Decisões de modelagem

- Categorias e status usam enums PostgreSQL porque são domínios pequenos e controlados nesta etapa.
- Configurações globais ficam em uma linha única em `store_settings`, com horários, promoções, adicionais e sabores em tabelas próprias.
- A leitura pública de configurações usa `public_store_settings`, que não expõe chave Pix nem observações internas de pagamento.
- `orders.public_code` é aleatório, único e não sequencial.
- `order_items` guarda snapshot de nome, categoria e preço para preservar o pedido mesmo que o produto seja alterado.
- `order_status_history` registra mudanças operacionais por trigger simples. Não é Event Sourcing.
- `create_internal_order` cria pedido interno de forma atômica. Itens com `product_id` usam preço do banco; itens sem `product_id` são manuais e autenticados.
- Endereço obrigatório para delivery será validado pela operação de servidor, não por `CHECK`, para evitar bloqueios em migrações e correções operacionais.
- Opções e preços dos montadores do delivery ficam em `delivery_builder_options`. O navegador usa esses valores apenas para prévia; a RPC calcula novamente cada preço no banco.

## RLS

Todas as tabelas públicas estão com RLS ativada.

- Público anônimo lê catálogo disponível, horários e a view `public_store_settings`.
- Público anônimo não tem SELECT direto em `store_settings`.
- Público anônimo não lista pedidos, não consulta clientes e não altera dados.
- `POST /api/orders` valida o payload no servidor e chama a RPC `create_public_order` com `service_role`; anon e authenticated não recebem `EXECUTE` nessa RPC.
- A criação pública é idempotente por `idempotency_key`. Repetições com o mesmo payload retornam o mesmo pedido; com payload diferente retornam conflito.
- Usuários internos ativos leem dados operacionais.
- Attendants criam pedidos internos e atualizam status/pagamento apenas por RPCs específicas.
- Owners gerenciam produtos, configurações, promoções, adicionais e sabores. A gestão de perfis permanece apenas administrativa nesta etapa.

## Próximos passos

- Não expor acompanhamento público só por `public_code`; use `public_code` com telefone normalizado ou token público para evitar enumeração e vazamento de telefone/endereço.
- Conectar gradualmente as telas aos repositórios em `src/data/repositories`.
- Adicionar testes automatizados para mappers e operações críticas quando a infraestrutura de testes for escolhida.
- Implementar Realtime e impressão em tarefas separadas.

## Integração atual da aplicação

Nesta versão existe somente um usuário `owner` e não há gestão de usuários. Crie o usuário em **Authentication > Users** e associe o UUID em `public.profiles` com o SQL administrativo acima. Nunca eleve privilégios automaticamente pelo navegador.

Configure a **Site URL** e autorize `/auth/callback` nas **Redirect URLs** para o endereço local e o domínio de produção. O callback troca o código PKCE por uma sessão antes de encaminhar de `/recuperar-senha` para `/redefinir-senha`.

As rotas internas são protegidas por `src/proxy.ts`, que atualiza cookies e exige profile `owner` ativo. A autenticação comum usa somente a anon key; a service role permanece exclusiva do servidor.

Supabase é a fonte de verdade para autenticação, profiles, produtos, configurações, horários, promoções, adicionais e sabores. Pedidos, acompanhamento, filas, fechamento e impressão continuam no `localStorage` nesta etapa.

O salvamento da tela de configurações usa a RPC `save_store_configuration`, criada pela migration `202607140002_atomic_store_configuration.sql`, para persistir configurações, horários, promoções, adicionais e sabores em uma única transação.

## Pedidos públicos

O delivery usa `POST /api/orders`. A rota valida limites, origem em produção, payload e rate limit persistente por IP, telefone e chave de idempotência. Em seguida, `create_public_order` valida disponibilidade da loja, horários (inclusive atravessando meia-noite), pagamentos, catálogo, sabores, adicionais, promoções e totais dentro de uma única transação.

O rate limit é uma proteção básica compatível com a infraestrutura atual; em múltiplas regiões ou alto volume, reavalie os limites e considere uma camada dedicada de borda. A tabela guarda somente hashes salgados das chaves de limitação.

Em desenvolvimento sem variáveis do Supabase, o delivery continua em modo de demonstração local e identifica o pedido com um código `DEMO-...`. Esse fluxo não simula nem grava pedidos de produção.
