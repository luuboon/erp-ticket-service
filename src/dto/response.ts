import { FastifyReply } from 'fastify';

// Prefijo TS = Ticket Service
const PREFIX = 'SxTS';

export function sendOK<T>(reply: FastifyReply, ...data: T[]) {
  return reply.status(200).send({
    statusCode: 200,
    intOpCode:  `${PREFIX}200`,
    data,
  });
}

export function sendCreated<T>(reply: FastifyReply, ...data: T[]) {
  return reply.status(201).send({
    statusCode: 201,
    intOpCode:  `${PREFIX}201`,
    data,
  });
}

export function sendError(reply: FastifyReply, statusCode: number, message: string) {
  return reply.status(statusCode).send({
    statusCode,
    intOpCode:  `${PREFIX}${statusCode}`,
    data:       [],
    message,
  });
}
