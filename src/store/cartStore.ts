import { atom } from "nanostores";
import { supabase } from "../lib/supabase";
import type { CartItem } from "../types";

// Re-export para que otros archivos importen desde aquí
export type { CartItem };

/**
 * Shape de datos que vienen de Supabase (snake_case)
 * vs CartItem que usa camelCase
 */
interface DBCartItem {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  image_url: string;
  size: string;
  quality: string;
  quantity: number;
}

/**
 * Lo mínimo que necesita addToCart para funcionar.
 * Reemplaza el `any` anterior.
 */
interface AddToCartInput {
  id: string;
  productId?: string;
  name?: string;
  product_name?: string;
  price: number;
  image?: string;
  image_url?: string;
  size: string;
  quality: "PK" | "G5" | "G4" | "G3";
}

const isBrowser = typeof window !== "undefined";

function getInitialCart(): CartItem[] {
  if (!isBrowser) return [];
  try {
    const savedCart = localStorage.getItem("amg-cart");
    return savedCart ? JSON.parse(savedCart) : [];
  } catch {
    return [];
  }
}

/** Normaliza un item de la DB (snake_case) a CartItem (camelCase) */
function normalizeDBItem(item: DBCartItem): CartItem {
  return {
    id: item.id,
    productId: item.product_id,
    name: item.product_name,
    price: item.price,
    quantity: item.quantity,
    size: item.size,
    quality: item.quality as CartItem["quality"],
    image: item.image_url,
  };
}

export const cartItems = atom<CartItem[]>(getInitialCart());
export const isCartOpen = atom<boolean>(false);

// Persist to localStorage on every change
cartItems.subscribe((value) => {
  if (isBrowser) {
    localStorage.setItem("amg-cart", JSON.stringify(value));
  }
});

export async function loadCartFromDB(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", session.user.id);

  if (!error && data) {
    cartItems.set(data.map((item: DBCartItem) => normalizeDBItem(item)));
  }
}

export async function addToCart(product: AddToCartInput): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const name = product.name || product.product_name || "Producto";
  const image = product.image || product.image_url || "";
  const productId = product.productId || product.id;

  const newItem: CartItem = {
    id: product.id,
    productId,
    name,
    price: Number(product.price),
    image,
    size: product.size,
    quality: product.quality,
    quantity: 1,
  };

  if (session) {
    const { data, error } = await supabase
      .from("cart_items")
      .insert([
        {
          user_id: session.user.id,
          product_id: productId,
          product_name: name,
          price: newItem.price,
          image_url: image,
          size: newItem.size,
          quality: newItem.quality,
          quantity: 1,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      const current = cartItems.get();
      cartItems.set([...current, normalizeDBItem(data as DBCartItem)]);
    }
  } else {
    const current = cartItems.get();
    cartItems.set([...current, newItem]);
  }

  isCartOpen.set(true);
}

export async function removeFromCart(itemId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    await supabase.from("cart_items").delete().eq("id", itemId);
  }

  const current = cartItems.get();
  const updated = current.filter(
    (item) => item.id !== itemId && item.productId !== itemId,
  );
  cartItems.set(updated);
}

export function clearCart(): void {
  cartItems.set([]);
  if (isBrowser) localStorage.removeItem("amg-cart");
}