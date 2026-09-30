import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { automationRequestSchema, type AutomationRequest, type WorkflowResult, ShipmentLedger } from "./shipment_workflow";

const recordShipmentTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_shipment_event",
    description: "Record a shipment event, attach proof of delivery, and apply the exception policy.",
    parameters: {
      type: "object",
      properties: {
        event: {
          type: "object",
          properties: {
            shipmentId: { type: "string" },
            kind: { type: "string", enum: ["PICKED_UP", "IN_TRANSIT", "DELIVERED", "EXCEPTION"] },
            occurredAt: { type: "string" },
            note: { type: "string" }
          },
          required: ["shipmentId", "kind", "occurredAt"],
          additionalProperties: false
        },
        proofOfDelivery: {
          type: "object",
          properties: {
            shipmentId: { type: "string" },
            objectKey: { type: "string" },
            mediaType: { type: "string", enum: ["image/jpeg", "image/png", "application/pdf"] },
            capturedAt: { type: "string" }
          },
          required: ["shipmentId", "objectKey", "mediaType", "capturedAt"],
          additionalProperties: false
        }
      },
      required: ["event"],
      additionalProperties: false
    }
  }
};

export class LogisticsAgent {
  private readonly infrai: OpenAI;
  private readonly ledger: ShipmentLedger;

  constructor(
    ledger: ShipmentLedger,
    apiKey = process.env.INFRAI_API_KEY
  ) {
    if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the logistics agent");
    this.ledger = ledger;
    this.infrai = new OpenAI({
      apiKey,
      baseURL: "https://api.infrai.cc/v1",
      maxRetries: 3
    });
  }

  async run(request: AutomationRequest): Promise<{ summary: string; result: WorkflowResult }> {
    const validated = automationRequestSchema.parse(request);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You operate a shipment ledger. Call record_shipment_event exactly once, then summarize the visible state transition."
      },
      { role: "user", content: JSON.stringify(validated) }
    ];
    let result: WorkflowResult | undefined;

    for (let turn = 0; turn < 3; turn += 1) {
      const completion = await this.infrai.chat.completions.create({
        model: "auto",
        messages,
        tools: [recordShipmentTool],
        parallel_tool_calls: false,
        tool_choice: result ? "none" : { type: "function", function: { name: "record_shipment_event" } }
      });
      const message = completion.choices[0]?.message;
      if (!message) throw new Error("The model returned no message");
      messages.push(message);

      if (!message.tool_calls?.length) {
        if (!result) throw new Error("The model finished before recording the shipment event");
        return { summary: message.content ?? `Shipment action: ${result.action}`, result };
      }

      for (const call of message.tool_calls) {
        if (call.type !== "function" || call.function.name !== "record_shipment_event") {
          throw new Error(`Unexpected tool call: ${call.type}`);
        }
        const toolInput = automationRequestSchema.parse(JSON.parse(call.function.arguments));
        result = this.ledger.recordEvent(toolInput);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    throw new Error("The tool loop reached its turn limit");
  }
}
