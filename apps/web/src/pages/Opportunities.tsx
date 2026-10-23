import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Connection, Opportunity, OpportunityStage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from './AuthLayout';

const STAGES: { value: OpportunityStage; label: string }[] = [
  { value: 'CONNECTION', label: 'Conexão' },
  { value: 'FIRST_CONTACT', label: 'Primeiro contato' },
  { value: 'MEETING', label: 'Reunião' },
  { value: 'EVALUATION', label: 'Avaliação' },
  { value: 'NEGOTIATION', label: 'Negociação' },
  { value: 'TERM_SHEET', label: 'Term sheet' },
  { value: 'CLOSED_WON', label: 'Concluída com sucesso' },
  { value: 'CLOSED_LOST', label: 'Encerrada' },
];
const money = (value: number | null) => value == null ? 'Não informado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('pt-BR') : 'Sem data definida';

export default function Opportunities() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [counterpartId, setCounterpartId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [opportunities, connections] = await Promise.all([api.opportunities(), api.mutualConnections()]);
      setItems(opportunities); setMatches(connections);
    } catch (e) { setError((e as Error).message || 'Não foi possível carregar oportunidades.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await api.createOpportunity({
        counterpartId, title: title.trim(), description: description.trim() || undefined,
        expectedValue: expectedValue ? Number(expectedValue) : undefined, targetDate: targetDate || undefined,
      });
      setTitle(''); setDescription(''); setExpectedValue(''); setTargetDate(''); setCounterpartId('');
      setNotice('Oportunidade criada. Você já pode registrar o próximo passo e acompanhar a evolução.');
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function changeStage(item: Opportunity, stage: OpportunityStage) {
    setSaving(true); setError(''); setNotice('');
    try {
      await api.updateOpportunity(item.id, { stage, note: 'Etapa atualizada pela plataforma' });
      setNotice('Etapa atualizada e registrada no histórico.');
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function updateNextStep(item: Opportunity, nextStep: string) {
    setSaving(true); setError(''); setNotice('');
    try { await api.updateOpportunity(item.id, { nextStep }); await refresh(); setNotice('Próximo passo salvo.'); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  return <div className="app-shell">
    <header className="topbar"><Logo /><nav className="main-nav"><Link to="/painel">Painel</Link><Link to="/">Recomendações</Link><Link to="/conexoes">Conexões</Link><span className="nav-current">Oportunidades</span><Link to="/perfil">Meu perfil</Link></nav>
      <div className="topbar-user"><span>{user?.name}</span><button className="btn-ghost" onClick={signOut}>Sair</button></div>
    </header>
    <main className="content opportunities-content">
      <div className="eyebrow">ACOMPANHAMENTO DE RELACIONAMENTOS</div><h1>Pipeline de oportunidades</h1>
      <p className="muted">Organize os próximos passos das conexões confirmadas — de primeiro contato e reunião até avaliação e negociação. As oportunidades são privadas aos dois participantes.</p>
      {error && <p className="error notice-error" role="alert">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}
      <section className="opportunity-create">
        <h2>Registrar uma oportunidade</h2>
        <p className="muted">Só é possível criar oportunidades com conexões mútuas já confirmadas.</p>
        {matches.length === 0 ? <div className="empty-state"><h3>Você ainda não tem conexões confirmadas</h3><p className="muted">Confirme um interesse mútuo antes de abrir uma oportunidade.</p><Link className="btn btn-small" to="/conexoes">Ver conexões</Link></div> :
          <form className="form opportunity-form" onSubmit={create}>
            <label>Conexão<select required value={counterpartId} onChange={e => setCounterpartId(e.target.value)}><option value="">Selecione uma conexão</option>{matches.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role === 'STARTUP' ? 'Startup' : m.role === 'MENTOR' ? 'Mentor' : 'Investidor'}</option>)}</select></label>
            <label>Título<input required maxLength={140} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: avaliar investimento seed" /></label>
            <label>Descrição<textarea rows={3} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo e contexto da oportunidade" /></label>
            <div className="field-grid"><label>Valor estimado (R$)<input type="number" min="0" step="1" value={expectedValue} onChange={e => setExpectedValue(e.target.value)} placeholder="Opcional" /></label><label>Data-alvo<input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></label></div>
            <button className="btn" disabled={saving || !counterpartId || !title.trim()}>{saving ? 'Salvando…' : 'Criar oportunidade'}</button>
          </form>}
      </section>
      <section className="opportunity-list-section">
        <div className="section-heading"><div><h2>Suas oportunidades</h2><p className="muted">Acompanhe a etapa, o valor e o próximo passo.</p></div><span className="count">{items.length}</span></div>
        {loading ? <p className="muted">Carregando oportunidades…</p> : items.length === 0 ? <div className="empty-state"><span className="empty-icon">↗</span><h3>Nenhuma oportunidade registrada</h3><p className="muted">Crie a primeira para transformar uma conexão em um relacionamento acompanhado.</p></div> :
          <div className="opportunity-list">{items.map(item => {
            const other = item.creatorId === user?.id ? item.counterpart : item.creator;
            return <article className="opportunity-card" key={item.id}>
              <div className="opportunity-card-heading"><div><span className="tag">{other.role === 'STARTUP' ? 'Startup' : other.role === 'MENTOR' ? 'Mentor' : 'Investidor'}</span><h3>{item.title}</h3><p className="muted">Com {other.name} · Atualizada em {date(item.updatedAt)}</p></div><strong className="opportunity-value">{money(item.expectedValue)}</strong></div>
              {item.description && <p className="opportunity-description">{item.description}</p>}
              <div className="opportunity-facts"><div><span>Etapa atual</span><strong>{STAGES.find(s => s.value === item.stage)?.label ?? item.stage}</strong></div><div><span>Data-alvo</span><strong>{date(item.targetDate)}</strong></div></div>
              <label className="opportunity-stage-field">Atualizar etapa<select disabled={saving} value={item.stage} onChange={e => void changeStage(item, e.target.value as OpportunityStage)}>{STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
              <form className="opportunity-next-step" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void updateNextStep(item, String(data.get('nextStep') ?? '').trim()); }}>
                <label>Próximo passo<input name="nextStep" maxLength={500} defaultValue={item.nextStep ?? ''} placeholder="Ex.: agendar reunião de alinhamento" /></label><button className="btn btn-small" disabled={saving}>Salvar próximo passo</button>
              </form>
              <details className="opportunity-history"><summary>Histórico ({item.events.length})</summary><ol>{item.events.map(event => <li key={event.id}><strong>{STAGES.find(s => s.value === event.toStage)?.label ?? event.toStage}</strong><span>{date(event.createdAt)}</span>{event.note && <p>{event.note}</p>}</li>)}</ol></details>
            </article>;
          })}</div>}
      </section>
    </main>
  </div>;
}
