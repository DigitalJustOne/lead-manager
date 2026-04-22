import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import localidadesGeoJSON from './bogota_localidades.json';

// Fix default marker icon issue with Vite
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Paleta de colores por densidad ──────────────────────────
function getColor(count, max) {
  if (count === 0) return '#1a1a2e';
  const intensity = count / max;
  if (intensity > 0.8) return '#ef4444'; // rojo intenso
  if (intensity > 0.6) return '#f97316'; // naranja
  if (intensity > 0.4) return '#f59e0b'; // amarillo
  if (intensity > 0.2) return '#6366f1'; // violeta
  return '#3b82f6';                       // azul claro
}

// ─── Componente Principal ──────────────────────────────────────
export default function MapaCalorView({ leads }) {
  // Conteo de leads por localidad
  const statsPerLocalidad = useMemo(() => {
    const map = {};
    for (const lead of leads) {
      const loc = lead.localidad || 'Sin Localidad';
      if (!map[loc]) map[loc] = { total: 0, activos: 0, gestion: 0, cerrados: 0, perdidos: 0 };
      map[loc].total++;
      const s = (lead.status || '').toLowerCase();
      if (s.includes('pendiente')) map[loc].activos++;
      else if (s.includes('potencial') || s.includes('contactado') || s.includes('cita')) map[loc].gestion++;
      else if (s.includes('cerrada') || s.includes('cliente')) map[loc].cerrados++;
      else if (s.includes('perdido') || s.includes('equivocado')) map[loc].perdidos++;
    }
    return map;
  }, [leads]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(statsPerLocalidad).map(s => s.total));
  }, [statsPerLocalidad]);

  // Ranking ordenado
  const ranking = useMemo(() => {
    return Object.entries(statsPerLocalidad)
      .filter(([key]) => key !== 'Sin Localidad')
      .sort((a, b) => b[1].total - a[1].total);
  }, [statsPerLocalidad]);

  // Estilo por feature GeoJSON
  const styleFeature = (feature) => {
    const nombre = feature.properties.nombre;
    const stats = statsPerLocalidad[nombre] || { total: 0 };
    return {
      fillColor: getColor(stats.total, maxCount),
      fillOpacity: stats.total > 0 ? 0.75 : 0.15,
      color: '#ffffff',
      weight: 1.5,
      opacity: 0.6,
    };
  };

  // Evento al pasar el mouse
  const onEachFeature = (feature, layer) => {
    const nombre = feature.properties.nombre;
    const stats = statsPerLocalidad[nombre] || { total: 0, activos: 0, gestion: 0, cerrados: 0, perdidos: 0 };
    const convRate = stats.total > 0 ? Math.round((stats.cerrados / stats.total) * 100) : 0;

    layer.bindTooltip(`
      <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:14px 16px;min-width:190px;font-family:system-ui,sans-serif">
        <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:8px">${nombre}</div>
        <div style="display:grid;gap:5px;font-size:12px;color:#aaa">
          <div>📋 Total leads: <strong style="color:#fff">${stats.total}</strong></div>
          <div>⏳ Pendientes: <strong style="color:#6366f1">${stats.activos}</strong></div>
          <div>🎯 En gestión: <strong style="color:#f59e0b">${stats.gestion}</strong></div>
          <div>✅ Cerrados: <strong style="color:#10b981">${stats.cerrados}</strong></div>
          <div>🗑️ Perdidos: <strong style="color:#ef4444">${stats.perdidos}</strong></div>
          <div style="margin-top:6px;border-top:1px solid #333;padding-top:6px">📈 Conversión: <strong style="color:#10b981">${convRate}%</strong></div>
        </div>
      </div>
    `, {
      permanent: false,
      sticky: true,
      opacity: 1,
      className: 'mapa-tooltip',
    });

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ fillOpacity: 0.95, weight: 2.5, color: '#ffffff' });
        e.target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle(styleFeature(feature));
      },
    });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🗺️ Mapa de Calor — Bogotá
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Densidad de leads por localidad. Pasa el cursor sobre cada zona para ver estadísticas detalladas.
        </p>
      </div>

      {/* Leyenda de colores */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Densidad:</span>
        {[
          { color: '#3b82f6', label: 'Baja' },
          { color: '#6366f1', label: 'Media-baja' },
          { color: '#f59e0b', label: 'Media' },
          { color: '#f97316', label: 'Alta' },
          { color: '#ef4444', label: 'Muy alta' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Mapa + Ranking side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Mapa */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', minHeight: '450px' }}>
          <MapContainer
            center={[4.65, -74.1]}
            zoom={11}
            style={{ height: '100%', width: '100%', minHeight: '450px', background: '#0d0d1a' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <GeoJSON
              key={JSON.stringify(statsPerLocalidad)}
              data={localidadesGeoJSON}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>

        {/* Ranking lateral */}
        <div className="glass-panel" style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            🏆 Ranking por Leads
          </h3>
          {ranking.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No hay datos de localidades aún.</p>
          )}
          {ranking.map(([nombre, stats], i) => (
            <div
              key={nombre}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2b' : '#444',
                minWidth: '20px',
              }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nombre}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '10px', color: '#6366f1' }}>⏳{stats.activos}</span>
                  <span style={{ fontSize: '10px', color: '#f59e0b' }}>🎯{stats.gestion}</span>
                  <span style={{ fontSize: '10px', color: '#10b981' }}>✅{stats.cerrados}</span>
                </div>
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 800,
                color: getColor(stats.total, maxCount),
              }}>
                {stats.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
