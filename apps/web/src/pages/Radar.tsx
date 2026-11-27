import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, SuggestedCall } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

function formatCurrency(value: number | null) {
  if (value === null) return null;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDeadline(value: string | null) {
  if (!value) return 'Prazo não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export default function Radar() {
  const { user, signOut } = useAuth();
  const [calls, setCalls] = useState<SuggestedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.suggestedCalls()
      .then((result) => {
        if (active) {
          setCalls(result);
          setError('');
        }
      })
      .catch((err: ApiError) => {
        if (active) {
          setError(err.message || 'Não foi possível carregar os editais.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <nav className="main-nav">
          <Link to="/painel">Painel</Link>
          <Link to="/">Recomendações</Link>
          <span className="nav-current">Radar de editais</span>
          <Link to="/conexoes">Conexões</Link>
          <Link to="/oportunidades">Oportunidades</Link>
          <Link to="/perfil">Meu perfil</Link>
        </nav>
        <div className="topbar-user">
          <span>{user?.name}</span>
          <button className="btn-ghost" onClick={signOut}>Sair</button>
        </div>
      </header>

      <main className="content">
        <div className="eyebrow">OPORTUNIDADES DE FOMENTO</div>
        <h1>Radar de editais</h1>
        <p className="muted">
          Editais revisados e compatíveis com as informações do perfil da sua startup.
        </p>

        {loading && (
          <div className="dashboard-loading" aria-live="polite">
            Buscando editais compatíveis…
          </div>
        )}

        {!loading && error && (
          <div className="notice" role="alert">
            <strong>Não foi possível carregar o Radar.</strong>
            <p>{error}</p>
            <button
              className="btn btn-small"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && calls.length === 0 && (
          <section className="empty-state">
            <h2>Nenhum edital compatível por enquanto</h2>
            <p className="muted">
              Novas oportunidades aparecerão quando houver editais revisados
              compatíveis com seu perfil.
            </p>
            <Link className="btn btn-small" to="/perfil">
              Revisar meu perfil
            </Link>
          </section>
        )}

        {!loading && !error && calls.length > 0 && (
          <section className="dashboard-suggestions">
            {calls.map(({ edital, score, motivosCompatibilidade, informacoesPendentes }) => (
              <article className="dashboard-suggestion" key={edital.id}>
                <div className="dashboard-suggestion-top">
                  <span className="tag">Compatibilidade</span>
                  <strong>{score}/100</strong>
                </div>

                <h2>{edital.title}</h2>
                {edital.organization && <p>{edital.organization}</p>}
                {edital.summary && <p className="muted">{edital.summary}</p>}

                <p>
                  <strong>Prazo:</strong> {formatDeadline(edital.applicationDeadline)}
                </p>

                {(edital.fundingMin !== null || edital.fundingMax !== null) && (
                  <p>
                    <strong>Financiamento:</strong>{' '}
                    {formatCurrency(edital.fundingMin) ?? 'Não informado'}
                    {' — '}
                    {formatCurrency(edital.fundingMax) ?? 'Não informado'}
                  </p>
                )}

                {motivosCompatibilidade.length > 0 && (
                  <>
                    <h3>Por que combina</h3>
                    <ul>
                      {motivosCompatibilidade.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </>
                )}

                {informacoesPendentes.length > 0 && (
                  <div className="notice">
                    <strong>Informações a confirmar</strong>
                    <ul>
                      {informacoesPendentes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <a
                  className="text-link"
                  href={edital.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar edital na fonte ↗
                </a>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}