import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// INICIALIZACIÓN DE CLIENTES
const mp = new MercadoPagoConfig({ accessToken: import.meta.env.MP_ACCESS_TOKEN });

// ⚠️ IMPORTANTE: Usa la SERVICE_ROLE_KEY para escribir en la DB sin restricciones de usuario (Guest Checkout)
const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY 
);

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { items: cartItems, customer } = body; // customer trae nombre, email, etc.

        if (!cartItems || cartItems.length === 0) {
            return new Response(JSON.stringify({ error: "El carrito está vacío" }), { status: 400 });
        }

        // 1. SEGURIDAD: RECALCULAR PRECIOS DESDE LA BASE DE DATOS
        // No confiamos en el precio que viene del frontend.
        const productIds = cartItems.map((i: any) => i.id);
        
        const { data: dbProducts, error: dbError } = await supabaseAdmin
            .from('products') // Asegúrate de tener esta tabla con precios reales
            .select('id, price, name')
            .in('id', productIds);

        if (dbError || !dbProducts) {
            throw new Error("Error verificando precios de productos");
        }

        // Mapeamos los items para Mercado Pago con el precio REAL de la DB
        const validatedItems = cartItems.map((cartItem: any) => {
            const dbProduct = dbProducts.find((p) => p.id === cartItem.id);
            if (!dbProduct) throw new Error(`Producto no disponible: ${cartItem.name}`);

            return {
                id: dbProduct.id,
                title: dbProduct.name,
                description: `Talla: ${cartItem.size} - ${cartItem.quality}`,
                picture_url: cartItem.image,
                quantity: Number(cartItem.quantity),
                unit_price: Number(dbProduct.price), // 🛡️ PRECIO BLINDADO
                currency_id: 'CLP'
            };
        });

        // Calcular total real
        const totalAmount = validatedItems.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);

        // 2. CREAR LA ORDEN EN SUPABASE (Backend)
        // Generamos el ID aquí para pasárselo a MercadoPago
        const newOrderId = crypto.randomUUID();

        // A. Insertar Cabecera
        const { error: orderError } = await supabaseAdmin.from('orders').insert({
            id: newOrderId,
            user_id: customer.userId || null, // Puede ser null si es invitado
            customer_name: `${customer.firstName} ${customer.lastName}`.toUpperCase(),
            email: customer.email,
            phone: customer.phone,
            rut: customer.rut,
            address: customer.address,
            city: customer.city,
            region: customer.region,
            total_price: totalAmount,
            status: 'Pendiente' // Estado inicial
        });

        if (orderError) throw new Error("Error creando la orden: " + orderError.message);

        // B. Insertar Items
        const itemsToInsert = cartItems.map((item: any) => ({
            order_id: newOrderId,
            product_name: item.name,
            price: dbProducts.find(p => p.id === item.id)?.price || 0, // Precio real
            size: item.size,
            quality: item.quality,
            image_url: item.image
        }));

        const { error: itemsError } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
        if (itemsError) console.error("⚠️ Alerta: Error guardando items", itemsError);

        // 3. CREAR PREFERENCIA MERCADO PAGO
        const preference = await new Preference(mp).create({
            body: {
                items: validatedItems,
                external_reference: newOrderId, // 🔗 El vínculo sagrado entre MP y tu DB
                payer: {
                    email: customer.email,
                    name: customer.firstName,
                    surname: customer.lastName
                },
                payment_methods: {
                    installments: 6 // Opcional: limitar cuotas
                },
                notification_url: "https://amgpage.vercel.app/api/webhook", // TU URL DE PRODUCCIÓN
                back_urls: {
                    success: "https://amgpage.vercel.app/pago-exitoso",
                    failure: "https://amgpage.vercel.app/checkout?status=failure",
                    pending: "https://amgpage.vercel.app/checkout?status=pending"
                },
                auto_return: "approved",
                statement_descriptor: "AMG SHOES"
            }
        });

        return new Response(JSON.stringify({ init_point: preference.init_point }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("❌ Error Checkout:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};