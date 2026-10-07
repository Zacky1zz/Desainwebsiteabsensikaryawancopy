
  # Desain Website Absensi Karyawan (Copy)

  This is a code bundle for Desain Website Absensi Karyawan (Copy). The original project is available at https://www.figma.com/design/gnvZXj09oQQeGlaHheCpVG/Desain-Website-Absensi-Karyawan--Copy-.

  ## Menjalankan aplikasi

  Install dependency frontend sekali:

  ```sh
  npm install
  ```

  Jalankan backend dan frontend di dua terminal:

  ```sh
  npm run server
  ```

  ```sh
  npm run dev
  ```

  Buka URL Vite yang ditampilkan di terminal. Backend berjalan di `http://localhost:5000/api/v1` dan membuat `backend/data.json` otomatis saat pertama kali dijalankan.

  Akun awal:

  | Peran | Email | Password |
  | --- | --- | --- |
  | Admin | `admin@mcc.id` | `admin123` |
  | Admin | `moon@mcc.id`  | `12345678` |
  | Karyawan | `budi@mcc.id` | `karyawan123` |

  Halaman login menyediakan pendaftaran mandiri karyawan. Pendaftaran akun admin memerlukan kode undangan; atur environment variable `ADMIN_REGISTRATION_CODE` di backend dan bagikan kodenya hanya kepada admin yang berwenang. Kode tidak disimpan di frontend. Untuk mengaktifkan pendaftaran admin :
  
  $env:ADMIN_REGISTRATION_CODE="kode-undangan-acak"; npm run server

  Data disimpan lokal di `backend/data.json`. Untuk deployment, atur environment variable `JWT_SECRET` ke nilai acak yang kuat, `ADMIN_REGISTRATION_CODE` ke kode undangan acak, dan `CORS_ORIGIN` ke origin frontend yang diizinkan. Default `CORS_ORIGIN=*` hanya ditujukan untuk development lokal.

  Fitur lupa password mengembalikan token reset 15 menit di response backend saat development; halaman login menampilkannya untuk akun yang terdaftar. Reset password otomatis dinonaktifkan pada `NODE_ENV=production` sampai layanan pengiriman email dikonfigurasi.
  