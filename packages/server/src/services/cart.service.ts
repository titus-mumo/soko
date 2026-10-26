import { getRepositories } from "../lib/repositories";

const {
  cartRepository,
  cartItemRepository,
  productVariantRepository,
  productRepository,
  sellerProfileRepository,
  stockRepository,
} = getRepositories();

/** Not enough unheld stock; `available` is what this shopper could have. */
export type InsufficientStock = {
  insufficientStock: true;
  available: number;
  inCart: number;
};

/** True if the variant belongs to a product listed by this user's own store. */
async function isOwnListing(
  userId: string,
  productId: string,
): Promise<boolean> {
  const store = await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (store === "seller_not_found") return false;
  const product = await productRepository.findProductById(productId);
  return product !== "product_not_found" && product.sellerId === store.id;
}

// ─────────────────────────────────────────
// Cart
// ─────────────────────────────────────────

// Finds or creates a cart for the user.
// Always call this before any cart item operations.
export async function getOrCreateCart(userId: string) {
  return await cartRepository.findOrCreateCart(userId);
}

export async function getCart(userId: string) {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found" as const;
  return cart;
}

// ─────────────────────────────────────────
// Cart Items
// ─────────────────────────────────────────

/**
 * The shopper's cart lines, each with what's available to them (stock not
 * held by other shoppers). Opening the cart renews the holds.
 */
export async function getCartItems(userId: string) {
  const cart = await getOrCreateCart(userId);
  await stockRepository.touchCart(cart.id);
  const items = await cartItemRepository.findItemsByCartId(cart.id);
  const available = await stockRepository.availableQuantities(
    items.map((i) => i.productVariantId),
    userId,
  );
  return items.map((i) => ({
    ...i,
    availableQuantity: available.get(i.productVariantId) ?? 0,
  }));
}

/**
 * Adds to the cart only if the line's new total fits in what other
 * shoppers aren't holding — so with one left, a second unit is refused,
 * and stock in someone else's cart can't be taken.
 */
export async function addToCart(
  userId: string,
  productVariantId: string,
  quantity: number = 1,
): Promise<
  | "variant_not_found"
  | "own_listing"
  | InsufficientStock
  | Awaited<ReturnType<typeof cartItemRepository.findCartItemByVariantId>>
> {
  const variant =
    await productVariantRepository.findVariantById(productVariantId);
  if (variant === "variant_not_found") return "variant_not_found";

  // Sellers can shop, but not from their own store.
  if (await isOwnListing(userId, variant.productId)) return "own_listing";

  const cart = await getOrCreateCart(userId);
  const result = await stockRepository.addToCart(
    cart.id,
    userId,
    productVariantId,
    quantity,
  );
  if (!result.ok) {
    if (result.reason === "variant_not_found") return "variant_not_found";
    const line = await cartItemRepository.findCartItemByVariantId(
      cart.id,
      productVariantId,
    );
    return {
      insufficientStock: true,
      available: result.available,
      inCart: line === "cart_item_not_found" ? 0 : line.quantity,
    };
  }

  return await cartItemRepository.findCartItemByVariantId(
    cart.id,
    productVariantId,
  );
}

/** Sets a line's quantity (0 removes it), within what's available. */
export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<
  "cart_not_found" | "cart_item_not_found" | InsufficientStock | true
> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  if (quantity <= 0) {
    const removed = await cartItemRepository.softDeleteCartItem(
      cartItemId,
      cart.id,
    );
    return removed ? true : "cart_item_not_found";
  }

  const result = await stockRepository.setCartQuantity(
    cart.id,
    userId,
    cartItemId,
    quantity,
  );
  if (result.ok) return true;
  if (result.reason === "insufficient_stock") {
    const line = await cartItemRepository.findCartItemById(cartItemId, cart.id);
    return {
      insufficientStock: true,
      available: result.available,
      inCart: line === "cart_item_not_found" ? 0 : line.quantity,
    };
  }
  return "cart_item_not_found";
}

/** Changes a line's quantity by `delta` (going to 0 removes it). */
export async function incrementCartItem(
  userId: string,
  cartItemId: string,
  delta: number = 1,
): Promise<
  "cart_not_found" | "cart_item_not_found" | InsufficientStock | true
> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  const cartItem = await cartItemRepository.findCartItemById(
    cartItemId,
    cart.id,
  );
  if (cartItem === "cart_item_not_found") return "cart_item_not_found";

  return await updateCartItemQuantity(
    userId,
    cartItemId,
    cartItem.quantity + delta,
  );
}

export async function removeCartItem(
  userId: string,
  cartItemId: string,
): Promise<"cart_not_found" | "cart_item_not_found" | boolean> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  const cartItem = await cartItemRepository.findCartItemById(
    cartItemId,
    cart.id,
  );
  if (cartItem === "cart_item_not_found") return "cart_item_not_found";

  return await cartItemRepository.softDeleteCartItem(cartItemId, cart.id);
}

export async function clearCart(
  userId: string,
): Promise<"cart_not_found" | boolean> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  return await cartItemRepository.softDeleteItemsByCartId(cart.id);
}

// ─────────────────────────────────────────
// Cart Summary
// ─────────────────────────────────────────

// Computes the cart total from live variant prices, with what's available
// to this shopper per line. The shopper is active, so their holds renew.
export async function getCartSummary(userId: string): Promise<
  | "cart_not_found"
  | {
      items: (Awaited<
        ReturnType<typeof cartItemRepository.findItemsByCartId>
      >[number] & { availableQuantity: number })[];
      itemCount: number;
      subtotal: string;
    }
> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  await stockRepository.touchCart(cart.id);
  const lines = await cartItemRepository.findItemsByCartId(cart.id);
  const available = await stockRepository.availableQuantities(
    lines.map((i) => i.productVariantId),
    userId,
  );
  const items = lines.map((i) => ({
    ...i,
    availableQuantity: available.get(i.productVariantId) ?? 0,
  }));

  // Fetch live prices from variants and compute subtotal.
  let subtotal = 0;

  await Promise.all(
    items.map(async (item) => {
      const variant = await productVariantRepository.findVariantById(
        item.productVariantId,
      );

      if (variant !== "variant_not_found") {
        subtotal += parseFloat(variant.price) * item.quantity;
      }
    }),
  );

  return {
    items,
    itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    subtotal: subtotal.toFixed(2),
  };
}
