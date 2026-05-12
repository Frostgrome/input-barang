// =============================================
// KONFIGURASI
// =============================================
const SPREADSHEET_ID   = '1cxc4VQYQxbLcFeO5DHCE311C85FT-p2ppOHC_vnSyGw';
const SHEET_PERSIAPAN  = '0. PERSIAPAN';
const SHEET_PENCATATAN = '1. PENCATATAN';

// =============================================
// ENTRY POINT — semua request masuk sini
// =============================================
function doGet(e) {
  const action   = e.parameter.action   || '';
  const callback = e.parameter.callback || '';
  let result;

  try {
    if      (action === 'getItems')      result = getItems();
    else if (action === 'addTransaksi')  result = addTransaksi(e.parameter);
    else if (action === 'getTransaksi')  result = getTransaksi(parseInt(e.parameter.limit) || 500);
    else if (action === 'getStok')       result = getStok();
    else if (action === 'setup')         result = setupSheets();
    else if (action === 'debug')         result = debugSheet();
    else                                 result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message };
  }

  const json = JSON.stringify(result);

  // JSONP — menghindari CORS block dari browser
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================
// GET: Daftar barang dari sheet "persiapan"
// Kolom A = ID BARANG, Kolom B = NAMA BARANG
// =============================================
function getItems() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PERSIAPAN);
  if (!sheet) return { error: 'Sheet "0. PERSIAPAN" tidak ditemukan' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Kolom B: "BR-0001 | MERK | NAMA" → ID = bagian sebelum ' | ' pertama
  // Kolom C: NAMA BARANG
  const values = sheet.getRange(2, 2, lastRow - 1, 2).getValues(); // mulai kolom B (2), ambil 2 kolom (B & C)
  const results = [];
  values.forEach(r => {
    const raw = String(r[0] || '').trim(); // kolom B
    if (!raw.includes('|')) return;
    const id   = raw.split('|')[0].trim();
    const nama = String(r[1] || '').trim(); // kolom C
    if (id && nama) results.push({ id, nama });
  });
  return results;
}

// =============================================
// POST: Tambah transaksi ke sheet "pencatatan"
// Kolom: NO | JENIS | TANGGAL | ID BARANG |
//        KETERANGAN | QTY | IN | OUT | LIVE STOK
// =============================================
function addTransaksi(params) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_PENCATATAN);
  if (!sheet) { setupSheets(); sheet = ss.getSheetByName(SHEET_PENCATATAN); }

  const jenis      = (params.jenis     || '').toUpperCase();
  const qty        = parseFloat(params.qty) || 0;
  const idBarang   = String(params.idBarang   || '').trim();
  const keterangan = String(params.keterangan || '').trim();

  // Konversi tanggal YYYY-MM-DD → MM/DD/YYYY
  const raw = params.tanggal || '';
  let tanggal = raw;
  if (raw && raw.includes('-')) {
    const [y, m, d] = raw.split('-');
    tanggal = `${m}/${d}/${y}`;
  }

  const inQty  = jenis === 'MASUK'  ? qty : 0;
  const outQty = jenis === 'KELUAR' ? qty : 0;

  // Hitung LIVE STOK untuk barang ini (cari baris terakhir yang sama)
  const lastRow = sheet.getLastRow();
  let liveStok = 0;

  if (lastRow >= 2) {
    const allRows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    for (let i = allRows.length - 1; i >= 0; i--) {
      if (String(allRows[i][3]).trim() === idBarang) {
        liveStok = Number(allRows[i][8]) || 0;
        break;
      }
    }
  }

  const newLiveStok = liveStok + inQty - outQty;

  // Nomor urut = jumlah baris data yang sudah ada + 1
  const dataRows = Math.max(0, lastRow - 1);
  const no = dataRows + 1;

  sheet.appendRow([
    no,            // A: NO
    jenis,         // B: JENIS
    tanggal,       // C: TANGGAL (MM/DD/YYYY)
    idBarang,      // D: ID BARANG
    keterangan,    // E: KETERANGAN
    qty,           // F: QTY
    inQty,         // G: IN
    outQty,        // H: OUT
    newLiveStok    // I: LIVE STOK
  ]);

  return { success: true, liveStok: newLiveStok, no: no };
}

// =============================================
// GET: Ambil N transaksi terakhir
// =============================================
function getTransaksi(limit) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_PENCATATAN);
  if (!sheet) { setupSheets(); sheet = ss.getSheetByName(SHEET_PENCATATAN); }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows  = lastRow - startRow + 1;
  const values   = sheet.getRange(startRow, 1, numRows, 9).getValues();

  return values.reverse().map(r => ({
    no        : r[0],
    jenis     : r[1],
    tanggal   : r[2],
    idBarang  : r[3],
    keterangan: r[4],
    qty       : r[5],
    inQty     : r[6],
    outQty    : r[7],
    liveStok  : r[8]
  }));
}

// =============================================
// GET: Live stok terbaru per ID BARANG
// =============================================
function getStok() {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_PENCATATAN);
  if (!sheet) { setupSheets(); sheet = ss.getSheetByName(SHEET_PENCATATAN); }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values  = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const stokMap = {};

  values.forEach(r => {
    const id = String(r[3]).trim();
    if (id) stokMap[id] = Number(r[8]) || 0;
  });

  return Object.entries(stokMap).map(([id, stok]) => ({ id, stok }));
}

// =============================================
// DEBUG: Lihat isi raw 10 baris pertama sheet persiapan
// =============================================
function debugSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PERSIAPAN);
  if (!sheet) return { error: 'Sheet tidak ditemukan', name: SHEET_PERSIAPAN };

  const lastRow = Math.min(sheet.getLastRow(), 15);
  if (lastRow < 1) return { lastRow: 0, rows: [] };

  const values = sheet.getRange(1, 1, lastRow, 4).getValues();
  return {
    sheetName: sheet.getName(),
    lastRow: sheet.getLastRow(),
    rows: values.map((r, i) => ({
      row: i + 1,
      A: String(r[0]),
      B: String(r[1]),
      C: String(r[2]),
      D: String(r[3])
    }))
  };
}

// =============================================
// HELPER: Setup header sheet — otomatis dipanggil
// jika sheet belum ada. Aman dipanggil berkali-kali.
// =============================================
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Sheet persiapan
  let sp = ss.getSheetByName(SHEET_PERSIAPAN);
  if (!sp) {
    sp = ss.insertSheet(SHEET_PERSIAPAN);
    sp.getRange(1, 1, 1, 2).setValues([['ID BARANG', 'NAMA BARANG']]);
    sp.getRange(1, 1, 1, 2).setFontWeight('bold');
    sp.setFrozenRows(1);
  }

  // Sheet pencatatan
  let sc = ss.getSheetByName(SHEET_PENCATATAN);
  if (!sc) {
    sc = ss.insertSheet(SHEET_PENCATATAN);
    sc.getRange(1, 1, 1, 9).setValues([[
      'NO', 'JENIS', 'TANGGAL', 'ID BARANG', 'KETERANGAN', 'QTY', 'IN', 'OUT', 'LIVE STOK'
    ]]);
    sc.getRange(1, 1, 1, 9).setFontWeight('bold');
    sc.setFrozenRows(1);
  }

  return { success: true, message: 'Sheet siap digunakan' };
}
