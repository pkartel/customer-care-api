import { FastifyInstance } from "fastify";
import { Type as T } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { uuid } from "uuidv4";
import Bull from "bull";

// TODO: move out to *.d.ts file
declare module 'fastify' {
  interface FastifyInstance {
    updateQueue: Bull.Queue;
  }
}

const body = T.Object({
  senderType: T.Union([
    T.Literal("customer"),
    T.Literal("operator"),
  ]),
  senderId: T.String(),
  ticketIds: T.Array(T.Number()),
  text: T.String(),
});

const response = T.Object({
  status: T.String()
});

export async function routeBulkAddMessageToTickets(instance: FastifyInstance) {
  instance.withTypeProvider<TypeBoxTypeProvider>().route({
    method: "POST",
    url: "/tickets/bulk/messages",
    schema: {
      body,
      response: { 202: response },
    },
    handler: async (req, reply) => {
      const { text, ticketIds, senderId, senderType } = req.body;
      const taskId = uuid()

      await instance.updateQueue.add({
        instance,
        taskId,
        text,
        ticketIds,
        senderId,
        senderType,
      });
    
      return reply.status(202).send({
        status: 'success'
      });
    }
  })
}

