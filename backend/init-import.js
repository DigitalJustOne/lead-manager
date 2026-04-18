const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const db = require('./db');

// Helper para parsear campos
const parseField = (row, fields) => {
    for (let f of fields) {
        if (row[f] !== undefined && row[f] !== null) return String(row[f]).trim();
    }
    return '';
};

const inputDir = path.resolve(__dirname, '../../base de datos');
const files = [
    'Outscraper-20260402151420s42.xlsx',
    'Outscraper-20260401145343s50_barber_shop_+5.xlsx',
    'Outscraper-20260401152139s3a_barber_shop_+3.xlsx',
    'Outscraper-20260401160708s6b_barber_shop_+2.xlsx'
];

let totalSuccess = 0;
let totalDuplicates = 0;

const processFile = (fileName) => {
    return new Promise((resolve) => {
        const filePath = path.join(inputDir, fileName);
        if (!fs.existsSync(filePath)) {
            console.log(`No encontrado: ${fileName}`);
            resolve();
            return;
        }

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`Procesando ${fileName} (${data.length} filas)...`);

        const stmt = db.prepare(`
            INSERT INTO leads (place_id, category, name, phone, website, city, state, country, rating, reviews)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            data.forEach((row) => {
                const place_id = parseField(row, ['place_id', 'google_id', 'website', 'phone']);
                const category = parseField(row, ['category', 'subtypes', 'type']);
                const name = parseField(row, ['name']);
                const phone = parseField(row, ['phone']);
                const website = parseField(row, ['website']);
                const city = parseField(row, ['city']);
                const state = parseField(row, ['state']);
                const country = parseField(row, ['country']);
                const rating = parseFloat(row['rating']) || 0;
                const reviews = parseInt(row['reviews']) || 0;

                if (!place_id && !phone && !name) {
                    return;
                }
                const unique_id = place_id || (phone + name);

                stmt.run(unique_id, category, name, phone, website, city, state, country, rating, reviews, function(err) {
                    if (err) {
                        totalDuplicates++;
                    } else {
                        totalSuccess++;
                    }
                });
            });

            stmt.finalize();
            db.run('COMMIT', () => {
                console.log(`✅ Completado: ${fileName}`);
                resolve();
            });
        });
    });
};

const runAll = async () => {
    // Wait a brief moment to ensure DB init if it's first time
    setTimeout(async () => {
        for (let f of files) {
            await processFile(f);
        }
        console.log('=============================');
        console.log('🎉 INITIAL IMPORT FINISHED');
        console.log('Total nuevos insertados:', totalSuccess);
        console.log('Total duplicados ignorados:', totalDuplicates);
        process.exit(0);
    }, 1000);
};

runAll();
