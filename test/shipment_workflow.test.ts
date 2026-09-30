import assert from "node:assert/strict";
import test from "node:test";
import { ShipmentLedger } from "../src/shipment_workflow";

test("opens a review exception when delivery arrives without proof", () => {
  const ledger = new ShipmentLedger();
  const outcome = ledger.recordEvent({
    event: {
      shipmentId: "SHIP-91",
      kind: "DELIVERED",
      occurredAt: "2026-09-28T09:00:00.000Z"
    }
  });

  assert.equal(outcome.action, "EXCEPTION_OPENED");
  assert.equal(outcome.shipment.status, "NEEDS_REVIEW");
  assert.equal(outcome.shipment.exception?.reason, "Delivered event has no proof-of-delivery file");
});

test("confirms delivery when proof belongs to the shipment", () => {
  const ledger = new ShipmentLedger();
  const outcome = ledger.recordEvent({
    event: {
      shipmentId: "SHIP-92",
      kind: "DELIVERED",
      occurredAt: "2026-09-28T09:05:00.000Z"
    },
    proofOfDelivery: {
      shipmentId: "SHIP-92",
      objectKey: "pod/SHIP-92/doorstep.jpg",
      mediaType: "image/jpeg",
      capturedAt: "2026-09-28T09:04:55.000Z"
    }
  });

  assert.equal(outcome.action, "DELIVERY_CONFIRMED");
  assert.equal(outcome.shipment.status, "DELIVERED");
});
