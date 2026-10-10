import { Elysia } from "elysia";
import { registerUser } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .post("/", async ({ body, set }: any) => {
    try {
      const result = await registerUser(body);
      set.status = 200; // or 201
      return result;
    } catch (error: any) {
      set.status = 400;
      return { error: error.message || "Bad Request" };
    }
  });
