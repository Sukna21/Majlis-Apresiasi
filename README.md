# Portal RSVP Majlis Apresiasi SUKNA-21 Selangor 2026

Portal ini disediakan untuk semakan kehadiran Majlis Apresiasi pada **Isnin, 28 September 2026**, 11.30 pagi – 2.30 petang di Royal Songket, Hotel Mardiyyah, Shah Alam.

## Halaman

- `index.html` — Borang RSVP
- `admin.html` — Dashboard kehadiran
- `masterlist_template.csv` — Template nama jemputan
- `styles.css` — Rekaan UI
- `app.js` / `admin.js` — Fungsi portal
- `config.js` — Sambungan Supabase

## Backend

Supabase project telah disediakan dengan:
- `sukna21_invitees`
- `sukna21_rsvps`
- RPC `submit_sukna21_rsvp`
- RPC `search_sukna21_invitees`
- paparan selamat `sukna21_rsvp_public`
- paparan selamat `sukna21_invitees_public`

RSVP ditutup secara automatik pada **27 September 2026, 11:59 malam (MYT)**.

## Masterlist

Isi fail `masterlist_template.csv` seperti berikut:

```csv
Nama,Bahagian/Unit,No Telefon
Nama Contoh,Bahagian Rancangan Pembangunan,0123456789
```

Selepas masterlist dimasukkan ke Supabase, dashboard akan automatik mengira **Belum Menjawab**.

## Cadangan URL GitHub Pages

https://faeiruzrusman.github.io/SUKNA-Lucky-Draw/apresiasi-rsvp/

Dashboard:
https://faeiruzrusman.github.io/SUKNA-Lucky-Draw/apresiasi-rsvp/admin.html
