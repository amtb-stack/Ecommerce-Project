# Isi Balang Raya Opah

Permainan web untuk kempen Raya 2027 The Baker. Malam Raya di dapur Opah: saudara-mara datang minta kuih, dan pemain mengisi 10 balang secepat mungkin. Yang paling pantas menang hadiah misteri mingguan.

Permainan ini berjalan dalam pelayar telefon atau komputer. Tiada aplikasi perlu dipasang dan tiada pendaftaran sebelum bermain.

## Cara main

- Tiga balang ada atas meja. Setiap balang ada kad yang menunjukkan kuih yang diminta.
- Oven **The Baker E-1AG** sentiasa membakar kuih ke dulang.
- Seret kuih ke balang yang betul. Pemain juga boleh tekan kuih, kemudian tekan balang.
- Salah balang: kuih melantun balik dan **masa ditambah 1 saat**.
- **Adik nak tolong**: kadang-kadang Adik letak mainan atas dulang, atau masukkan kuih salah ke dalam balang. Tekan untuk alihkan.
- Setiap balang yang siap menyalakan satu pelita di luar tingkap. 10 balang siap, rumah Opah terang dan bunga api dilepaskan.
- **Had masa 90 saat.** Pemain yang tak siap tidak masuk papan pemenang.
- Bintang: 45 saat ke bawah dapat 3 bintang, 60 saat ke bawah dapat 2 bintang, dan siap dalam had masa dapat 1 bintang.

Kuih: tart nenas, semperit, almond london, cornflakes madu, coklat cip dan biskut makmur.

Watak: Opah, Adik, dan saudara-mara serta jiran (Mak Long, Pak Su, Kak Ton, Atuk, Uncle Lim dan Kak Ngah).

## Cara pemenang ditentukan

1. Masa paling cepat (milisaat), bagi pemain yang siap 10 balang.
2. Jika masa sama: kesilapan paling sedikit.
3. Jika masih sama: rekod yang diterima pelayan dahulu.

Semua pemain dalam minggu yang sama mendapat **cabaran yang sama**: urutan pesanan dan masa gangguan Adik ditetapkan daripada nama cabaran (contoh `raya27-minggu-2`). Cabaran bertukar setiap Isnin mengikut `CONFIG.campaign` dalam `game.js`. Sebelum tarikh mula kempen, permainan menunjukkan "Cabaran Latihan".

### Pengesahan rekod (anti-penipuan)

Pelayar menghantar log setiap gerakan pemain. Pelayan **tidak mempercayai masa yang dihantar**. Ia main semula log itu dengan fail peraturan yang sama (`sim.js`), dan menerima rekod hanya jika keputusannya sama tepat.

```bash
node server/verify.js --uji
```

```bash
node server/verify.js rekod.json
```

Arahan pertama menjalankan ujian sendiri: rekod jujur diterima, masa palsu ditolak, log yang diubah ditolak, dan pemecah seri betul. Arahan kedua mengesahkan satu rekod.

Fungsi `verifyRun()` dan `rank()` dalam `server/verify.js` boleh terus digunakan dalam pelayan Node (contohnya Firebase Functions, Supabase Edge Functions atau Vercel). Rekod luar biasa pantas (bawah 22 saat) atau gerakan terlalu laju akan ditandakan untuk semakan manual.

## API papan pemenang (perlu dibina)

Tetapkan `CONFIG.apiBase` dalam `game.js`. Selagi ia kosong, permainan berjalan dalam **mod demo** dan rekod hanya disimpan dalam peranti pemain. Pelayan perlu menyediakan:

| Laluan | Kegunaan |
| --- | --- |
| `POST /mula` | Dipanggil semasa kiraan mundur. Pulangkan `{ token }` dan simpan waktu mula di pelayan. |
| `POST /rekod` | Badan: `{ cabaran, seed, log, masaMs, kesilapan, nama, telefon, setuju, token, masaPelayanMs }`. Sahkan dengan `verifyRun()`, kira `masaPelayanMs` daripada waktu token, simpan rekod terbaik untuk setiap nombor telefon, dan pulangkan `{ ok, kedudukan }` atau `{ ok: false, sebab }`. |
| `GET /papan?cabaran=minggu-1` | Pulangkan 10 teratas: `[{ nama, masaMs, kesilapan }]`, disusun dengan `rank()`. |

Perkara lain yang perlu disediakan sebelum pelancaran:
- pengesahan nombor telefon dengan kod OTP
- Terma & Syarat peraduan dan Notis Privasi (PDPA). Borang sudah meminta persetujuan, tetapi belum ada pautan ke dokumennya.
- tapisan nama paparan di pelayan
- semakan manual 10 teratas sebelum pemenang diumumkan

## Jalankan di komputer

```bash
cd raya-game
python3 -m http.server 8000
```

Kemudian buka http://localhost:8000.

## Fail

| Fail | Isi |
| --- | --- |
| `index.html` | Skrin tajuk, skrin tamat, papan pemenang dan kad kongsi |
| `style.css` | Gaya skrin |
| `sim.js` | Peraturan perlumbaan (deterministik, dikongsi dengan pelayan) |
| `game.js` | Lukisan dapur Opah, animasi, kawalan, skrin dan tracking |
| `audio.js` | Muzik dan kesan bunyi |
| `server/verify.js` | Pengesah rekod untuk pelayan |
| `assets/thebaker-logo.png` | Logo |
| `assets/e1ag-oven.webp` | Gambar E-1AG untuk kad produk Shopee |

Semua grafik dalam permainan dilukis terus dalam kod: dapur, watak, kuih, oven dan mixer.

## Muzik

Dua lagu **ciptaan asal**, dijana dalam pelayar (tiada fail audio dimuat turun):
- **"Zapin Dapur Opah"** semasa perlumbaan: 112 BPM, gambus, akordion, marwas, dalam skala D minor harmonik.
- **"Lofi Malam Raya"** di menu: 76 BPM, suling, piano elektrik dan bunyi piring hitam.

Lagu Raya sedia ada seperti "Berlalulah Sudah Ramadhan" tidak digunakan atau ditiru. Lagu itu dilindungi hak cipta dan memerlukan lesen untuk kempen komersial. Jika The Baker mendapatkan lesen untuk lagu atau versi lofi tertentu, `audio.js` boleh ditukar untuk memainkan fail audio itu.

## Sebelum pelancaran

1. **Pautan Shopee:** tukar `CONFIG.productUrl` dalam `game.js` kepada pautan produk E-1AG di Shopee Mall. Sekarang ia pautan carian.
2. **Tarikh kempen:** semak `CONFIG.campaign` (sekarang mula 11 Januari 2027, 8 minggu).
3. **Meta Pixel:** tampal kod asas dalam `<head>` pada `index.html`. Permainan menghantar acara melalui `fbq('trackCustom', …)` dan `window.dataLayer`:

   | Acara | Bila | Parameter |
   | --- | --- | --- |
   | `GameView` | Halaman dibuka | `challenge` |
   | `RaceStart` | Perlumbaan pertama | `challenge`, `round` |
   | `Replay` | Perlumbaan seterusnya | `challenge`, `round` |
   | `RaceFinish` | Siap 10 balang | `challenge`, `ms`, `mistakes`, `stars` |
   | `RaceTimeout` | Masa tamat | `challenge`, `done` |
   | `EngagedPlayer` | Selesai pusingan ketiga | `rounds` |
   | `LeaderboardSubmit` | Hantar rekod | `challenge`, `ms` |
   | `ShareOpen` / `ShareComplete` | Kongsi | `ms` / `method` |
   | `ShopeeClick` | Tekan kad produk | `product`, `ms` |

4. **Laraskan kesukaran** selepas uji main dengan pemain sebenar. Nilai bintang ada dalam `CONFIG.starMs`, manakala had masa, denda dan kelajuan oven ada dalam `RULES` dalam `sim.js`. Jika `RULES` diubah, pelayan mesti menggunakan `sim.js` yang sama.
