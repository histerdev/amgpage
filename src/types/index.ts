/**
 * ✅ TIPOS COMPARTIDOS PARA TODO EL PROYECTO
 * Centro único de verdad para estructuras de datos
 */

// ── PRODUCTO ────────────────────────────────────────
// ── PRODUCTO ────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  prices: {
    PK: number;
    G5: number;
  };
  image: string | string[]; // string[] para álbum, string para imagen única
  tallas: string[];
  tags: string[];
  // Campos opcionales para futuro
  description?: string;
  category?: string;
  availability?: "available" | "low_stock" | "out_of_stock";
  stock?: Record<string, Record<string, number>>;
}

// ── CARRITO ────────────────────────────────────────
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  quality: "PK" | "G5" | "G4" | "G3";
  image: string;
}

export interface Cart {
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
}

// ── CLIENTE ────────────────────────────────────────
export interface Customer {
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone: string;
  region: string;
  city: string;
  address: string;
}

// ── ORDEN ────────────────────────────────────────
export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  size: string;
  quality: string;
  image_url: string;
  qc_images?: string[];
  item_notes?: string;
}

export interface Order {
  id: string;
  user_id: string;
  customer_name: string;
  email: string;
  rut: string;
  phone: string;
  region: string;
  city: string;
  address: string;
  total_price: number;
  status: "Pendiente" | "Completado" | "Cancelado" | "Enviado";
  client_decision?: string;
  mp_payment_id?: string;
  order_items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// ── NOTIFICACIÓN ────────────────────────────────────
export interface Notification {
  id: string;
  order_id: string;
  notification_type:
    | "order_created"
    | "payment_confirmed"
    | "qc_ready"
    | "order_shipped";
  status: "pending" | "sent" | "failed" | "retrying";
  channel: "telegram" | "email";
  recipient: string;
  message?: string;
  error_message?: string;
  retry_count: number;
  sent_at?: string;
  created_at: string;
}

export interface NotificationPayload {
  orderId: string;
  type: "order_created" | "payment_confirmed" | "qc_ready" | "order_shipped";
  recipient: {
    email: string;
    telegramId?: string;
    customerName: string;
  };
  data: {
    orderNumber: string;
    totalPrice?: number;
    productNames?: string[];
    message?: string;
  };
}

// ── PERFIL DE USUARIO ────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  telegram_id?: string;
  created_at: string;
  updated_at: string;
}

// ── RESPUESTA DE API ────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── PAGO (MERCADO PAGO) ────────────────────────────
export interface PaymentData {
  id: string;
  status:
    | "pending"
    | "approved"
    | "authorized"
    | "in_process"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  external_reference: string;
  transaction_amount: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

// ── RATE LIMIT ────────────────────────────────────
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter?: number;
  message?: string;
}
