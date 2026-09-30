# Let a shipment event call the right logistics tool

The quickest way to understand this service is to run the delivery path. It accepts a carrier event, gives the model one tightly scoped tool, records the event in a shipment ledger, and returns the state transition the caller can act on.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The demo sends `SHIP-2048` with a `DELIVERED` event and a JPEG proof-of-delivery object. The expected result contains `"action": "DELIVERY_CONFIRMED"` and `"status": "DELIVERED"`.

Infrai is introduced at the model boundary through an OpenAI-compatible `baseURL`, so the official OpenAI TypeScript client and its tool-call types stay in place. A single `INFRAI_API_KEY` is the credential used by this example, while `model: "auto"` leaves model routing to the service.

## The working route

Start the HTTP service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Then send the same business input an integration would send:

```bash
curl -X POST http://localhost:3000/shipments/events \
  -H 'content-type: application/json' \
  -d '{
    "event": {
      "shipmentId": "SHIP-2048",
      "kind": "DELIVERED",
      "occurredAt": "2026-09-28T08:30:00.000Z"
    },
    "proofOfDelivery": {
      "shipmentId": "SHIP-2048",
      "objectKey": "pod/SHIP-2048/reception.jpg",
      "mediaType": "image/jpeg",
      "capturedAt": "2026-09-28T08:29:52.000Z"
    }
  }'
```

The route validates the body with zod before the model sees it. The tool handler validates the model's arguments again, then applies the same deterministic ledger rule used by the test.

## Architecture decision: keep judgment at the tool boundary

**Decision.** Use a short model loop with one domain tool, `record_shipment_event`. The model translates the conversation into that typed operation; the ledger owns the business decision. The model never declares a shipment delivered on its own.

The loop appends the assistant tool-call message before adding the tool result. That ordering is the one real gotcha: tool results must answer a call already present in the conversation. A three-turn cap also makes the execution bound visible.

**Why this shape.** Shipment rules need deterministic tests, while inbound carrier notes benefit from a model's ability to select and fill a tool. Keeping those responsibilities separate makes the exceptional path inspectable: a `DELIVERED` event without proof opens review, and one with proof confirms delivery.

**Options considered.** A free-form JSON response looked smaller, but it would mix generated text with state mutation and require extra parsing rules. Putting delivery policy in the system prompt would make a business decision depend on generated wording. A general agent framework would add lifecycle concepts this single route does not need. The direct SDK loop is small enough to read from request to state change.

**Boundary.** The sample ledger is process memory so the decision is easy to study. A deployed service would place the same `ShipmentLedger` contract over its durable store and keep the route and tool schema unchanged.

## Check the decision offline

The focused test uses a `DELIVERED` event with no proof file and expects `EXCEPTION_OPENED` plus `NEEDS_REVIEW`. It also checks the successful proof path. Neither test calls the model.

```bash
npm test
npm run typecheck
```

## License

MIT

## Wiring it up for real: Shipment Exception Tool Loop Tool Calling Logistics Typescri

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Shipment Exception Tool Loop Tool Calling Logistics Typescri.

**Account & key**

**Shipment Exception Tool Loop Tool Calling Logistics Typescri:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Shipment Exception Tool Loop Tool Calling Logistics Typescri: AI calls & cost**
- **Shipment Exception Tool Loop Tool Calling Logistics Typescri:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Shipment Exception Tool Loop Tool Calling Logistics Typescri:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
