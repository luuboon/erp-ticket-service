import 'dotenv/config';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { config } from './config/env.js';
import { PgTicketRepository } from './infrastructure/postgres/pg-ticket.repository.js';
import { TicketService } from './application/ticket.service.js';
import { ticketRoutes } from './infrastructure/http/ticket.routes.js';
import { sendError } from './dto/response.js';

async function main() {
  // ── Conexión a PostgreSQL ──────────────────────────────────────
  const pool = new Pool({
    connectionString: config.databaseURL,
    ssl: { rejectUnauthorized: false }, // requerido por Neon
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  // Verificar conexión
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conectado a PostgreSQL (Neon)');
  } catch (err) {
    console.error('❌ BD no responde:', err);
    process.exit(1);
  }

  // ── Wiring ────────────────────────────────────────────────────
  const repo    = new PgTicketRepository(pool);
  const service = new TicketService(repo);

  // ── Fastify ───────────────────────────────────────────────────
  const fastify = Fastify({
    logger: config.isDev
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : true,
  });

  // Healthcheck
  fastify.get('/health', async () => ({
    statusCode: 200,
    intOpCode:  'SxTS200',
    data:       [{ status: 'ok', service: 'ticket-service' }],
  }));

  // Rutas de tickets
  await ticketRoutes(fastify, service);

  // Error handler global
  fastify.setErrorHandler((error, _req, reply) => {
    fastify.log.error(error);
    sendError(reply, error.statusCode ?? 500, config.isDev ? error.message : 'Error interno');
  });

  // ── Arrancar servidor ─────────────────────────────────────────
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Ticket Service escuchando en http://0.0.0.0:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT',  () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main();
