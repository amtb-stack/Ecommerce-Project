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

## Kampung

| | Kampung Ketupat (A) | Kampung Lemang (B) |
| --- | --- | --- |
| Suasana | Sawah padi terbuka, langit cerah | Hutan lebat, redup kebiruan sejak tengah hari |
| Rumah | Rumah kampung bertiang, tebar layar | Rumah gonjong (gaya Minangkabau, Negeri Sembilan) |
| Hantaran | 30 rumah | 15 rumah berjauhan + 15 orang tepi jalan tunggu balang |
| Halangan | Lubang, batu, tahi lembu, angsa pengejar, kelapa jatuh, jambatan patah | Lopak lumpur, batu berlumut, pokok tumbang mengejut, tahi burung enggang, jambatan patah, satu motor besar (-2 nyawa) |
| Penamat | Rumah ke-30 | Simpang ke Kampung Ketupat |

## Muzik (gubahan asal)

Dalam permainan, muzik mengikut ciri lagu raya klasik 1950-90an: tonaliti major, biola dan akordion dengan orkestra kecil, rebana dan gong, serta rentak joget, inang atau rentak Latin seperti cha-cha.

| Keadaan | Rentak & alat |
| --- | --- |
| Menu, keputusan | Gamelan Melayu: saron, keromong, gambang, kenong, gong agung, gendang ibu/anak |
| Kampung Ketupat | Cha-cha raya, G major: biola, akordion, bass petik, guiro, konga, tamborin, kompang, gong |
| Kampung Lemang | Inang raya, D major: seruling, biola, akordion, gendang ibu/anak, rebana, kompang, gong |
| Fasa seterusnya | Makin meriah: akordion menggandakan melodi, seruling harmoni, kompang |
| Nyawa tinggal 1 | Lagu sama lebih laju, degupan jantung, tremolo biola |
| ALAHAI OPPS | Lagu "pening": nada beralun, wisel jatuh, burung bercicip |

## Aliran skrin

Menu → PDPA (nama + setuju, sekali sahaja) → Pilih Kampung → Kiraan 3-2-1 → 4 fasa (Misi 1-4) → Misi Selesai → Keputusan.
Nyawa habis → skrin "ALAHAI! OPPS!". "Cuba lagi" / "Main semula" mengulang kampung yang sama.

## Pratonton setiap frame

Tambah `?frame=<nama>` pada URL untuk paparan statik satu skrin:
`menu`, `pdpa`, `pilih`, `caramain`, `siang`, `petang`, `hantar`, `langgar`, `senja`, `malam`, `banner`, `zon`, `jatuh`, `keputusan`, `aset`,
`lemang`, `lemang-pokok`, `lemang-motor`, `lemang-malam`, `simpang`, `aset2`.

## Di mana nak ubah

| Nak ubah | Lokasi dalam `game.js` |
| --- | --- |
| Jumlah hantaran, kelajuan, lompatan | `TOTAL`, `SPEED_MIN/MAX`, `JUMP_V/GRAV` (atas fail) |
| Tetapan setiap kampung (langit, fasa, jam) | `VILLAGES`, `SKY_KETUPAT`, `SKY_LEMANG`, `PHASES`, `PHASES_LEMANG` |
| Susun atur & halangan Kampung Ketupat | `buildLevel`, `fillHazards` (pemberat `weights`) |
| Susun atur & halangan Kampung Lemang | `buildLevelLemang`, `fillHazardsL` |
| Pakaian penunggang | `drawRider` |
| Rumah kampung / rumah gonjong | `drawHouse`, `drawGonjong` |
| Orang tunggu balang, burung, motor | `drawCustomer`, `drawHornbill`, `drawChopper` |
| Nama penerima | `NAMES`, `NAMES_ORANG` |
| Teks bila terlanggar | `HURT_TEXT`, `HURT_LEMANG` |
| Letupan, asap, debu, serpihan | `drawExplo`, `drawPuff`, `fx()`, `debris()`, `hurt` |
| Muzik (melodi, kord, rentak, tempo) | `SONG_CHACHA`, `SONG_INANG`, `SONG_MENU`, `CHA_*`, `GENDANG_INANG`, `Sfx.stepChacha/stepInang` |
| Markah hantaran / combo | `deliver`, `comboMult` |

Teks butang & panel ada dalam `index.html`; gaya dalam `style.css`.
Papan kedudukan disimpan dalam `localStorage` pelayar pemain, ditanda ikut kampung.
