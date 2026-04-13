-- Migration: 001_create_tickets.sql
-- Ejecutar en Neon con la base de datos erp_tickets seleccionada

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla principal de tickets
CREATE TABLE IF NOT EXISTS tickets (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    status      VARCHAR(50)  NOT NULL DEFAULT 'Pendiente',
    assigned_to VARCHAR(255) NOT NULL DEFAULT '',
    created_by  VARCHAR(255) NOT NULL,
    priority    VARCHAR(50)  NOT NULL DEFAULT 'Media',
    due_date    TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    group_id    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Comentarios de tickets
CREATE TABLE IF NOT EXISTS ticket_comments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author     VARCHAR(255) NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historial de cambios
CREATE TABLE IF NOT EXISTS ticket_history (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    field      VARCHAR(100) NOT NULL,
    old_value  TEXT         NOT NULL DEFAULT '',
    new_value  TEXT         NOT NULL DEFAULT '',
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_group_id   ON tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status      ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id  ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_history_ticket_id   ON ticket_history(ticket_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
