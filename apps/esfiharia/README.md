# Esfiharia da Manu

Aplicação Next.js da operação Esfiharia. Compartilha o Supabase e o domínio de pedidos da plataforma, mas resolve a loja exclusivamente no servidor por `STORE_SLUG=esfiharia`.

Enquanto a store estiver inativa ou sem configuração, a experiência pública permanece em pré-lançamento e bloqueia pedidos. Nenhum produto, horário, endereço ou contato fictício é usado.

## Preparação comercial

A migration `202608100002_prepare_esfiharia_operation.sql` associa o owner existente, cria configurações neutras e sete dias desabilitados, sem preencher horários. O owner pode preparar uma store inativa pelas telas de produtos e configurações.

A ativação é manual, pelo botão **Ativar Esfiharia** em `/configuracoes`, e passa pela RPC `activate_store`. O banco exige configuração inicial, produto ativo e disponível, horário válido habilitado, forma de pagamento e ao menos retirada ou entrega. Endereço e contato aparecem como recomendação de prontidão, mas não são inventados nem bloqueiam uma operação exclusiva de retirada.

Ainda precisam ser informados com dados reais:

- produtos, descrições, preços e imagens;
- horários comerciais;
- formas de pagamento e eventual chave Pix;
- retirada, entrega e eventual taxa;
- endereço, WhatsApp, Instagram e textos públicos.

Até que os requisitos obrigatórios sejam preenchidos e o owner faça a ativação explícita, a Esfiharia permanece inativa e não aceita pedidos públicos nem internos.

## Desenvolvimento

Na raiz do monorepo:

```bash
npm run dev:esfiharia
npm run test:esfiharia
npm run lint:esfiharia
npm run build:esfiharia
```

Copie `.env.example` para `.env.local` dentro deste diretório. A service role é usada apenas pelos Route Handlers.

Os Route Handlers de storefront, pedido e tracking são adaptadores locais e finos porque `apps/api` ainda não foi extraído. Eles fixam `STORE_SLUG=esfiharia` no servidor e delegam cálculo, isolamento, idempotência e tracking às mesmas RPCs multi-store usadas pela plataforma. Essa pequena duplicação de fronteira é temporária; não existe backend, banco ou regra de preço paralela.

## Netlify

- Package directory: `apps/esfiharia`
- Variável fixa: `STORE_SLUG=esfiharia`
- As demais credenciais Supabase devem pertencer ao mesmo ambiente da plataforma.
