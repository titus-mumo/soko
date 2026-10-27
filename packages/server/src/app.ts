import { Elysia } from "elysia";
import { searchRoutes } from "./routes/search";
import { cors } from "@elysiajs/cors"; // Import CORS plugin
import { openapi } from "@elysiajs/openapi";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { sellerRoutes } from "./routes/seller";
import { categoryRoutes } from "./routes/category";
import { productRoutes } from "./routes/product";
import { cartRoutes } from "./routes/cart";
import { orderRoutes } from "./routes/order";
import { paymentRoutes } from "./routes/payment";
import { deliveryRoutes } from "./routes/delivery";
import { reviewRoutes } from "./routes/review";
import { disputeRoutes } from "./routes/dispute";
import { promotionRoutes } from "./routes/promotion";
import { notificationRoutes } from "./routes/notification";
import { scrub } from "./lib/views";
import { rateLimit } from "./lib/rate-limit";
import { auditLog } from "./lib/audit";
import { auditRoutes } from "./routes/audit";

const checkSoko = "soko server is running!";

const App = new Elysia()
  .use(
    cors({
      origin: Bun.env.FRONTEND_URL || "http://localhost:3000", // Allow all origins for dev; specify your frontend URL (e.g., 'http://localhost:3000') for production
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed HTTP methods
      allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
      // Lets the web app read when to retry after a 429.
      exposeHeaders: [
        "Retry-After",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
      ],
      credentials: true, // Enable if your frontend sends cookies or auth headers
    }),
  ) // Add CORS middleware
  // Every request goes in the admin audit log (lib/audit.ts) — first, so
  // requests the rate limiter turns away are recorded too.
  .use(auditLog)
  // Before routing, so floods are turned away cheaply (lib/rate-limit.ts).
  .use(rateLimit)
  // Log the request line only: response bodies carry tokens and personal data.
  .onAfterResponse(({ request, set }) => {
    if (Bun.env.NODE_ENV !== "test")
      console.log(
        `${request.method} ${new URL(request.url).pathname} ${set.status ?? 200}`,
      );
  })
  // Safety net under the per-route views (lib/views.ts): soft-delete markers,
  // internal timestamps and password hashes never leave the server.
  .onAfterHandle({ as: "global" }, ({ response }) => {
    if (
      response &&
      typeof response === "object" &&
      !(response instanceof Response)
    )
      return scrub(response) as typeof response;
  })
  .onError(({ code, error, set }) => {
    // Expected 4xx (validation, not found) would flood test output.
    if (
      Bun.env.NODE_ENV !== "test" ||
      code === "INTERNAL_SERVER_ERROR" ||
      code === "UNKNOWN"
    )
      console.error(error);
    // Error bodies say what went wrong in plain words — never the schema,
    // stack or database message (those name tables, columns and rules).
    switch (code) {
      case "NOT_FOUND":
        set.status = 404;
        return { success: false, message: "Not found." };

      case "VALIDATION": {
        set.status = 400;
        const first = error.all?.[0] as { path?: string } | undefined;
        const field = first?.path?.replace(/^\//, "").replace(/\//g, ".");
        return {
          success: false,
          message: field
            ? `Invalid or missing field: ${field}.`
            : "Invalid request.",
        };
      }

      case "PARSE":
        set.status = 400;
        return { success: false, message: "Malformed request body." };

      default:
        set.status = 500;
        return {
          success: false,
          message: "Something went wrong. Please try again.",
        };
    }
  })
  // API docs map every endpoint — development only.
  .use(Bun.env.NODE_ENV === "production" ? new Elysia() : openapi())
  .get("/", () => checkSoko)
  .use(authRoutes)
  .use(userRoutes)
  .use(sellerRoutes)
  .use(categoryRoutes)
  .use(productRoutes)
  .use(cartRoutes)
  .use(orderRoutes)
  .use(paymentRoutes)
  .use(deliveryRoutes)
  .use(reviewRoutes)
  .use(disputeRoutes)
  .use(promotionRoutes)
  .use(notificationRoutes)
  .use(searchRoutes)
  .use(auditRoutes);

export default App;
