import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { usersRoute } from "../src/routes/users-route";

const app = new Elysia().use(usersRoute);

describe("Auth Endpoints", () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "securePassword123";
  let authToken = "";

  it("POST /api/users - should register a new user successfully", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: "OK" });
  });

  it("POST /api/users - should fail registering duplicate email", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Duplicate",
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Email sudah terdaftar");
  });

  it("POST /api/users - should fail registering with name longer than 255 characters", async () => {
    const longName = "A".repeat(300);
    const res = await app.handle(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: longName,
          email: `longname_${Date.now()}@example.com`,
          password: "password123",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Nama maksimal 255 karakter");
  });

  it("POST /api/users/login - should fail login with wrong password", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "wrongpassword",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Email atau password salah");
  });

  it("POST /api/users/login - should succeed login with correct credentials", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe("string");
    authToken = body.data;
  });

  it("GET /api/users/current - should fail without Authorization header", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/current", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/users/current - should fail with invalid bearer token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/current", {
        method: "GET",
        headers: { Authorization: "Bearer fake-token-12345" },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/users/current - should succeed with valid token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/current", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toBeDefined();
    expect(body.data.email).toBe(testEmail);
    expect(body.data.name).toBe("Test User");
    expect(body.data.password).toBeUndefined();
  });

  it("DELETE /api/users/logout - should fail without Authorization header", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("DELETE /api/users/logout - should fail with non-Bearer auth format", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/logout", {
        method: "DELETE",
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("DELETE /api/users/logout - should succeed with valid token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/logout", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toEqual({ data: "OK" });
  });

  it("GET /api/users/current - should fail with 401 after logout", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/current", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("DELETE /api/users/logout - should fail with 401 when logging out again with same token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/logout", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });
});
