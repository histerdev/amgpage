// src/store/cartStore.js
import { atom } from 'nanostores';
import { supabase } from '../lib/supabase';

const isBrowser = typeof window !== 'undefined';
const getInitialCart = () => {
    if (!isBrowser) return [];
    const savedCart = localStorage.getItem('amg-cart');
    return savedCart ? JSON.parse(savedCart) : [];
};

export const cartItems = atom(getInitialCart());
export const isCartOpen = atom(false);

cartItems.subscribe((value) => {
    if (isBrowser) {
        localStorage.setItem('amg-cart', JSON.stringify(value));
    }
});

export async function loadCartFromDB() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session.user.id);

    if (!error && data) {
        const normalizedData = data.map(item => ({
            ...item,
            name: item.product_name,
            image: item.image_url,
            productId: item.product_id  // ✅ Agregar productId en camelCase
        }));
        cartItems.set(normalizedData);
    }
}

export async function addToCart(product) {
    const { data: { session } } = await supabase.auth.getSession();
    
    // ✅ Objeto normalizado con productId (camelCase)
    const newItem = {
        id: product.id,  // ID único del carrito (UUID)
        productId: product.productId || product.id,  // ✅ ID del producto (jordan-6-retro-black-infrared)
        name: product.name || product.product_name,
        product_name: product.name || product.product_name,
        price: Number(product.price),
        image: product.image || product.image_url,
        image_url: product.image || product.image_url,
        size: product.size,
        quality: product.quality,
        quantity: 1
    };

    if (session) {
        // Guardar en Supabase
        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ 
                user_id: session.user.id,
                product_id: newItem.productId,  // ✅ Usar productId
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
            cartItems.set([...current, { 
                ...data, 
                name: data.product_name, 
                image: data.image_url,
                productId: data.product_id  // ✅ Agregar productId
            }]);
        }
    } else {
        // Solo local
        const current = cartItems.get();
        cartItems.set([...current, newItem]);
    }
    
    isCartOpen.set(true);
}

export async function removeFromCart(itemId) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        await supabase.from('cart_items').delete().eq('id', itemId);
    }
    
    const current = cartItems.get();
    const updated = current.filter(item => item.id !== itemId && item.product_id !== itemId);
    cartItems.set(updated);
}

export function clearCart() {
    cartItems.set([]);
    if (isBrowser) localStorage.removeItem('amg-cart');
}