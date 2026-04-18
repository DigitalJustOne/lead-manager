require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const dbPath = path.resolve(__dirname, 'leads.db');
const db = new sqlite3.Database(dbPath);

async function migrate() {
    console.log('--- Iniciando migración de datos a Supabase ---');
    
    db.all("SELECT * FROM leads", async (err, rows) => {
        if (err) {
            console.error('Error leyendo SQLite:', err);
            return;
        }

        console.log(`Encontrados ${rows.length} registros en local.`);
        
        // Preparar datos para Supabase (limpiar campos si es necesario)
        const leadsToInsert = rows.map(r => ({
            place_id: r.place_id,
            category: r.category,
            name: r.name,
            phone: r.phone,
            website: r.website,
            city: r.city,
            country: r.country,
            rating: r.rating,
            reviews: r.reviews,
            status: r.status,
            notes: r.notes
        }));

        // Insertar en bloques de 50 para evitar limites de payload
        const chunkSize = 50;
        let totalMigrated = 0;

        for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
            const chunk = leadsToInsert.slice(i, i + chunkSize);
            const { data, error } = await supabase
                .from('leads')
                .upsert(chunk, { onConflict: 'place_id' });

            if (error) {
                console.error(`Error migrando bloque ${i}:`, error.message);
            } else {
                totalMigrated += chunk.length;
                console.log(`Progreso: ${totalMigrated}/${rows.length} migrados...`);
            }
        }

        console.log('--- Migración completada con éxito ---');
        db.close();
    });
}

migrate();
