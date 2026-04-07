import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors"; // Import CORS plugin
import { openapi } from "@elysiajs/openapi";
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user";
import { sellerRoutes } from "./routes/seller.routes";
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

const checkSoko = "soko server is running!";

const App = new Elysia()
  .use(
    cors({
      origin: "*", // Allow all origins for dev; specify your frontend URL (e.g., 'http://localhost:3000') for production
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
      allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
      credentials: true, // Enable if your frontend sends cookies or auth headers
    }),
  ) // Add CORS middleware
  .onAfterResponse((context) => {
    console.log(context.response);
  })
  .onError(({ code, error, set }) => {
    console.error(error);
    switch (code) {
      case "NOT_FOUND":
        set.status = 404;
        return "Not Found :(";

      case "INTERNAL_SERVER_ERROR":
        set.status = 500;
        return "Internal Server Error :(";

      case "VALIDATION":
        set.status = 400;
        return error;

      default:
        set.status = 400;
        return error;
    }
  })
  .use(openapi())
  .get("/", () => checkSoko)
  .get("/test-auth", async (ctx) => {
    const authHeader = ctx.request.headers.get("authorization");
    console.log("auth header:", authHeader);
    return { authHeader };
  })
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
  .use(notificationRoutes);

export default App;
