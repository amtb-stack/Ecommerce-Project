# Vespa Raya The Baker

Permainan runner pixel art 2D dengan sentuhan arked (shading tebal, letupan, asap, serpihan, HUD logam berivet).
Penunggang berbusana Melayu (songkok, baju Melayu sedondon, samping songket, capal) membawa vespa untuk menghantar 30 kuih raya, dari siang hingga malam raya.
Semua grafik dilukis dengan kod (tiada fail imej), muzik & bunyi disintesis dengan WebAudio.

![Contoh frame](preview/frames.png)

## Cara jalankan

Buka `index.html` dalam pelayar, atau hidangkan folder ini:

```bash
npx serve vespa-raya
```

## Kawalan

| Tindakan | Sentuh | Papan kekunci |
| --- | --- | --- |
| Lompat (tekan lama = lebih tinggi) | Tekan mana-mana bahagian skrin | Space / ↑ |
| Hantar kuih / balang | Butang **HANTAR** | Enter / → |
| Rehat | Butang ‖ | P / Esc |

## Laluan

1. **Hantaran 1–10, jalan bersama** (siang): lubang, batu, bonggol, ayam & anak ayam melintas, angsa pengejar, jambatan patah, duit raya, satu rumah terbuka.
2. **SIMPANG**: pemain ada **5 saat** untuk pilih Kampung A (atas) atau Kampung B (bawah). Halangan tidak didedahkan. Kalau tiada pilihan, jalan dipilih rawak.
3. **Hantaran 11–29 dalam kampung pilihan.** Kedua-dua kampung guna **benih rawak yang sama** untuk susunan halangan, jadi bilangan, jarak dan masa reaksi sama. Hanya "kulit" halangan berbeza.
4. **Hantaran 30, Rumah Opah**: rumah paling besar (gaya Rumah Melaka, tangga berjubin) dengan ketuhar **The Baker**. Tekan HANTAR 3x untuk bonus.

| Peranan halangan | Kampung A: Kampung Ketupat (cerah, sawah) | Kampung B: Kampung Lemang (hujan lebat, tepi paya) |
| --- | --- | --- |
| Lompat pendek | Mercun di jalan | Katak melompat |
| Lompat panjang | Lembu tidur tengah jalan | Banjir + batang hanyut |
| Jatuh dari atas | Durian runtuh | Dahan patah selepas petir |
| Pengejar dari belakang (-2 nyawa) | Motor besar | Kereta lama percik air |
| Ikut rentak | Budak main meriam buluh | Petir menyambar lopak |
| Curi markah (tak hilang nyawa) | Kera curi kuih | Payung makcik terbang |
| Rumah | Rumah kampung tebar layar | Rumah Kutai: tiang tinggi, dinding kelarai, atap limas nipah |

Di Kampung B penunggang memakai baju hujan plastik dan beg plastik merah atas songkok. Hujan berhenti dekat Rumah Opah.

## Muzik (gubahan asal)

Dalam permainan, muzik mengikut ciri lagu raya klasik 1950-90an: tonaliti major, biola dan akordion dengan orkestra kecil, rebana dan gong, serta rentak joget, inang atau rentak Latin seperti cha-cha.

| Keadaan | Rentak & alat |
| --- | --- |
| Menu, keputusan | Gamelan Melayu: saron, keromong, gambang, kenong, gong agung, gendang ibu/anak |
| Jalan bersama & Kampung Ketupat | Cha-cha raya, G major: biola, akordion, bass petik, guiro, konga, tamborin, kompang, gong |
| Kampung Lemang | Inang raya, D major: seruling, biola, akordion, gendang ibu/anak, rebana, kompang, gong (+ bunyi hujan & guruh) |
| Fasa seterusnya | Makin meriah: akordion menggandakan melodi, seruling harmoni, kompang |
| Nyawa tinggal 1 | Lagu sama lebih laju, degupan jantung, tremolo biola |
| ALAHAI OPPS | Trombon sedih "wah-wah-wah-waaah", boing, ba-dum-tss, kemudian tuba oom-pah + kazoo |

## Aliran skrin

Menu → Daftar PDPA (nama, telefon, e-mel pilihan, setuju; sekali sahaja) → Kiraan 3-2-1 → Jalan bersama → SIMPANG (5 saat) → Kampung A/B → Rumah Opah → Misi Selesai → Keputusan.
Nyawa habis → skrin "ALAHAI! OPPS!".

## Terbitkan & kumpul data

Pautan artifak Claude sesuai untuk **pratonton** sahaja: pemain perlu log masuk claude.ai dan data kekal dalam peranti mereka.
Untuk kempen sebenar, hos folder ini di laman sendiri dan hantar data ke **Google Sheet** anda (percuma, tiada pelayan).

### 1. Sediakan Google Sheet (penerima data)

1. Cipta Google Sheet baharu, cth. "Vespa Raya - Data Pemain".
2. **Extensions → Apps Script**. Padam kod contoh, tampal semua kandungan [`apps-script/Code.gs`](apps-script/Code.gs), Save.
3. Pilih fungsi `setup` di bar atas → **Run** → benarkan akses. Helaian **Pemain** dan **Permainan** akan dicipta.
4. **Deploy → New deployment →** ikon gear → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. **Deploy**, salin **Web app URL** (berakhir dengan `/exec`).

### 2. Isi `config.js`

```js
endpoint: 'https://script.google.com/macros/s/XXXX/exec',
organiser: 'The Baker',
contact: 'e-mel atau WhatsApp rasmi anda',
```

Medan borang (telefon wajib, e-mel pilihan, kotak promosi) boleh dihidup/matikan dalam fail yang sama.
Semak teks notis PDPA dalam `index.html` (bahagian `scr-pdpa`). Jika teks diubah, tukar `policyVersion` supaya pemain diminta setuju semula.

### 3. Hos laman (pilih satu, semua percuma dengan HTTPS)

| Hos | Cara |
| --- | --- |
| **Netlify Drop** (paling mudah) | Buka app.netlify.com/drop, seret folder `vespa-raya`. Daftar akaun percuma supaya laman kekal. Boleh tukar nama laman atau guna domain sendiri. |
| Cloudflare Pages | Workers & Pages → Create → Pages → **Upload assets** → muat naik folder `vespa-raya`. |
| GitHub Pages | Repositori awam → Settings → Pages → pilih cawangan. Laman di `/vespa-raya/`. |

Setiap kali `config.js` atau permainan diubah, muat naik semula folder itu.

### 4. Uji

Main sekali di telefon. Dalam 1 hingga 2 saat, baris baharu muncul dalam helaian **Pemain** dan **Permainan**.
Papan kedudukan dalam permainan kini menunjukkan **Semua pemain**.

### Data yang dikumpul

| Helaian | Lajur |
| --- | --- |
| Pemain (satu baris setiap pemain) | Kemas kini, ID Pemain, Nama, No. Telefon (+60…), E-mel, Setuju PDPA, Setuju Promosi, Versi Notis, Daftar Pertama, Bil. Main, Skor Terbaik |
| Permainan (satu baris setiap pusingan) | Diterima, ID Pemain, Nama, Keputusan (Selesai / Gagal / Berhenti), Skor, Hantaran, Masa (s), Kuih, Combo, Nyawa, Kampung, Benih, Masa Peranti, ID Rekod |

Muat turun sebagai Excel/CSV: **File → Download** dalam Google Sheet.
Papan kedudukan awam hanya mendedahkan nama, skor dan kampung. Telefon dan e-mel tidak pernah keluar dari Sheet.

### Nota

- Rekod disimpan dalam peti keluar peranti dahulu. Jika talian putus, ia dihantar semula bila permainan dibuka lagi. Rekod berulang ditapis oleh `ID Rekod`.
- Apps Script percuma sesuai untuk ratusan hingga beberapa ribu pemain sehari. Untuk kempen besar (ribuan serentak), pindah ke Supabase atau Firebase.
- Skor permainan pelayar boleh dipalsukan oleh orang yang mahir. Semak pemenang (Skor, Masa, Benih) sebelum memberi hadiah.
- Bila `Code.gs` diubah: Deploy → Manage deployments → Edit → Version: **New version** → Deploy. URL kekal sama.

## Pratonton setiap frame

Tambah `?frame=<nama>` pada URL untuk paparan statik satu skrin:
`menu`, `pdpa`, `caramain`, `jalan`, `simpang`, `kg-a1`, `kg-a2`, `kg-b1`, `kg-b2`, `kg-b-malam`, `opah`, `jatuh`, `keputusan`, `langgar`, `aset`, `aset2`.

## Di mana nak ubah

| Nak ubah | Lokasi dalam `game.js` |
| --- | --- |
| URL Google Sheet, medan borang, penganjur | `config.js` |
| Pendaftaran, hantar data, papan semua pemain | `Net`, `submitPdpa`, `recordGame`, `loadGlobalBoard` |
| Jumlah hantaran, kelajuan, lompatan | `TOTAL`, `SPEED_MIN/MAX`, `JUMP_V/GRAV` (atas fail) |
| Tetapan setiap kampung (langit, fasa, jam) | `VILLAGES`, `SKY_KETUPAT`, `SKY_LEMANG`, `PHASES`, `PHASES_LEMANG` |
| Jalan bersama & simpang | `buildLevel`, `SHARED_STOPS`, `checkFork`, `chooseRoad` |
| Kampung selepas simpang & Rumah Opah | `extendLevel`, `makeStop` |
| Peranan & jenis halangan | `fillHazards`, `ROLE_TYPE`, `ROLE_DIM`, `RHYTHM_PERIOD` |
| Tingkah laku halangan | `updateObstacles`, `stealKuih`, `updateChasers` |
| Pakaian penunggang (termasuk baju hujan) | `drawRider` |
| Rumah kampung / Kutai / Rumah Opah | `drawHouse`, `drawKutai`, `drawOpahHouse`, `drawOven` |
| Latar hujan & paya | `drawRiverBack`, `drawRain`, `rainK` |
| Nama penerima | `NAMES`, `NAMES_ORANG` |
| Teks bila terlanggar | `HURT_TEXT`, `HURT_LEMANG` |
| Letupan, asap, debu, serpihan | `drawExplo`, `drawPuff`, `fx()`, `debris()`, `hurt` |
| Muzik & bunyi gagal | `SONG_CHACHA`, `SONG_INANG`, `SONG_MENU`, `Sfx.crash`, `Sfx.stepDizzy` |
| Markah hantaran / combo | `deliver`, `comboMult` |

Teks butang & panel ada dalam `index.html`; gaya dalam `style.css`.
Papan kedudukan setempat disimpan dalam `localStorage`. Bila `endpoint` diisi, papan semua pemain diambil dari Google Sheet.
