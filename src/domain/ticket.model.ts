// Estos modelos son idénticos a los del frontend Angular.
// Si cambias uno, cambia el otro también.

export enum TicketStatus {
  Pendiente  = 'Pendiente',
  EnProgreso = 'En Progreso',
  Revision   = 'Revisión',
  Finalizado = 'Finalizado',
}

export enum TicketPriority {
  Baja    = 'Baja',
  Media   = 'Media',
  Alta    = 'Alta',
  Urgente = 'Urgente',
}

export interface TicketComment {
  id:      string;
  author:  string;
  content: string;
  date:    Date;
}

export interface TicketHistoryEntry {
  id:        string;
  field:     string;
  oldValue:  string;
  newValue:  string;
  changedBy: string;
  date:      Date;
}

export interface Ticket {
  id:          string;
  title:       string;
  description: string;
  status:      TicketStatus;
  assignedTo:  string;
  createdBy:   string;
  priority:    TicketPriority;
  createdAt:   Date;
  dueDate:     Date;
  comments:    TicketComment[];
  history:     TicketHistoryEntry[];
  groupId:     string;
}

// Input para crear un ticket — sin campos autogenerados
export type CreateTicketInput = Omit<Ticket, 'id' | 'createdAt' | 'comments' | 'history'>;

// Input para actualizar — todos opcionales excepto el changedBy para el historial
export type UpdateTicketInput = Partial<Omit<Ticket, 'id' | 'createdAt' | 'comments' | 'history'>>;
