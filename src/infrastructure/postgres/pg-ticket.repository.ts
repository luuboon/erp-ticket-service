import { Pool } from 'pg';
import { TicketRepository } from '../../domain/ticket.repository.js';
import {
  Ticket, TicketStatus, TicketPriority,
  TicketComment, TicketHistoryEntry,
  CreateTicketInput, UpdateTicketInput,
} from '../../domain/ticket.model.js';

// Implementación PostgreSQL del TicketRepository.
// Usa el paquete `pg` (node-postgres) — más simple que pgx para TS.
//
// Los tickets tienen dos arrays relacionados (comments e history)
// que se guardan en tablas separadas y se unen en las queries.
export class PgTicketRepository extends TicketRepository {
  constructor(private pool: Pool) { super(); }

  // ── getAll ─────────────────────────────────────────────────────
  async getAll(groupId?: string): Promise<Ticket[]> {
    const query = groupId
      ? `SELECT * FROM tickets WHERE group_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM tickets ORDER BY created_at DESC`;
    const params = groupId ? [groupId] : [];

    const { rows } = await this.pool.query(query, params);
    return Promise.all(rows.map(r => this.hydrateTicket(r)));
  }

  // ── getById ────────────────────────────────────────────────────
  async getById(id: string): Promise<Ticket | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tickets WHERE id = $1`, [id]
    );
    if (!rows[0]) return undefined;
    return this.hydrateTicket(rows[0]);
  }

  // ── getByGroup ─────────────────────────────────────────────────
  async getByGroup(groupId: string): Promise<Ticket[]> {
    return this.getAll(groupId);
  }

  // ── getByAssignee ──────────────────────────────────────────────
  async getByAssignee(userId: string): Promise<Ticket[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tickets WHERE assigned_to = $1 ORDER BY created_at DESC`, [userId]
    );
    return Promise.all(rows.map(r => this.hydrateTicket(r)));
  }

  // ── create ─────────────────────────────────────────────────────
  async create(data: CreateTicketInput): Promise<Ticket> {
    const { rows } = await this.pool.query(`
      INSERT INTO tickets (title, description, status, assigned_to, created_by, priority, due_date, group_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.title, data.description, data.status,
      data.assignedTo, data.createdBy, data.priority,
      data.dueDate, data.groupId,
    ]);
    return this.hydrateTicket(rows[0]);
  }

  // ── update ─────────────────────────────────────────────────────
  // Actualiza los campos que lleguen y registra los cambios en el historial.
  async update(id: string, changes: UpdateTicketInput, changedBy: string): Promise<Ticket | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    // Construir query dinámica solo con los campos que cambian
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      title:       'title',
      description: 'description',
      status:      'status',
      assignedTo:  'assigned_to',
      priority:    'priority',
      dueDate:     'due_date',
      groupId:     'group_id',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (changes as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await this.pool.query(
        `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
      );
    }

    // Registrar historial de cambios
    for (const [key] of Object.entries(fieldMap)) {
      const newVal = (changes as Record<string, unknown>)[key];
      const oldVal = (existing as Record<string, unknown>)[key];
      if (newVal !== undefined && String(newVal) !== String(oldVal)) {
        await this.pool.query(`
          INSERT INTO ticket_history (ticket_id, field, old_value, new_value, changed_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, key, String(oldVal ?? ''), String(newVal), changedBy]);
      }
    }

    return this.getById(id);
  }

  // ── delete ─────────────────────────────────────────────────────
  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM tickets WHERE id = $1`, [id]
    );
    return (rowCount ?? 0) > 0;
  }

  // ── addComment ─────────────────────────────────────────────────
  async addComment(ticketId: string, author: string, content: string): Promise<Ticket | undefined> {
    const existing = await this.getById(ticketId);
    if (!existing) return undefined;

    await this.pool.query(`
      INSERT INTO ticket_comments (ticket_id, author, content)
      VALUES ($1, $2, $3)
    `, [ticketId, author, content]);

    return this.getById(ticketId);
  }

  // ── hydrateTicket ──────────────────────────────────────────────
  // Construye un Ticket completo desde una fila de BD
  // trayendo también sus comments e history.
  private async hydrateTicket(row: Record<string, unknown>): Promise<Ticket> {
    const [commentsRes, historyRes] = await Promise.all([
      this.pool.query(
        `SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [row['id']]
      ),
      this.pool.query(
        `SELECT * FROM ticket_history WHERE ticket_id = $1 ORDER BY changed_at ASC`,
        [row['id']]
      ),
    ]);

    const comments: TicketComment[] = commentsRes.rows.map(c => ({
      id:      c.id,
      author:  c.author,
      content: c.content,
      date:    new Date(c.created_at),
    }));

    const history: TicketHistoryEntry[] = historyRes.rows.map(h => ({
      id:        h.id,
      field:     h.field,
      oldValue:  h.old_value,
      newValue:  h.new_value,
      changedBy: h.changed_by,
      date:      new Date(h.changed_at),
    }));

    return {
      id:          row['id'] as string,
      title:       row['title'] as string,
      description: row['description'] as string,
      status:      row['status'] as TicketStatus,
      assignedTo:  row['assigned_to'] as string,
      createdBy:   row['created_by'] as string,
      priority:    row['priority'] as TicketPriority,
      createdAt:   new Date(row['created_at'] as string),
      dueDate:     new Date(row['due_date'] as string),
      groupId:     row['group_id'] as string,
      comments,
      history,
    };
  }
}
