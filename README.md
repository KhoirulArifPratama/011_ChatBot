# TimTam — AI Chatbot

Aplikasi chatbot web interaktif berbasis **Node.js** dan **Express** yang terhubung ke layanan **OpenRouter API** dengan antarmuka bertema minimalis modern (monochrome / hitam-putih). Mendukung fitur *streaming response* secara real-time menggunakan Server-Sent Events (SSE) dan sistem failover multi-model gratis untuk menjamin keandalan layanan.

---

## 🌟 Fitur Utama

- **Desain Minimalis Monochrome**: Antarmuka bersih hitam-putih yang elegan, nyaman dilihat, dan responsif untuk mobile maupun desktop.
- **Real-Time Streaming**: Menampilkan respons teks kata-per-kata secara langsung melalui Server-Sent Events (SSE).
- **Identitas Personal TimTam**: Dilengkapi dengan avatar logo, nama brand, dan *system prompt* terarah.
- **Automatic Model Failover**: Menggunakan daftar kandidat model AI gratis dengan failover otomatis saat terjadi batas kuota upstream (HTTP 429).
- **Friendly Error Handling**: Penanganan kesalahan yang ramah pengguna jika terjadi kendala pada server atau jaringan.

---

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js, dotenv
- **Frontend**: HTML5, CSS3 (Modern Flexbox & CSS Variables), Vanilla JavaScript
- **AI Provider**: OpenRouter API (Streaming Chat Completions)

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Clone Repositori
```bash
git clone https://github.com/KhoirulArifPratama/-011_ChatBot.git
cd -011_ChatBot
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan masukkan API Key OpenRouter Anda:
```env
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
PORT=3000
```

### 4. Jalankan Aplikasi
```bash
npm start
# atau
node index.js
```

Buka browser Anda dan akses:
```
http://localhost:3000
```

---

## 📁 Struktur Direktori

```
├── public/
│   ├── index.html       # Struktur antarmuka chat
│   ├── style.css        # Desain tema minimalis hitam-putih
│   ├── script.js       # Logika interaksi frontend & streaming SSE
│   └── logo.png         # Aset logo TimTam
├── .env.example         # Template konfigurasi environment
├── .gitignore           # File yang diabaikan oleh Git
├── index.js             # Server Express & integrasi OpenRouter
├── package.json         # Konfigurasi dependensi project
└── README.md            # Dokumentasi project
```

---

## 👤 Penulis

- **Khoirul Arif Pratama** ([@KhoirulArifPratama](https://github.com/KhoirulArifPratama))
