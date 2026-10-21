# Sistem Absensi Karyawan MCC

Aplikasi web untuk mencatat dan memantau kehadiran karyawan Malang Creative Center (MCC). Aplikasi memiliki dua peran pengguna, yaitu **Admin** dan **Karyawan**, dengan dashboard dan hak akses fitur yang berbeda.

Dokumen ini menjelaskan fitur yang tersedia pada implementasi saat ini agar dapat digunakan sebagai bahan awal penyusunan **Software Requirements Specification (SRS)**. Bagian **Batasan dan hal yang perlu diputuskan untuk SRS** membedakan fitur yang benar-benar berjalan dari hal yang belum tersedia atau perlu disepakati.

## Daftar Isi

- [Teknologi dan struktur aplikasi](#teknologi-dan-struktur-aplikasi)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Peran pengguna dan hak akses](#peran-pengguna-dan-hak-akses)
- [Fitur umum](#fitur-umum)
- [Fitur karyawan](#fitur-karyawan)
- [Fitur admin](#fitur-admin)
- [Status kehadiran dan aturan bisnis saat ini](#status-kehadiran-dan-aturan-bisnis-saat-ini)
- [Data dan layanan backend](#data-dan-layanan-backend)
- [Batasan dan hal yang perlu diputuskan untuk SRS](#batasan-dan-hal-yang-perlu-diputuskan-untuk-srs)
- [Akun awal](#akun-awal)
- [Konfigurasi deployment](#konfigurasi-deployment)

## Teknologi dan struktur aplikasi

- **Frontend:** React, TypeScript, Vite, dan React Router.
- **Backend:** Node.js HTTP API dengan prefix `/api/v1`.
- **Penyimpanan:** berkas JSON lokal (`backend/data.json` secara default).
- **Autentikasi:** token akses bearer yang disimpan di `sessionStorage` browser.
- **Visualisasi:** grafik ringkasan kehadiran pada halaman dashboard dan laporan.

## Menjalankan aplikasi

Pastikan Node.js dan npm tersedia. Instal dependensi frontend satu kali:

```sh
npm install
```

Jalankan backend dan frontend pada terminal terpisah:

```sh
npm run server
```

```sh
npm run dev
```

Buka URL Vite yang ditampilkan di terminal. Backend secara default tersedia di `http://localhost:5000/api/v1` dan akan membuat `backend/data.json` dengan data awal jika berkas tersebut belum ada.

Untuk menggunakan alamat API lain pada frontend, atur `VITE_API_URL` sebelum menjalankan atau membangun frontend. Nilai default-nya adalah `http://localhost:5000/api/v1`.

## Peran pengguna dan hak akses

### Admin

Admin dapat:

- Melihat dashboard ringkasan kehadiran seluruh karyawan.
- Melihat, mencari, menambah, mengubah, dan menghapus data karyawan.
- Membuka laporan absensi dengan filter bulan dan departemen.
- Melihat log aktivitas perubahan data karyawan.
- Membuka portal karyawan dari menu navigasi.

Layanan backend membatasi pengelolaan karyawan, seluruh data absensi, dan log aktivitas untuk admin.

### Karyawan

Karyawan dapat:

- Melihat dashboard dan ringkasan absensi miliknya.
- Melakukan check-in dan check-out.
- Mengirim pengajuan izin atau sakit untuk hari berjalan.
- Melihat dan memfilter riwayat absensi miliknya.

Karyawan hanya memperoleh data absensinya sendiri dari layanan backend.

## Fitur umum

### Login

- Login menggunakan alamat email dan password.
- Login berhasil mengarahkan admin ke dashboard admin dan karyawan ke dashboard karyawan.
- Pesan kesalahan ditampilkan ketika login gagal.
- Pengguna yang sudah memiliki sesi aktif diarahkan sesuai perannya.
- Profil dan validitas sesi dimuat kembali dari backend saat aplikasi dibuka. Token disimpan selama tab/sesi browser berlangsung.
- Form password menyediakan tombol untuk menampilkan atau menyembunyikan password.

### Pendaftaran akun

Form pendaftaran mandiri menyediakan pilihan peran:

- **Karyawan:** nama lengkap, email, password, konfirmasi password, departemen, posisi, dan nomor telepon opsional.
- **Admin:** nama lengkap, email, password, konfirmasi password, dan kode undangan admin.

Password pendaftaran minimal 8 karakter dan harus sama dengan konfirmasinya. Email yang telah digunakan tidak dapat didaftarkan kembali. Pendaftaran admin hanya dapat dilakukan jika `ADMIN_REGISTRATION_CODE` telah dikonfigurasi di backend. Pendaftaran karyawan membuat akun sekaligus data karyawan.

### Lupa dan reset password

- Pengguna memasukkan email untuk meminta reset password.
- Token reset berlaku 15 menit.
- Pada mode development, token reset dikembalikan oleh backend dan ditampilkan pada halaman agar dapat digunakan untuk membuat password baru.
- Password baru minimal 8 karakter dan harus cocok dengan konfirmasi.
- Pada `NODE_ENV=production`, reset password tidak tersedia sampai layanan pengiriman email dikonfigurasi.

### Navigasi dan sesi

- Sidebar menampilkan menu sesuai peran, nama pengguna, posisi, tanggal, dan tombol keluar.
- Navigasi sidebar dapat dibuka pada tampilan mobile.
- Tombol keluar menghapus token dan informasi pengguna dari sesi browser.
- Halaman aplikasi selain login mengarahkan pengguna yang belum masuk kembali ke halaman login.

## Fitur karyawan

### Dashboard karyawan

Dashboard menampilkan:

- Sapaan sesuai waktu, nama, posisi, dan departemen pengguna.
- Jam dan tanggal saat ini.
- Jumlah catatan berstatus hadir/terlambat, izin, sakit, dan alpha.
- Catatan absensi hari ini, meliputi jam masuk, jam pulang, status, durasi kerja, dan keterangan jika tersedia.
- Maksimal lima catatan absensi terbaru selain catatan hari ini.

### Check-in dan check-out

- Karyawan dapat melakukan check-in maksimal satu kali per hari.
- Check-out hanya dapat dilakukan setelah check-in dan maksimal satu kali per hari.
- Waktu check-in dan check-out dicatat oleh backend.
- Check-in setelah pukul 08.00 diberi status **Terlambat**; check-in sampai dengan pukul 08.00 diberi status **Hadir**.
- Tombol check-in/check-out dinonaktifkan ketika aksi tidak sesuai dengan status absensi hari itu.
- Durasi kerja dihitung dari selisih waktu check-in dan check-out jika keduanya tersedia.

### Pengajuan izin atau sakit

- Pengajuan hanya berlaku untuk hari berjalan.
- Karyawan memilih jenis **Izin** atau **Sakit** dan mengisi keterangan.
- Keterangan wajib diisi sebelum pengajuan dapat dikirim.
- Pengajuan dicatat sebagai status kehadiran pada hari tersebut.
- Pengajuan tidak dapat dikirim jika sudah ada catatan absensi untuk hari itu.

### Riwayat absensi

Halaman riwayat menampilkan ringkasan jumlah hari berdasarkan status, total jam kerja, dan total hari yang tercatat. Tabel menampilkan tanggal, waktu masuk/pulang, jam kerja, status, dan keterangan.

Pengguna dapat:

- Mencari catatan berdasarkan tanggal.
- Memfilter berdasarkan status: Hadir, Terlambat, Izin, Sakit, atau Alpha.
- Membuka hasil dalam halaman berisi maksimal delapan catatan.

## Fitur admin

### Dashboard admin

Dashboard menampilkan ringkasan hari ini:

- Total akun karyawan aktif yang tercatat.
- Jumlah hadir, terlambat, izin, sakit, alpha, dan belum melakukan absensi.
- Persentase kehadiran hari ini.
- Grafik status kehadiran tujuh hari terakhir.
- Diagram status kehadiran hari ini.
- Tabel absensi hari ini yang berisi nama, posisi, departemen, waktu masuk/pulang, dan status.

Status **belum absen** pada dashboard merupakan jumlah karyawan tanpa catatan absensi hari ini. Dashboard menghitung angka dari data karyawan dan catatan absensi yang tersedia.

### Manajemen karyawan

Halaman manajemen karyawan menampilkan nama, posisi, departemen, email, telepon, status akun, tanggal bergabung, serta absensi terakhir.

Admin dapat:

- Mencari karyawan berdasarkan nama, email, atau posisi.
- Memfilter daftar berdasarkan departemen.
- Menavigasi daftar dengan pagination, enam karyawan per halaman.
- Menambah akun karyawan dengan nama, email, password, departemen, posisi, telepon, dan tanggal bergabung.
- Mengubah nama, departemen, posisi, dan telepon karyawan.
- Menghapus akun karyawan setelah konfirmasi.

Pada form tambah karyawan, password default yang digunakan jika kolom password tidak diisi adalah `mcc123`. Saat karyawan dihapus, akun pengguna, profil karyawan, dan catatan absensinya turut dihapus dari penyimpanan aplikasi.

### Laporan dan ekspor

Admin dapat memilih bulan dan departemen untuk melihat:

- Jumlah catatan Hadir, Terlambat, Izin, Sakit, dan Alpha.
- Total jam kerja, jumlah catatan, dan jumlah karyawan yang tercatat.
- Grafik tren harian yang menampilkan status Hadir, Terlambat, dan Izin.
- Grafik perbandingan kehadiran antar departemen.
- Tabel rekap per karyawan: nama, posisi, departemen, jumlah tiap status, dan total jam kerja.

Ekspor CSV tersedia melalui tombol **Export Excel**. File yang diunduh berformat `.csv` dengan nama laporan berdasarkan bulan terpilih.

### Log aktivitas admin

Halaman log mencatat aktivitas penambahan, perubahan, dan penghapusan data karyawan. Informasi yang ditampilkan mencakup jenis aktivitas, email admin, nama karyawan, rincian nilai sebelum/sesudah, serta waktu aktivitas.

Admin dapat mencari berdasarkan admin, karyawan, atau nama field, memfilter jenis aktivitas, dan memuat ulang daftar log. Backend mengembalikan maksimal 200 log terbaru.

## Status kehadiran dan aturan bisnis saat ini

Status yang digunakan aplikasi:

| Status | Makna pada aplikasi |
| --- | --- |
| Hadir | Check-in dilakukan sampai dengan pukul 08.00. |
| Terlambat | Check-in dilakukan setelah pukul 08.00. |
| Izin | Karyawan mengirim pengajuan izin untuk hari berjalan. |
| Sakit | Karyawan mengirim pengajuan sakit untuk hari berjalan. |
| Alpha | Ditampilkan dalam ringkasan, tetapi backend saat ini tidak membuat status ini secara otomatis. |

Satu karyawan hanya dapat memiliki satu catatan absensi per hari. Semua tanggal dan aturan jam mengikuti waktu yang dibaca oleh proses backend; zona waktu deployment perlu ditetapkan untuk penggunaan produksi.

## Data dan layanan backend

Backend menyediakan alur API untuk autentikasi (login, pendaftaran, profil, lupa/reset password), daftar dan pengelolaan karyawan, pembacaan catatan absensi, tindakan check-in/check-out/pengajuan izin-sakit, dan pembacaan log audit admin.

Data akun, profil karyawan, catatan absensi, dan log audit disimpan pada `backend/data.json`. Penyimpanan ini cocok untuk prototipe/pengembangan satu instance, bukan sebagai pengganti basis data produksi dengan kebutuhan konkurensi, backup, dan pemulihan.

Password disimpan sebagai hash, bukan teks biasa. Token akses backend berlaku tujuh hari. Perubahan data karyawan melalui admin menghasilkan catatan audit.

## Batasan dan hal yang perlu diputuskan untuk SRS

Hal-hal berikut perlu diperlakukan sebagai batasan implementasi sekarang atau keputusan kebutuhan yang belum ditetapkan:

1. **Verifikasi lokasi belum nyata.** Frontend mengirim koordinat tetap kantor MCC untuk check-in/check-out. Browser tidak meminta lokasi aktual pengguna dan backend belum memeriksa geofence.
2. **Tidak ada persetujuan izin/sakit.** Pengajuan langsung menjadi catatan berstatus Izin/Sakit; tidak ada alur persetujuan admin maupun unggah bukti.
3. **Status Alpha tidak dibuat otomatis.** Belum ada proses penjadwalan atau aturan yang membuat catatan Alpha bagi karyawan yang tidak melakukan absensi.
4. **PDF belum benar-benar diekspor.** Tombol **Export PDF** hanya menampilkan notifikasi; implementasi ekspor PDF belum tersedia.
5. **Ekspor Excel menghasilkan CSV.** Tombol ekspor yang tersedia menghasilkan file CSV, bukan workbook `.xlsx`.
6. **Belum ada pengaturan jadwal kerja.** Batas terlambat 08.00 dan jam pulang 17.00 ditampilkan/digunakan sebagai aturan tetap, bukan konfigurasi per shift/departemen.
7. **Pengelolaan akun terbatas.** Admin dapat melihat status aktif/nonaktif, tetapi belum tersedia aksi untuk menonaktifkan/mengaktifkan akun. Email dan status akun tidak dapat diubah melalui form edit karyawan.
8. **Reset password produksi belum tersedia.** Belum ada integrasi email untuk mengirim tautan/token reset.
9. **Penyimpanan masih berupa JSON lokal.** Belum ada basis data, pemisahan environment penyimpanan, atau mekanisme backup/retensi data.
10. **Akun admin baru memakai kode undangan bersama.** Belum ada alur persetujuan admin, undangan sekali pakai, atau pengelolaan administrator lain.
11. **Kebijakan privasi dan audit belum ditentukan.** Retensi data, ekspor data pribadi, batas akses historis, serta kebijakan penghapusan perlu diputuskan sebelum spesifikasi produksi.
12. **Aksesibilitas dan kebutuhan nonfungsional belum dispesifikasikan.** Target browser/perangkat, performa, ketersediaan, dan kebutuhan aksesibilitas perlu dirumuskan dalam SRS.

## Akun awal

Jika `backend/data.json` belum tersedia, backend membuat akun demonstrasi berikut:

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@mcc.id` | `admin123` |
| Karyawan | `budi@mcc.id` | `karyawan123` |

Akun dapat berbeda jika berkas data yang sudah ada digunakan. Ganti atau hapus kredensial demonstrasi sebelum deployment.

## Konfigurasi deployment

Sebelum deployment:

- Atur `JWT_SECRET` ke nilai acak yang kuat dan rahasiakan nilainya.
- Atur `ADMIN_REGISTRATION_CODE` ke kode acak yang hanya diberikan kepada admin yang berwenang. Contoh pada PowerShell:

  ```powershell
  $env:ADMIN_REGISTRATION_CODE="kode-undangan-acak"
  npm run server
  ```

- Atur `CORS_ORIGIN` ke origin frontend yang diizinkan. Nilai default `*` hanya ditujukan untuk pengembangan lokal.
- Atur `DATA_PATH` bila berkas data perlu disimpan di lokasi tertentu.
- Atur `VITE_API_URL` saat frontend perlu mengakses backend pada alamat berbeda.
- Konfigurasikan layanan pengiriman email sebelum mengaktifkan reset password di produksi.
- Jangan gunakan password akun demonstrasi atau password default karyawan pada deployment.
