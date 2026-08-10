import assert from "node:assert/strict";
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

const storeId = "00000000-0000-4000-8000-000000000002";
const productId = "10000000-0000-4000-8000-000000000001";

test("resolve exclusivamente o slug configurado para a Esfiharia", () => {
  assert.equal(getCurrentStoreSlug({ STORE_SLUG: " Esfiharia " }), "esfiharia");
  assert.equal(realtimeStoreFilter(storeId), `store_id=eq.${storeId}`);
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
