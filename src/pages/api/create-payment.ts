import type { APIRoute } from "astro";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import {
  checkoutPayloadSchema,
  type CheckoutPayload,
} from "../../utils/validation";
import {
  checkRateLimitByIP,
  checkRateLimitByEmail,
  logFailedAttempt,
} from "../../lib/rateLimit";

export const prerender = false; // ← FIX 1: Obligatorio para endpoints API en output: 'static'

const mp = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN!,
});

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface DBProduct {
  id: string;
  name: string;
  price_pk: number;
  price_g5: number;
}

interface ValidatedItem {
  id: string;
  title: string;
  description: string;
  picture_url: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 0️⃣ OBTENER IP DEL CLIENTE
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") ||
      "unknown";

    // 1️⃣ VALIDAR MÉTODO
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método no permitido" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2️⃣ PARSEAR BODY
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("JSON parse error:", e);
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3️⃣ VALIDAR CON ZOD
    let validatedPayload: CheckoutPayload;
    try {
      validatedPayload = checkoutPayloadSchema.parse(body);
    } catch (zodError: unknown) {
      let errorMessage = "Error de validación";

      const err = zodError as { issues?: { path?: string[]; message: string }[] };
      if (err.issues && err.issues.length > 0) {
        const issue = err.issues[0];
        const path = issue.path?.join(".") || "campo desconocido";
        errorMessage = `${path}: ${issue.message}`;
      }

      console.warn(`[Validation Error] ${errorMessage}`);

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { items: cartItems, customer } = validatedPayload;

    // 4️⃣ APLICAR RATE LIMITING
    // FIX 2: await — ahora son async porque consultan Supabase

    // Rate limit por IP
    const ipLimit = await checkRateLimitByIP(ip);
    if (!ipLimit.success) {
      console.warn(`⚠️ Rate limit por IP excedido: ${ip}`);
      await logFailedAttempt(ip, customer.email, "IP rate limit exceeded");

      return new Response(
        JSON.stringify({
          error: ipLimit.message,
          retryAfter: ipLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(ipLimit.retryAfter),
          },
        },
      );
    }

    // Rate limit por Email
    const emailLimit = await checkRateLimitByEmail(customer.email);
    if (!emailLimit.success) {
      console.warn(`⚠️ Rate limit por email excedido: ${customer.email}`);
      await logFailedAttempt(ip, customer.email, "Email rate limit exceeded"); // ← FIX 3: await añadido

      return new Response(
        JSON.stringify({
          error: emailLimit.message,
          retryAfter: emailLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(emailLimit.retryAfter),
          },
        },
      );
    }

    // 5️⃣ EXTRAER EL ID DEL PRODUCTO (sin talla ni calidad)
    const productIds = cartItems.map((cartItem) => {
      let productId = cartItem.productId || cartItem.name;
      productId = productId.replace(/-(?:PK|G5|G4|G3)-\d+$/, "");
      return productId;
    });

    // 6️⃣ BUSCAR EN BD
    const { data: dbProducts, error: dbError } = await supabaseAdmin
      .from("products")
      .select("id, name, price_pk, price_g5")
      .in("id", productIds);

    if (dbError) {
      console.error("DB Error:", dbError.message);
      return new Response(
        JSON.stringify({ error: "Error consultando productos en BD" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!dbProducts || dbProducts.length === 0) {
      console.error("❌ No se encontraron productos");
      return new Response(
        JSON.stringify({
          error: `Productos no encontrados en BD. Buscados: ${productIds.join(", ")}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const typedDbProducts = dbProducts as DBProduct[];

    // 7️⃣ VALIDAR Y MAPEAR ITEMS
    const validatedItems: ValidatedItem[] = cartItems.map((cartItem) => {
      let productIdToSearch = cartItem.name;

      if (cartItem.productId) {
        productIdToSearch = cartItem.productId.replace(
          /-(?:PK|G5|G4|G3)-\d+$/,
          "",
        );
      }

      const dbProduct = typedDbProducts.find(
        (p) => p.id.toLowerCase() === productIdToSearch.toLowerCase(),
      );

      if (!dbProduct) {
        throw new Error(`Producto no encontrado en BD: ${productIdToSearch}`);
      }

      const isG5 = cartItem.quality === "G5";
      const finalPrice = isG5 ? dbProduct.price_g5 : dbProduct.price_pk;

      return {
        id: dbProduct.id,
        title: `${dbProduct.name} (${cartItem.quality})`,
        description: `Talla: ${cartItem.size} - Calidad: ${cartItem.quality}`,
        picture_url: cartItem.image || "",
        quantity: cartItem.quantity,
        unit_price: Number(finalPrice),
        currency_id: "CLP",
      };
    });

    // 8️⃣ CALCULAR TOTAL
    const totalAmount = validatedItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    const newOrderId = crypto.randomUUID();

    // 9️⃣ GUARDAR ORDEN EN BD
    const { error: orderError } = await supabaseAdmin.from("orders").insert({
      id: newOrderId,
      user_id: customer.userId || null,
      customer_name: `${customer.firstName} ${customer.lastName}`.toUpperCase(),
      email: customer.email,
      phone: customer.phone,
      rut: customer.rut,
      address: customer.address,
      city: customer.city,
      region: customer.region,
      total_price: totalAmount,
      status: "Pendiente",
    });

    if (orderError) {
      console.error("Order Insert Error:", orderError.message);
      return new Response(
        JSON.stringify({ error: "Error guardando orden en BD" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 🔟 GUARDAR ITEMS
    const itemsToInsert = validatedItems.map((item, idx) => {
      const originalItem = cartItems[idx];
      return {
        order_id: newOrderId,
        product_name: item.title,
        price: item.unit_price,
        quantity: item.quantity,
        size: originalItem.size,
        quality: originalItem.quality,
        image_url: item.picture_url,
      };
    });

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert);

    // FIX 4: itemsError ya no se ignora — si falla, rollback de la orden
    if (itemsError) {
      console.error("Items Insert Error:", itemsError.message);
      // Borrar la orden huérfana para no dejar basura en BD
      await supabaseAdmin.from("orders").delete().eq("id", newOrderId);
      return new Response(
        JSON.stringify({ error: "Error guardando items en BD" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 1️⃣1️⃣ CREAR PREFERENCIA EN MERCADO PAGO
    const preference = await new Preference(mp).create({
      body: {
        items: validatedItems,
        external_reference: newOrderId,
        payer: {
          email: customer.email,
          name: customer.firstName,
          surname: customer.lastName,
        },
        notification_url: `${import.meta.env.PUBLIC_SITE_URL}/api/webhook`,
        back_urls: {
          success: `${import.meta.env.PUBLIC_SITE_URL}/pago-exitoso`,
          failure: `${import.meta.env.PUBLIC_SITE_URL}/pago-error?error=payment_failed`,
        },
        auto_return: "approved",
        statement_descriptor: "AMG SNEAKERS",
      },
    });

    if (!preference.init_point) {
      // FIX 5: Si MP falla después de crear la orden, limpiar
      await supabaseAdmin.from("order_items").delete().eq("order_id", newOrderId);
      await supabaseAdmin.from("orders").delete().eq("id", newOrderId);
      throw new Error("No se pudo generar init_point de MP");
    }

    return new Response(JSON.stringify({ init_point: preference.init_point }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // FIX 6: error tipado como unknown en vez de any
    const message = error instanceof Error ? error.message : "Error desconocido";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("❌ Error en create-payment:", message);
    if (stack) console.error("Stack:", stack);

    return new Response(
      JSON.stringify({ error: message || "Error procesando pago" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};