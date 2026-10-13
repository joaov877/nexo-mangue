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
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState({ kind: '', search: '', sector: '', stage: '', minScore: '0' });
  const selected = items?.find((item) => item.userId === selectedId);
  async function load(next: RecommendationFilters = {}) {
    setItems(null); setNotice(null); setSelectedId('');
    try { setItems(await api.recommendations(next)); }
    catch (err) { const e = err as ApiError; setItems([]); setNotice(e.status === 404 ? 'Complete seu perfil para receber recomendações.' : e.message); }
  }
  useEffect(() => { void load(); }, []);
  function applyFilters(e: FormEvent) {
    e.preventDefault();
    void load({ kind: filters.kind ? filters.kind as 'MENTOR' | 'INVESTOR' : undefined,
      search: filters.search || undefined, sector: filters.sector || undefined, stage: filters.stage ? filters.stage as Stage : undefined,
      minScore: Number(filters.minScore), limit: 20 });
  }
  function resetFilters() {
    const empty = { kind: '', search: '', sector: '', stage: '', minScore: '0' }; setFilters(empty); void load({ limit: 10 });
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
        <label>Buscar perfil<input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Nome, startup, setor ou cidade" /></label>
        {user?.role === 'STARTUP' && <label>Tipo de perfil<select value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })}><option value="">Todos</option><option value="MENTOR">Mentor</option><option value="INVESTOR">Investidor</option></select></label>}
        <label>Buscar por setor<input value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} placeholder="Digite parte do setor, ex.: tec" /></label>
        {user?.role !== 'STARTUP' && <label>Estágio da startup<select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}><option value="">Todos os estágios</option>{STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>}
        <label>Nota mínima <strong>{filters.minScore}/100</strong><input type="range" min="0" max="100" step="5" value={filters.minScore} onChange={(e) => setFilters({ ...filters, minScore: e.target.value })} /></label>
      </div><div className="filter-actions"><button className="btn btn-small" type="submit">Aplicar filtros</button><button className="btn-ghost" type="button" onClick={resetFilters}>Limpar filtros</button></div>
    </form>
    {contact && <p className="success" role="status">{contact} <Link to="/conexoes">Ver conexões</Link></p>}
    {notice && <p className="notice" role="alert">{notice}</p>}
    {selected && <section className="selected-profile" aria-labelledby="selected-title"><div className="selected-top"><div><span className="tag">Perfil selecionado · {KIND_LABEL[selected.kind]}</span><h2 id="selected-title">{selected.title ?? selected.name}</h2><p className="muted">{selected.name} · {selected.city}/{selected.state}</p></div><button className="btn-ghost" type="button" onClick={() => setSelectedId('')}>Fechar detalhes</button></div>
      {selected.description && <p className="detail-description">{selected.description}</p>}
      {selected.headline && <p><strong>Resumo profissional:</strong> {selected.headline}</p>}
      {selected.thesis && <p><strong>Tese de investimento:</strong> {selected.thesis}</p>}
      <div className="detail-grid"><div><span>Setores</span><strong>{selected.sectors.length ? selected.sectors.join(', ') : 'Não informado'}</strong></div>
        {selected.kind === 'STARTUP' && <div><span>Estágio atual</span><strong>{STAGES.find((s) => s.value === selected.stage)?.label ?? 'Não informado'}</strong></div>}
        {selected.kind !== 'STARTUP' && <div><span>Estágios de interesse</span><strong>{selected.stages?.map((stage) => STAGES.find((s) => s.value === stage)?.label ?? stage).join(', ') || 'Não informado'}</strong></div>}
        {selected.kind === 'STARTUP' && selected.ticketNeeded != null && <div><span>Captação desejada</span><strong>{selected.ticketNeeded.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</strong></div>}
        {selected.kind === 'INVESTOR' && <div><span>Faixa de investimento</span><strong>{selected.ticketMin != null && selected.ticketMax != null ? `${selected.ticketMin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} – ${selected.ticketMax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}` : 'Não informado'}</strong></div>}
        {selected.kind === 'MENTOR' && <div><span>Especialidades</span><strong>{selected.expertise?.join(', ') || 'Não informado'}</strong></div>}
        {selected.kind === 'STARTUP' && <div><span>Busca apoio em</span><strong>{selected.needs?.join(', ') || 'Não informado'}</strong></div>}
        <div><span>Áreas de impacto</span><strong>{selected.impactAreas?.join(', ') || 'Não informado'}</strong></div></div>
      <div className="selected-actions"><span className="selected-score">Compatibilidade: <strong>{selected.score}/100</strong></span><button className="btn btn-small" disabled={selected.interestSent || busyId === selected.userId} onClick={() => void interest(selected)}>{busyId === selected.userId ? 'Enviando…' : selected.interestSent ? 'Interesse enviado' : 'Tenho interesse neste perfil'}</button></div>
    </section>}
    <div className="results-heading"><h2>Perfis para conhecer</h2>{items && <span className="muted">{items.length} resultado(s)</span>}</div>
    {items === null && <p className="muted">Calculando recomendações…</p>}
    {items?.length === 0 && !notice && <div className="empty-state"><span className="empty-icon">⌕</span><h3>Nenhuma recomendação encontrada</h3><p className="muted">Tente ajustar os filtros ou volte mais tarde para novas conexões.</p></div>}
    <ul className="cards">{items?.map((r) => <li key={r.userId} className="card"><div className="card-head"><div><span className="tag">{KIND_LABEL[r.kind]}</span><h2>{r.title ?? r.name}</h2><p className="muted">{r.title ? r.name + ' · ' : ''}{r.city}/{r.state}</p></div>
      <div className="score" aria-label={'Compatibilidade ' + r.score + ' de 100'}><strong>{r.score}</strong><span>/100</span></div></div>
      <div className="bar"><span style={{ width: r.score + '%' }} /></div>
      {r.highlights.length > 0 && <><p className="why">Por que esta indicação?</p><ul className="reasons">{r.highlights.map((h) => <li key={h}>{h}</li>)}</ul></>}
      <div className="card-actions"><button className="btn-ghost" type="button" aria-expanded={selectedId === r.userId} onClick={() => setSelectedId(selectedId === r.userId ? '' : r.userId)}>{selectedId === r.userId ? 'Perfil selecionado' : 'Ver perfil'}</button><button className="btn btn-small" disabled={r.interestSent || busyId === r.userId} onClick={() => void interest(r)}>{busyId === r.userId ? 'Enviando…' : r.interestSent ? 'Interesse enviado' : 'Tenho interesse'}</button></div>
    </li>)}</ul>
  </main></div>;
}
