// Script debug để xem cấu trúc file Excel
// Chạy: node debug-excel.js

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Tìm file Excel trong thư mục hiện tại hoặc đường dẫn chỉ định
const args = process.argv.slice(2);
let filePath = args[0];

if (!filePath) {
    // Tìm file xlsx trong thư mục hiện tại
    const files = fs.readdirSync('.').filter(f => f.endsWith('.xlsx') && f.toLowerCase().includes('ngay'));
    if (files.length > 0) {
        filePath = files[0];
        console.log(`Tìm thấy file: ${filePath}`);
    } else {
        console.log('Cách dùng: node debug-excel.js <đường dẫn file Excel>');
        console.log('Ví dụ: node debug-excel.js "So lieu ngay_thang.xlsx"');
        process.exit(1);
    }
}

console.log('\n========================================');
console.log('DEBUG FILE EXCEL - CẤU TRÚC CỘT');
console.log('========================================\n');

const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log(`Sheet: ${sheetName}`);
console.log(`Range: ${sheet['!ref']}\n`);

const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

// Hàm lấy giá trị cell
const getValue = (row, col) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return '';
    return cell.v;
};

// Hàm chuyển số cột thành chữ (0 -> A, 1 -> B, ...)
const colToLetter = (col) => {
    let letter = '';
    while (col >= 0) {
        letter = String.fromCharCode((col % 26) + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
};

// In header rows (row 0-5)
console.log('=== HEADER ROWS (0-5) ===\n');
for (let r = 0; r <= 5; r++) {
    const rowData = [];
    for (let c = 0; c <= 40; c++) {
        const val = getValue(r, c);
        if (val !== '' && val !== undefined && val !== null) {
            rowData.push(`${colToLetter(c)}(${c}): "${val}"`);
        }
    }
    if (rowData.length > 0) {
        console.log(`Row ${r}: ${rowData.join(' | ')}`);
    }
}

// Tìm dòng TC của Ngày 01
console.log('\n=== TÌM DÒNG TC CỦA NGÀY 01 ===\n');

let foundRow = -1;
let currentDay = '';

for (let r = 0; r <= range.e.r; r++) {
    const dayCell = getValue(r, 0);
    const caCell = getValue(r, 1);

    if (dayCell !== '' && dayCell !== undefined) {
        const match = String(dayCell).match(/\d+/);
        if (match) {
            currentDay = match[0].padStart(2, '0');
        }
    }

    if (currentDay === '01' && String(caCell).toUpperCase() === 'TC') {
        foundRow = r;
        console.log(`Tìm thấy: Row ${r}, Ngày=${dayCell}, CA=${caCell}`);
        break;
    }
}

if (foundRow === -1) {
    console.log('Không tìm thấy dòng TC của Ngày 01!');
    process.exit(1);
}

// In tất cả giá trị của dòng TC
console.log(`\n=== GIÁ TRỊ TẤT CẢ CỘT ROW ${foundRow} (Ngày 01 TC) ===\n`);

const allValues = [];
for (let c = 0; c <= 45; c++) {
    const val = getValue(foundRow, c);
    if (val !== '' && val !== undefined && val !== null) {
        const numVal = typeof val === 'number' ? val : parseFloat(val);
        allValues.push({
            col: c,
            letter: colToLetter(c),
            value: val,
            numValue: isNaN(numVal) ? val : numVal
        });
    }
}

console.log('Cột | Letter | Giá trị');
console.log('----|--------|--------');
allValues.forEach(v => {
    console.log(`${v.col.toString().padStart(3)} | ${v.letter.padStart(6)} | ${v.value}`);
});

// Phân tích
console.log('\n=== PHÂN TÍCH KỲ VỌNG ===\n');
console.log('Theo file Excel Ngày 01:');
console.log('- Tổng Hạ (XE+XALAN) = 52');
console.log('- Tổng Giao (XE+XALAN) = 45');
console.log('- Full CFS = 24');
console.log('- Tổng CONT = 121');
console.log('');
console.log('- XE: Hạ=42, Giao=12, CFS=24, Total=78');
console.log('- XALAN: Hạ=10, Giao=33, CFS=0, Total=43');

console.log('\n=== TÌM CÁC GIÁ TRỊ QUAN TRỌNG ===\n');
const importantValues = [52, 45, 24, 121, 42, 12, 78, 10, 33, 43, 37, 5, 7, 20];
importantValues.forEach(target => {
    const found = allValues.filter(v => v.numValue === target);
    if (found.length > 0) {
        console.log(`Giá trị ${target}: tìm thấy ở ${found.map(f => `${f.letter}(${f.col})`).join(', ')}`);
    }
});

console.log('\n========================================');
console.log('Xong! Dùng thông tin trên để sửa ExcelParser');
console.log('========================================');
