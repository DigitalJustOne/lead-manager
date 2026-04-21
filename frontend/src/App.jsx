import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, BarChart3, Upload, Search, Filter, 
  ChevronRight, Phone, Globe, Star, MapPin, X, Save, Lock, LogOut,
  TrendingUp, Target, CheckCircle, Clock, LayoutDashboard, Database, Zap, Plus,
  Menu, RefreshCw, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3001/api' 
  : 'https://lead-manager-tnxt.onrender.com/api';
const SUPABASE_URL = 'https://dmvrmgixqydznratglao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnJtZ2l4cXlkem5yYXRnbGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTI3NjIsImV4cCI6MjA5MjA4ODc2Mn0.JYybeKQyvMyRXK-fxbL8m5L-I6PbdAolF8XI-8ccwcw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const LeadRow = React.memo(({ lead, onOpen }) => (
  <tr onClick={() => onOpen(lead)}>
    <td><div className="font-semibold">{lead.name}</div><div className="text-xs text-muted mobile-niche">{lead.category}</div></td>
    <td className="text-sm text-muted">{lead.category}</td>
    <td className="text-sm text-muted">{lead.city}</td>
    <td className="text-sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lead.phone && <a href={`tel:${lead.phone}`} className="text-muted" style={{textDecoration:'none'}} onClick={e=>e.stopPropagation()}><Phone size={12}/> {lead.phone}</a>}
        {lead.website && <div style={{color:'var(--accent-primary)'}}><Globe size={12}/> Web</div>}
      </div>
    </td>
    <td><span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status || 'Pendiente'}</span></td>
    <td><ChevronRight size={18} color="#444" /></td>
  </tr>
));

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

function App() {
  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWebsite, setFilterWebsite] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTab, setActiveTab] = useState('all'); // all, pending, active, closed
  const [visibleCount, setVisibleCount] = useState(50);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(search);
        setVisibleCount(50);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/leads`);
      setLeads(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredLeads = useMemo(() => {
    const normalize = (t) => t?.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || '';
    let result = [...leads];
    if (debouncedSearch) {
      const q = normalize(debouncedSearch);
      result = result.filter(l => normalize(l.name).includes(q) || normalize(l.category).includes(q) || normalize(l.city).includes(q) || normalize(l.phone).includes(q));
    }
    
    result = result.filter(lead => {
      // Filtrado por Pestaña (Embudo)
      if (activeTab === 'pending' && lead.status !== 'Pendiente') return false;
      if (activeTab === 'active' && !['Lead Potencial', 'Contactado', 'Cita Agendada'].includes(lead.status)) return false;
      if (activeTab === 'closed' && !['Cliente Cerrado', 'Venta Cerrada', 'Lead Perdido', 'Número Equivocado'].includes(lead.status)) return false;

      // Otros Filtros
      if (filterStatus !== 'All' && lead.status !== filterStatus) return false;
      if (filterWebsite === 'yes' && !lead.website) return false;
      if (filterWebsite === 'no' && lead.website) return false;
      return true;
    });
    
    // Sort logic
    if (sortBy === 'reviews_desc') result.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    else if (sortBy === 'reviews_asc') result.sort((a, b) => (a.reviews || 0) - (b.reviews || 0));
    else if (sortBy === 'rating_desc') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'rating_asc') result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    return result;
  }, [debouncedSearch, filterStatus, filterWebsite, sortBy, leads, activeTab]);

  const visibleLeads = useMemo(() => filteredLeads.slice(0, visibleCount), [filteredLeads, visibleCount]);

  const switchView = (newView) => {
    startTransition(() => {
      setView(newView);
      if (newView === 'list') setVisibleCount(50);
      if (newView === 'dashboard') fetchLeads();
    });
  };

  const openPanel = useCallback((lead) => {
    setSelectedLead(lead);
    setEditStatus(lead.status || 'Pendiente');
    setEditNotes(lead.notes || '');
  }, []);

  const saveLead = async () => {
    if (!selectedLead) return;
    try {
      await axios.put(`${API_URL}/leads/${selectedLead.id}`, { status: editStatus, notes: editNotes });
      setLeads(leads.map(l => l.id === selectedLead.id ? {...l, status: editStatus, notes: editNotes} : l));
      setSelectedLead(null);
    } catch (e) { alert('Error'); }
  };

  const statsData = useMemo(() => {
    const normalizeStr = (s) => (s || '').toLowerCase();
    const isClosed = (s) => {
      const n = normalizeStr(s);
      return n.includes('cerrado') || n.includes('cliente') || n.includes('ganado') || n.includes('venta') || n.includes('perdido') || n.includes('equivocado') || n.includes('errado');
    };
    const isPotential = (s) => {
      const n = normalizeStr(s);
      return (n.includes('potencial') || n.includes('lead') || n.includes('interesado')) && !isClosed(s);
    };
    const isPending = (s) => {
      const n = normalizeStr(s);
      return !s || n.includes('pendiente') || n.includes('espera');
    };

    const closedLeads = leads.filter(l => isClosed(l.status));
    const potentialLeads = leads.filter(l => isPotential(l.status));
    const pendingLeads = leads.filter(l => isPending(l.status));
    const otherLeadsCount = leads.length - (closedLeads.length + potentialLeads.length + pendingLeads.length);

    const stats = {
      total: leads.length,
      closed: closedLeads.length,
      potential: potentialLeads.length,
      pending: pendingLeads.length
    };

    const byStatus = [
      { name: 'Cerrados', value: stats.closed },
      { name: 'Potenciales', value: stats.potential },
      { name: 'Pendientes', value: stats.pending },
      { name: 'Otros', value: Math.max(0, otherLeadsCount) }
    ].filter(i => i.value > 0);

    const cityMap = leads.reduce((acc, l) => { acc[l.city || 'Otros'] = (acc[l.city || 'Otros'] || 0) + 1; return acc; }, {});
    const byCity = Object.keys(cityMap).map(k => ({ name: k, leads: cityMap[k] })).sort((a,b) => b.leads - a.leads).slice(0, 5);
    return { stats, byStatus, byCity };
  }, [leads]);

  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card glass-panel fade-in">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="login-icon"><Lock size={32} color="var(--accent-primary)" /></div>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800 }}>VRS CRM Leads</h1>
            <p className="text-muted text-sm mt-4">Premium Lead Management</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '20px' }}>
            <div className="input-group"><label>Usuario</label><input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="input-group"><label>Contraseña</label><input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required /></div>
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
        <div className="sidebar-header"><div className="brand"><div className="brand-logo"><TrendingUp size={20} /></div><div><h1 className="brand-name">VRS CRM Leads</h1><p className="brand-tagline">Enterprise Edition</p></div></div></div>
        <nav className="sidebar-nav">
          <div className="nav-group"><span className="nav-label">General</span>
            <button onClick={() => switchView('dashboard')} className={`nav-link ${view === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={18} /> <span>Panel</span></button>
            <button onClick={() => switchView('list')} className={`nav-link ${view === 'list' ? 'active' : ''}`}><Users size={18} /> <span>Clientes</span></button>
            <button onClick={() => switchView('upload')} className={`nav-link ${view === 'upload' ? 'active' : ''}`}><Upload size={18} /> <span>Importar Masivo</span></button>
            <button onClick={() => switchView('add_manual')} className={`nav-link ${view === 'add_manual' ? 'active' : ''}`}><Plus size={18} /> <span>Agregar Manual</span></button>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{session.user.email[0].toUpperCase()}</div>
            <div className="user-details"><span className="user-email">Victor</span><span className="user-role">Admin</span></div>
          </div>
          <button className="btn btn-logout w-full" onClick={handleLogout}><LogOut size={16} /> <span>Salir</span></button>
        </div>
      </aside>

      <main className="main-content">
        {view === 'dashboard' && <DashboardView data={statsData} user={session.user.email} onRefresh={fetchLeads} loading={loading} />}
        {view === 'list' && (
          <div className="fade-in">
            <header className="main-header glass-header">
              <div className="flex-col">
                <h2>Directorio Maestro</h2>
                <div className="view-tabs mt-2">
                  <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Todos</button>
                  <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>📥 Nuevos</button>
                  <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>🎯 En Gestión</button>
                  <button className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`} onClick={() => setActiveTab('closed')}>🏁 Finalizados</button>
                </div>
              </div>
              <div className="filters-container">
                <div className="search-box">
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre, nicho o ciudad..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="filters-grid">
                  <div className="select-wrapper">
                    <Filter size={14} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                      <option value="newest">Más recientes</option>
                      <option value="rating_desc">Mejor Rating (5 → 1)</option>
                      <option value="rating_asc">Menor Rating (1 → 5)</option>
                      <option value="reviews_desc">Más Reseñas</option>
                      <option value="reviews_asc">Menos Reseñas</option>
                    </select>
                  </div>

                  <div className="select-wrapper">
                    <Target size={14} />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="All">Cualquier Estado</option>
                      <option value="Pendiente">⏳ Pendiente</option>
                      <option value="Contactado">📞 Contactado</option>
                      <option value="Lead Potencial">⭐ VIP/Potencial</option>
                      <option value="Cita Agendada">📅 Cita Agendada</option>
                      <option value="Venta Cerrada">✅ Venta Ganada</option>
                      <option value="Lead Perdido">🗑️ Perdido</option>
                      <option value="Número Equivocado">❌ Nro Erróneo</option>
                    </select>
                  </div>

                  <div className="select-wrapper">
                    <Globe size={14} />
                    <select value={filterWebsite} onChange={e => setFilterWebsite(e.target.value)}>
                      <option value="All">Cualquier Web</option>
                      <option value="yes">🌍 Con Sitio Web</option>
                      <option value="no">🚫 Sin Sitio Web</option>
                    </select>
                  </div>
                </div>
              </div>
            </header>
            <div className="data-grid-container content-scroll mt-6">
              <table className="data-grid">
                <thead><tr><th>Negocio</th><th>Nicho</th><th>Ciudad</th><th>Contacto</th><th>Estado</th><th></th></tr></thead>
                <tbody>{visibleLeads.map(l => <LeadRow key={l.id} lead={l} onOpen={openPanel} />)}</tbody>
              </table>
              {visibleCount < filteredLeads.length && (
                <div style={{ padding: '40px 20px 120px 20px', textAlign: 'center' }}>
                  <button className="btn btn-secondary" style={{ margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} onClick={() => setVisibleCount(v => v + 50)}>
                    Cargar más resultados ({filteredLeads.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {view === 'upload' && <UploadView onSuccess={() => { setView('list'); fetchLeads(); }} />}
        {view === 'add_manual' && <AddManualView onSuccess={() => { setView('list'); fetchLeads(); }} />}
      </main>

      {selectedLead && (
        <div className="side-panel-overlay" onClick={() => setSelectedLead(null)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header glass-header">
              <div><h3 className="text-lg font-semibold">{selectedLead.name}</h3><p className="text-muted text-sm mt-4">{selectedLead.category}</p></div>
              <button onClick={() => setSelectedLead(null)} className="btn-close"><X size={24} /></button>
            </div>
            <div className="panel-content">
              <div className="glass-panel mb-4" style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="flex-between">
                    <span className="text-muted text-xs uppercase tracking-wider">Valoración</span>
                    <div className="flex-item-center" style={{ gap: '4px', color: '#f59e0b' }}>
                      <Star size={14} fill="#f59e0b" />
                      <span className="font-bold">{selectedLead.rating || '0.0'}</span>
                      <span className="text-muted text-xs">({selectedLead.reviews || 0} reseñas)</span>
                    </div>
                  </div>
                  
                  <div className="flex-between">
                    <span className="text-muted text-xs uppercase tracking-wider">Contacto</span>
                    <div style={{ textAlign: 'right' }}>
                      <a href={`tel:${selectedLead.phone}`} className="block font-semibold" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{selectedLead.phone}</a>
                      {selectedLead.website && <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-xs text-muted block mt-1">Visitar Sitio Web</a>}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <span className="text-muted text-xs uppercase tracking-wider block mb-2">Ubicación</span>
                    <div className="flex-item-center" style={{ gap: '8px', marginBottom: '8px' }}>
                      <MapPin size={14} className="text-muted" />
                      <span className="text-sm">{selectedLead.address || selectedLead.city}</span>
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLead.name + ' ' + (selectedLead.address || selectedLead.city))}`}
                      target="_blank" rel="noreferrer"
                      className="btn btn-secondary w-full text-xs"
                      style={{ padding: '8px' }}
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Estado de Gestión</label>
                <select 
                  className="input-field w-full" 
                  value={editStatus} 
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ background: 'var(--bg-card)', fontSize: '0.95rem' }}
                >
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="Contactado">📞 Contactado</option>
                  <option value="Lead Potencial">⭐ VIP / Potencial</option>
                  <option value="Cita Agendada">📅 Cita Agendada</option>
                  <option value="Venta Cerrada">✅ Venta Ganada</option>
                  <option value="Lead Perdido">🗑️ Lead Perdido</option>
                  <option value="Número Equivocado">❌ Número Equivocado</option>
                </select>
              </div>
              <div className="input-group"><label>Notas del Seguimiento</label><textarea className="input-field" value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ height: '150px' }} placeholder="Escribe aquí los detalles de la conversación..."></textarea></div>
            </div>
            <div className="panel-footer glass-header">
              <button className="btn btn-secondary" onClick={() => setSelectedLead(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={saveLead}><Save size={16} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-nav">
        <button onClick={() => switchView('dashboard')} className={`mobile-nav-item ${view === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={24} /><span>Inicio</span></button>
        <button onClick={() => switchView('list')} className={`mobile-nav-item ${view === 'list' ? 'active' : ''}`}><Users size={24} /><span>Clientes</span></button>
        <button onClick={() => switchView('upload')} className={`mobile-nav-item ${view === 'upload' ? 'active' : ''}`}><Upload size={24} /><span>Subir</span></button>
        <button onClick={() => switchView('add_manual')} className={`mobile-nav-item ${view === 'add_manual' ? 'active' : ''}`}><Plus size={24} /><span>Más</span></button>
        <button onClick={handleLogout} className="mobile-nav-item"><LogOut size={24} /><span>Salir</span></button>
      </nav>
    </div>
  );
}

const DashboardView = React.memo(({ data, user, onRefresh, loading }) => {
  const { stats, byStatus, byCity } = data;
  return (
    <div className="dashboard-container fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Hola, Victor</h2>
          <p className="page-subtitle">Rendimiento en tiempo real.</p>
        </div>
        <button className={`btn btn-secondary ${loading ? 'spin' : ''}`} onClick={onRefresh} style={{ padding: '10px' }}>
          <Zap size={18} fill={loading ? "currentColor" : "none"} /> 
          <span className="desktop-only">{loading ? 'Actualizando...' : 'Refrescar'}</span>
          <span className="mobile-only">{loading ? '...' : ''}</span>
        </button>
      </header>
      <div className="stats-grid">
        <StatCard icon={<Database />} val={stats.total} label="Total" color="#6366f1" />
        <StatCard icon={<CheckCircle />} val={stats.closed} label="Cerrados" color="#10b981" />
        <StatCard icon={<Target />} val={stats.potential} label="VIP" color="#f59e0b" />
        <StatCard icon={<Clock />} val={stats.pending} label="Pendiente" color="#ef4444" />
      </div>
      <div className="charts-grid">
        <div className="chart-card glass-panel"><h3 className="chart-title">Distribución</h3>
          <div style={{ height: '250px' }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{byStatus.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} /></PieChart></ResponsiveContainer></div>
        </div>
        <div className="chart-card glass-panel"><h3 className="chart-title">Top Ciudades</h3>
          <div style={{ height: '250px' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byCity} margin={{ bottom: 20 }}><XAxis dataKey="name" fontSize={10} stroke="#666" tick={{fill: '#666'}} /><YAxis fontSize={10} stroke="#666" tick={{fill: '#666'}} /><Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} /><Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
});

const StatCard = ({ icon, val, label, color }) => (
  <div className="stat-card glass-panel"><div className="stat-icon" style={{ background: `${color}15`, color: color }}>{icon}</div><div><div className="stat-value">{val}</div><div className="stat-label">{label}</div></div></div>
);

function UploadView({ onSuccess }) {
  const fileInput = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    try {
      const res = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
    } catch (e) { alert('Error subiendo archivos'); }
    finally { setUploading(false); }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="fade-in" style={{maxWidth:'600px', margin:'0 auto', paddingTop:'40px'}}>
      <div className="glass-panel" style={{ padding: '40px', textAlign:'center' }}>
        <h2 className="text-xl font-bold mb-6">Carga Masiva (Excel)</h2>
        {!result ? (
          <>
            <div className="file-drop-zone" onClick={() => fileInput.current?.click()} style={{border:'2px dashed #444', padding:'40px', borderRadius:'16px', cursor:'pointer', background:'rgba(255,255,255,0.02)'}}>
              <input type="file" ref={fileInput} style={{ display: 'none' }} accept=".xlsx, .csv" multiple onChange={handleFileChange} />
              <Upload size={48} className="text-muted" />
              {files.length > 0 ? (
                <div style={{marginTop:'16px'}}>
                  <p className="font-bold">{files.length} archivos seleccionados</p>
                  <p className="text-xs text-muted mb-2">Soporta Excel (.xlsx) y CSV</p>
                  <ul style={{listStyle:'none', padding:0, fontSize:'12px', color:'var(--text-muted)', marginTop:'8px'}}>
                    {files.slice(0, 5).map((f, i) => <li key={i}>{f.name}</li>)}
                    {files.length > 5 && <li>...y {files.length - 5} más</li>}
                  </ul>
                </div>
              ) : <p className="mt-4 text-muted">Haz clic para seleccionar uno o varios archivos Excel</p>}
            </div>
            <button className="btn btn-primary mt-6 w-full" disabled={files.length === 0 || uploading} onClick={handleUpload}>
              {uploading ? 'Procesando archivos...' : `Importar ${files.length} Archivos`}
            </button>
          </>
        ) : (
          <div>
            {result.errors && result.errors.length > 0 ? (
              <AlertTriangle size={64} color="#f59e0b" style={{margin:'0 auto 16px'}}/>
            ) : (
              <CheckCircle size={64} color="#10b981" style={{margin:'0 auto 16px'}}/>
            )}
            
            <h3>{result.errors && result.errors.length > 0 ? 'Procesado con Advertencias' : '¡Importación Exitosa!'}</h3>
            <p className="text-muted mt-2">
              Se han procesado **{result.total_processed}** leads correctamente.
            </p>

            {result.errors && result.errors.length > 0 && (
              <div className="glass-panel mt-4" style={{textAlign:'left', padding:'15px', background:'rgba(245,158,11,0.05)', borderColor:'rgba(245,158,11,0.2)'}}>
                <p className="text-xs font-bold" style={{color:'#f59e0b', marginBottom:'8px'}}>Problemas encontrados:</p>
                <ul style={{fontSize:'12px', color:'var(--text-muted)', paddingLeft:'15px'}}>
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            <button className="btn btn-primary mt-10 w-full" style={{py: '12px'}} onClick={onSuccess}>Ver Clientes Actualizados</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddManualView({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    website: '',
    category: '',
    city: '',
    address: '',
    status: 'Pendiente',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_URL}/leads`, formData);
      onSuccess();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '40px', paddingBottom: '100px' }}>
      <div className="glass-panel" style={{ padding: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '12px', borderRadius: '12px', color: 'white' }}>
            <Plus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Agregar Manualmente</h2>
            <p className="text-muted text-sm">Ingresa los detalles del nuevo cliente o potencial lead.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Nombre del Negocio / Cliente *</label>
            <input type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} required placeholder="Ej: Restaurante El Gourmet" />
          </div>

          <div className="input-group">
            <label>Teléfono / Contacto</label>
            <input type="text" name="phone" className="input-field" value={formData.phone} onChange={handleChange} placeholder="Ej: +57 300..." />
          </div>

          <div className="input-group">
            <label>Sitio Web</label>
            <input type="url" name="website" className="input-field" value={formData.website} onChange={handleChange} placeholder="Ej: https://..." />
          </div>

          <div className="input-group">
            <label>Categoría / Nicho</label>
            <input type="text" name="category" className="input-field" value={formData.category} onChange={handleChange} placeholder="Ej: Gastronomía" />
          </div>

          <div className="input-group">
            <label>Ciudad</label>
            <input type="text" name="city" className="input-field" value={formData.city} onChange={handleChange} placeholder="Ej: Medellín" />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Dirección Completa</label>
            <input type="text" name="address" className="input-field" value={formData.address} onChange={handleChange} placeholder="Ej: Calle 10 # 50-20..." />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Estado Inicial</label>
            <select name="status" className="input-field" value={formData.status} onChange={handleChange}>
              <option value="Pendiente">⏳ Pendiente</option>
              <option value="Contactado">📞 Contactado</option>
              <option value="Lead Potencial">⭐ VIP / Potencial</option>
              <option value="Cita Agendada">📅 Cita Agendada</option>
              <option value="Venta Cerrada">✅ Venta Ganada</option>
              <option value="Lead Perdido">🗑️ Lead Perdido</option>
              <option value="Número Equivocado">❌ Número Equivocado</option>
            </select>
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Notas Iniciales</label>
            <textarea name="notes" className="input-field" value={formData.notes} onChange={handleChange} style={{ height: '100px' }} placeholder="Detalles relevantes..."></textarea>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Nuevo Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
