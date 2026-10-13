# Issue: Implementasi API Logout User (DELETE /api/users/logout)

## 📋 Deskripsi Fitur
Membuat endpoint REST API `DELETE /api/users/logout` untuk menghapus sesi login pengguna yang sedang aktif dari database.

Client akan mengirimkan token sesi pada request header `Authorization: Bearer <token>`. Server akan memvalidasi apakah token tersebut ada di tabel `sessions`. Jika token valid dan ditemukan, server akan menghapus baris session tersebut dari tabel `sessions` di database MySQL sehingga token tidak dapat digunakan lagi, kemudian mengembalikan respon `{ "data": "OK" }` (HTTP 200). Jika header tidak ada, format salah, atau token tidak ditemukan di database, server mengembalikan respon error `{"error": "Unauthorized"}` (HTTP 401).

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
│   └── users-route.ts     # Route ElysiaJS (tambahkan endpoint DELETE /logout di sini)
├── services/
│   └── users-service.ts   # Business logic (tambahkan fungsi logoutUser di sini)
└── index.ts               # Entry point server ElysiaJS
```

---

## 🔌 Spesifikasi API: Logout User

### Endpoint
- **Method**: `DELETE`
- **Path**: `/api/users/logout` (karena `usersRoute` memiliki prefix `/api/users`, di handler route cukup didefinisikan sebagai `.delete("/logout", ...)`)

### Request Header
| Header Name     | Format / Nilai                   | Wajib |
| --------------- | -------------------------------- | ----- |
| `Authorization` | `Bearer <token>`                | Ya    |

*Keterangan: `<token>` adalah string UUID yang diperoleh client saat login (`POST /api/users/login`) dan tersimpan di tabel `sessions`.*

### Request Body
*Tidak ada (kosong).*

---

### Response Body

#### 1. Response Sukses (`200 OK`)
Dikembalikan jika header `Authorization` valid, token ditemukan di database `sessions`, dan data session berhasil dihapus:

```json
{
  "data": "OK"
}
```

> ⚠️ **Efek Samping di Database**: Record session dengan token tersebut pada tabel `sessions` **harus terhapus** sehingga panggilan berikutnya ke `GET /api/users/current` menggunakan token tersebut akan menghasilkan `401 Unauthorized`.

#### 2. Response Gagal (`401 Unauthorized`)
Dikembalikan jika header `Authorization` tidak dikirim, format tidak diawali `Bearer `, atau token tidak ditemukan di tabel `sessions`:

```json
{
  "error": "Unauthorized"
}
```

---

## 🛠️ Panduan Langkah-demi-Langkah Implementasi

Berikut adalah urutan tahapan yang wajib dijalankan secara berurutan:

### Langkah 1: Implementasi Logic di Service Layer (`src/services/users-service.ts`)
Tambahkan fungsi `logoutUser(authHeader: string | undefined)` di file `src/services/users-service.ts`.

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
3. **Validasi Keberadaan Session di Database**:
   - Query tabel `sessions` berdasarkan token:
     ```typescript
     const sessionList = await db.select().from(sessions).where(eq(sessions.token, token));
     const session = sessionList[0];
     if (!session) {
       throw new Error("Unauthorized");
     }
     ```
4. **Hapus Session dari Database**:
   - Hapus record session tersebut dari tabel `sessions`:
     ```typescript
     await db.delete(sessions).where(eq(sessions.token, token));
     ```
5. **Kembalikan Respon Sukses**:
   - Return respon:
     ```typescript
     return { data: "OK" };
     ```

---

### Langkah 2: Tambahkan Route Handler di Route Layer (`src/routes/users-route.ts`)
1. Import fungsi `logoutUser` dari `../services/users-service`.
2. Daftarkan method `.delete("/logout", ...)` pada instance `usersRoute`:
   ```typescript
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

3. **Uji Skenario Berhasil (Logout dengan Token Valid)**:
   - Langkah A: Lakukan login terlebih dahulu untuk mendapatkan token baru:
     ```bash
     curl -X POST http://localhost:3000/api/users/login \
       -H "Content-Type: application/json" \
       -d '{"email":"ilham@gmail.com","password":"password"}'
     ```
     *(Salin string token dari response `{ "data": "<TOKEN>" }`)*
   - Langkah B: Kirim request logout dengan token tersebut:
     ```bash
     curl -X DELETE http://localhost:3000/api/users/logout \
       -H "Authorization: Bearer <TOKEN>"
     ```
     *Expected Response:* Status `200`, body: `{"data": "OK"}`.
   - Langkah C: Verifikasi bahwa token sudah tidak bisa digunakan lagi:
     ```bash
     curl -X GET http://localhost:3000/api/users/current \
       -H "Authorization: Bearer <TOKEN>"
     ```
     *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

4. **Uji Skenario Gagal (Tanpa Header Authorization)**:
   ```bash
   curl -X DELETE http://localhost:3000/api/users/logout
   ```
   *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

5. **Uji Skenario Gagal (Token Sudah Terhapus / Token Palsu)**:
   Kirim request logout ulang menggunakan token yang sama (sudah dihapus) atau token acak:
   ```bash
   curl -X DELETE http://localhost:3000/api/users/logout \
     -H "Authorization: Bearer <TOKEN_SUDAH_LOGOUT>"
   ```
   *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

6. **Uji Skenario Gagal (Format Header Bukan Bearer)**:
   ```bash
   curl -X DELETE http://localhost:3000/api/users/logout \
     -H "Authorization: Basic dXNlcjpwYXNz"
   ```
   *Expected Response:* Status `401`, body: `{"error": "Unauthorized"}`.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)
- [ ] Endpoint `DELETE /api/users/logout` berhasil didaftarkan dan dapat diakses.
- [ ] Header `Authorization` dengan format `Bearer <token>` divalidasi dengan benar.
- [ ] Record session yang sesuai dengan token dihapus dari tabel `sessions` saat logout berhasil.
- [ ] Respon sukses mengembalikan `{ "data": "OK" }` (HTTP 200).
- [ ] Setelah logout berhasil, token yang sama tidak dapat lagi digunakan untuk mengakses endpoint `GET /api/users/current` (menghasilkan HTTP 401).
- [ ] Request tanpa token / token tidak valid / token yang sudah dihapus menghasilkan error `{"error": "Unauthorized"}` (HTTP 401).
- [ ] Mengikuti pemisahan struktur folder `src/routes` dan `src/services`.
- [ ] Kode lulus pengecekan type TypeScript (`bun run typecheck`).
