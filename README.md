# Portal RSVP Majlis Apresiasi SUKNA-21 — Google Sheet Version

Portal ini tidak lagi menggunakan Supabase.

## Google Sheet

https://docs.google.com/spreadsheets/d/1Z8uafVcuju1rx2P7WfE2xSRbHs-k-NNOxgIh8qIW0Uw/edit

Sheet disediakan dengan tiga tab:
- `Masterlist` — 99 nama pegawai + Bahagian
- `RSVP` — jawapan Hadir / Tidak Hadir
- `Dashboard` — ringkasan dalam Google Sheet

## Sambungkan portal ke Google Sheet

1. Buka Google Sheet di atas.
2. Pilih **Extensions → Apps Script**.
3. Padam kod contoh dan paste seluruh kandungan fail `Code.gs`.
4. Klik **Deploy → New deployment**.
5. Pilih **Web app**.
6. `Execute as`: **Me**
7. `Who has access`: **Anyone**
8. Klik **Deploy**, authorize jika diminta.
9. Copy URL yang berakhir dengan `/exec`.
10. Buka `config.js` dalam repo dan tukar:

```js
googleScriptUrl: "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

kepada URL `/exec` tadi.

Selepas itu portal RSVP dan dashboard urusetia akan menggunakan Google Sheet ini sahaja.

## URL portal
https://sukna21.github.io/Majlis-Apresiasi/

## Urusetia
Username: `admin`
Password: `12345678`
