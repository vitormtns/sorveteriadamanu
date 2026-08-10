import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canAcceptOrders,
  parseSimpleOrder,
  toRpcPayload,
} from "../src/lib/public-order.ts";
import {
  getCurrentStoreSlug,
  realtimeStoreFilter,
} from "../src/lib/store-config.ts";
import { formatElapsed, formatMoney } from "../src/lib/format.ts";
import {
  esfihariaProductCategories,
  parseProductCategory,
} from "../src/lib/product.ts";
import {
  activationDisabled,
  hasRequiredReadiness,
  parseStoreReadiness,
} from "../src/lib/store-readiness.ts";
import { filterByStore } from "../src/lib/store-scope.ts";

const storeId = "00000000-0000-4000-8000-000000000002";
const productId = "10000000-0000-4000-8000-000000000001";

test("resolve exclusivamente o slug configurado para a Esfiharia", () => {
  assert.equal(getCurrentStoreSlug({ STORE_SLUG: " Esfiharia " }), "esfiharia");
  assert.equal(realtimeStoreFilter(storeId), `store_id=eq.${storeId}`);
});

test("suporta a categoria Esfihas no produto simples", () => {
  assert.equal(parseProductCategory("Esfihas"), "Esfihas");
  assert.ok(esfihariaProductCategories.includes("Esfihas"));
  assert.throws(() => parseProductCategory("Categoria inválida"));
});

test("bloqueia pedidos quando a store está inativa ou sem configuração", () => {
  const store = {
    id: storeId,
    slug: "esfiharia",
    name: "Esfiharia",
    type: "esfiharia",
    active: false,
  };
  assert.equal(canAcceptOrders({ store, products: [], settings: null }), false);
  assert.equal(
    canAcceptOrders({
      store: { ...store, active: true },
      products: [],
      settings: null,
    }),
    false,
  );
});

test("exige configuração mínima para liberar o checkout", () => {
  const snapshot = {
    store: {
      id: storeId,
      slug: "esfiharia",
      name: "Esfiharia",
      type: "esfiharia",
      active: true,
    },
    products: [],
    settings: {
      deliveryOpen: true,
      paused: false,
      closedToday: false,
      closedMessage: "",
      allowPickup: true,
      allowDelivery: false,
      deliveryFee: 0,
      minimumOrder: 0,
      acceptedPaymentMethods: ["Pix"],
      whatsapp: "",
      instagram: "",
      address: "",
      headline: "",
      subtitle: "",
      displayedHours: "",
      hours: [],
    },
  };
  assert.equal(canAcceptOrders(snapshot), false);
  snapshot.settings.hours.push({
    weekday: 1,
    enabled: true,
    open: "18:00",
    close: "22:00",
  });
  assert.equal(canAcceptOrders(snapshot), true);
});

test("calcula readiness e só libera ativação quando os requisitos obrigatórios estão prontos", () => {
  const requirements = {
    settings: true,
    catalog: true,
    hours: true,
    payment: true,
    fulfillment: true,
    contact: false,
  };
  assert.equal(hasRequiredReadiness(requirements), true);
  const ready = parseStoreReadiness({
    ready: true,
    requirements,
    missing: [],
  });
  assert.ok(ready);
  assert.equal(activationDisabled(ready), false);

  const blocked = parseStoreReadiness({
    ready: false,
    requirements: { ...requirements, catalog: false },
    missing: ["ao menos um produto ativo e disponível"],
  });
  assert.ok(blocked);
  assert.equal(activationDisabled(blocked), true);
});

test("mantém produtos de lojas diferentes isolados", () => {
  const products = [
    { id: "esfiha", storeId },
    { id: "sorvete", storeId: "00000000-0000-4000-8000-000000000001" },
  ];
  assert.deepEqual(filterByStore(products, storeId), [products[0]]);
});

test("aceita checkout simples e remove preços do payload da RPC", () => {
  const result = parseSimpleOrder({
    customerName: "Cliente Teste",
    phone: "(11) 99999-8888",
    deliveryType: "pickup",
    paymentMethod: "Pix",
    idempotencyKey: "pedido-esfiharia-0001",
    trackingToken: "token-seguro-12345678901234567890",
    items: [{ productId, quantity: 2, notes: "Sem cebola", price: 0.01 }],
  });
  assert.equal(result.error, null);
  if (!result.data) return;
  const payload = toRpcPayload(result.data);
  assert.deepEqual(payload.items, [
    {
      builder_type: "product",
      product_id: productId,
      quantity: 2,
      notes: "Sem cebola",
    },
  ]);
  assert.equal("price" in payload.items[0], false);
  assert.equal("store_id" in payload, false);
});

test("migration prepara dados neutros e bloqueia ativação ou pedidos inválidos no banco", () => {
  const migration = readFileSync(
    new URL(
      "../../../supabase/migrations/202608100002_prepare_esfiharia_operation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    migration,
    /alter type public\.product_category add value if not exists 'Esfihas'/,
  );
  assert.match(migration, /insert into public\.profile_stores/);
  assert.match(migration, /cross join generate_series\(0, 6\)/);
  assert.match(migration, /create or replace function public\.get_store_readiness/);
  assert.match(migration, /create or replace function public\.activate_store/);
  assert.match(migration, /v_readiness := public\.get_store_readiness/);
  assert.match(migration, /create trigger orders_require_active_store/);
  assert.doesNotMatch(migration, /insert into public\.products/);
});

test("rejeita quantidade zero, produto inválido e entrega sem endereço", () => {
  const base = {
    customerName: "Cliente Teste",
    phone: "11999998888",
    deliveryType: "pickup",
    paymentMethod: "Pix",
    idempotencyKey: "pedido-esfiharia-0002",
    trackingToken: "token-seguro-12345678901234567890",
  };
  assert.ok(
    parseSimpleOrder({ ...base, items: [{ productId, quantity: 0 }] }).error,
  );
  assert.ok(
    parseSimpleOrder({
      ...base,
      items: [{ productId: "outra-store", quantity: 1 }],
    }).error,
  );
  assert.ok(
    parseSimpleOrder({
      ...base,
      deliveryType: "delivery",
      items: [{ productId, quantity: 1 }],
    }).error,
  );
});

test("formata valores e tempo para pt-BR", () => {
  assert.match(formatMoney(12.5), /12,50/);
  assert.equal(
    formatElapsed(new Date(Date.now() - 5 * 60_000).toISOString()),
    "Há 5 min",
  );
});
