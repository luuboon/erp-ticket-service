import { z } from 'zod';

const EnvSchema = z.object({
  PORT:           z.coerce.number().default(3003),
  NODE_ENV:       z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL:   z.string().min(1, 'DATABASE_URL es requerido'),
  GATEWAY_SECRET: z.string().min(8, 'GATEWAY_SECRET debe tener al menos 8 caracteres'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:\n', parsed.error.format());
  process.exit(1);
}

export const config = {
  port:          parsed.data.PORT,
  isDev:         parsed.data.NODE_ENV === 'development',
  databaseURL:   parsed.data.DATABASE_URL,
  gatewaySecret: parsed.data.GATEWAY_SECRET,
} as const;
