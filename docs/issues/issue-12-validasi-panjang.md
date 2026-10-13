# Bug: Registrasi User dengan Name Melebihi 255 Karakter Menghasilkan Error 500 (Internal Server Error)

## 📋 Deskripsi Masalah (Bug Description)
Saat ini, jika client mengirimkan request registrasi user baru (`POST /api/users`) dengan field `name` yang memiliki panjang lebih dari 255 karakter (misalnya 300 karakter), server mengalami internal crash dan mengembalikan respon:
```json
HTTP 500 Internal Server Error
{
  "error": "Internal Server Error"
}
```

### Perilaku yang Diharapkan (Expected Behavior)
Input field harus divalidasi di layer aplikasi sebelum query insert dieksekusi ke database. Jika panjang `name` melebihi batas kapasitas kolom database (255 karakter), server harus menolak request tersebut lebih awal dan mengembalikan respon client error:
```json
HTTP 400 Bad Request
{
  "error": "Nama maksimal 255 karakter"
}
```

---

## 🔍 Akar Masalah (Root Cause)
1. **Kapasitas Kolom Database (`src/db/schema.ts`)**:
   Kolom `name` pada tabel `users` didefinisikan menggunakan tipe `VARCHAR(255)`:
   ```typescript
   name: varchar("name", { length: 255 }).notNull(),
   ```
2. **Ketiadaan Validasi Batas Panjang Karakter**:
   - Di route validator (`src/routes/users-route.ts`), schema validasi TypeBox hanya memeriksa `name: t.String()`, tanpa batas `maxLength: 255`.
   - Di business logic (`src/services/users-service.ts`), belum ada pengecekan panjang karakter string `name` sebelum memanggil `db.insert(users)`.
3. **Terlemparnya SQL Error ke Internal Server Error**:
   MySQL melempar error `ER_DATA_TOO_LONG: Data too long for column 'name' at row 1`. Karena error ini berasal dari database dan bukan `BadRequestError`, route handler menangkapnya di blok `catch` dan menetapkan status HTTP 500.

---

## 📁 Struktur File Terkait
Perbaikan akan dilakukan pada file-file berikut:
```text
src/
├── routes/
│   └── users-route.ts       # Tambahkan validasi maxLength pada schema TypeBox
├── services/
│   └── users-service.ts     # Tambahkan validasi panjang string & lempar BadRequestError
tests/
└── auth.test.ts             # Tambahkan unit/integration test untuk input name > 255 karakter
```

---

## 🔌 Spesifikasi API: Validasi Registrasi User

### Endpoint
- **Method**: `POST`
- **Path**: `/api/users`

### Request Body
```json
{
  "name": "string (wajib, maksimal 255 karakter)",
  "email": "string (wajib, format email, maksimal 255 karakter)",
  "password": "string (wajib, minimal 6 karakter)"
}
```

### Response Body

#### 1. Response Gagal Validasi (`400 Bad Request`)
Dikembalikan jika `name` kosong atau panjangnya melebihi 255 karakter:
```json
{
  "error": "Nama maksimal 255 karakter"
}
```

---

## 🛠️ Panduan Langkah-demi-Langkah Perbaikan (Step-by-Step Guide)

Ikuti tahapan berikut secara berurutan:

### Langkah 1: Tambahkan Validasi di Service Layer (`src/services/users-service.ts`)
Buka file `src/services/users-service.ts`, lalu pada fungsi `registerUser(payload: any)`, tambahkan pengecekan validasi panjang karakter sebelum query database dijalankan:

```typescript
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

  // Hash password & simpan ke database...
  ...
}
```

> 💡 **Kenapa divalidasi di service layer?**
> Melempar `BadRequestError` memastikan bahwa arsitektur backend memiliki pertahanan ganda (*defense-in-depth*), dan route handler yang menangkap `BadRequestError` otomatis mengembalikan status HTTP `400` dengan format JSON `{ "error": error.message }`.

---

### Langkah 2: Perbarui Schema Validasi di Route Layer (`src/routes/users-route.ts`)
Buka file `src/routes/users-route.ts`, perbarui schema validasi `body` untuk endpoint `POST /`:

```typescript
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
        name: t.String({ maxLength: 255 }),
        email: t.String({ maxLength: 255 }),
        password: t.String(),
      }),
    }
  )
```

---

### Langkah 3: Tambahkan Automated Test di `tests/auth.test.ts`
Buka file `tests/auth.test.ts`, tambahkan test case baru di dalam blok `describe("Auth Endpoints", ...)` untuk menguji skenario input nama yang terlalu panjang:

```typescript
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
    expect(body.error).toBeDefined();
  });
```

---

### Langkah 4: Verifikasi & Testing

1. **Jalankan Test Suite**:
   ```bash
   bun test
   ```
   Pastikan seluruh test lulus (semua centang hijau).

2. **Jalankan Typecheck**:
   ```bash
   bun run typecheck
   ```
   Pastikan output: `✓ No type errors in 8 files`.

3. **Uji Manual dengan Curl**:
   Jalankan server:
   ```bash
   bun run dev
   ```
   Kirim request dengan nama 300 karakter:
   ```bash
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"name":"'$(python -c 'print("A"*300)')'","email":"test300@mail.com","password":"password123"}'
   ```
   *Hasil yang Diharapkan:*
   - HTTP Status: `400`
   - Response: `{"error": "Nama maksimal 255 karakter"}` (bukan 500).

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)
- [ ] Request registrasi dengan field `name` melebihi 255 karakter mengembalikan status HTTP `400 Bad Request` (bukan `500 Internal Server Error`).
- [ ] Format response error berupa JSON `{ "error": "Nama maksimal 255 karakter" }` atau pesan error validasi yang jelas.
- [ ] Database tidak menerima query insert yang melebihi kapasitas kolom.
- [ ] Request registrasi dengan `name` normal (<= 255 karakter) tetap berhasil dengan status HTTP `200`.
- [ ] Test case baru ditambahkan di `tests/auth.test.ts` dan semua test `bun test` berhasil lulus.
- [ ] Kode lulus pengecekan TypeScript (`bun run typecheck`).
