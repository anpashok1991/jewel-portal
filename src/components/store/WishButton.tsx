"use client";

import { toggleWishlist } from "@/actions/wishlist";

export default function WishButton({ productId, slug, active }: { productId: string; slug: string; active: boolean }) {
  return (
    <form action={toggleWishlist}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
        className="h-9 w-9 grid place-items-center rounded-full shadow transition-transform hover:scale-110 active:scale-95"
        style={{ background: "var(--c-surface)", color: active ? "var(--c-danger)" : "var(--c-muted)", fontSize: "1.1rem" }}
      >
        {active ? "♥" : "♡"}
      </button>
    </form>
  );
}
