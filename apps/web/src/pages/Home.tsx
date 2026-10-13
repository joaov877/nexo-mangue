import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, Recommendation, RecommendationFilters, Stage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

const KIND_LABEL = { STARTUP: 'Startup', MENTOR: 'Mentor', INVESTOR: 'Investidor' } as const;
const ROLE_LABEL = { STARTUP: 'startup', MENTOR: 'mentor', INVESTOR: 'investidor', ADMIN: 'administrador' } as const;
const STAGES: { value: Stage; label: string }[] = [
  { value: 'IDEACAO', label: 'Ideação' }, { value: 'VALIDACAO', label: 'Validação' },
  { value: 'MVP', label: 'MVP' }, { value: 'TRACAO', label: 'Tração' }, { value: 'ESCALA', label: 'Escala' },
];
export default function Home() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);
  const [busyId, setBusyId] = useState('');
  const [filters, setFilters] = useState({ kind: '', sector: '', stage: '', minScore: '0' });
  async function load(next: RecommendationFilters = {}) {
    setItems(null); setNotice(null);
    try { setItems(await api.recommendations(next)); }
    catch (err) { const e = err as ApiError; setItems([]); setNotice(e.status === 404 ? 'Complete seu perfil para receber recomendações.' : e.message); }
  }
  useEffect(() => { void load(); }, []);
  function applyFilters(e: FormEvent) {
    e.preventDefault();
    void load({ kind: filters.kind ? filters.kind as 'MENTOR' | 'INVESTOR' : undefined,
      sector: filters.sector || undefined, stage: filters.stage ? filters.stage as Stage : undefined,
      minScore: Number(filters.minScore), limit: 20 });
  }
  function resetFilters() {
    const empty = { kind: '', sector: '', stage: '', minScore: '0' }; setFilters(empty); void load({ limit: 10 });
  }
  async function interest(r: Recommendation) {
    setBusyId(r.userId); setNotice(null);
    try {
      const res = await api.interest(r.userId);
      setItems((list) => list?.map((i) => i.userId === r.userId ? { ...i, interestSent: true } : i) ?? null);
      if (res.mutual && res.contact) setContact('Interesse mútuo com ' + res.contact.name + '! Contato: ' + res.contact.email);
      else setNotice('Interesse enviado! Você poderá acompanhar as respostas em Conexões.');
    } catch (err) { setNotice((err as Error).message); }
    finally { setBusyId(''); }
  }
  return <div className="app-shell"><header className="topbar"><Logo />
    <nav className="main-nav"><span className="nav-current">Recomendações</span><Link to="/conexoes">Conexões</Link><Link to="/perfil">Meu perfil</Link></nav>
    <div className="topbar-user"><span>{user?.name} · <span className="muted">{user && ROLE_LABEL[user.role]}</span></span><button className="btn-ghost" onClick={signOut}>Sair</button></div>
  </header>
  <main className="content"><div className="eyebrow">MATCHMAKING EXPLICÁVEL</div><h1>Conexões recomendadas</h1>
    <p className="muted">A nota mede a aderência aos critérios dos perfis — setor, estágio, ticket, localização e impacto — e não a chance de investimento.</p>
    <form className="filter-panel" onSubmit={applyFilters}><div className="filter-title"><div><h2>Refinar recomendações</h2><p className="muted">Combine os critérios para encontrar conexões relevantes.</p></div></div>
      <div className="filter-grid">
        {user?.role === 'STARTUP' && <label>Tipo de perfil<select value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })}><option value="">Todos</option><option value="MENTOR">Mentor</option><option value="INVESTOR">Investidor</option></select></label>}
        <label>Setor<input value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} placeholder="Ex.: Tecnologia" /></label>
        {user?.role !== 'STARTUP' && <label>Estágio da startup<select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}><option value="">Todos os estágios</option>{STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>}
        <label>Nota mínima <strong>{filters.minScore}/100</strong><input type="range" min="0" max="100" step="5" value={filters.minScore} onChange={(e) => setFilters({ ...filters, minScore: e.target.value })} /></label>
      </div><div className="filter-actions"><button className="btn btn-small" type="submit">Aplicar filtros</button><button className="btn-ghost" type="button" onClick={resetFilters}>Limpar filtros</button></div>
    </form>
    {contact && <p className="success" role="status">{contact} <Link to="/conexoes">Ver conexões</Link></p>}
    {notice && <p className="notice" role="alert">{notice}</p>}
    <div className="results-heading"><h2>Perfis para conhecer</h2>{items && <span className="muted">{items.length} resultado(s)</span>}</div>
    {items === null && <p className="muted">Calculando recomendações…</p>}
    {items?.length === 0 && !notice && <div className="empty-state"><span className="empty-icon">⌕</span><h3>Nenhuma recomendação encontrada</h3><p className="muted">Tente ajustar os filtros ou volte mais tarde para novas conexões.</p></div>}
    <ul className="cards">{items?.map((r) => <li key={r.userId} className="card"><div className="card-head"><div><span className="tag">{KIND_LABEL[r.kind]}</span><h2>{r.title ?? r.name}</h2><p className="muted">{r.title ? r.name + ' · ' : ''}{r.city}/{r.state}</p></div>
      <div className="score" aria-label={'Compatibilidade ' + r.score + ' de 100'}><strong>{r.score}</strong><span>/100</span></div></div>
      <div className="bar"><span style={{ width: r.score + '%' }} /></div>
      {r.highlights.length > 0 && <><p className="why">Por que esta indicação?</p><ul className="reasons">{r.highlights.map((h) => <li key={h}>{h}</li>)}</ul></>}
      <button className="btn btn-small" disabled={r.interestSent || busyId === r.userId} onClick={() => void interest(r)}>{busyId === r.userId ? 'Enviando…' : r.interestSent ? 'Interesse enviado' : 'Tenho interesse'}</button>
    </li>)}</ul>
  </main></div>;
}
