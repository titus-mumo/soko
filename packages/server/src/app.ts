import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors"; // Import CORS plugin
import { openapi } from "@elysiajs/openapi";
import { authRoutes, protectedAuthRoutes } from "./routes/auth.route";

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
  .use(authRoutes)
  .use(protectedAuthRoutes);

export default App;
