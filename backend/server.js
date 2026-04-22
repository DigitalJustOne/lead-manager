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

const parseField = (row, keys) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        // Buscamos la columna de forma exacta primero
        if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();

        // Si no, buscamos quitando espacios y mayúsculas
        const normalizedTarget = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const foundKey = rowKeys.find(rk => {
            const normalizedRowKey = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedRowKey === normalizedTarget;
        });

        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return String(row[foundKey]).trim();
        }
    }
    return '';
};

const extractLocalidad = (address) => {
    if (!address) return '';
    const normalized = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const map = {
        "usaquen": "Usaquén", "chapinero": "Chapinero", "santa fe": "Santa Fe", "san cristobal": "San Cristóbal",
        "usme": "Usme", "tunjuelito": "Tunjuelito", "bosa": "Bosa", "kennedy": "Kennedy", "fontibon": "Fontibón",
        "engativa": "Engativá", "suba": "Suba", "barrios unidos": "Barrios Unidos", "teusaquillo": "Teusaquillo",
        "los martires": "Los Mártires", "antonio narino": "Antonio Nariño", "puente aranda": "Puente Aranda",
        "la candelaria": "La Candelaria", "rafael uribe": "Rafael Uribe Uribe", "ciudad bolivar": "Ciudad Bolívar",
        "sumapaz": "Sumapaz"
    };
    for (const [key, val] of Object.entries(map)) {
        if (normalized.includes(key)) return val;
    }
    return '';
};

// Importar Excel Route (Múltiples archivos)
app.post('/api/upload', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    let totalImported = 0;
    let errors = [];
    
    try {
        for (const file of req.files) {
            try {
                // Leemos el archivo como buffer para controlar la codificación
                const fileBuffer = fs.readFileSync(file.path);
                const workbook = xlsx.read(fileBuffer, { type: 'buffer', codepage: 65001 });
                const sheetName = workbook.SheetNames[0];
                const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

                const leadsToInsert = data.map(row => {
                    try {
                        // Mapeo mucho más agresivo y flexible
                        const name = parseField(row, ['name', 'title', 'nombre', 'negocio', 'pyme', 'fullname']);
                        const phone = parseField(row, ['phone', 'tel', 'celular', 'phone_number', 'phoneNumber', 'contacto', 'phones']);
                        const website = parseField(row, ['website', 'url', 'sitio', 'web', 'domain']);
                        
                        // Si es una fila de publicidad del scraper o no tiene nombre, ignorar
                        if (!name || name.toLowerCase().includes('scraper exports') || (!phone && !website)) return null;

                        const rawId = parseField(row, ['place_id', 'placeid', 'google_id', 'id', 'cid']);
                        // Generamos un ID basado en el nombre si no hay uno real
                        const place_id = rawId || (name + phone).replace(/[^a-zA-Z0-9]/g, '');

                        const category = parseField(row, ['category', 'categoryName', 'subtypes', 'type', 'nicho', 'rubro', 'categories']);
                        const city = parseField(row, ['city', 'ciudad', 'location', 'municipio', 'town']);
                        const address = parseField(row, ['address', 'fulladdress', 'direccion', 'ubicacion', 'street']);
                        const rating = parseFloat(parseField(row, ['rating', 'score', 'puntuacion', 'estrellas', 'averagerating'])) || 0;
                        const reviews = parseInt(parseField(row, ['reviews', 'reviewsCount', 'reseñas', 'reviewcount'])) || 0;

                        return {
                            place_id,
                            name: name.substring(0, 250),
                            phone: phone ? phone.toString().substring(0, 50) : '',
                            website: website ? website.toString().substring(0, 500) : '',
                            category: category.substring(0, 100),
                            city: city.substring(0, 100),
                            address: address.substring(0, 500),
                            localidad: extractLocalidad(address),
                            rating: isNaN(rating) ? 0 : rating,
                            reviews: isNaN(reviews) ? 0 : reviews,
                            status: 'Pendiente'
                        };
                    } catch (err) {
                        return null;
                    }
                }).filter(l => l !== null);

                if (leadsToInsert.length > 0) {
                    const { error } = await supabase
                        .from('leads')
                        .upsert(leadsToInsert, { onConflict: 'place_id' });
                    if (error) {
                        console.error('Supabase error:', error);
                        errors.push(`Error en BD con archivo ${file.originalname}: ${error.message}`);
                    } else {
                        totalImported += leadsToInsert.length;
                    }
                }
            } catch (fileErr) {
                console.error('File process error:', fileErr);
                errors.push(`No se pudo leer el archivo ${file.originalname}: ${fileErr.message}`);
            } finally {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
        }

        res.json({
            message: errors.length > 0 ? 'Procesado con advertencias' : 'Completado con éxito',
            total_processed: totalImported,
            errors: errors
        });

    } catch (e) {
        console.error('Global upload error:', e);
        res.status(500).json({ error: 'Fallo crítico en el servidor', details: e.message });
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

// Create manual lead
app.post('/api/leads', async (req, res) => {
    const lead = req.body;
    
    try {
        if (!lead.name) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        // Generamos un ID basado en el nombre si no hay uno real
        const place_id = lead.place_id || 'manual-' + (lead.name + (lead.phone || '')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50) + '-' + Date.now();

        const leadToInsert = {
            place_id,
            name: lead.name.substring(0, 250),
            phone: lead.phone ? lead.phone.toString().substring(0, 50) : '',
            website: lead.website ? lead.website.toString().substring(0, 500) : '',
            category: (lead.category || '').substring(0, 100),
            city: (lead.city || '').substring(0, 100),
            address: (lead.address || '').substring(0, 500),
            localidad: lead.localidad ? lead.localidad.substring(0, 100) : extractLocalidad(lead.address || ''),
            rating: parseFloat(lead.rating) || 0,
            reviews: parseInt(lead.reviews) || 0,
            status: lead.status || 'Pendiente',
            notes: lead.notes || ''
        };

        const { data, error } = await supabase
            .from('leads')
            .upsert([leadToInsert], { onConflict: 'place_id' })
            .select();

        if (error) throw error;

        res.json({
            message: 'success',
            data: data[0]
        });
    } catch (e) {
        console.error('Manual lead error:', e);
        res.status(400).json({ error: e.message });
    }
});

// Update lead fully
app.put('/api/leads/:id', async (req, res) => {
    const { status, notes, name, phone, website, category, city, address, rating, reviews, localidad } = req.body;
    const { id } = req.params;

    try {
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (name !== undefined) updateData.name = name ? String(name).substring(0, 250) : '';
        if (phone !== undefined) updateData.phone = phone ? String(phone).substring(0, 50) : '';
        if (website !== undefined) updateData.website = website ? String(website).substring(0, 500) : '';
        if (category !== undefined) updateData.category = category ? String(category).substring(0, 100) : '';
        if (city !== undefined) updateData.city = city ? String(city).substring(0, 100) : '';
        if (address !== undefined) {
            updateData.address = address ? String(address).substring(0, 500) : '';
            if (localidad === undefined) updateData.localidad = extractLocalidad(updateData.address);
        }
        if (localidad !== undefined) updateData.localidad = localidad ? String(localidad).substring(0, 100) : '';
        if (rating !== undefined) updateData.rating = parseFloat(rating) || 0;
        if (reviews !== undefined) updateData.reviews = parseInt(reviews) || 0;

        const { data, error } = await supabase
            .from('leads')
            .update(updateData)
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
