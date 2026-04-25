const XLSX = require('xlsx');

// 1. Create Standard Template
const templateHeaders = [
    'STT',
    'Tên Tàu',
    'Hãng Tàu (Line)',
    'Ngày (YYYY-MM-DD)',
    'ATB (dd/mm/yyyy hh:mm)',
    'ATW (dd/mm/yyyy hh:mm)',
    'ATC (dd/mm/yyyy hh:mm)',
    'ATD (dd/mm/yyyy hh:mm)',
    'Nhập (Conts)',
    'Xuất (Conts)',
    'Shift In (Conts)',
    'Shift Out (Conts)',
    'TEUs',
    'Ghi Chú'
];

const sampleRow = [
    1,
    'MAERSK ALABAMA',
    'MAERSK',
    '2025-01-01',
    '01/01/2025 08:00',
    '01/01/2025 09:30',
    '01/01/2025 20:00',
    '01/01/2025 22:00',
    150,
    120,
    10,
    5,
    350,
    'Tàu về sớm'
];

const wbNew = XLSX.utils.book_new();
const wsNew = XLSX.utils.aoa_to_sheet([templateHeaders, sampleRow]);

// Adjust column widths
wsNew['!cols'] = templateHeaders.map(() => ({ wch: 20 }));
XLSX.utils.book_append_sheet(wbNew, wsNew, 'Template_BaoCaoTau');
XLSX.writeFile(wbNew, 'Template_Import_Tau.xlsx');
console.log('✅ Created: Template_Import_Tau.xlsx');

// 2. List columns from existing file for mapping
console.log('\n=============================================');
console.log('🔍 FILE CŨ: DANH SÁCH CỘT TRONG TAU 2025.XLSX');
console.log('=============================================\n');

try {
    const wbOld = XLSX.readFile('Tau 2025.xlsx');
    const sheetOld = wbOld.Sheets[wbOld.SheetNames[0]];
    const range = XLSX.utils.decode_range(sheetOld['!ref']);

    // Header row appears to be 2 (index 2, which is row 3 in Excel visual)
    const headerRowIdx = 2;

    for (let C = 0; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c: C });
        const cell = sheetOld[addr];
        if (cell && cell.v) {
            console.log(`[Cột ${C}] : ${cell.v}`);
        }
    }
} catch (error) {
    console.error('Không đọc được file Tau 2025.xlsx:', error.message);
}
