import { Elysia } from "elysia";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .use(usersRoute)
  .get("/", () => ({
    status: "ok",
    message: "Server ElysiaJS Backend Aktif",
    timestamp: new Date().toISOString(),
  }))
  .get("/health", () => ({
    status: "healthy",
    uptime: process.uptime(),
  }))
  .listen(port);

console.log(`🚀 Server ElysiaJS berjalan di http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
