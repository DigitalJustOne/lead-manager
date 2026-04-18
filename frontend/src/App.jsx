import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, BarChart3, Upload, Search, Filter, 
  ChevronRight, Phone, Globe, Star, MapPin, X, Save, Lock, LogOut,
  TrendingUp, Target, CheckCircle, Clock, LayoutDashboard, Database
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const API_URL = 'https://lead-manager-tnxt.onrender.com/api';
const SUPABASE_URL = 'https://dmvrmgixqydznratglao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnJtZ2l4cXlkem5yYXRnbGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTI3NjIsImV4cCI6MjA5MjA4ODc2Mn0.JYybeKQyvMyRXK-fxbL8m5L-I6PbdAolF8XI-8ccwcw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function App() {
  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard | list | upload
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchLeads();
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError('Acceso denegado');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

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
    if (statusFilter) result = result.filter(l => l.status === statusFilter);
    if (websiteFilter === 'con') result = result.filter(l => l.website && l.website.trim() !== '');
    else if (websiteFilter === 'sin') result = result.filter(l => !l.website || l.website.trim() === '');

    if (sortBy === 'reviews_desc') result.sort((a, b) => (b.reviews || 0) * (b.rating || 0) - (a.reviews || 0) * (a.rating || 0));
    else if (sortBy === 'name_asc') result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortBy === 'category_asc') result.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    else if (sortBy === 'city_asc') result.sort((a, b) => (a.city || '').localeCompare(b.city || ''));

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

  const saveLead = async () => {
    if (!selectedLead) return;
    try {
      await axios.put(`${API_URL}/leads/${selectedLead.id}`, { status: editStatus, notes: editNotes });
      const updated = leads.map(l => l.id === selectedLead.id ? {...l, status: editStatus, notes: editNotes} : l);
      setLeads(updated);
      setSelectedLead(null);
    } catch (e) { alert('Error'); }
  };

  const getStatusClass = (status) => {
    if (!status) return 'status-pendiente';
    const s = status.toLowerCase();
    if (s.includes('pendiente')) return 'status-pendiente';
    if (s.includes('sabe') || s.includes('notesta')) return 'status-nocontesta';
    if (s.includes('negación') || s.includes('negacio')) return 'status-negacion';
    if (s.includes('potencial') || s.includes('lead')) return 'status-lead';
    if (s.includes('cliente') || s.includes('cerrado')) return 'status-cliente';
    return 'status-pendiente';
  };

  // Stats Data
  const getStats = () => {
    const stats = {
      total: leads.length,
      closed: leads.filter(l => l.status === 'Cliente Cerrado').length,
      potential: leads.filter(l => l.status === 'Lead Potencial').length,
      pending: leads.filter(l => !l.status || l.status === 'Pendiente').length
    };
    
    const byStatus = [
      { name: 'Cerrados', value: stats.closed },
      { name: 'Potenciales', value: stats.potential },
      { name: 'Pendientes', value: stats.pending },
      { name: 'Otros', value: leads.length - (stats.closed+stats.potential+stats.pending) }
    ];

    const cityStats = leads.reduce((acc, lead) => {
      const city = lead.city || 'Desconocida';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    const byCity = Object.keys(cityStats).map(city => ({ name: city, leads: cityStats[city] }))
      .sort((a,b) => b.leads - a.leads).slice(0, 5);

    return { stats, byStatus, byCity };
  };

  const { stats, byStatus, byCity } = getStats();

  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card glass-panel fade-in">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="login-icon"><Lock size={32} color="var(--accent-primary)" /></div>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800 }}>Global CRM</h1>
            <p className="text-muted text-sm mt-4">Premium Lead Management</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '20px' }}>
            <div className="input-group">
              <label>Usuario</label>
              <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Contraseña</label>
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {loginError && <p style={{ color: 'var(--status-negacion)', textAlign: 'center' }}>{loginError}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Iniciando...' : 'Acceder'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar premium-sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-logo"><TrendingUp size={20} /></div>
            <div>
              <h1 className="brand-name">Global CRM</h1>
              <p className="brand-tagline">Enterprise Edition</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-label">General</span>
            <button onClick={() => setView('dashboard')} className={`nav-link ${view === 'dashboard' ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> <span>Panel de Control</span>
            </button>
            <button onClick={() => setView('list')} className={`nav-link ${view === 'list' ? 'active' : ''}`}>
              <Users size={18} /> <span>Mis Clientes</span>
            </button>
          </div>
          <div className="nav-group">
            <span className="nav-label">Herramientas</span>
            <button onClick={() => setView('upload')} className={`nav-link ${view === 'upload' ? 'active' : ''}`}>
              <Upload size={18} /> <span>Importar Excel</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{session.user.email[0].toUpperCase()}</div>
            <div className="user-details">
              <span className="user-email">{session.user.email.split('@')[0]}</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
          <button className="btn btn-logout w-full" onClick={handleLogout}>
            <LogOut size={16} /> <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {view === 'dashboard' && (
          <div className="dashboard-container fade-in">
            <header className="page-header">
              <h2 className="page-title">Bienvenido, {session.user.email.split('@')[0]}</h2>
              <p className="page-subtitle">Aquí tienes el resumen de tu rendimiento hoy.</p>
            </header>

            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}><Database size={24} /></div>
                <div><div className="stat-value">{stats.total}</div><div className="stat-label">Leads Totales</div></div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><CheckCircle size={24} /></div>
                <div><div className="stat-value">{stats.closed}</div><div className="stat-label">Ventas Cerradas</div></div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Target size={24} /></div>
                <div><div className="stat-value">{stats.potential}</div><div className="stat-label">Leads VIP</div></div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Clock size={24} /></div>
                <div><div className="stat-value">{stats.pending}</div><div className="stat-label">Por Llamar</div></div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card glass-panel">
                <h3 className="chart-title">Distribución por Estado</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {byStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-card glass-panel">
                <h3 className="chart-title">Top Ciudades</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                      <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="fade-in">
            <header className="main-header glass-header">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Directorio Maestro</h2>
                <p className="text-muted text-sm">Gestiona tus prospectos</p>
              </div>
              <div className="flex-item-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
                <div className="input-field search-box">
                  <Search size={16} className="text-muted" />
                  <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="input-field filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="">Ordenar...</option>
                  <option value="reviews_desc">⭐ Reseñas</option>
                  <option value="name_asc">🔤 Nombre</option>
                </select>
                <select className="input-field filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Estado...</option>
                  <option value="Cliente Cerrado">✅ Cerrado</option>
                  <option value="Lead Potencial">⭐ Potencial</option>
                  <option value="Pendiente">⏳ Pendiente</option>
                </select>
                <select className="input-field filter-select" value={websiteFilter} onChange={(e) => setWebsiteFilter(e.target.value)}>
                  <option value="">Web...</option>
                  <option value="con">✅ Tiene Web</option>
                  <option value="sin">🚫 Sin Web</option>
                </select>
              </div>
            </header>

            <div className="content-scroll" style={{ paddingTop: '24px' }}>
              <div className="data-grid-container">
                <table className="data-grid">
                  <thead>
                    <tr><th>Negocio</th><th>Nicho</th><th>Ciudad</th><th>Contacto</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} onClick={() => openPanel(lead)}>
                        <td>
                          <div className="font-semibold">{lead.name}</div>
                          <div className="text-xs text-muted mobile-niche">{lead.category}</div>
                        </td>
                        <td className="text-sm text-muted">{lead.category}</td>
                        <td className="text-sm text-muted">{lead.city}</td>
                        <td className="text-sm">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {lead.phone && <a href={`tel:${lead.phone}`} className="text-muted" style={{textDecoration:'none'}} onClick={e=>e.stopPropagation()}><Phone size={12}/> {lead.phone}</a>}
                            {lead.website && <div style={{color:'var(--accent-primary)'}}><Globe size={12}/> Web</div>}
                          </div>
                        </td>
                        <td><span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status}</span></td>
                        <td><ChevronRight size={18} color="#444" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && <UploadView onSuccess={() => { setView('list'); fetchLeads(); }} />}
      </main>

      {selectedLead && (
        <div className="side-panel-overlay" onClick={() => setSelectedLead(null)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header glass-header">
              <div><h3 className="text-lg font-semibold">{selectedLead.name}</h3><p className="text-muted text-sm mt-4">{selectedLead.category}</p></div>
              <button onClick={() => setSelectedLead(null)} className="btn-close"><X size={24} /></button>
            </div>
            <div className="panel-content">
              <div className="glass-panel mb-4" style={{ padding: '16px' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-muted">Detalles</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="flex-between text-sm"><span>Teléfono</span><a href={`tel:${selectedLead.phone}`} style={{color:'var(--accent-primary)', textDecoration:'none'}}>{selectedLead.phone}</a></div>
                  <div className="flex-between text-sm"><span>Ubicación</span><span>{selectedLead.city}</span></div>
                </div>
              </div>
              <div className="input-group">
                <label>Estado</label>
                <select className="input-field" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Lead Potencial">Lead Potencial</option>
                  <option value="Cliente Cerrado">Cliente Cerrado</option>
                </select>
              </div>
              <div className="input-group">
                <label>Notas</label>
                <textarea className="input-field" value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{height:'120px'}}></textarea>
              </div>
            </div>
            <div className="panel-footer glass-header">
              <button className="btn btn-secondary" onClick={() => setSelectedLead(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={saveLead}><Save size={16} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <button onClick={() => setView('dashboard')} className={`mobile-nav-item ${view === 'dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Inicio</span>
        </button>
        <button onClick={() => setView('list')} className={`mobile-nav-item ${view === 'list' ? 'active' : ''}`}>
          <Users size={24} />
          <span>Clientes</span>
        </button>
        <button onClick={() => setView('upload')} className={`mobile-nav-item ${view === 'upload' ? 'active' : ''}`}>
          <Upload size={24} />
          <span>Subir</span>
        </button>
        <button onClick={handleLogout} className="mobile-nav-item">
          <LogOut size={24} />
          <span>Salir</span>
        </button>
      </nav>
    </div>
  );
}

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
      const res = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      setFile(null);
    } catch (e) { alert('Error'); }
    finally { setUploading(false); }
  };

  return (
    <div className="fade-in" style={{maxWidth:'800px', margin:'0 auto', paddingTop:'40px'}}>
      <div className="glass-panel" style={{ padding: '40px', textAlign:'center' }}>
        <h2 className="text-xl font-bold mb-2">Importar Clientes</h2>
        {!result ? (
          <>
            <div className="file-drop-zone" onClick={() => fileInput.current?.click()}>
              <input type="file" ref={fileInput} style={{ display: 'none' }} accept=".xlsx" onChange={e => setFile(e.target.files?.[0])} />
              <Upload size={48} className="text-muted" />
              {file ? <p className="font-bold">{file.name}</p> : <p>Sube tu archivo Outscraper</p>}
            </div>
            <button className="btn btn-primary mt-6" disabled={!file || uploading} onClick={handleUpload}>{uploading ? 'Procesando...' : 'Importar Ahora'}</button>
          </>
        ) : (
          <div>
            <div style={{color:'#10b981', marginBottom:'16px'}}><CheckCircle size={64} style={{margin:'0 auto'}}/></div>
            <h3>¡Éxito!</h3>
            <p className="text-muted">{result.imported} clientes nuevos añadidos.</p>
            <button className="btn btn-primary mt-6" onClick={onSuccess}>Ver Clientes</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
