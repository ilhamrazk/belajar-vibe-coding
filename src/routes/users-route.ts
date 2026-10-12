import { Elysia } from "elysia";
import { loginUser, registerUser } from "../services/users-service";

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
  })
  .post("/login", async ({ body, set }: any) => {
    try {
      const result = await loginUser(body);
      set.status = 200;
      return result;
    } catch (error: any) {
      set.status = 400;
      return { error: error.message || "Bad Request" };
    }
  });
