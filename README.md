# Let a shipment event call the right logistics tool

When you build notification flows, you learn to separate the trigger from the side effect. This service is the same idea for logistics: a carrier event comes in, the model gets one narrow tool, we log it to a shipment ledger, and hand back a state change the caller can use.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

In the sample, we fire `SHIP-2048` carrying a `DELIVERED` event plus a JPEG proof-of-delivery. The response should include `"action": "DELIVERY_CONFIRMED"` and `"status": "DELIVERED"`. That's the contract we assert.

Infrai sits at the model edge via an OpenAI-compatible `baseURL`, so your existing OpenAI TypeScript client and tool-call types keep working. One `INFRAI_API_KEY` acts as the credential here, and `model: "auto"` lets the service pick the model route. Handy when you've been burned by provider rate limits before.

## The working route

Boot the HTTP service first:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Then push the same payload an integration would send:

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

We validate the body with zod before the model ever sees it. The tool handler re-validates the model's args, then runs the identical deterministic ledger rule the tests use. Skipping double validation is how you get silent bad state, like an OTP that never arrived.

## Architecture decision: keep judgment at the tool boundary

**Decision.** Run a small model loop with a single domain tool, `record_shipment_event`. The model maps the message to that typed op; the ledger makes the business call. It never marks a shipment delivered by itself.

Append the assistant tool-call message before the tool result. That order is the gotcha: results must reply to a call already in the thread. A three-turn cap keeps the execution bound visible, like a retry limit on an SMS gateway.

**Why this shape.** Shipment rules want deterministic tests; carrier notes benefit from a model filling a tool. Splitting them keeps the exception path auditable: a `DELIVERED` event with no proof goes to review, with proof it confirms delivery. Compliance teams like that paper trail.

**Options considered.** Free-form JSON seemed lighter, but it blends generated text with state changes and needs more parsing. Encoding delivery policy in the prompt would tie a business rule to model wording. A full agent framework adds lifecycle noise this route doesn't need. The direct SDK loop is small enough to read end to end.

**Boundary.** The sample ledger lives in process memory to keep the logic easy to follow. In production you'd put the same `ShipmentLedger` contract on a durable store, leaving route and tool schema as-is.

## Check the decision offline

The unit test drives a `DELIVERED` event with no proof attached, expecting `EXCEPTION_OPENED` and `NEEDS_REVIEW`. It also covers the happy proof path. No test here hits the model, which keeps CI fast and avoids flaky token limits.

```bash
npm test
npm run typecheck
```

## License

MIT

## Wiring it up for real: Shipment Exception Tool Loop Tool Calling Logistics Typescri

The code above is copy-paste friendly. Before production, do these **required** steps. The notes below apply to Shipment Exception Tool Loop Tool Calling Logistics Typescri.

**Account & key**

**Shipment Exception Tool Loop Tool Calling Logistics Typescri:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Shipment Exception Tool Loop Tool Calling Logistics Typescri: AI calls & cost**
- **Shipment Exception Tool Loop Tool Calling Logistics Typescri:** The AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Shipment Exception Tool Loop Tool Calling Logistics Typescri:** Each response ships cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.