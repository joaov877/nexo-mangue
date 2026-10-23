import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Connection, Profile, Recommendation } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

type DashboardData = { profile: Profile; recommendations: Recommendation[]; pending: Connection[]; matches: Connection[] };
const roleGoals: Record<string, string> = {
  STARTUP: 'Encontre mentores e investidores que ajudem seu negócio a avançar.',
  MENTOR: 'Descubra startups em que sua experiência pode gerar impacto.',
  INVESTOR: 'Encontre startups alinhadas à sua tese e aos seus critérios de investimento.',
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.profile(), api.recommendations({ limit: 5 }), api.pendingConnections(), api.mutualConnections()])
      .then(([profileResult, recommendationsResult, pendingResult, matchesResult]) => {
        if (!active) return;
        if (profileResult.status !== 'fulfilled') {
          setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Não foi possível carregar seu perfil.');
          return;
        }
        const failedSections = [recommendationsResult, pendingResult, matchesResult].some((result) => result.status === 'rejected');
        setError(failedSections ? 'Algumas informações não carregaram. Você ainda pode usar as seções disponíveis; tente atualizar a página.' : '');
        setData({
          profile: profileResult.value,
          recommendations: recommendationsResult.status === 'fulfilled' ? recommendationsResult.value : [],
          pending: pendingResult.status === 'fulfilled' ? pendingResult.value : [],
          matches: matchesResult.status === 'fulfilled' ? matchesResult.value : [],
        });
      })
      .catch((err: Error) => { if (active) setError(err.message || 'Não foi possível carregar o painel.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="app-shell">
    <header className="topbar"><Logo />
      <nav className="main-nav"><span className="nav-current">Painel</span><Link to="/">Recomendações</Link><Link to="/conexoes">Conexões</Link><Link to="/oportunidades">Oportunidades</Link><Link to="/perfil">Meu perfil</Link></nav>
      <div className="topbar-user"><span>{user?.name}</span><button className="btn-ghost" onClick={signOut}>Sair</button></div>
    </header>
    <main className="content dashboard-content">
      <div className="eyebrow">SEU ECOSSISTEMA DE CONEXÕES</div>
      <h1>Olá, {user?.name?.split(' ')[0] ?? 'bem-vindo'}!</h1>
      <p className="muted">{user ? roleGoals[user.role] ?? 'Acompanhe suas conexões e recomendações.' : 'Acompanhe suas conexões e recomendações.'}</p>
      {error && <div className="notice dashboard-error" role="alert"><strong>Não foi possível carregar todos os dados.</strong><p>{error}</p><button className="btn btn-small" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
      {loading ? <div className="dashboard-loading" aria-live="polite">Preparando seu painel…</div> : data && <>
        <section className="dashboard-metrics" aria-label="Resumo da conta">
          <article className="dashboard-metric"><span>Perfil</span><strong>Completo</strong><small>Informações salvas</small><Link to="/perfil">Atualizar perfil</Link></article>
          <article className="dashboard-metric"><span>Perfis sugeridos</span><strong>{data.recommendations.length}</strong><small>Recomendações carregadas</small><Link to="/">Explorar recomendações</Link></article>
          <article className="dashboard-metric"><span>Interesses recebidos</span><strong>{data.pending.length}</strong><small>Aguardando sua resposta</small><Link to="/conexoes">Ver interesses</Link></article>
          <article className="dashboard-metric"><span>Matches confirmados</span><strong>{data.matches.length}</strong><small>Conexões recíprocas</small><Link to="/conexoes">Abrir conexões</Link></article>
        </section>
        <section className="dashboard-section">
          <div className="dashboard-section-heading"><div><h2>Próximos passos</h2><p className="muted">Pequenas ações para fortalecer sua presença no Nexo Mangue.</p></div></div>
          <div className="dashboard-actions">
            <Link to="/" className="dashboard-action"><span className="dashboard-action-icon">⌕</span><span><strong>Descobrir novas conexões</strong><small>Pesquise perfis e refine seus critérios de compatibilidade.</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/conexoes" className="dashboard-action"><span className="dashboard-action-icon">↗</span><span><strong>Responder a interesses</strong><small>Revise quem demonstrou interesse no seu perfil.</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/oportunidades" className="dashboard-action"><span className="dashboard-action-icon">↗</span><span><strong>Acompanhar oportunidades</strong><small>Registre próximos passos e acompanhe reuniões e negociações com suas conexões.</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/perfil" className="dashboard-action"><span className="dashboard-action-icon">◎</span><span><strong>Manter o perfil atualizado</strong><small>Informações claras ajudam a encontrar conexões relevantes.</small></span><span aria-hidden="true">→</span></Link>
          </div>
        </section>
        <section className="dashboard-section">
          <div className="dashboard-section-heading"><div><h2>Recomendações para você</h2><p className="muted">Sugestões com base nos critérios do seu perfil.</p></div><Link className="text-link" to="/">Ver todas</Link></div>
          {data.recommendations.length === 0 ? <div className="empty-state"><h3>Vamos encontrar sua primeira conexão</h3><p className="muted">Ajuste os setores, estágios e objetivos do perfil para melhorar as recomendações.</p><Link className="btn btn-small" to="/perfil">Revisar perfil</Link></div> :
            <div className="dashboard-suggestions">{data.recommendations.slice(0, 3).map((item) => <article className="dashboard-suggestion" key={item.userId}><div className="dashboard-suggestion-top"><span className="tag">{item.kind === 'STARTUP' ? 'Startup' : item.kind === 'MENTOR' ? 'Mentor' : 'Investidor'}</span><strong>{item.score}/100</strong></div><h3>{item.title ?? item.name}</h3><p className="muted">{item.city}, {item.state}</p><div className="dashboard-progress"><span style={{ width: item.score + '%' }} /></div><p className="dashboard-reason">{item.highlights?.[0] ?? 'Compatibilidade calculada com base nos critérios dos perfis.'}</p><Link to="/" className="text-link">Ver perfil e selecionar →</Link></article>)}</div>}
        </section>
      </>}
      <footer className="dashboard-footer">Nexo Mangue · Conectando ideias, experiência e investimento no ecossistema nordestino.</footer>
    </main>
  </div>;
}
