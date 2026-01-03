import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';
import { sendAdminNotification } from '../../lib/notifications';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (id) {
        processPayment(id).catch(console.error);
    }

    return new Response(null, { status: 200 });
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;

            // 1. Obtener datos de la orden y cliente
            const { data: order } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (!order || order.status === 'PAGADO') return;

            // 2. Actualizar a PAGADO
            await supabase
                .from('orders')
                .update({ status: 'PAGADO', payment_id: paymentId })
                .eq('id', orderId);

            // 3. Obtener todos los productos (Zapatillas, Tallas, Calidad)
            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            const itemsHtml = items?.map(i => 
                `👟 <b>${i.product_name}</b>\n   ├ Talla: ${i.size}\n   ├ Calidad: ${i.quality}\n   └ Precio: $${Number(i.price).toLocaleString('es-CL')}`
            ).join('\n\n') || "⚠️ No hay detalles de productos";

            // 4. Construir Mensaje Profesional
            const mensaje = `
🚨 <b>VENTA CONFIRMADA - AMG SHOES</b> 🚨
➖➖➖➖➖➖➖➖➖➖➖
💰 <b>Total Pagado:</b> $${new Intl.NumberFormat('es-CL').format(payment.transaction_amount || 0)}
🆔 <b>Orden ID:</b> <code>${orderId}</code>
💳 <b>Pago ID:</b> <code>${paymentId}</code>

📦 <b>DETALLE DEL PEDIDO:</b>
${itemsHtml}

👤 <b>DATOS DEL CLIENTE:</b>
• Nombre: ${order.customer_name}
• Email: ${order.email}
• Teléfono: ${order.phone || 'No indicado'}

✈️ <b>INFORMACIÓN ADUANERA:</b>
• Declaración: Calzado Deportivo / Gift
• Origen: International Shipping (QC Required)
• Estado: 🟡 <b>Esperando preparación de QC</b>
➖➖➖➖➖➖➖➖➖➖➖
<i>Sistema de Notificaciones Vercel-Bot</i>`;

            await sendAdminNotification(mensaje);
        }
    } catch (error) {
        console.error("❌ Error procesando el pago:", error);
    }
}