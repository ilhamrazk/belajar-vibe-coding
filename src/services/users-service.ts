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
