import express from "express";
import { ZodError } from "zod";
import { LogisticsAgent } from "./logistics_agent";
import { automationRequestSchema, ShipmentLedger } from "./shipment_workflow";

const server = express();
server.use(express.json({ limit: "64kb" }));

const agent = new LogisticsAgent(new ShipmentLedger());

server.post("/shipments/events", async (request, response) => {
  try {
    const input = automationRequestSchema.parse(request.body);
    const outcome = await agent.run(input);
    response.status(200).json(outcome);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Invalid shipment event", details: error.flatten() });
      return;
    }
    console.error(error);
    response.status(502).json({ error: "Shipment automation could not complete" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Shipment automation listening on http://localhost:${port}`));
