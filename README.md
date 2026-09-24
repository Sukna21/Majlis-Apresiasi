# Portal RSVP Majlis Apresiasi SUKNA-21 Selangor 2026

Versi ini telah disesuaikan dengan tema poster ungu + hitam + emas.

## Halaman

- `index.html` — Portal RSVP awam
- `urusetia.html` — Halaman log masuk urusetia
- `admin.html` — Dashboard urusetia
- `qr.html` — Paparan QR RSVP

## Status RSVP

Hanya dua pilihan:
- Hadir
- Tidak Hadir

Tiada ruangan nombor telefon dan tiada ruangan catatan.

## Urusetia

Username: `admin`  
Password: `12345678`

Dashboard tidak dipautkan pada halaman awam.

> Nota: GitHub Pages ialah hosting statik. Login ini berfungsi sebagai sekatan UI ringan (client-side), bukan sistem keselamatan server-grade.

## URL GitHub Pages

Portal:
https://sukna21.github.io/Majlis-Apresiasi/

Urusetia:
https://sukna21.github.io/Majlis-Apresiasi/urusetia.html

Dashboard:
https://sukna21.github.io/Majlis-Apresiasi/admin.html

QR:
https://sukna21.github.io/Majlis-Apresiasi/qr.html


## Perubahan v4

- Tajuk portal disusun kepada 3 baris:
  1. Majlis Apresiasi
  2. Kejohanan Sukan Nasional Perancangan Bandar dan Desa Ke-21 (SUKNA21)
  3. Selangor 2026
- Bahagian kini menggunakan dropdown sahaja.
- Senarai bahagian: Pentadbiran dan Kewangan, Perancangan Korporat, Pengawalan Perancangan, Rancangan Pembangunan.
- Suggestion nama menggunakan masterlist 99 pegawai dalam Supabase dan akan mengisi Bahagian secara automatik apabila nama dipilih.

## Hotfix v4.1

- Memperbaiki masalah "Senarai nama tidak dapat dimuatkan".
- `config.js` kini menggunakan legacy anon JWT yang serasi dengan direct Supabase REST/RPC.
- Suggestion nama kini baca terus `masterlist_pegawai_jpbd_selangor.csv` dari repo sebagai sumber utama.
- Supabase digunakan sebagai fallback dan untuk menyimpan RSVP.

## Hotfix v4.2

- Dashboard admin kini menggunakan RPC `get_sukna21_dashboard()`.
- Tidak lagi bergantung kepada GET terus ke database view.
- Memperbaiki ralat `Gagal mendapatkan data`.
- Jumlah jemputan kini terus membaca 99 nama masterlist dari Supabase.
