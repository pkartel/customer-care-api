import { FastifyBaseLogger, FastifyInstance } from "fastify";
import * as pg from "pg";
import { addMessageToTicket, sender_type } from "../../queries/messages.queries";

import Bull from 'bull';
import assert from "assert";
import { notifySender } from "../routes/tickets/bulk-add-message-notif";

type Task = {
  taskId: string;
  text: string;
  ticketIds: number[];
  senderId: string;
  senderType: sender_type
}

export type Result = {
  ticketId: number;
  senderId: string;
  senderType: string;
  text: string;
  success: boolean;
  createdAt?: Date;
  error?: any;
}

export function startQueueProcessing(fastify: FastifyInstance) {
  const updateQueue = new Bull('bulk-message-update', {
      redis: {
        host: 'localhost',
        port: 6379,
      },
    });

  updateQueue.process(async (job) => {
    const { taskId, text, ticketIds, senderId, senderType } = job.data;

    const ticketsTotal = ticketIds.length;
    let processedTickets = 0;

    while (processedTickets < ticketsTotal) {
      const chunk = ticketIds.slice(processedTickets, processedTickets + 10); // increase chunk size to 100 for big batches
      
      assert.ok(fastify.db)
      const results = await updateMessageTable(fastify.db, {taskId, ticketIds: chunk, text, senderId, senderType}, fastify.log);
      
      processedTickets += chunk.length;
      const progress = Math.round((processedTickets / ticketsTotal) * 100);
      
      job.progress(progress);
      notifySender({ senderId, progress, results }, fastify.log);
    }
        
    fastify.log.info(`Task ${taskId} processed`);
  });

  return updateQueue
}

async function updateMessageTable(db: pg.Pool, task: Task, log: FastifyBaseLogger) {
    const results: Result[] = [];
    
    // Adding message to all tickets separately to be able to progress even if some updates will fail
    for (const ticketId of task.ticketIds) {
        const { senderId, senderType, text } = task
        try {
            const messages = await addMessageToTicket.run({
                ticketId,
                senderId,
                senderType,
                text,
            }, db);
            
            assert.ok(messages.length === 1);
            const [{ createdAt, ...message }] = messages;

            results.push({
                ...message,
                ticketId,
                success: true,
                error: null,
                createdAt,
              });

        } catch (error: any) {
            log.error('Error updating message table:', error);
            results.push({
                ticketId,
                success: false,
                error: error.message,
                senderId, senderType, text
            });
        }
    }

    return results;
}
