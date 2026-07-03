create extension if not exists "pgcrypto";

create type product_category as enum ('Açaí', 'Sorvete', 'Complementos', 'Promoções', 'Outros');
create type payment_method as enum ('Pix', 'Dinheiro', 'Cartão', 'Fiado/Outro');
create type order_status as enum ('pending_payment', 'paid', 'canceled');

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category product_category not null,
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text,
  notes text,
  payment_method payment_method not null,
  status order_status not null default 'pending_payment',
  total numeric(10, 2) not null check (total >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Usuários autenticados gerenciam produtos" on products for all to authenticated using (true) with check (true);
create policy "Usuários autenticados gerenciam pedidos" on orders for all to authenticated using (true) with check (true);
create policy "Usuários autenticados gerenciam itens" on order_items for all to authenticated using (true) with check (true);
