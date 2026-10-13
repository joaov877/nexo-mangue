import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, Role } from '../lib/api';
import { useAuth } from '../lib/auth';
import AuthLayout from './AuthLayout';

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'STARTUP', label: 'Startup', hint: 'Busco mentoria e investimento' },
  { value: 'MENTOR', label: 'Mentor', hint: 'Quero compartilhar experiência' },
  { value: 'INVESTOR', label: 'Investidor', hint: 'Procuro negócios para a minha tese' },
];
export default function Register() {
  const { user, signIn } = useAuth(); const navigate = useNavigate();
  const [role, setRole] = useState<Role>('STARTUP'); const [name, setName] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres');
    if (!consent) return setError('É preciso aceitar os termos e a política de privacidade');
    setBusy(true);
    try { signIn(await api.register({ name, email, password, role, consent })); navigate('/perfil', { replace: true }); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <AuthLayout title="Criar cadastro" subtitle="Escolha como você participa do ecossistema.">
    <form onSubmit={onSubmit} className="form"><fieldset className="roles"><legend>Eu sou</legend>
      {ROLES.map((r) => <label key={r.value} className={'role ' + (role === r.value ? 'selected' : '')}>
        <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} /><strong>{r.label}</strong><span>{r.hint}</span>
      </label>)}</fieldset>
      <label>{role === 'STARTUP' ? 'Seu nome (responsável pela startup)' : 'Nome completo'}<input required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Senha<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><small className="muted">Mínimo de 8 caracteres.</small></label>
      <label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Concordo com o uso dos dados do meu perfil para gerar recomendações, conforme a LGPD. Meu contato só é liberado quando há interesse mútuo.</span></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</button>
    </form><p className="switch">Já tem conta? <Link to="/login">Entrar</Link></p>
  </AuthLayout>;
}
