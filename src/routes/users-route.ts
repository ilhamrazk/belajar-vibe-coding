import { Elysia } from "elysia";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "../services/users-service";

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
  })
  .get("/current", async ({ headers, set }: any) => {
    try {
      const authHeader = headers["authorization"] || headers["Authorization"];
      const result = await getCurrentUser(authHeader);
      set.status = 200;
      return result;
    } catch (error: any) {
      set.status = 401;
      return { error: error.message || "Unauthorized" };
    }
  })
  .delete("/logout", async ({ headers, set }: any) => {
    try {
      const authHeader = headers["authorization"] || headers["Authorization"];
      const result = await logoutUser(authHeader);
      set.status = 200;
      return result;
    } catch (error: any) {
      set.status = 401;
      return { error: error.message || "Unauthorized" };
    }
  });
