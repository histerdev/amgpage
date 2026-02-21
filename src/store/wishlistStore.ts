import { atom } from "nanostores";
import { supabase } from "../lib/supabase";

export interface WishlistItem {
    id: string;       // product id (slug)
    name: string;
    image: string;
    pricePK: number;
    priceG5: number;
    savedAt: number;  // timestamp
}

const isBrowser = typeof window !== "undefined";

function getInitialWishlist(): WishlistItem[] {
    if (!isBrowser) return [];
    try {
        const saved = localStorage.getItem("amg-wishlist");
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

export const wishlist = atom<WishlistItem[]>(getInitialWishlist());

// Persist to localStorage on every change
wishlist.subscribe((value) => {
    if (isBrowser) {
        localStorage.setItem("amg-wishlist", JSON.stringify(value));
    }
});

/** Returns true if product is already in wishlist */
export function isWishlisted(productId: string): boolean {
    return wishlist.get().some((item) => item.id === productId);
}

/** Toggle: adds if absent, removes if present. Returns new state (true = added). */
export async function toggleWishlist(item: WishlistItem): Promise<boolean> {
    const current = wishlist.get();
    const exists = current.some((w) => w.id === item.id);

    if (exists) {
        // Remove
        wishlist.set(current.filter((w) => w.id !== item.id));

        // Sync to Supabase if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase
                .from("wishlists")
                .delete()
                .eq("user_id", session.user.id)
                .eq("product_id", item.id);
        }
        return false;
    } else {
        // Add
        const newItem = { ...item, savedAt: Date.now() };
        wishlist.set([...current, newItem]);

        // Sync to Supabase if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase.from("wishlists").upsert({
                user_id: session.user.id,
                product_id: item.id,
                product_name: item.name,
                image_url: item.image,
                price_pk: item.pricePK,
                price_g5: item.priceG5,
                saved_at: new Date(newItem.savedAt).toISOString(),
            }, { onConflict: "user_id,product_id" });
        }
        return true;
    }
}

/** Load wishlist from Supabase for logged-in users (merges with localStorage) */
export async function loadWishlistFromDB(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", session.user.id);

    if (!error && data) {
        const dbItems: WishlistItem[] = data.map((row: any) => ({
            id: row.product_id,
            name: row.product_name,
            image: row.image_url,
            pricePK: row.price_pk,
            priceG5: row.price_g5,
            savedAt: new Date(row.saved_at).getTime(),
        }));

        // Merge: DB wins for duplicates
        const local = wishlist.get();
        const merged = [
            ...dbItems,
            ...local.filter((l) => !dbItems.some((d) => d.id === l.id)),
        ];
        wishlist.set(merged);
    }
}
