import { FastifyBaseLogger, FastifyInstance } from "fastify";
import { Writable } from "stream";
import { Type as T } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Result } from "../../plugins/bulkMessageUpdateQueue";

interface NotifySenderPayload {
  senderId: string;
  progress: number;
  results: Result[];
}

interface SSEClient {
    id: string;
    connection: Writable;
}

const bulkUpdateResult = T.Object({
    id: T.Number(),
    success: T.Boolean(),
    error: T.Optional(T.String()),
    createdAt: T.Optional(T.String({ format: "date-time" })),
  });

const response = T.Object({
  senderType: T.Union([
    T.Literal("customer"),
    T.Literal("operator"),
  ]),
  senderId: T.String(),
  progress: T.Number(),
  results: T.Array(bulkUpdateResult),
  status: T.Union([T.Literal("success"), T.Literal("in progress")]),
  message: T.String(),
});

const params = T.Object({
  clientId: T.String(),
})

let clients: SSEClient[] = [];

export async function routeSseNotifications(instance: FastifyInstance) {
  instance.withTypeProvider<TypeBoxTypeProvider>().route({
    method: "GET",
    url: '/tickets/notifications/clients/:clientId',
    schema: {
        params,
        response: { 200: response },
    },
    handler: async (req, reply) => {
      // TODO: fix fastify's intereference with CORS headers without bypassing it completely
      // perhaps fastify-sse lib could be useful
      reply.hijack();

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const { clientId } = req.params;
      clients.push({ id: clientId, connection: reply.raw });

      req.raw.on('close', () => {
        clients = clients.filter((client) => client.id !== clientId);
        instance.log.info(`Client disconnected: ${clientId}`);
      });
    }
  })
}

export function notifySender({ senderId, progress, results }: NotifySenderPayload, log: FastifyBaseLogger) {
  try {
    const client = clients.find(c => c.id === senderId)

    if (client) {
      const msg = JSON.stringify(results)
      client.connection.write(`data: {"progress": ${progress}, "results": ${msg}} \n\n`);
    }
  } catch (error) {
    log.error(`Error sending SSE to client ${senderId}:`, error);
  }
}