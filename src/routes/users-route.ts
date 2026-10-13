import { Elysia, t } from "elysia";
import {
  BadRequestError,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  UnauthorizedError,
} from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: error.message };
    }
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const result = await registerUser(body);
        set.status = 200;
        return result;
      } catch (error: any) {
        if (error instanceof BadRequestError) {
          set.status = 400;
          return { error: error.message };
        }
        set.status = 500;
        return { error: "Internal Server Error" };
      }
    },
    {
      body: t.Object({
        name: t.String({ maxLength: 255, error: "Nama maksimal 255 karakter" }),
        email: t.String({ maxLength: 255, error: "Email maksimal 255 karakter" }),
        password: t.String(),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        set.status = 200;
        return result;
      } catch (error: any) {
        if (error instanceof BadRequestError) {
          set.status = 400;
          return { error: error.message };
        }
        set.status = 500;
        return { error: "Internal Server Error" };
      }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      try {
        const authHeader = headers["authorization"];
        const result = await getCurrentUser(authHeader);
        set.status = 200;
        return result;
      } catch (error: any) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return { error: error.message };
        }
        set.status = 500;
        return { error: "Internal Server Error" };
      }
    },
    {
      headers: t.Object({
        authorization: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      try {
        const authHeader = headers["authorization"];
        const result = await logoutUser(authHeader);
        set.status = 200;
        return result;
      } catch (error: any) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return { error: error.message };
        }
        set.status = 500;
        return { error: "Internal Server Error" };
      }
    },
    {
      headers: t.Object({
        authorization: t.Optional(t.String()),
      }),
    }
  );
