import { TicketRepository } from '../domain/ticket.repository.js';
import { Ticket, CreateTicketInput, UpdateTicketInput } from '../domain/ticket.model.js';

// TicketService contiene la lógica de negocio.
// La clave aquí es el historial automático de cambios en update() —
// igual que lo tenías en el frontend, pero ahora persiste en BD.
export class TicketService {
  constructor(private repo: TicketRepository) {}

  async getAll(groupId?: string): Promise<Ticket[]> {
    return this.repo.getAll(groupId);
  }

  async getById(id: string): Promise<Ticket | undefined> {
    return this.repo.getById(id);
  }

  async getByGroup(groupId: string): Promise<Ticket[]> {
    return this.repo.getByGroup(groupId);
  }

  // createTicket — el createdBy viene del header X-User-Id del Gateway
  async createTicket(data: CreateTicketInput): Promise<Ticket> {
    if (!data.title || data.title.trim().length < 3) {
      throw new Error('El título debe tener al menos 3 caracteres');
    }
    if (!data.groupId) {
      throw new Error('groupId es requerido');
    }
    return this.repo.create(data);
  }

  // updateTicket — changedBy es el nombre del usuario para el historial
  async updateTicket(id: string, changes: UpdateTicketInput, changedBy: string): Promise<Ticket | undefined> {
    const existing = await this.repo.getById(id);
    if (!existing) return undefined;
    return this.repo.update(id, changes, changedBy);
  }

  async deleteTicket(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async addComment(ticketId: string, author: string, content: string): Promise<Ticket | undefined> {
    if (!content.trim()) {
      throw new Error('El comentario no puede estar vacío');
    }
    return this.repo.addComment(ticketId, author, content);
  }
}
