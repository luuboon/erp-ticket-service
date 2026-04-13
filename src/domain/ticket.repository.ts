import { Ticket, CreateTicketInput, UpdateTicketInput } from './ticket.model.js';

// Contrato que debe cumplir cualquier implementación de persistencia.
// Igual que en el frontend — si mañana cambias de PostgreSQL a otra BD,
// solo creas una nueva implementación de esta interface.
export abstract class TicketRepository {
  abstract getAll(groupId?: string): Promise<Ticket[]>;
  abstract getById(id: string): Promise<Ticket | undefined>;
  abstract getByGroup(groupId: string): Promise<Ticket[]>;
  abstract getByAssignee(userId: string): Promise<Ticket[]>;
  abstract create(data: CreateTicketInput): Promise<Ticket>;
  abstract update(id: string, changes: UpdateTicketInput, changedBy: string): Promise<Ticket | undefined>;
  abstract delete(id: string): Promise<boolean>;
  abstract addComment(ticketId: string, author: string, content: string): Promise<Ticket | undefined>;
}
