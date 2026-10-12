# Issue: Implementasi Schema Database Sessions & API Login User

## 📋 Deskripsi Fitur
Membuat fitur login user dengan menambahkan schema tabel `sessions` pada database MySQL menggunakan Drizzle ORM, serta menyediakan endpoint REST API `POST /api/users/login` menggunakan framework ElysiaJS.

Ketika pengguna berhasil login dengan email dan password yang valid, sistem akan menghasilkan token sesi berupa **UUID** (`crypto.randomUUID()`), menyimpannya ke tabel `sessions`, dan mengembalikan token tersebut kepada client.

Dokumen perencanaan ini dirancang sangat terstruktur dan detail agar dapat diimplementasikan dengan mudah oleh **junior programmer** maupun **AI model**.

---

## 📁 Struktur Folder & File
Pastikan penempatan file mengikuti arsitektur yang sudah ada di dalam folder `src/`:

```text
src/
├── db/
│   ├── index.ts           # Koneksi Drizzle MySQL (sudah ada)
│   └── schema.ts          # Schema Drizzle (tambahkan tabel sessions di sini)
├── routes/
│   └── users-route.ts     # Route ElysiaJS (tambahkan endpoint POST /login di sini)
├── services/
│   └── users-service.ts   # Business logic (tambahkan fungsi loginUser di sini)
└── index.ts               # Entry point server ElysiaJS (sudah mendaftarkan usersRoute)
```

---

## 🗄️ Spesifikasi Database: Tabel `sessions`

Definisikan tabel `sessions` di dalam file `src/db/schema.ts` dengan relasi Foreign Key ke tabel `users`.

### Spesifikasi Kolom

| Nama Kolom   | Tipe Data      | Atribut / Constraint                                     | Keterangan                                  |
| ------------ | -------------- | -------------------------------------------------------- | ------------------------------------------- |
| `id`         | `serial` / int | Primary Key, Auto Increment                              | ID unik session                             |
| `token`      | `varchar(255)` | Not Null                                                 | String UUID token login                     |
| `user_id`    | `int`          | Not Null, Foreign Key (`references(() => users.id)`)     | ID user pemilik session                    |
| `created_at` | `timestamp`    | Default `CURRENT_TIMESTAMP`                              | Waktu session dibuat                        |

### Contoh Kode Schema (`src/db/schema.ts`)
```typescript
import { mysqlTable, serial, varchar, timestamp, int } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## 🔌 Spesifikasi API Login User

### Endpoint
- **Method**: `POST`
- **Path**: `/api/users/login` (karena `usersRoute` memiliki prefix `/api/users`, maka pada handler routing cukup didefinisikan sebagai `.post("/login", ...)`)

### Request Header
```http
Content-Type: application/json
```

### Request Body
```json
{
  "email": "ilham@gmail.com",
  "password": "password"
}
```

### Response Body

#### 1. Response Sukses (`200 OK`)
Dikembalikan jika email terdaftar dan password cocok:
```json
{
  "data": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
*(Nilai `"data"` berupa string token UUID yang baru dibuat)*

#### 2. Response Gagal (`400 Bad Request`)
Dikembalikan jika email tidak ditemukan atau password tidak cocok (pesan error sengaja dibuat umum demi alasan keamanan):
```json
{
  "error": "Email atau password salah"
}
```

---

## 🛠️ Panduan Langkah-demi-Langkah Implementasi

Berikut adalah urutan tahapan yang wajib dijalankan secara berurutan:

### Langkah 1: Update Schema Database
1. Buka file `src/db/schema.ts`.
2. Tambahkan import `int` dari `"drizzle-orm/mysql-core"`.
3. Definisikan export tabel `sessions` dengan kolom `id`, `token`, `userId` (foreign key ke `users.id`), dan `createdAt`.

### Langkah 2: Sinkronisasi Schema ke MySQL
Jalankan perintah berikut pada terminal untuk membuat tabel `sessions` di database MySQL:
```bash
bun run db:push
```
*Pastikan tidak ada pesan error koneksi dan tabel `sessions` berhasil dibuat.*

---

### Langkah 3: Implementasi Logic di Service Layer (`src/services/users-service.ts`)
Tambahkan fungsi `loginUser(payload)` pada `src/services/users-service.ts`.

#### Alur Logika:
1. Ambil `email` dan `password` dari payload.
2. Cari record pengguna di database berdasarkan email:
   ```typescript
   const existingUsers = await db.select().from(users).where(eq(users.email, email));
   ```
3. Jika user tidak ditemukan (`existingUsers.length === 0`), lempar error:
   ```typescript
   throw new Error("Email atau password salah");
   ```
4. Jika user ditemukan, verifikasi password menggunakan fungsi bawaan Bun (`Bun.password.verify`):
   ```typescript
   const user = existingUsers[0];
   const isPasswordValid = await Bun.password.verify(password, user.password);
   if (!isPasswordValid) {
     throw new Error("Email atau password salah");
   }
   ```
5. Jika password cocok, buat token unik UUID:
   ```typescript
   const token = crypto.randomUUID();
   ```
6. Simpan token ke dalam tabel `sessions`:
   ```typescript
   await db.insert(sessions).values({
     token,
     userId: user.id,
   });
   ```
7. Kembalikan data token:
   ```typescript
   return { data: token };
   ```

---

### Langkah 4: Tambahkan Route Handler di Route Layer (`src/routes/users-route.ts`)
1. Import fungsi `loginUser` dari `../services/users-service`.
2. Tambahkan sub-route `.post("/login", ...)` ke instance `usersRoute`:
   ```typescript
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
   ```

---

### Langkah 5: Validasi Typecheck & Pengujian (Testing)

1. **Jalankan Typecheck**:
   ```bash
   bun run typecheck
   ```
   Pastikan tidak ada error tipe TypeScript.

2. **Jalankan Dev Server**:
   ```bash
   bun run dev
   ```

3. **Uji Kasus Berhasil (Login Valid)**:
   Kirim request dengan email dan password yang terdaftar:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ilham@gmail.com","password":"password"}'
   ```
   *Expected Response:* Status `200`, body: `{"data":"<UUID>"}`.

4. **Uji Kasus Gagal (Password Salah)**:
   Kirim request dengan password salah:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ilham@gmail.com","password":"passwordsalah"}'
   ```
   *Expected Response:* Status `400`, body: `{"error":"Email atau password salah"}`.

5. **Uji Kasus Gagal (Email Tidak Terdaftar)**:
   Kirim request dengan email yang tidak ada di database:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"unknown@gmail.com","password":"password"}'
   ```
   *Expected Response:* Status `400`, body: `{"error":"Email atau password salah"}`.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)
- [ ] Tabel `sessions` berhasil dibuat di database MySQL dengan relasi Foreign Key ke `users.id`.
- [ ] Endpoint `POST /api/users/login` tersedia dan dapat diakses.
- [ ] Login dengan kredensial benar menghasilkan token UUID dan tersimpan di database `sessions`.
- [ ] Login dengan email salah mengembalikan pesan error `Email atau password salah` (HTTP 400).
- [ ] Login dengan password salah mengembalikan pesan error `Email atau password salah` (HTTP 400).
- [ ] Struktur folder dan file konsisten mengikuti standar `src/routes` dan `src/services`.
- [ ] Kode lulus pengecekan type TypeScript (`bun run typecheck`).
