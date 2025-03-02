import { FastifyInstance } from "fastify";
import { routeListTickets } from "./tickets/list-tickets";
import { routeGetTicket } from "./tickets/get-ticket";
import { routeAddMessageToTicket } from "./tickets/add-ticket-message";
import { routeCreateTicket } from "./tickets/create-ticket";
import { routeDeleteTicket } from "./tickets/delete-ticket";
import { routeResolveTicket } from "./tickets/resolve-ticket";
import { routeListTicketMessages } from "./tickets/list-ticket-messages";
import { routeBulkAddMessageToTickets } from "./tickets/bulk-add-message";
import { routeSseNotifications } from "./tickets/bulk-add-message-notif";

export async function routes(instance: FastifyInstance) {
  instance
    .register(routeListTickets)
    .register(routeGetTicket)
    .register(routeDeleteTicket)
    .register(routeCreateTicket)
    .register(routeAddMessageToTicket)
    .register(routeBulkAddMessageToTickets)
    .register(routeSseNotifications)
    .register(routeResolveTicket)
    .register(routeListTicketMessages)
    ;
}
