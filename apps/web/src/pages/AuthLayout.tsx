import { ReactNode } from 'react';

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">N</span>
      <span>
        Nexo <b>Mangue</b>
      </span>
    </span>
  );
}

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <Logo />
        <div>
          <p className="brand-claim">
            Conectamos quem constrói, quem orienta e <em>quem investe.</em>
          </p>
          <p className="brand-sub">Matchmaking explicável para startups, mentores e investidores-anjo de Recife/PE.</p>
        </div>
        <span className="brand-foot">Projeto Integrador · 2026.2</span>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
