require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Helper para parsear campos
const parseField = (row, fields) => {
    for (let f of fields) {
        if (row[f] !== undefined && row[f] !== null) return String(row[f]).trim();
    }
    return '';
};

// Importar Excel Route (Múltiples archivos)
app.post('/api/upload', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    let totalImported = 0;
    try {
        for (const file of req.files) {
            const workbook = xlsx.readFile(file.path);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const leadsToInsert = data.map(row => {
                const place_id = parseField(row, ['place_id', 'google_id', 'website', 'phone']);
                const name = parseField(row, ['name']);
                const phone = parseField(row, ['phone']);
                
                if (!place_id && !phone && !name) return null;

                return {
                    place_id: place_id || (phone + name),
                    category: parseField(row, ['category', 'subtypes', 'type']),
                    name: name,
                    phone: phone,
                    website: parseField(row, ['website']),
                    city: parseField(row, ['city']),
                    country: parseField(row, ['country']),
                    rating: parseFloat(row['rating']) || 0,
                    reviews: parseInt(row['reviews']) || 0,
                    status: 'Pendiente'
                };
            }).filter(l => l !== null);

            if (leadsToInsert.length > 0) {
                const { error } = await supabase
                    .from('leads')
                    .upsert(leadsToInsert, { onConflict: 'place_id' });
                if (error) throw error;
                totalImported += leadsToInsert.length;
            }
            fs.unlinkSync(file.path);
        }

        res.json({
            message: 'Upload complete',
            total_processed: totalImported
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to process files', details: e.message });
    }
});

// GET all leads
app.get('/api/leads', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            message: 'success',
            data: data
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// GET stats
app.get('/api/stats', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('status');

        if (error) throw error;

        // Count manual since simple count is easier here
        const stats = data.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});

        const formattedStats = Object.keys(stats).map(status => ({
            status,
            count: stats[status]
        }));

        res.json({
            message: 'success',
            data: formattedStats
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Update lead status/notes
app.put('/api/leads/:id', async (req, res) => {
    const { status, notes } = req.body;
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('leads')
            .update({ status, notes })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            message: 'success',
            data: data[0]
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`CRM Cloud Backend (Supabase) running at http://localhost:${port}`);
});
