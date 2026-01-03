// src/store/cartStore.js
import { atom } from 'nanostores';
import { supabase } from '../lib/supabase';

// Inicialización segura para SSR (Astro) y persistencia en LocalStorage
const isBrowser = typeof window !== 'undefined';
const getInitialCart = () => {
    if (!isBrowser) return [];
    const savedCart = localStorage.getItem('amg-cart');
    return savedCart ? JSON.parse(savedCart) : [];
};

// Estados globales
export const cartItems = atom(getInitialCart());
export const isCartOpen = atom(false);

// Suscripción para persistir automáticamente cada cambio en LocalStorage
cartItems.subscribe((value) => {
    if (isBrowser) {
        localStorage.setItem('amg-cart', JSON.stringify(value));
    }
});

// Cargar carrito desde Supabase al iniciar sesión
export async function loadCartFromDB() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session.user.id);

    if (!error && data) {
        // Normalizamos los datos de la DB para que coincidan con los del Front
        const normalizedData = data.map(item => ({
            ...item,
            name: item.product_name,
            image: item.image_url
        }));
        cartItems.set(normalizedData);
    }
}

// Función para añadir productos
export async function addToCart(product) {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Objeto normalizado para evitar confusiones de nombres
    const newItem = {
        product_id: product.id || product.product_id,
        name: product.name || product.product_name,
        product_name: product.name || product.product_name, // Doble nombre por seguridad
        price: Number(product.price),
        image: product.image || product.image_url,
        image_url: product.image || product.image_url, // Doble imagen por seguridad
        size: product.size,
        quality: product.quality,
        quantity: 1
    };

    if (session) {
        // Si hay sesión, guardamos en Supabase
        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ 
                user_id: session.user.id,
                product_id: newItem.product_id,
                product_name: newItem.name,
                price: newItem.price,
                image_url: newItem.image,
                size: newItem.size,
                quality: newItem.quality,
                quantity: 1
            }])
            .select()
            .single();
        
        if (!error && data) {
            const current = cartItems.get();
            cartItems.set([...current, { ...data, name: data.product_name, image: data.image_url }]);
        }
    } else {
        // Si no hay sesión, solo local con ID temporal
        const current = cartItems.get();
        cartItems.set([...current, { ...newItem, id: crypto.randomUUID() }]);
    }
    
    // Abrir el carrito automáticamente al añadir
    isCartOpen.set(true);
}

// Función para eliminar productos
export async function removeFromCart(itemId) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Intentar eliminar por el ID de la fila en Supabase
        await supabase.from('cart_items').delete().eq('id', itemId);
    }
    
    const current = cartItems.get();
    // Filtramos tanto por id como por product_id para asegurar la limpieza
    const updated = current.filter(item => item.id !== itemId && item.product_id !== itemId);
    cartItems.set(updated);
}

// Función para limpiar el carrito (útil tras finalizar la compra)
export function clearCart() {
    cartItems.set([]);
    if (isBrowser) localStorage.removeItem('amg-cart');
}