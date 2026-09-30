import { LogisticsAgent } from "./logistics_agent";
import { ShipmentLedger } from "./shipment_workflow";

const agent = new LogisticsAgent(new ShipmentLedger());
const outcome = await agent.run({
  event: {
    shipmentId: "SHIP-2048",
    kind: "DELIVERED",
    occurredAt: "2026-09-28T08:30:00.000Z",
    note: "Left with reception"
  },
  proofOfDelivery: {
    shipmentId: "SHIP-2048",
    objectKey: "pod/SHIP-2048/reception.jpg",
    mediaType: "image/jpeg",
    capturedAt: "2026-09-28T08:29:52.000Z"
  }
});

console.log(JSON.stringify(outcome, null, 2));
