// Script debug chi tiết cho file lũy tiến
const XLSX = require('xlsx');
const fs = require('fs');

const filePath = process.argv[2] || '..\\So lieu luy tien.xlsx';

const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log(`Sheet: ${sheetName}\n`);

const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

const getValue = (row, col) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return null;
    return cell.v;
};

const colToLetter = (col) => {
    let letter = '';
    while (col >= 0) {
        letter = String.fromCharCode((col % 26) + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
};

// In header row 5
console.log('=== HEADER ROW 5 ===');
for (let c = 0; c <= 35; c++) {
    const val = getValue(5, c);
    if (val) {
        console.log(`${colToLetter(c)}(${c}): ${String(val).replace(/\n/g, ' ')}`);
    }
}

// Tìm tất cả dòng có dữ liệu
console.log('\n=== TẤT CẢ DÒNG DỮ LIỆU ===');
for (let r = 6; r <= 40; r++) {
    const label = getValue(r, 0);
    if (label) {
        const labelStr = String(label).replace(/\n/g, ' ').trim();
        // Lấy một số cột quan trọng
        const b = getValue(r, 1) || 0; // Hạ tổng
        const c = getValue(r, 2) || 0; // Giao tổng
        const d = getValue(r, 3) || 0; // CFS
        const h = getValue(r, 7) || 0; // Tổng XE  
        const k = getValue(r, 10) || 0; // XE Tổng Hạ
        const n = getValue(r, 13) || 0; // XE Tổng Giao
        const q = getValue(r, 16) || 0; // XE Tổng CFS Full
        const x = getValue(r, 23) || 0; // Tổng XALAN
        const aa = getValue(r, 26) || 0; // XALAN Tổng Hạ
        const ad = getValue(r, 29) || 0; // XALAN Tổng Giao
        const ag = getValue(r, 32) || 0; // XALAN Tổng CFS Full

        console.log(`\nRow ${r}: "${labelStr}"`);
        console.log(`  Tổng: Hạ(B)=${b}, Giao(C)=${c}, CFS(D)=${d}`);
        console.log(`  XE:   Tổng(H)=${h}, Hạ(K)=${k}, Giao(N)=${n}, CFS(Q)=${q}`);
        console.log(`  XALAN: Tổng(X)=${x}, Hạ(AA)=${aa}, Giao(AD)=${ad}, CFS(AG)=${ag}`);
    }
}

console.log('\n========================================');
