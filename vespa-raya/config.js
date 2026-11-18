// ============================================================
// Tetapan pengumpulan data pemain
// Ubah fail ini sahaja selepas deploy Google Apps Script (lihat README, "Terbitkan & kumpul data").
// ============================================================
window.VRTB_CONFIG = {
  // URL Web App Google Apps Script, berakhir dengan /exec.
  // Kosong = mod pratonton: tiada data dihantar, papan kedudukan hanya dalam peranti.
  endpoint: '',

  // Dipaparkan dalam notis PDPA.
  organiser: 'The Baker',
  contact: '', // cth: 'hello@contoh.com.my' atau 'WhatsApp 012-345 6789'

  // Medan borang
  askPhone: true, phoneRequired: true,
  askEmail: true, emailRequired: false,
  askMarketing: true, // kotak pilihan berasingan untuk terima promosi

  // Papan kedudukan semua pemain (dari Google Sheet). false = setempat sahaja.
  globalBoard: true,

  // Tukar nilai ini bila teks notis PDPA berubah: pemain akan diminta setuju semula.
  policyVersion: '2026-11',
};
