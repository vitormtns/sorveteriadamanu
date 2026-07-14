import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAcaiAddOnPrice,
  canMeetMinimumOrder,
  isWithinBusinessHours,
  parsePublicOrderRequest,
  publicOrderError,
  roundMoney,
} from "../src/lib/public-order.ts";

const ids = {
  format: "00000000-0000-4000-8000-000000000002",
  scoop: "00000000-0000-4000-8000-000000000003",
  topping: "00000000-0000-4000-8000-000000000004",
  flavor: "00000000-0000-4000-8000-000000000005",
};

test("cobra apenas os adicionais de açaí acima da franquia", () => {
  assert.equal(calculateAcaiAddOnPrice([2, 2, 3, 4], 3), 4);
  assert.equal(calculateAcaiAddOnPrice([2, 2], 3), 0);
});

test("arredonda valores monetários em duas casas", () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(16.905), 16.91);
});

test("aplica pedido mínimo somente à entrega", () => {
  assert.equal(canMeetMinimumOrder(9.99, 10, "delivery"), false);
  assert.equal(canMeetMinimumOrder(10, 10, "delivery"), true);
  assert.equal(canMeetMinimumOrder(0, 10, "pickup"), true);
});

test("reconhece horário que atravessa meia-noite", () => {
  assert.equal(isWithinBusinessHours("18:00", "02:00", 60, true), true);
  assert.equal(isWithinBusinessHours("18:00", "02:00", 60), false);
  assert.equal(isWithinBusinessHours("18:00", "02:00", 23 * 60), true);
});

test("valida payload público e descarta preços enviados pelo navegador", () => {
  const parsed = parsePublicOrderRequest({
    customerName: "Cliente de teste",
    phone: "(11) 99999-8888",
    deliveryType: "delivery",
    address: "Rua de teste, 123",
    paymentMethod: "Pix",
    idempotencyKey: "pedido-publico-valido-20260714",
    total: 0.37,
    items: [{ builderType: "ice_cream", quantity: 1, formatId: ids.format, scoopId: ids.scoop, toppingId: ids.topping, flavorIds: [ids.flavor], unitPrice: 0.37 }],
  });
  assert.equal("code" in parsed, false);
  if ("code" in parsed) return;
  assert.equal(parsed.phone, "11999998888");
  assert.equal("total" in parsed, false);
  assert.equal("unitPrice" in parsed.items[0], false);
});

test("rejeita campos obrigatórios, IDs inválidos e repetição de sabores", () => {
  const missingAddress = parsePublicOrderRequest({ customerName: "Cliente", phone: "11999998888", deliveryType: "delivery", paymentMethod: "Pix", idempotencyKey: "pedido-publico-invalido-1", items: [] });
  assert.equal("code" in missingAddress && missingAddress.code, "PAYLOAD_INVALID");
  const repeatedFlavor = parsePublicOrderRequest({ customerName: "Cliente", phone: "11999998888", deliveryType: "pickup", paymentMethod: "Pix", idempotencyKey: "pedido-publico-invalido-2", items: [{ builderType: "ice_cream", quantity: 1, formatId: ids.format, scoopId: ids.scoop, toppingId: ids.topping, flavorIds: [ids.flavor, ids.flavor] }] });
  assert.equal("code" in repeatedFlavor && repeatedFlavor.code, "PAYLOAD_INVALID");
});

test("mapeia conflitos de idempotência sem expor erro do banco", () => {
  assert.deepEqual(publicOrderError(409, "IDEMPOTENCY_CONFLICT"), { status: 409, code: "IDEMPOTENCY_CONFLICT", message: "Este envio já foi usado para um pedido diferente." });
});
