require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

async function run() {
    console.log('Fetching all leads...');
    const { data: leads, error } = await supabase.from('leads').select('id, address');
    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }
    
    console.log(`Found ${leads.length} leads. Updating localidades...`);
    let updated = 0;
    
    for (const lead of leads) {
        const localidad = extractLocalidad(lead.address);
        if (localidad) {
            const { error: updateError } = await supabase.from('leads').update({ localidad }).eq('id', lead.id);
            if (updateError) {
                console.error(`Error updating lead ${lead.id}:`, updateError.message);
            } else {
                updated++;
            }
        }
    }
    console.log(`Done! Updated ${updated} leads with a recognized localidad.`);
}

run();
