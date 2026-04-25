const XLSX = require('xlsx');

function parseExcelDate(value) {
    if (!value) return undefined;

    // Check if value is number (Serial date)
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
            const p = (n) => n.toString().padStart(2, '0');
            return `${date.y}-${p(date.m)}-${p(date.d)}T${p(date.H)}:${p(date.M)}:${p(date.S)}`;
        }
    }

    // Check if value is string
    if (typeof value === 'string') {
        const parts = value.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\s*(\d{1,2})?:?(\d{1,2})?/);
        if (parts) {
            return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}T${(parts[4] || '00').padStart(2, '0')}:${(parts[5] || '00').padStart(2, '0')}`;
        }
    }

    return "PARSE_FAILED";
}

try {
    console.log('📖 Reading Template_Import_Tau.xlsx ...');
    const wb = XLSX.readFile('Template_Import_Tau.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = jsonData[0].map(h => String(h).trim().toLowerCase());
    console.log('\n🔍 Headers found:', headers);

    const colMap = {
        atb: headers.findIndex(h => h === 'atb' || h.includes('arrival')),
        import: headers.findIndex(h => h.includes('import') || h.includes('nhập') || h.includes('discharge')),
        export: headers.findIndex(h => h.includes('export') || h.includes('xuất') || h.includes('loading')),
    };

    console.log('\n📍 Column Mapping:', colMap);

    console.log('\n📋 Dumping first 3 rows of data:');
    const rows = jsonData.slice(1);
    for (let i = 0; i < Math.min(3, rows.length); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        console.log(`\n--- Row ${i + 1} ---`);
        console.log('RAW Export Val:', row[colMap.export], ' (Type:', typeof row[colMap.export], ')');
        console.log('RAW Import Val:', row[colMap.import], ' (Type:', typeof row[colMap.import], ')');
        console.log('RAW ATB Val:   ', row[colMap.atb], ' (Type:', typeof row[colMap.atb], ')');

        const parsedATB = parseExcelDate(row[colMap.atb]);
        console.log('➤ Parsed ATB:  ', parsedATB);

        const nhap = Number(row[colMap.import]);
        const xuat = Number(row[colMap.export]);
        console.log('➤ Sum Check:   ', nhap, '+', xuat, '=', nhap + xuat);
    }

} catch (e) {
    console.error('Error:', e.message);
}
