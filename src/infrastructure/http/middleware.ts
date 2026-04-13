import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config/env.js';
import { sendError } from '../../dto/response.js';

// Verifica que el request viene del Gateway
export async function gatewayOnly(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // En desarrollo sin secret configurado, dejar pasar
  if (!config.gatewaySecret) return;

  const incoming = request.headers['x-gateway-secret'];
  if (incoming !== config.gatewaySecret) {
    sendError(reply, 403, 'Acceso denegado: solo el Gateway puede llamar este servicio');
  }
}

// Obtiene el ID del usuario desde el header inyectado por el Gateway
export function getRequesterID(request: FastifyRequest): string {
  return (request.headers['x-user-id'] as string) ?? '';
}

// Obtiene el email/nombre del usuario para el historial de cambios
export function getRequesterEmail(request: FastifyRequest): string {
  return (request.headers['x-user-email'] as string) ?? 'Unknown';
}
