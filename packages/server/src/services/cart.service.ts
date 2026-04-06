import { getRepositories } from "../lib/repositories";

const { cartRepository, cartItemRepository, productVariantRepository } =
  getRepositories();

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

export async function getCartItems(userId: string) {
  const cart = await getOrCreateCart(userId);
  return await cartItemRepository.findItemsByCartId(cart.id);
}

export async function addToCart(
  userId: string,
  productVariantId: string,
  quantity: number = 1,
): Promise<
  | "variant_not_found"
  | "insufficient_stock"
  | Awaited<ReturnType<typeof cartItemRepository.insertCartItem>>
> {
  // Confirm the variant exists and has enough stock.
  const variant =
    await productVariantRepository.findVariantById(productVariantId);
  if (variant === "variant_not_found") return "variant_not_found";

  if (variant.stockQuantity < quantity) return "insufficient_stock";

  const cart = await getOrCreateCart(userId);

  return await cartItemRepository.insertCartItem(
    cart.id,
    productVariantId,
    quantity,
  );
}

export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<
  | "cart_not_found"
  | "cart_item_not_found"
  | "insufficient_stock"
  | Awaited<ReturnType<typeof cartItemRepository.setQuantity>>
> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  // Fetch the cart item to get the variant and check stock.
  const cartItem = await cartItemRepository.findCartItemById(
    cartItemId,
    cart.id,
  );
  if (cartItem === "cart_item_not_found") return "cart_item_not_found";

  // Verify stock is sufficient for the new quantity.
  const variant = await productVariantRepository.findVariantById(
    cartItem.productVariantId,
  );

  if (variant !== "variant_not_found" && variant.stockQuantity < quantity) {
    return "insufficient_stock";
  }

  return await cartItemRepository.setQuantity(cartItemId, cart.id, quantity);
}

export async function incrementCartItem(
  userId: string,
  cartItemId: string,
  delta: number = 1,
): Promise<
  | "cart_not_found"
  | "cart_item_not_found"
  | "insufficient_stock"
  | Awaited<ReturnType<typeof cartItemRepository.adjustQuantity>>
> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  const cartItem = await cartItemRepository.findCartItemById(
    cartItemId,
    cart.id,
  );
  if (cartItem === "cart_item_not_found") return "cart_item_not_found";

  // Check that the increment won't exceed available stock.
  const variant = await productVariantRepository.findVariantById(
    cartItem.productVariantId,
  );

  if (
    variant !== "variant_not_found" &&
    variant.stockQuantity < cartItem.quantity + delta
  ) {
    return "insufficient_stock";
  }

  return await cartItemRepository.adjustQuantity(cartItemId, cart.id, delta);
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

// Computes the cart total from live variant prices.
// Use this at checkout to ensure prices are current.
export async function getCartSummary(userId: string): Promise<
  | "cart_not_found"
  | {
      items: Awaited<ReturnType<typeof cartItemRepository.findItemsByCartId>>;
      itemCount: number;
      subtotal: string;
    }
> {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  const items = await cartItemRepository.findItemsByCartId(cart.id);

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
