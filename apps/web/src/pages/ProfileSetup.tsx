import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, Profile, Role, Stage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

const STAGES: { value: Stage; label: string }[] = [
  { value: 'IDEACAO', label: 'Ideação' }, { value: 'VALIDACAO', label: 'Validação' },
  { value: 'MVP', label: 'MVP' }, { value: 'TRACAO', label: 'Tração' }, { value: 'ESCALA', label: 'Escala' },
];
const split = (value: string) => value.split(',').map((s) => s.trim()).filter(Boolean);
const join = (value?: string[]) => value?.join(', ') ?? '';

export default function ProfileSetup() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({
    companyName: '', description: '', sectors: '', stage: 'IDEACAO', ticketNeeded: '',
    city: 'Recife', state: 'PE', impactAreas: '', needs: '', headline: '', stages: 'MVP, TRACAO',
    expertise: '', thesis: '', ticketMin: '10000', ticketMax: '100000',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.profile().then((p: Profile) => {
      setForm((old) => ({
        ...old, companyName: p.companyName ?? '', description: p.description ?? '', sectors: join(p.sectors),
        stage: p.stage ?? 'IDEACAO', ticketNeeded: p.ticketNeeded == null ? '' : String(p.ticketNeeded),
        city: p.city ?? '', state: p.state ?? '', impactAreas: join(p.impactAreas), needs: join(p.needs),
        headline: p.headline ?? '', stages: join(p.stages), expertise: join(p.expertise), thesis: p.thesis ?? '',
        ticketMin: String(p.ticketMin ?? 10000), ticketMax: String(p.ticketMax ?? 100000),
      }));
    }).catch((err: ApiError) => {
      if (err.status !== 404) setError(err.message);
    }).finally(() => setLoading(false));
  }, []);

  function change(key: string, value: string) { setForm((old) => ({ ...old, [key]: value })); }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    if (form.state.trim().length !== 2) { setError('Informe a sigla do estado com duas letras.'); return; }
    if (!split(form.sectors).length) { setError('Informe pelo menos um setor de atuação.'); return; }
    const common = { sectors: split(form.sectors), city: form.city.trim(), state: form.state.trim().toUpperCase(), impactAreas: split(form.impactAreas) };
    let payload: Record<string, unknown>;
    if (user?.role === 'STARTUP') {
      payload = { ...common, companyName: form.companyName.trim(), description: form.description.trim(), stage: form.stage,
        ticketNeeded: form.ticketNeeded ? Number(form.ticketNeeded) : undefined, needs: split(form.needs) };
      if (!form.companyName.trim()) { setError('Informe o nome da startup.'); return; }
    } else if (user?.role === 'MENTOR') {
      payload = { ...common, headline: form.headline.trim(), stages: split(form.stages), expertise: split(form.expertise) };
      if (!split(form.stages).length) { setError('Selecione pelo menos um estágio que você acompanha.'); return; }
    } else if (user?.role === 'INVESTOR') {
      const ticketMin = Number(form.ticketMin), ticketMax = Number(form.ticketMax);
      if (ticketMin > ticketMax) { setError('O ticket mínimo não pode superar o máximo.'); return; }
      payload = { ...common, thesis: form.thesis.trim(), stages: split(form.stages), ticketMin, ticketMax };
      if (!split(form.stages).length) { setError('Selecione pelo menos um estágio de investimento.'); return; }
    } else { setError('Este tipo de conta não possui perfil de matchmaking.'); return; }

    setBusy(true);
    try { await api.saveProfile(payload); setSuccess('Perfil salvo. Preparando suas recomendações…'); navigate('/', { replace: true }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  const stagesControl = <label>Estágios (separe por vírgula)
    <input value={form.stages} onChange={(e) => change('stages', e.target.value)} placeholder="MVP, TRACAO" required />
    <small className="muted">Valores aceitos: {STAGES.map((s) => s.value).join(', ')}.</small>
  </label>;

  return <div className="app-shell">
    <header className="topbar"><Logo /><nav className="main-nav"><Link to="/">Recomendações</Link><Link to="/conexoes">Conexões</Link><span className="nav-current">Meu perfil</span></nav>
      <div className="topbar-user"><span>{user?.name}</span><button className="btn-ghost" onClick={signOut}>Sair</button></div>
    </header>
    <main className="content profile-content">
      <div className="eyebrow">SEU ESPAÇO NO ECOSSISTEMA</div><h1>Vamos completar seu perfil</h1>
      <p className="muted">Essas informações ajudam o Nexo Mangue a recomendar conexões mais relevantes. Você pode atualizar os dados depois.</p>
      {loading ? <p className="muted">Carregando seu perfil…</p> : <form className="form profile-form" onSubmit={submit}>
        {user?.role === 'STARTUP' && <>
          <h2>Sobre a startup</h2>
          <label>Nome da startup<input required maxLength={120} value={form.companyName} onChange={(e) => change('companyName', e.target.value)} /></label>
          <label>Descrição da solução<textarea maxLength={1000} rows={3} value={form.description} onChange={(e) => change('description', e.target.value)} placeholder="Que problema vocês resolvem e como?" /></label>
          <label>Estágio atual<select value={form.stage} onChange={(e) => change('stage', e.target.value)}>{STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label>Captação desejada (R$)<input type="number" min="0" step="1" value={form.ticketNeeded} onChange={(e) => change('ticketNeeded', e.target.value)} placeholder="Ex.: 150000" /></label>
          <label>O que você procura?<input value={form.needs} onChange={(e) => change('needs', e.target.value)} placeholder="Mentoria em vendas, investimento seed" /><small className="muted">Separe os itens por vírgula.</small></label>
        </>}
        {user?.role === 'MENTOR' && <>
          <h2>Experiência como mentor</h2>
          <label>Resumo profissional<input maxLength={160} value={form.headline} onChange={(e) => change('headline', e.target.value)} placeholder="Ex.: Produto digital e crescimento" /></label>
          <label>Especialidades<input value={form.expertise} onChange={(e) => change('expertise', e.target.value)} placeholder="Produto, vendas, tecnologia" /><small className="muted">Separe por vírgula.</small></label>
          {stagesControl}
        </>}
        {user?.role === 'INVESTOR' && <>
          <h2>Tese de investimento</h2>
          <label>Resumo da tese<textarea rows={3} maxLength={1000} value={form.thesis} onChange={(e) => change('thesis', e.target.value)} placeholder="Que negócios e impactos você procura?" /></label>
          {stagesControl}
          <div className="field-grid">
            <label>Ticket mínimo (R$)<input type="number" min="0" step="1" required value={form.ticketMin} onChange={(e) => change('ticketMin', e.target.value)} /></label>
            <label>Ticket máximo (R$)<input type="number" min="0" step="1" required value={form.ticketMax} onChange={(e) => change('ticketMax', e.target.value)} /></label>
          </div>
        </>}
        <h2>Atuação e localização</h2>
        <label>Setores de interesse<input required value={form.sectors} onChange={(e) => change('sectors', e.target.value)} placeholder="Tecnologia, educação, saúde" /><small className="muted">Separe por vírgula. Use nomes claros para melhorar o matching.</small></label>
        <label>Áreas de impacto<input value={form.impactAreas} onChange={(e) => change('impactAreas', e.target.value)} placeholder="Inclusão, sustentabilidade, cultura" /><small className="muted">Separe por vírgula.</small></label>
        <div className="field-grid"><label>Cidade<input required minLength={2} value={form.city} onChange={(e) => change('city', e.target.value)} /></label>
          <label>Estado (UF)<input required minLength={2} maxLength={2} value={form.state} onChange={(e) => change('state', e.target.value.toUpperCase())} /></label></div>
        {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}
        <div className="form-actions"><button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e ver recomendações'}</button><Link className="text-link" to="/">Voltar</Link></div>
      </form>}
    </main>
  </div>;
}
