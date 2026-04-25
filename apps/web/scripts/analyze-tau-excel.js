const XLSX = require('xlsx');

const wb = XLSX.readFile('Tau 2025.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref']);

const headerRow = 2; // Based on scan results

console.log('=== ALL COLUMN HEADERS (Row 2) ===\n');
const headers = [];
for (let C = 0; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c: C });
    const cell = sheet[addr];
    const value = cell ? String(cell.v).trim() : '';
    headers.push(value);
    if (value) {
        console.log(`Col ${String(C).padStart(2, '0')}: ${value}`);
    }
}

console.log('\n\n=== SAMPLE DATA (First 3 vessel rows) ===\n');
for (let R = headerRow + 1; R <= headerRow + 3; R++) {
    console.log(`--- Row ${R - headerRow} ---`);
    const rowData = {};
    for (let C = 0; C <= Math.min(20, range.e.c); C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[addr];
        if (cell && headers[C]) {
            rowData[headers[C]] = cell.v;
        }
    }
    console.log(JSON.stringify(rowData, null, 2));
    console.log('');
}

console.log('\n\n=== FIELD MAPPING ANALYSIS ===\n');

const requiredFields = {
    'Tên tàu (Vessel Name)': null,
    'Hãng tàu (LINE)': null,
    'ATB (Arrival Time Berth)': null,
    'ATW (At Work)': null,
    'ATC (At Completed)': null,
    'ATD (Actual Time Departure)': null,
    'Nhập tàu (Discharge/Load)': null,
    'Xuất tàu (Loading/Unload)': null,
    'Shifting In': null,
    'Shifting Out': null,
    'Total Moves': null,
    'TEUs': null,
    'Moves/h (Productivity)': null
};

headers.forEach((header, idx) => {
    const h = header.toLowerCase();

    if (h.includes('vessel') && !h.includes('year') && !h.includes('seq')) {
        requiredFields['Tên tàu (Vessel Name)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('line') || h === 'line') {
        requiredFields['Hãng tàu (LINE)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h === 'atb') {
        requiredFields['ATB (Arrival Time Berth)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h === 'atw' || h.includes('at work')) {
        requiredFields['ATW (At Work)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h === 'atc' || h.includes('at completed')) {
        requiredFields['ATC (At Completed)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h === 'atd') {
        requiredFields['ATD (Actual Time Departure)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('discharge') || h.includes('nhập') || (h.includes('load') && !h.includes('unload'))) {
        requiredFields['Nhập tàu (Discharge/Load)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('loading') || h.includes('xuất') || h.includes('unload')) {
        requiredFields['Xuất tàu (Loading/Unload)'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('shift') && (h.includes('in') || h.includes('nhập'))) {
        requiredFields['Shifting In'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('shift') && (h.includes('out') || h.includes('xuất'))) {
        requiredFields['Shifting Out'] = `✅ Col ${idx}: "${header}"`;
    }
    if ((h.includes('total') || h.includes('tổng')) && h.includes('move')) {
        requiredFields['Total Moves'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('teu')) {
        requiredFields['TEUs'] = `✅ Col ${idx}: "${header}"`;
    }
    if (h.includes('move') && h.includes('h')) {
        requiredFields['Moves/h (Productivity)'] = `✅ Col ${idx}: "${header}"`;
    }
});

console.log('\n📊 FIELD AVAILABILITY:\n');
Object.entries(requiredFields).forEach(([field, result]) => {
    if (result) {
        console.log(result);
    } else {
        console.log(`❌ ${field}: NOT FOUND`);
    }
});

const found = Object.values(requiredFields).filter(v => v !== null).length;
const total = Object.keys(requiredFields).length;

console.log(`\n\n📈 SUMMARY: ${found}/${total} required fields found`);

if (found === total) {
    console.log('\n✅ EXCELLENT! All required fields are present in the Excel file.');
} else {
    console.log(`\n⚠️  ${total - found} field(s) missing. These will need to be:`);
    console.log('   1. Manually entered during import');
    console.log('   2. Auto-calculated from available data');
    console.log('   3. Left optional (can be added later)');

    console.log('\n🔍 Missing fields:');
    Object.entries(requiredFields).forEach(([field, result]) => {
        if (!result) {
            console.log(`   - ${field}`);
        }
    });
}
