import { FastifyInstance } from "fastify";
import * as pg from "pg";
import { db } from "./plugins/db";
import { routes } from "./routes";
import { startQueueProcessing } from "./plugins/bulkMessageUpdateQueue";

type Opts = {
  db: pg.PoolConfig;
};

export async function api(instance: FastifyInstance, opts: Opts) {
  await instance
    .register(db, opts.db)

    try {
      const updateQueue = await startQueueProcessing(instance); // Start the queue worker only after DB is available
      instance.log.info("Queue worker started successfully.");
      instance.decorate('updateQueue', updateQueue);
    } catch (err) {
      instance.log.error("Failed to start the queue worker", err);
    }

    await instance
      .register(routes)
}
