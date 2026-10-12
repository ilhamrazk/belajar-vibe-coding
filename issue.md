# Issue: Implementasi API Get Current User (GET /api/users/current)

## 📋 Deskripsi Fitur
Membuat endpoint REST API `GET /api/users/current` untuk mengambil informasi profil pengguna yang saat ini sedang login berdasarkan token autentikasi sesi.

Client akan mengirimkan token pada header `Authorization: Bearer <token>`. Server akan memvalidasi token tersebut ke tabel `sessions` di database MySQL. Jika token valid, server akan mengambil data user terkait dari tabel `users` (tanpa menyertakan field `password`) dan mengembalikannya kepada client. Jika token tidak ada, tidak valid, atau user tidak ditemukan, server mengembalikan respon error `Unauthorized` (HTTP 401).

Dokumen perencanaan ini dirancang sangat terstruktur dan detail agar dapat diimplementasikan dengan mudah oleh **junior programmer** maupun **AI model**.

---

## 📁 Struktur Folder & File
Implementasi ini menggunakan arsitektur modular yang sudah ada di dalam folder `src/`:

```text
src/
├── db/
│   ├── index.ts           # Koneksi Drizzle MySQL (sudah ada)
│   └── schema.ts          # Schema tabel users dan sessions (sudah ada)
├── routes/
│   └── users-route.ts     # Route ElysiaJS (tambahkan endpoint GET /current di sini)
├── services/
│   └── users-service.ts   # Business logic (tambahkan fungsi getCurrentUser di sini)
└── index.ts               # Entry point server ElysiaJS
```

---

## 🔌 Spesifikasi API: Get Current User

### Endpoint
- **Method**: `GET`
- **Path**: `/api/users/current` (karena `usersRoute` memiliki prefix `/api/users`, di handler route cukup didefinisikan sebagai `.get("/current", ...)`)

### Request Header
| Header Name     | Format / Nilai                   | Wajib |
| --------------- | -------------------------------- | ----- |
| `Authorization` | `Bearer <token>`                | Ya    |

*Keterangan: `<token>` adalah string UUID yang diperoleh client saat berhasil melakukan login pada endpoint `POST /api/users/login`.*

### Request Body
*Tidak ada (kosong).*

---

### Response Body

#### 1. Response Sukses (`200 OK`)
Dikembalikan jika header Authorization valid dan token terdaftar di tabel `sessions`:

```json
{
  "data": {
    "id": 1,
    "name": "ilham",
    "email": "ilham@gmail.com",
    "created_at": "2026-10-12T21:59:04.000Z"
  }
}
```

> ⚠️ **Penting untuk Keamanan**: Kolom `password` **TIDAK BOLEH** disertakan dalam response JSON!

#### 2. Response Gagal (`401 Unauthorized`)
Dikembalikan jika header `Authorization` tidak dikirim, format tidak diawali `Bearer `, token tidak ditemukan di database `sessions`, atau user tidak ditemukan:

```json
{
  "error": "Unauthorized"
}
```

---

## 🛠️ Panduan Langkah-demi-Langkah Implementasi

Berikut adalah urutan tahapan yang wajib dijalankan secara berurutan:

### Langkah 1: Implementasi Logic di Service Layer (`src/services/users-service.ts`)
Tambahkan fungsi `getCurrentUser(authHeader: string | undefined)` di file `src/services/users-service.ts`.

#### Alur Logika:
1. **Validasi Header Authorization**:
   - Periksa apakah `authHeader` ada dan string-nya diawali dengan prefix `"Bearer "`.
   - Jika tidak ada atau formatnya salah, lempar error:
     ```typescript
     throw new Error("Unauthorized");
     ```
2. **Ekstraksi Token**:
   - Ambil token dengan memotong substring prefix `"Bearer "`:
     ```typescript
     const token = authHeader.substring(7).trim();
     if (!token) {
       throw new Error("Unauthorized");
     }
     ```
3. **Cari Session di Database**:
   - Query tabel `sessions` menggunakan token yang diekstrak:
     ```typescript
     const sessionList = await db.select().from(sessions).where(eq(sessions.token, token));
     const session = sessionList[0];
     if (!session) {
       throw new Error("Unauthorized");
     }
     ```
4. **Cari User Terkait di Database**:
   - Ambil data user dari tabel `users` berdasarkan `session.userId`:
     ```typescript
     const userList = await db.select().from(users).where(eq(users.id, session.userId));
     const user = userList[0];
     if (!user) {
       throw new Error("Unauthorized");
     }
     ```
5. **Kembalikan Data Profil User**:
   - Bentuk object respon tanpa menyertakan `password`:
     ```typescript
     return {
       data: {
         id: user.id,
         name: user.name,
         email: user.email,
         created_at: user.createdAt,
       },
     };
     ```

---

### Langkah 2: Tambahkan Route Handler di Route Layer (`src/routes/users-route.ts`)
1. Import fungsi `getCurrentUser` dari `../services/users-service`.
2. Daftarkan method `.get("/current", ...)` pada instance `usersRoute`:
   ```typescript
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
   ```

---

### Langkah 3: Validasi Typecheck & Pengujian (Testing)

1. **Jalankan Pengecekan Type**:
   ```bash
   bun run typecheck
   ```
   Pastikan tidak ada kesalahan compiler TypeScript.

2. **Jalankan Dev Server**:
   ```bash
   bun run dev
   ```

3. **Uji Skenario Berhasil (Token Valid)**:
   Gunakan token UUID yang aktif di database:
   ```bash
   curl -X GET http://localhost:3000/api/users/current \
     -H "Authorization: Bearer <MASUKKAN_TOKEN_VALID_DI_SINI>"
   ```
   *Expected Response:* Status `200`, body berisi data user dengan kolom `id`, `name`, `email`, dan `created_at` (tanpa password).

4. **Uji Skenario Gagal (Tanpa Header Authorization)**:
   ```bash
   curl -X GET http://localhost:3000/api/users/current
   ```
   *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

5. **Uji Skenario Gagal (Token Salah / Acak)**:
   ```bash
   curl -X GET http://localhost:3000/api/users/current \
     -H "Authorization: Bearer token-ngawur-12345"
   ```
   *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

6. **Uji Skenario Gagal (Format Header Bukan Bearer)**:
   ```bash
   curl -X GET http://localhost:3000/api/users/current \
     -H "Authorization: Basic dXNlcjpwYXNz"
   ```
   *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)
- [ ] Endpoint `GET /api/users/current` berhasil didaftarkan dan dapat diakses.
- [ ] Header `Authorization` dengan prefix `Bearer ` divalidasi dengan benar.
- [ ] Token diverifikasi ke tabel `sessions` untuk memperoleh user yang sesuai.
- [ ] Respon sukses mengembalikan data profil pengguna (HTTP 200) dan **tidak mengekspos hash password**.
- [ ] Request tanpa token / token tidak valid mengembalikan error `{"error": "Unauthorized"}` (HTTP 401).
- [ ] Mengikuti pemisahan struktur folder `src/routes` dan `src/services`.
- [ ] Kode lulus pengecekan type TypeScript (`bun run typecheck`).
