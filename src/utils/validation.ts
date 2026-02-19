import { z } from "zod";

/**
 * ✅ VALIDADORES COMPARTIDOS
 * Se reutilizan en múltiples endpoints
 */

// ── VALIDADORES BÁSICOS ────────────────────────────────────────
export const emailSchema = z
  .string()
  .min(1, "Email requerido")
  .email("Email inválido")
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Contraseña mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
  .regex(/[0-9]/, "Debe tener al menos un número");

// ── VALIDAR RUT CHILENO ────────────────────────────────────────
function validateChileRUT(rut: string): string {
  const rutRegex = /^(\d{7,8})-([0-9K])$/i;
  const match = rut.toUpperCase().match(rutRegex);

  if (!match) {
    throw new Error("RUT debe tener formato: 12345678-K");
  }

  const [, num, dv] = match;
  const numArray = num.split("").reverse();
  let sum = 0;
  let multiplier = 2;

  for (const digit of numArray) {
    sum += parseInt(digit) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDV = (11 - (sum % 11)).toString();
  const expected =
    expectedDV === "11" ? "0" : expectedDV === "10" ? "K" : expectedDV;

  if (dv !== expected) {
    throw new Error("RUT inválido (verificador incorrecto)");
  }

  return rut.toUpperCase();
}

export const rutSchema = z
  .string()
  .min(1, "RUT requerido")
  .transform((val) => val.replace(/\./g, "").toUpperCase())
  .refine(
    (val) => /^(\d{7,8})-([0-9K])$/i.test(val),
    "RUT debe tener formato: 12345678-K",
  )
  .transform(validateChileRUT);

// ── TELÉFONO CHILENO ────────────────────────────────────────────
export const phoneSchema = z
  .string()
  .min(1, "Teléfono requerido")
  .regex(/^(\+56|0)?9\d{8}$/, "Teléfono debe ser: +56912345678 o 912345678")
  .transform((val) => {
    const clean = val.replace(/\D/g, "");
    if (clean.startsWith("56")) return `+${clean}`;
    if (clean.startsWith("9")) return `+56${clean}`;
    if (clean.startsWith("09")) return `+56${clean.slice(1)}`;
    return `+56${clean}`;
  });

// ── CLIENTE (CHECKOUT) ──────────────────────────────────────────
export const checkoutCustomerSchema = z.object({
  firstName: z
    .string()
    .min(2, "Nombre mínimo 2 caracteres")
    .max(50, "Nombre máximo 50 caracteres")
    .regex(/^[a-záéíóúñ\s]+$/i, "Solo letras permitidas"),

  lastName: z
    .string()
    .min(2, "Apellido mínimo 2 caracteres")
    .max(50, "Apellido máximo 50 caracteres")
    .regex(/^[a-záéíóúñ\s]+$/i, "Solo letras permitidas"),

  email: emailSchema.max(100),

  rut: rutSchema,

  phone: phoneSchema,

  region: z.string().min(1, "Región requerida").max(100),

  city: z.string().min(1, "Ciudad requerida").max(100),

  address: z
    .string()
    .min(5, "Dirección mínimo 5 caracteres")
    .max(255, "Dirección máximo 255 caracteres"),

  userId: z.string().uuid().optional().nullable(),
});

// ── ITEM DEL CARRITO ────────────────────────────────────────────
export const cartItemSchema = z.object({
  productId: z // ✅ AGREGAR ESTO
    .string()
    .optional(),
  id: z
    .string()
    .min(1, "ID de producto requerido")
    .uuid("ID de producto inválido"),

  name: z.string().min(1, "Nombre de producto requerido").max(255),

  quality: z.string().refine((val) => ["PK", "G5", "G4", "G3"].includes(val), {
    message: "Calidad debe ser: PK, G5, G4 o G3",
  }),

  size: z.string().min(1, "Talla requerida").max(10),

  quantity: z
    .number()
    .int("Cantidad debe ser número entero")
    .min(1, "Cantidad mínimo 1")
    .max(10, "Cantidad máximo 10 por orden"),

  price: z
    .number()
    .positive("Precio debe ser positivo")
    .max(9999999, "Precio demasiado alto"),

  image: z.string().url("Imagen debe ser URL válida").max(500).optional(),
});

// ── PAYLOAD COMPLETO DEL CHECKOUT ──────────────────────────────
export const checkoutPayloadSchema = z.object({
  items: z
    .array(cartItemSchema)
    .min(1, "Carrito vacío")
    .max(50, "Máximo 50 items por orden"),

  customer: checkoutCustomerSchema,
});

// ── LOGIN ──────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Contraseña requerida"),
});

// ── REGISTRO ───────────────────────────────────────────────────
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .min(2, "Nombre mínimo 2 caracteres")
    .regex(/^[a-záéíóúñ\s]+$/i, "Solo letras permitidas"),
  lastName: z
    .string()
    .min(2, "Apellido mínimo 2 caracteres")
    .regex(/^[a-záéíóúñ\s]+$/i, "Solo letras permitidas"),
});

// ── TIPOS EXPORTADOS (para TypeScript) ─────────────────────────
export type CheckoutCustomer = z.infer<typeof checkoutCustomerSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
