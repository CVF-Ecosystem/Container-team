const XLSX = require('xlsx');

const wb = XLSX.readFile('Tau 2025.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref']);

console.log('Scanning first 50 rows for content...\n');

for (let R = 0; R <= 50; R++) {
    const cells = [];
    for (let C = 0; C <= 10; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[addr];
        cells.push(cell ? String(cell.v).substring(0, 20) : '');
    }

    const rowText = cells.join(' | ');
    if (rowText.trim()) {
        console.log(`R${R}:`, rowText);
    }
}
