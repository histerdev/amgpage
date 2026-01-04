import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// 1. INICIALIZACIÓN
const mp = new MercadoPagoConfig({ accessToken: import.meta.env.MP_ACCESS_TOKEN });

const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY 
);

// Definimos interfaces para que TypeScript esté tranquilo
interface CartItem {
    id: string;
    name: string;
    quality: string;
    size: string;
    quantity: number;
    image: string;
}

interface DBProduct {
    id: string;
    name: string;
    price_pk: number;
    price_g5: number;
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { items: cartItems, customer } = body as { items: CartItem[], customer: any };

        if (!cartItems || cartItems.length === 0) {
            return new Response(JSON.stringify({ error: "El carrito está vacío" }), { status: 400 });
        }

        // 2. OBTENER PRODUCTOS DE LA DB
        const productIds = cartItems.map((i) => i.id);
        const productNames = cartItems.map((i) => i.name);
        
        const { data: dbProducts, error: dbError } = await supabaseAdmin
            .from('products')
            .select('id, name, price_pk, price_g5')
            .or(`id.in.(${productIds.join(',')}),name.in.("${productNames.join('","')}")`);

        if (dbError || !dbProducts) {
            console.error("Error Supabase:", dbError);
            throw new Error("No se pudo conectar con la base de datos de productos");
        }

        const typedDbProducts = dbProducts as DBProduct[];

        // 3. VALIDACIÓN Y MAPEADO DE ITEMS
        const validatedItems = cartItems.map((cartItem) => {
            const dbProduct = typedDbProducts.find((p) => 
                p.id.toLowerCase() === cartItem.id?.toLowerCase() || 
                p.name.toLowerCase() === cartItem.name?.toLowerCase()
            );
            
            if (!dbProduct) {
                throw new Error(`Producto no disponible en catálogo: ${cartItem.name}`);
            }

            const isG5 = cartItem.quality === 'G5';
            const finalPrice = isG5 ? dbProduct.price_g5 : dbProduct.price_pk;

            return {
                id: dbProduct.id,
                title: `${dbProduct.name} (${cartItem.quality})`,
                description: `Talla: ${cartItem.size} - Calidad: ${cartItem.quality}`,
                picture_url: cartItem.image,
                quantity: Number(cartItem.quantity),
                unit_price: Number(finalPrice),
                currency_id: 'CLP'
            };
        });

        // 4. CÁLCULO DE TOTAL (Aquí corregimos los errores de 'acc' e 'item')
        const totalAmount = validatedItems.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
        
        const newOrderId = crypto.randomUUID();

        // Guardar Orden Principal
        const { error: orderError } = await supabaseAdmin.from('orders').insert({
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
            status: 'Pendiente'
        });

        if (orderError) throw new Error("Error al registrar orden: " + orderError.message);

        // Guardar Detalles (Aquí corregimos el error del segundo 'item')
        const itemsToInsert = validatedItems.map((item: any) => ({
            order_id: newOrderId,
            product_name: item.title,
            price: item.unit_price,
            size: cartItems.find((ci) => item.title.startsWith(ci.name))?.size || 'N/A',
            quality: item.title.includes('G5') ? 'G5' : 'PK',
            image_url: item.picture_url
        }));

        await supabaseAdmin.from('order_items').insert(itemsToInsert);

        // 5. CREAR PREFERENCIA MP
        const preference = await new Preference(mp).create({
            body: {
                items: validatedItems,
                external_reference: newOrderId,
                payer: {
                    email: customer.email,
                    name: customer.firstName,
                    surname: customer.lastName
                },
                notification_url: "https://amgpage.vercel.app/api/webhook",
                back_urls: {
                    success: "https://amgpage.vercel.app/pago-exitoso",
                    failure: "https://amgpage.vercel.app/checkout?status=failure"
                },
                auto_return: "approved",
                statement_descriptor: "AMG SNEAKERS"
            }
        });

        return new Response(JSON.stringify({ init_point: preference.init_point }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("❌ Pago Fallido:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};