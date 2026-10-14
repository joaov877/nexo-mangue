import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Connection } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

const roleLabel: Record<string, string> = { STARTUP: 'Startup', MENTOR: 'Mentor', INVESTOR: 'Investidor' };
export default function Connections() {
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState<Connection[]>([]);
  const [matches, setMatches] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [received, connected] = await Promise.all([api.pendingConnections(), api.mutualConnections()]);
      setPending(received); setMatches(connected);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function accept(item: Connection) {
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const result = await api.interest(item.id);
      if (result.mutual) setNotice('Match confirmado! Agora vocês podem ver os contatos um do outro.');
      else setNotice('Interesse registrado. A conexão aparecerá em matches quando houver reciprocidade.');
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusyId(''); }
  }

  return <div className="app-shell">
    <header className="topbar"><Logo /><nav className="main-nav"><Link to="/painel">Painel</Link><Link to="/">Recomendações</Link><span className="nav-current">Conexões</span><Link to="/perfil">Meu perfil</Link></nav>
      <div className="topbar-user"><span>{user?.name}</span><button className="btn-ghost" onClick={signOut}>Sair</button></div>
    </header>
    <main className="content">
      <div className="eyebrow">REDE NEXO MANGUE</div><h1>Suas conexões</h1>
      <p className="muted">Acompanhe quem demonstrou interesse e encontre as conexões confirmadas. O contato é liberado após interesse mútuo.</p>
      {error && <p className="error notice-error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
      <section className="connection-section"><div className="section-heading"><div><h2>Interesses recebidos</h2><p className="muted">Perfis que querem conhecer você.</p></div><span className="count">{pending.length}</span></div>
        {loading ? <p className="muted">Carregando conexões…</p> : pending.length === 0 ? <div className="empty-state"><span className="empty-icon">↗</span><h3>Nenhum interesse novo</h3><p className="muted">Quando alguém demonstrar interesse, você verá o perfil aqui.</p></div> :
          <div className="connection-list">{pending.map((item) => <article className="connection-card" key={item.id}><div className="avatar">{item.name.slice(0, 1).toUpperCase()}</div><div className="connection-info"><h3>{item.name}</h3><p className="muted">{roleLabel[item.role] ?? item.role}</p></div><button className="btn btn-small" disabled={busyId === item.id} onClick={() => void accept(item)}>{busyId === item.id ? 'Salvando…' : 'Demonstrar interesse'}</button></article>)}</div>}
      </section>
      <section className="connection-section"><div className="section-heading"><div><h2>Matches confirmados</h2><p className="muted">O interesse é recíproco; os dados de contato ficam disponíveis.</p></div><span className="count">{matches.length}</span></div>
        {loading ? <p className="muted">Carregando matches…</p> : matches.length === 0 ? <div className="empty-state"><span className="empty-icon">◎</span><h3>Seus matches aparecem aqui</h3><p className="muted">Explore as recomendações e demonstre interesse em perfis alinhados ao seu objetivo.</p><Link className="btn btn-small" to="/">Ver recomendações</Link></div> :
          <div className="connection-list">{matches.map((item) => <article className="connection-card" key={item.id}><div className="avatar avatar-match">{item.name.slice(0, 1).toUpperCase()}</div><div className="connection-info"><h3>{item.name}</h3><p className="muted">{roleLabel[item.role] ?? item.role}</p><a href={'mailto:' + item.email}>{item.email}</a></div><span className="match-pill">Match confirmado</span></article>)}</div>}
      </section>
    </main>
  </div>;
}
