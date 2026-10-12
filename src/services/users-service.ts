import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";

export async function registerUser(payload: any) {
  const { name, email, password } = payload;

  // Cek apakah email sudah terdaftar
  const existingUser = await db.select().from(users).where(eq(users.email, email));
  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar");
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
  const existingUsers = await db.select().from(users).where(eq(users.email, email));
  const user = existingUsers[0];
  if (!user) {
    throw new Error("Email atau password salah");
  }

  // Verifikasi password hash bcrypt
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Email atau password salah");
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
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error("Unauthorized");
  }

  // Cari session berdasarkan token
  const sessionList = await db.select().from(sessions).where(eq(sessions.token, token));
  const session = sessionList[0];
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Cari data user berdasarkan user_id dari session
  const userList = await db.select().from(users).where(eq(users.id, session.userId));
  const user = userList[0];
  if (!user) {
    throw new Error("Unauthorized");
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
