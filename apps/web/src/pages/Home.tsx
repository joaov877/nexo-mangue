import { useEffect, useState } from 'react';
import { api, ApiError, Recommendation } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

const KIND_LABEL = { STARTUP: 'Startup', MENTOR: 'Mentor', INVESTOR: 'Investidor' } as const;
const ROLE_LABEL = { STARTUP: 'startup', MENTOR: 'mentor', INVESTOR: 'investidor', ADMIN: 'administrador' } as const;

export default function Home() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);

  useEffect(() => {
    api
      .recommendations()
      .then(setItems)
      .catch((err: ApiError) => {
        setItems([]);
        setNotice(err.status === 404 ? 'Preencha seu perfil para receber recomendações.' : err.message);
      });
  }, []);

  async function interest(r: Recommendation) {
    const res = await api.interest(r.userId);
    setItems((list) => list?.map((i) => (i.userId === r.userId ? { ...i, interestSent: true } : i)) ?? null);
    if (res.mutual && res.contact) setContact(`Interesse mútuo com ${res.contact.name}! Contato: ${res.contact.email}`);
  }

  return (
    <div className="home">
      <header className="topbar">
        <Logo />
        <div className="topbar-user">
          <span>
            {user?.name} · <span className="muted">{user && ROLE_LABEL[user.role]}</span>
          </span>
          <button className="btn-ghost" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>

      <main className="content">
        <h1>Conexões recomendadas</h1>
        <p className="muted">
          A nota mede a aderência aos critérios dos perfis (setor, estágio, ticket, localização e impacto), não a chance de
          investimento.
        </p>
        {contact && <p className="success">{contact}</p>}
        {notice && <p className="notice">{notice}</p>}
        {items === null && <p className="muted">Calculando recomendações…</p>}
        {items?.length === 0 && !notice && <p className="muted">Nenhuma recomendação por enquanto.</p>}

        <ul className="cards">
          {items?.map((r) => (
            <li key={r.userId} className="card">
              <div className="card-head">
                <div>
                  <span className="tag">{KIND_LABEL[r.kind]}</span>
                  <h2>{r.title ?? r.name}</h2>
                  <p className="muted">
                    {r.title ? `${r.name} · ` : ''}
                    {r.city}/{r.state}
                  </p>
                </div>
                <div className="score" aria-label={`Compatibilidade ${r.score} de 100`}>
                  <strong>{r.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="bar">
                <span style={{ width: `${r.score}%` }} />
              </div>
              {r.highlights.length > 0 && (
                <>
                  <p className="why">Por que esta indicação?</p>
                  <ul className="reasons">
                    {r.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
              <button className="btn btn-small" disabled={r.interestSent} onClick={() => interest(r)}>
                {r.interestSent ? 'Interesse enviado' : 'Tenho interesse'}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
