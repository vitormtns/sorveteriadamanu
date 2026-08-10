# Esfiharia da Manu

Aplicação Next.js da operação Esfiharia. Compartilha o Supabase e o domínio de pedidos da plataforma, mas resolve a loja exclusivamente no servidor por `STORE_SLUG=esfiharia`.

Enquanto a store estiver inativa ou sem configuração, a experiência pública permanece em pré-lançamento e bloqueia pedidos. Nenhum produto, horário, endereço ou contato fictício é usado.

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
