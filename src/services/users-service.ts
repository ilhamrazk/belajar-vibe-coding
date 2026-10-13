import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class BadRequestError extends Error {
  constructor(message: string = "Bad Request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new UnauthorizedError();
  }

  return token;
}

export async function registerUser(payload: any) {
  const { name, email, password } = payload;

  // Validasi panjang karakter name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new BadRequestError("Nama wajib diisi");
  }

  if (name.length > 255) {
    throw new BadRequestError("Nama maksimal 255 karakter");
  }

  if (email && email.length > 255) {
    throw new BadRequestError("Email maksimal 255 karakter");
  }

  // Cek apakah email sudah terdaftar
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new BadRequestError("Email sudah terdaftar");
  }

  // Hash password menggunakan fitur bawaan Bun (bcrypt)
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Simpan ke database
  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  return { data: "OK" };
}

export async function loginUser(payload: any) {
  const { email, password } = payload;

  // Cek apakah user dengan email tersebut terdaftar
  const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = existingUsers[0];
  if (!user) {
    throw new BadRequestError("Email atau password salah");
  }

  // Verifikasi password hash bcrypt
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    throw new BadRequestError("Email atau password salah");
  }

  // Generate UUID token
  const token = crypto.randomUUID();

  // Simpan token ke database sessions
  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return { data: token };
}

export async function getCurrentUser(authHeader: string | undefined) {
  const token = extractBearerToken(authHeader);

  // Cari session berdasarkan token (dengan limit 1)
  const sessionList = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  const session = sessionList[0];
  if (!session) {
    throw new UnauthorizedError();
  }

  // Cari data user berdasarkan user_id dari session (dengan limit 1)
  const userList = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = userList[0];
  if (!user) {
    throw new UnauthorizedError();
  }

  return {
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    },
  };
}

export async function logoutUser(authHeader: string | undefined) {
  const token = extractBearerToken(authHeader);

  // Langsung hapus session dari database dan cek affectedRows untuk menghemat roundtrip query
  const [result] = await db.delete(sessions).where(eq(sessions.token, token));
  if ((result as any)?.affectedRows === 0) {
    throw new UnauthorizedError();
  }

  return { data: "OK" };
}
