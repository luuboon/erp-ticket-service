import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TicketService } from '../../application/ticket.service.js';
import { TicketStatus, TicketPriority } from '../../domain/ticket.model.js';
import { sendOK, sendCreated, sendError } from '../../dto/response.js';
import { gatewayOnly, getRequesterID, getRequesterEmail } from './middleware.js';
import { z } from 'zod';

// Schemas de validación con Zod
const CreateTicketSchema = z.object({
  title:       z.string().min(3),
  description: z.string().min(1),
  status:      z.nativeEnum(TicketStatus).default(TicketStatus.Pendiente),
  assignedTo:  z.string().default(''),
  priority:    z.nativeEnum(TicketPriority).default(TicketPriority.Media),
  dueDate:     z.string().transform(s => new Date(s)),
  groupId:     z.string().min(1),
});

const UpdateTicketSchema = z.object({
  title:       z.string().min(3).optional(),
  description: z.string().optional(),
  status:      z.nativeEnum(TicketStatus).optional(),
  assignedTo:  z.string().optional(),
  priority:    z.nativeEnum(TicketPriority).optional(),
  dueDate:     z.string().transform(s => new Date(s)).optional(),
  groupId:     z.string().optional(),
});

const AddCommentSchema = z.object({
  content: z.string().min(1, 'El comentario no puede estar vacío'),
});

export async function ticketRoutes(
  fastify: FastifyInstance,
  svc: TicketService,
): Promise<void> {

  // Todos los endpoints requieren venir del Gateway
  fastify.addHook('preHandler', gatewayOnly);

  // ── GET /tickets ───────────────────────────────────────────────
  // Acepta ?groupId= para filtrar por grupo
  fastify.get('/tickets', async (req: FastifyRequest, reply: FastifyReply) => {
    const { groupId } = req.query as { groupId?: string };
    const tickets = await svc.getAll(groupId);
    return sendOK(reply, ...tickets);
  });

  // ── GET /tickets/:id ───────────────────────────────────────────
  fastify.get('/tickets/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ticket = await svc.getById(id);
    if (!ticket) return sendError(reply, 404, 'Ticket no encontrado');
    return sendOK(reply, ticket);
  });

  // ── POST /tickets ──────────────────────────────────────────────
  fastify.post('/tickets', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = CreateTicketSchema.safeParse(req.body);
    if (!body.success) {
      return sendError(reply, 400, body.error.issues.map(i => i.message).join(', '));
    }

    // El createdBy viene del header X-User-Id inyectado por el Gateway
    const createdBy = getRequesterID(req);

    try {
      const ticket = await svc.createTicket({ ...body.data, createdBy });
      return sendCreated(reply, ticket);
    } catch (err: unknown) {
      return sendError(reply, 400, err instanceof Error ? err.message : 'Error al crear ticket');
    }
  });

  // ── PATCH /tickets/:id ─────────────────────────────────────────
  fastify.patch('/tickets/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = UpdateTicketSchema.safeParse(req.body);
    if (!body.success) {
      return sendError(reply, 400, body.error.issues.map(i => i.message).join(', '));
    }

    const changedBy = getRequesterEmail(req);
    const ticket = await svc.updateTicket(id, body.data, changedBy);
    if (!ticket) return sendError(reply, 404, 'Ticket no encontrado');
    return sendOK(reply, ticket);
  });

  // ── DELETE /tickets/:id ────────────────────────────────────────
  fastify.delete('/tickets/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const deleted = await svc.deleteTicket(id);
    if (!deleted) return sendError(reply, 404, 'Ticket no encontrado');
    return sendOK(reply, { deleted: id });
  });

  // ── POST /tickets/:id/comments ─────────────────────────────────
  fastify.post('/tickets/:id/comments', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = AddCommentSchema.safeParse(req.body);
    if (!body.success) {
      return sendError(reply, 400, body.error.issues[0].message);
    }

    const author = getRequesterEmail(req);
    try {
      const ticket = await svc.addComment(id, author, body.data.content);
      if (!ticket) return sendError(reply, 404, 'Ticket no encontrado');
      return sendCreated(reply, ticket);
    } catch (err: unknown) {
      return sendError(reply, 400, err instanceof Error ? err.message : 'Error al agregar comentario');
    }
  });
}
