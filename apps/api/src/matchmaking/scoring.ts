/**
 * Score de compatibilidade explicável do Nexo Mangue (Trello: I4 — Matchmaking: filtros + scoring).
 *
 * Pesos iniciais do MVP (slide 6 da apresentação), a validar com dados reais:
 *   Setor 30% · Estágio 25% · Ticket 20% · Localização 15% · Impacto 10%
 *
 * A nota mede aderência aos critérios informados nos perfis, NÃO a chance de investimento.
 * Funções puras, sem acesso a banco, para facilitar testes e ajustes de peso.
 */

export type StageValue = 'IDEACAO' | 'VALIDACAO' | 'MVP' | 'TRACAO' | 'ESCALA';

export const STAGE_ORDER: StageValue[] = ['IDEACAO', 'VALIDACAO', 'MVP', 'TRACAO', 'ESCALA'];

export const WEIGHTS = {
  sector: 0.3,
  stage: 0.25,
  ticket: 0.2,
  location: 0.15,
  impact: 0.1,
} as const;

export type Criterion = keyof typeof WEIGHTS;

export const CRITERION_LABEL: Record<Criterion, string> = {
  sector: 'Setor',
  stage: 'Estágio',
  ticket: 'Ticket',
  location: 'Localização',
  impact: 'Impacto',
};

const NORDESTE = new Set(['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']);

export interface StartupInput {
  sectors: string[];
  stage: StageValue;
  ticketNeeded?: number | null;
  city: string;
  state: string;
  impactAreas: string[];
}

/** Mentor ou investidor. `ticketMin`/`ticketMax` só existem para investidores. */
export interface CounterpartInput {
  kind: 'MENTOR' | 'INVESTOR';
  sectors: string[];
  stages: StageValue[];
  ticketMin?: number | null;
  ticketMax?: number | null;
  city: string;
  state: string;
  impactAreas: string[];
}

export interface CriterionResult {
  criterion: Criterion;
  label: string;
  /** Peso efetivo usado (após redistribuir critérios que não se aplicam) */
  weight: number;
  /** Aderência do critério, de 0 a 1 */
  fit: number;
  /** Pontos que o critério somou na nota final (0–100) */
  points: number;
  reason: string;
}

export interface MatchScore {
  /** Nota final de 0 a 100 */
  score: number;
  breakdown: CriterionResult[];
  /** Motivos positivos, prontos para mostrar em "Por que esta indicação?" */
  highlights: string[];
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

function intersection(a: string[], b: string[]): string[] {
  const nb = new Set(b.map(norm));
  const seen = new Set<string>();
  return a.filter((x) => {
    const n = norm(x);
    if (!nb.has(n) || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

const SECTOR_ALIASES: Record<string, string[]> = {
  tecnologia: ['tech', 'tecnologia da informacao', 'ti'],
  saas: ['software as a service', 'software como servico'],
  fintech: ['tecnologia financeira', 'servicos financeiros'],
  edtech: ['tecnologia educacional', 'educacao'],
  healthtech: ['tecnologia em saude', 'saude digital'],
  agritech: ['tecnologia agricola', 'agrotech'],
};

function sectorKey(value: string): string {
  const normalized = norm(value);
  for (const [canonical, aliases] of Object.entries(SECTOR_ALIASES)) {
    if (normalized === canonical || aliases.some((alias) => norm(alias) === normalized)) return canonical;
  }
  return normalized;
}

export function scoreSector(startup: StartupInput, other: CounterpartInput) {
  const startupSectors = startup.sectors.map(sectorKey);
  const otherSectors = other.sectors.map(sectorKey);
  const shared = [...new Set(startupSectors.filter((sector) => otherSectors.includes(sector)))];
  if (shared.length > 0) {
    return { fit: 1, reason: `Setor compatível (${shared.join(', ')})` };
  }

  // Correspondência parcial por termos: útil quando os perfis usam rótulos mais específicos.
  const tokens = (values: string[]) => new Set(values.flatMap((v) => norm(v).split(/[^a-z0-9]+/).filter((t) => t.length >= 4)));
  const a = tokens(startup.sectors);
  const b = tokens(other.sectors);
  const overlap = [...a].filter((token) => b.has(token));
  if (overlap.length > 0) {
    return { fit: 0.5, reason: `Correspondência parcial de setor (${overlap.join(', ')})` };
  }
  return { fit: 0, reason: 'Nenhum setor em comum' };
}

export function scoreStage(startup: StartupInput, other: CounterpartInput) {
  if (other.stages.length === 0) {
    return { fit: 0.5, reason: 'O outro perfil não informou estágios de preferência' };
  }
  if (other.stages.includes(startup.stage)) {
    return { fit: 1, reason: 'O estágio é compatível' };
  }
  const idx = STAGE_ORDER.indexOf(startup.stage);
  const distance = Math.min(...other.stages.map((s) => Math.abs(STAGE_ORDER.indexOf(s) - idx)));
  if (distance === 1) {
    return { fit: 0.5, reason: 'O estágio é vizinho ao preferido' };
  }
  return { fit: 0, reason: 'O estágio está fora da preferência' };
}

/** Retorna null quando o critério não se aplica (mentoria ou dados ausentes). */
export function scoreTicket(startup: StartupInput, other: CounterpartInput) {
  if (other.kind !== 'INVESTOR') return null;
  const min = other.ticketMin ?? null;
  const max = other.ticketMax ?? null;
  const need = startup.ticketNeeded ?? null;
  if (need === null || min === null || max === null) return null;

  if (need >= min && need <= max) {
    return { fit: 1, reason: `O ticket atende à necessidade (${brl(need)} dentro da faixa ${brl(min)}–${brl(max)})` };
  }
  // tolerância de 25% fora da faixa conta como compatível parcial
  const gap = need < min ? (min - need) / min : (need - max) / max;
  if (gap <= 0.25) {
    return { fit: 0.5, reason: `O ticket está próximo da faixa do investidor (${brl(min)}–${brl(max)})` };
  }
  return { fit: 0, reason: `O ticket está fora da faixa do investidor (${brl(min)}–${brl(max)})` };
}

export function scoreLocation(startup: StartupInput, other: CounterpartInput) {
  const sameState = startup.state.toUpperCase() === other.state.toUpperCase();
  if (sameState && norm(startup.city) === norm(other.city)) {
    return { fit: 1, reason: `Mesma cidade (${startup.city})` };
  }
  if (sameState) {
    return { fit: 0.7, reason: `Mesmo estado (${startup.state.toUpperCase()})` };
  }
  if (NORDESTE.has(startup.state.toUpperCase()) && NORDESTE.has(other.state.toUpperCase())) {
    return { fit: 0.4, reason: 'Ambos no Nordeste' };
  }
  return { fit: 0, reason: 'Regiões diferentes' };
}

export function scoreImpact(startup: StartupInput, other: CounterpartInput) {
  const shared = intersection(startup.impactAreas, other.impactAreas);
  if (shared.length > 0) {
    return { fit: 1, reason: `Impacto em comum (${shared.join(', ')})` };
  }
  return { fit: 0, reason: 'Sem área de impacto em comum' };
}

/**
 * Calcula a nota de compatibilidade entre uma startup e um mentor/investidor.
 * Critérios que não se aplicam (ex.: ticket para mentores) têm o peso redistribuído
 * proporcionalmente entre os demais, para a nota continuar na escala 0–100.
 */
export type MatchWeights = Record<Criterion, number>;

export function scoreMatch(
  startup: StartupInput,
  other: CounterpartInput,
  weights: MatchWeights = { ...WEIGHTS },
): MatchScore {
  const weightValues = Object.values(weights);
  if (weightValues.some((weight) => !Number.isFinite(weight) || weight < 0) ||
      weightValues.every((weight) => weight === 0)) {
    throw new Error('Os pesos do matchmaking devem ser números finitos, não negativos e com pelo menos um peso positivo.');
  }
  const raw: Record<Criterion, { fit: number; reason: string } | null> = {
    sector: scoreSector(startup, other),
    stage: scoreStage(startup, other),
    ticket: scoreTicket(startup, other),
    location: scoreLocation(startup, other),
    impact: scoreImpact(startup, other),
  };

  const applicable = (Object.keys(raw) as Criterion[]).filter((c) => raw[c] !== null);
  const totalWeight = applicable.reduce((sum, c) => sum + weights[c], 0);

  const breakdown: CriterionResult[] = applicable.map((c) => {
    const r = raw[c]!;
    const weight = weights[c] / totalWeight;
    return {
      criterion: c,
      label: CRITERION_LABEL[c],
      weight: round(weight, 4),
      fit: r.fit,
      points: round(weight * r.fit * 100, 1),
      reason: r.reason,
    };
  });

  const score = Math.round(breakdown.reduce((sum, b) => sum + b.points, 0));
  const highlights = breakdown
    .filter((b) => b.fit > 0)
    .sort((a, b) => b.points - a.points)
    .map((b) => b.reason);

  return { score, breakdown, highlights };
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
