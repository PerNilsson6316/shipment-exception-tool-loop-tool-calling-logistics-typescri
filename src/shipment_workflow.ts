import { z } from "zod";

export const shipmentEventSchema = z.object({
  shipmentId: z.string().min(1),
  kind: z.enum(["PICKED_UP", "IN_TRANSIT", "DELIVERED", "EXCEPTION"]),
  occurredAt: z.string().datetime(),
  note: z.string().min(1).optional()
});

export const proofOfDeliverySchema = z.object({
  shipmentId: z.string().min(1),
  objectKey: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  capturedAt: z.string().datetime()
});

export const automationRequestSchema = z.object({
  event: shipmentEventSchema,
  proofOfDelivery: proofOfDeliverySchema.optional()
}).superRefine((input, context) => {
  if (input.proofOfDelivery && input.proofOfDelivery.shipmentId !== input.event.shipmentId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["proofOfDelivery", "shipmentId"],
      message: "Proof of delivery must belong to the event shipment"
    });
  }
});

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;
export type ProofOfDelivery = z.infer<typeof proofOfDeliverySchema>;
export type AutomationRequest = z.infer<typeof automationRequestSchema>;

export type ShipmentRecord = {
  shipmentId: string;
  status: "IN_PROGRESS" | "DELIVERED" | "NEEDS_REVIEW";
  events: ShipmentEvent[];
  proofOfDelivery?: ProofOfDelivery;
  exception?: { reason: string; openedAt: string };
};

export type WorkflowResult = {
  action: "EVENT_RECORDED" | "DELIVERY_CONFIRMED" | "EXCEPTION_OPENED";
  shipment: ShipmentRecord;
};

export class ShipmentLedger {
  private readonly records = new Map<string, ShipmentRecord>();

  recordEvent(input: AutomationRequest): WorkflowResult {
    const existing = this.records.get(input.event.shipmentId);
    const events = existing ? existing.events.concat(input.event) : [input.event];
    const base: ShipmentRecord = {
      shipmentId: input.event.shipmentId,
      status: existing?.status ?? "IN_PROGRESS",
      events,
      proofOfDelivery: input.proofOfDelivery ?? existing?.proofOfDelivery,
      exception: existing?.exception
    };

    if (input.event.kind === "DELIVERED" && !base.proofOfDelivery) {
      const shipment: ShipmentRecord = {
        ...base,
        status: "NEEDS_REVIEW",
        exception: {
          reason: "Delivered event has no proof-of-delivery file",
          openedAt: input.event.occurredAt
        }
      };
      this.records.set(shipment.shipmentId, shipment);
      return { action: "EXCEPTION_OPENED", shipment };
    }

    if (input.event.kind === "EXCEPTION") {
      const shipment: ShipmentRecord = {
        ...base,
        status: "NEEDS_REVIEW",
        exception: {
          reason: input.event.note ?? "Carrier reported an exception",
          openedAt: input.event.occurredAt
        }
      };
      this.records.set(shipment.shipmentId, shipment);
      return { action: "EXCEPTION_OPENED", shipment };
    }

    if (input.event.kind === "DELIVERED") {
      const shipment: ShipmentRecord = { ...base, status: "DELIVERED", exception: undefined };
      this.records.set(shipment.shipmentId, shipment);
      return { action: "DELIVERY_CONFIRMED", shipment };
    }

    this.records.set(base.shipmentId, base);
    return { action: "EVENT_RECORDED", shipment: base };
  }

  getShipment(shipmentId: string): ShipmentRecord | undefined {
    return this.records.get(shipmentId);
  }
}
