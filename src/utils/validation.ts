// src/utils/validation.ts
// Esquemas de validación con Zod para todos los formularios
// SETUP: npm install zod

import { z } from 'zod';

// ── Checkout ─────────────────────────────────────────────────────────────────
export const checkoutSchema = z.object({
  primer_nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'Nombre demasiado largo')
    .regex(/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/, 'Solo letras y espacios'),

  apellido: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'Apellido demasiado largo')
    .regex(/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/, 'Solo letras y espacios'),

  email: z
    .string()
    .email('Email inválido')
    .max(254, 'Email demasiado largo')
    .toLowerCase(),

  telefono: z
    .string()
    .regex(/^(\+?56)?[0-9]{8,9}$/, 'Teléfono chileno inválido (ej: 912345678)')
    .optional()
    .or(z.literal('')),

  region: z
    .string()
    .min(1, 'Selecciona una región'),

  ciudad: z
    .string()
    .min(2, 'Ciudad inválida')
    .max(100, 'Ciudad demasiado larga'),

  direccion: z
    .string()
    .min(5, 'Dirección muy corta')
    .max(200, 'Dirección demasiado larga'),

  notas: z
    .string()
    .max(500, 'Notas demasiado largas')
    .optional()
    .or(z.literal('')),
});

export type CheckoutData = z.infer<typeof checkoutSchema>;

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase(),

  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'Contraseña demasiado larga'),
});

// ── Producto (Admin) ─────────────────────────────────────────────────────────
export const productSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(10_000_000),
  stock: z.number().int().min(0),
  image_url: z.string().url('URL de imagen inválida').optional(),
});

// ── Helper: validar y retornar errores formateados ───────────────────────────
export function validate<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> }
{
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const key = issue.path.join('.');
    errors[key] = issue.message;
  });

  return { success: false, errors };
}