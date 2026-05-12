# 📦 Input Transaksi — Web App

Website input transaksi barang masuk/keluar yang terhubung ke Google Sheets secara real-time.

---

## 🗂️ Struktur File

```
├── index.html           → Form input transaksi (halaman utama)
├── transaksi.html       → Riwayat & dashboard transaksi (auto-refresh 30 detik)
├── apps-script/
│   └── Code.gs          → Backend Google Apps Script (API)
└── README.md
```

---

## 🚀 Cara Setup (Langkah demi Langkah)

### LANGKAH 1 — Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama, misal: **"Database Transaksi Barang"**
3. Catat **ID Spreadsheet** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_ADA_DI_SINI/edit
   ```

### LANGKAH 2 — Setup Google Apps Script

1. Di Google Sheets, klik menu **Extensions → Apps Script**
2. Hapus semua kode yang ada
3. Copy-paste seluruh isi file `apps-script/Code.gs`
4. Ganti baris ini dengan ID spreadsheet Anda:
   ```javascript
   const SPREADSHEET_ID = 'PASTE_ID_SPREADSHEET_ANDA_DI_SINI';
   ```
5. Klik **Save** (ikon disket)

### LANGKAH 3 — Inisialisasi Sheet

1. Di Apps Script, pilih fungsi `setupSheets` dari dropdown
2. Klik **Run** ▶️
3. Izinkan akses saat diminta (klik "Allow")
4. Dua sheet akan dibuat otomatis: **Barang** dan **Transaksi**
5. Edit sheet **Barang** — tambahkan nama-nama barang di kolom A (mulai baris 2)

### LANGKAH 4 — Deploy sebagai Web App

1. Klik **Deploy → New Deployment**
2. Klik ikon ⚙️ → pilih **Web App**
3. Isi pengaturan:
   - **Description**: `Input Transaksi API v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` ← PENTING!
4. Klik **Deploy**
5. **Salin URL Web App** yang muncul (bentuknya seperti):
   ```
   https://script.google.com/macros/s/XXXXXXXX/exec
   ```

### LANGKAH 5 — Pasang URL ke HTML

Buka **`index.html`** dan **`transaksi.html`**, cari baris ini di kedua file:

```javascript
const API_URL = 'GANTI_DENGAN_URL_APPS_SCRIPT_WEB_APP';
```

Ganti dengan URL yang Anda salin tadi:

```javascript
const API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### LANGKAH 6 — Upload ke GitHub & Aktifkan GitHub Pages

1. Buat repository baru di [GitHub](https://github.com/new)
   - Nama: misal `transaksi-barang`
   - Visibility: **Public** (wajib untuk GitHub Pages gratis)
2. Upload semua file (`index.html`, `transaksi.html`, `README.md`)
3. Buka **Settings → Pages**
4. Pada **Source**, pilih: `Deploy from a branch`
5. Branch: `main`, Folder: `/ (root)` → klik **Save**
6. Tunggu 1-2 menit, website Anda aktif di:
   ```
   https://USERNAME.github.io/NAMA-REPO/
   ```

---

## ✅ Cara Pakai

| Halaman | URL | Fungsi |
|---------|-----|--------|
| Form Input | `/index.html` | Input transaksi baru |
| Riwayat | `/transaksi.html` | Lihat & filter semua transaksi, auto-refresh 30 detik |

---

## 🔄 Real-Time Sync

- Data tersimpan **langsung ke Google Sheets** saat form disubmit
- Halaman `transaksi.html` **auto-refresh setiap 30 detik**
- Bisa klik tombol **🔄 Refresh** kapan saja

---

## ⚠️ Catatan Penting

- Jika deploy ulang Apps Script (update kode), Anda harus **Deploy → Manage Deployments → Edit** dan pilih versi baru — URL tetap sama
- Jangan ganti `Who has access` ke selain `Anyone`, nanti website tidak bisa akses API
- Sheet **Barang** = daftar barang yang bisa dipilih di form
- Sheet **Transaksi** = log semua transaksi yang masuk

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Gagal terhubung" | Pastikan `API_URL` sudah diisi dan Apps Script sudah di-deploy |
| Daftar barang kosong | Tambahkan data di sheet "Barang" kolom A mulai baris 2 |
| Transaksi tidak tersimpan | Cek Console browser (F12) untuk pesan error |
| CORS error | Pastikan `Who has access: Anyone` saat deploy |
