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
2. Abra o SQL Editor e execute o arquivo `supabase/schema.sql`.
3. Em Authentication, habilite o acesso por e-mail e senha e crie os usuários da equipe.
4. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
```

O login passa a usar o Supabase automaticamente quando essas variáveis existem. O MVP mantém produtos e pedidos no adaptador local para funcionar sem infraestrutura; para produção, substitua as operações do `StoreProvider` por consultas às tabelas `products`, `orders` e `order_items`.

## Comandos

```bash
npm run dev
npm run lint
npm run build
```

O projeto está pronto para deploy na Vercel. Cadastre as mesmas variáveis de ambiente no painel do projeto antes do deploy.
