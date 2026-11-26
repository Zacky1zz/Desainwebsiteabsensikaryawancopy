# White Box Testing Modul 4 - Pengujian 8 Fitur

Patch ini disusun dari source project yang diberikan. Salin file/folder sesuai struktur ke project asli (jangan mengganti seluruh project).

## Target dokumentasi
- Pre-Lab tetap satu fitur: FS-002 Login, fungsi `getAuthenticatedUser()` pada `backend/server.mjs`.
- Lab Session diperluas menjadi delapan fitur FS-001 sampai FS-008.

## File tambahan
- `tests/features/`: delapan kelompok pengujian (28 test case).
- `tests/helpers/backendTestServer.mjs`: helper untuk menjalankan backend pada port sementara dan memakai `DATA_PATH` sementara.
- `src/app/utils/reportUtils.ts`: fungsi murni untuk filter laporan, rekap per karyawan, dan membuat CSV.
- `tests/features/fs006-reports-export.test.ts`: unit test untuk utilitas laporan.
- `backend/server.mjs`: mengekspor instance server agar integration test dapat menjalankannya pada port sementara.
- `src/app/pages/AdminReports.tsx`: memakai helper laporan yang diuji.
- `vite.config.ts`: coverage menyertakan backend dan utilitas laporan.

## Cara memasang
1. Backup project asli.
2. Extract ZIP patch ini.
3. Salin file sesuai path ke folder project asli dan izinkan penggabungan folder.
4. Jangan menghapus `tests/backend/getAuthenticatedUser.test.mjs` atau `tests/AuthContext.login.test.tsx`.
5. Jangan salin `.env`, `.git`, `node_modules`, atau `backend/data.json` dari sumber ZIP.

## Cara menjalankan
Di terminal pada root project:

```bash
npm test
npm run test:coverage
npm run build
```

Hasil aktual belum diverifikasi di lingkungan penyusunan patch karena dependencies project tidak dijalankan di sini. Catat hasil yang benar-benar muncul pada komputer lokal; jangan menyalin angka coverage lama.

## Batasan fitur yang ditemukan saat memeriksa source
- FS-006: tombol Excel saat ini mengunduh CSV, bukan file XLSX. Tombol PDF saat ini hanya menampilkan notifikasi dan belum membuat PDF. Pengujian menargetkan filter, rekap, dan CSV yang memang tersedia.
- FS-005: API saat ini menyediakan tambah, ubah, hapus; endpoint khusus untuk mengubah status aktif/nonaktif akun belum ditemukan.
- FS-004 diuji pada endpoint data karyawan dan absensi yang menjadi sumber dashboard, bukan tampilan visual seluruh dashboard.
- FS-008 diuji pada endpoint check-in, check-out, izin/sakit. Validasi koordinat tidak dilakukan backend saat ini.

## Catatan Test Double
`tests/backend/getAuthenticatedUser.test.mjs` yang sudah ada tetap menyediakan:
- Stub: request object/header terkontrol.
- Spy: pemantauan `timingSafeEqual` sambil meneruskan panggilan ke implementasi Node asli.

Dua Test Double tersebut tetap menjadi bukti untuk ketentuan Modul 4.
