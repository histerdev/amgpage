import { atom } from "nanostores";
import { supabase } from "../lib/supabase";

// ✅ TIPOS DEFINIDOS
interface CartItem {
  id: string;
  productId: string;
  name: string;
  product_name: string;
  price: number;
  image: string;
  image_url: string;
  size: string;
  quality: string;
  quantity: number;
}

const isBrowser = typeof window !== "undefined";

const getInitialCart = (): CartItem[] => {
  if (!isBrowser) return [];
  try {
    const savedCart = localStorage.getItem("amg-cart");
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (e) {
    console.error("Error parsing cart from localStorage:", e);
    return [];
  }
};

export const cartItems = atom<CartItem[]>(getInitialCart());
export const isCartOpen = atom<boolean>(false);

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
    const normalizedData: CartItem[] = data.map((item: any) => ({
      ...item,
      name: item.product_name,
      image: item.image_url,
      productId: item.product_id,
    }));
    cartItems.set(normalizedData);
  }
}

export async function addToCart(product: any): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const newItem: CartItem = {
    id: product.id,
    productId: product.productId || product.id,
    name: product.name || product.product_name,
    product_name: product.name || product.product_name,
    price: Number(product.price),
    image: product.image || product.image_url,
    image_url: product.image || product.image_url,
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
          product_id: newItem.productId,
          product_name: newItem.name,
          price: newItem.price,
          image_url: newItem.image,
          size: newItem.size,
          quality: newItem.quality,
          quantity: 1,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      const current = cartItems.get();
      cartItems.set([
        ...current,
        {
          ...data,
          name: data.product_name,
          image: data.image_url,
          productId: data.product_id,
        } as CartItem,
      ]);
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
