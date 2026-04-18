import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Users, BarChart3, Upload, Search, Filter, 
  ChevronRight, Phone, Globe, Star, MapPin, X, Save
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [view, setView] = useState('list'); // list | upload
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Edit states
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  useEffect(() => {
    let result = [...leads];
    if (search) {
      const q = normalizeText(search);
      result = result.filter(l => 
        normalizeText(l.name).includes(q) || 
        normalizeText(l.category).includes(q) || 
        normalizeText(l.city).includes(q) ||
        normalizeText(l.phone).includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter(l => l.status === statusFilter);
    }
    if (websiteFilter === 'con') {
      result = result.filter(l => l.website && l.website.trim() !== '');
    } else if (websiteFilter === 'sin') {
      result = result.filter(l => !l.website || l.website.trim() === '');
    }

    if (sortBy === 'reviews_desc') {
      result.sort((a, b) => (b.reviews || 0) * (b.rating || 0) - (a.reviews || 0) * (a.rating || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'category_asc') {
      result.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    } else if (sortBy === 'city_asc') {
      result.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
    }

    setFilteredLeads(result);
  }, [search, statusFilter, websiteFilter, sortBy, leads]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/leads`);
      setLeads(res.data.data || []);
      setFilteredLeads(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (lead) => {
    setSelectedLead(lead);
    setEditStatus(lead.status);
    setEditNotes(lead.notes || '');
  };

  const saveLead = async () => {
    if (!selectedLead) return;
    try {
      await axios.put(`${API_URL}/leads/${selectedLead.id}`, {
        status: editStatus,
        notes: editNotes
      });
      // Update local state optimistic
      const updated = leads.map(l => l.id === selectedLead.id ? {...l, status: editStatus, notes: editNotes} : l);
      setLeads(updated);
      setSelectedLead(null);
    } catch (e) {
      alert('Error updating lead');
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'status-pendiente';
    const s = status.toLowerCase();
    if (s.includes('pendiente')) return 'status-pendiente';
    if (s.includes('sabe') || s.includes('contesta')) return 'status-nocontesta';
    if (s.includes('negació') || s.includes('negacio')) return 'status-negacion';
    if (s.includes('potencial') || s.includes('lead')) return 'status-lead';
    if (s.includes('cliente') || s.includes('cerrado')) return 'status-cliente';
    return 'status-pendiente';
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
        <div style={{ padding: '0 0 20px 0', borderBottom: '1px solid var(--border-light)' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Global CRM</h1>
          <p className="text-muted text-sm mt-4">Local Lead Manager</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setView('list')}
            className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start' }}
          >
            <Users size={18} /> Directorio de Clientes
          </button>
          <button 
            onClick={() => setView('upload')}
            className={`btn ${view === 'upload' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start' }}
          >
            <Upload size={18} /> Importar Datos
          </button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div className="glass-panel" style={{ padding: '16px', border: '1px dashed var(--border-focus)' }}>
            <div className="flex-item-center text-muted mb-4">
              <BarChart3 size={16} /> <span className="text-sm font-semibold">Resumen Total</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {leads.length}
            </div>
            <div className="text-sm text-muted">Leads Totales</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {view === 'list' && (
          <>
            <header className="main-header glass-header">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Directorio de Clientes</h2>
                <p className="text-muted text-sm" style={{ marginTop: '4px' }}>Gestiona y haz seguimiento a tus leads</p>
              </div>
              <div className="flex-item-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
                <div className="input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', width: '280px' }}>
                  <Search size={16} className="text-muted" />
                  <input 
                    type="text" 
                    placeholder="Buscar nombre, nicho, ciudad..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                <select 
                  className="input-field" 
                  style={{ padding: '10px 40px 10px 16px', width: '190px' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="">Ordenar por defecto</option>
                  <option value="reviews_desc">⭐ Mejor valorados (Reseñas)</option>
                  <option value="name_asc">🔤 Alfabéticamente (A-Z)</option>
                  <option value="category_asc">🏢 Por Nicho / Categoría</option>
                  <option value="city_asc">📍 Por Ubicación</option>
                </select>
                <select 
                  className="input-field" 
                  style={{ padding: '10px 40px 10px 16px', width: '190px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos los Estados</option>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="Lead Potencial">⭐ Lead Potencial</option>
                  <option value="No contesta">📵 No contesta</option>
                  <option value="Negación Total">❌ Negación Total</option>
                  <option value="Cliente Cerrado">✅ Cliente Cerrado</option>
                </select>
                <select 
                  className="input-field" 
                  style={{ padding: '10px 40px 10px 16px', width: '190px' }}
                  value={websiteFilter}
                  onChange={(e) => setWebsiteFilter(e.target.value)}
                >
                  <option value="">🌐 Todas las Webs</option>
                  <option value="con">✅ Con página web</option>
                  <option value="sin">🚫 Sin página web</option>
                </select>
              </div>
            </header>

            <div className="content-scroll fade-in" style={{ paddingTop: '24px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando datos...</div>
              ) : (
                <div className="data-grid-container">
                  <table className="data-grid">
                    <thead>
                      <tr>
                        <th>Negocio</th>
                        <th>Nicho</th>
                        <th>Ubicación</th>
                        <th>Contacto</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} onClick={() => openPanel(lead)}>
                          <td>
                            <div className="font-semibold">{lead.name}</div>
                            {lead.rating > 0 && (
                              <div className="flex-item-center text-sm text-muted" style={{ marginTop: '4px' }}>
                                <Star size={12} fill="var(--status-pending)" color="var(--status-pending)" /> 
                                {lead.rating} ({lead.reviews})
                              </div>
                            )}
                          </td>
                          <td className="text-sm text-muted">{lead.category}</td>
                          <td className="text-sm text-muted">
                            <div className="flex-item-center"><MapPin size={14}/> {lead.city || 'N/A'}, {lead.country || ''}</div>
                          </td>
                          <td className="text-sm">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {lead.phone && (
                                <div className="flex-item-center text-muted">
                                  <Phone size={14}/> 
                                  <a href={`tel:${lead.phone}`} style={{ color: 'inherit', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                                    {lead.phone}
                                  </a>
                                </div>
                              )}
                              {lead.website && <div className="flex-item-center" style={{ color: 'var(--accent-primary)' }}><Globe size={14}/> Website</div>}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(lead.status)}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            <ChevronRight size={18} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLeads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                      No se encontraron resultados.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'upload' && (
          <UploadView onSuccess={() => { setView('list'); fetchLeads(); }} />
        )}
      </main>

      {/* Side Panel for Editing */}
      {selectedLead && (
        <div className="side-panel-overlay" onClick={() => setSelectedLead(null)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header glass-header">
              <div>
                <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                <p className="text-muted text-sm mt-4">{selectedLead.category}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="panel-content">
              <div className="glass-panel mb-4" style={{ padding: '16px' }}>
                <h4 className="text-sm font-semibold mb-4 text-muted">Información de Contacto</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="flex-between text-sm">
                    <span className="text-muted"><Phone size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'6px'}}/> Teléfono</span>
                    <span className="font-semibold">
                      {selectedLead.phone ? (
                        <a href={`tel:${selectedLead.phone}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {selectedLead.phone}
                        </a>
                      ) : 'No disponible'}
                    </span>
                  </div>
                  <div className="flex-between text-sm">
                    <span className="text-muted"><Globe size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'6px'}}/> Sitio Web</span>
                    {selectedLead.website ? (
                      <a href={selectedLead.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }} className="font-semibold">Visitar</a>
                    ) : (
                      <span className="font-semibold">No disponible</span>
                    )}
                  </div>
                  <div className="flex-between text-sm">
                    <span className="text-muted"><MapPin size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'6px'}}/> Ubicación</span>
                    <span className="font-semibold">{selectedLead.city}, {selectedLead.state || selectedLead.country}</span>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Estado de Seguimiento</label>
                <select 
                  className="input-field"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Lead Potencial">Lead Potencial</option>
                  <option value="No contesta">No contesta</option>
                  <option value="Negación Total">Negación Total</option>
                  <option value="Cliente Cerrado">Cliente Cerrado</option>
                </select>
              </div>

              <div className="input-group">
                <label>Notas del Vendedor</label>
                <textarea 
                  className="input-field" 
                  placeholder="Ej: Llamé a las 3pm, dijeron que les interesa pero que llame el Lunes..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                ></textarea>
              </div>

            </div>
            
            <div className="panel-footer glass-header">
              <button className="btn btn-secondary" onClick={() => setSelectedLead(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveLead}><Save size={16} /> Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Extract UploadView Component
function UploadView({ onSuccess }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      setFile(null);
    } catch (e) {
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header className="main-header glass-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Importar Datos</h2>
          <p className="text-muted text-sm" style={{ marginTop: '4px' }}>Sube archivos de Outscraper (Excel) para nutrir la base de datos.</p>
        </div>
      </header>

      <div className="content-scroll fade-in" style={{ paddingTop: '40px', maxWidth: '800px' }}>
        <div className="glass-panel" style={{ padding: '40px' }}>
          
          {!result ? (
            <>
              <div 
                className="file-drop-zone" 
                onClick={() => fileInput.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInput} 
                  style={{ display: 'none' }} 
                  accept=".xlsx, .xls, .csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                <Upload size={48} className="text-muted" style={{ margin: '0 auto' }} />
                {file ? (
                  <p className="font-semibold text-primary" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                ) : (
                  <>
                    <p className="font-semibold text-primary" style={{ color: 'var(--text-primary)' }}>Haz clic para seleccionar el archivo Excel (.xlsx)</p>
                    <p className="text-sm">El sistema extraerá automáticamente clientes, limpiará duplicados y los preparará para seguimiento.</p>
                  </>
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  disabled={!file || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? 'Procesando archivo...' : 'Procesar y Agregar a DB'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-closed)', marginBottom: '20px' }}>
                <Save size={32} />
              </div>
              <h3 className="text-lg font-semibold mb-4">Importación Completada</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                <div className="glass-panel" style={{ padding: '16px 24px' }}>
                  <div className="text-sm text-muted">Añadidos Nuevos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.imported}</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px 24px' }}>
                  <div className="text-sm text-muted">Duplicados Ignorados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.duplicates}</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={onSuccess}>Ir al Directorio de Clientes</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default App;
