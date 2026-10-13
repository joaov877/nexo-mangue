import { CounterpartInput, scoreMatch, StartupInput, WEIGHTS } from './scoring';

const startup: StartupInput = {
  sectors: ['Fintech', 'SaaS'],
  stage: 'MVP',
  ticketNeeded: 300_000,
  city: 'Recife',
  state: 'PE',
  impactAreas: ['Inclusão financeira'],
};

const idealInvestor: CounterpartInput = {
  kind: 'INVESTOR',
  sectors: ['fintech'],
  stages: ['MVP', 'TRACAO'],
  ticketMin: 100_000,
  ticketMax: 500_000,
  city: 'Recife',
  state: 'PE',
  impactAreas: ['inclusao financeira'],
};

describe('scoreMatch', () => {
  it('os pesos do MVP somam 100%', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });

  it('dá 100 quando todos os critérios coincidem (ignorando acento e maiúsculas)', () => {
    const r = scoreMatch(startup, idealInvestor);
    expect(r.score).toBe(100);
    expect(r.breakdown).toHaveLength(5);
    expect(r.highlights[0]).toContain('O setor coincide');
  });

  it('dá 0 quando nada coincide', () => {
    const r = scoreMatch(startup, {
      kind: 'INVESTOR',
      sectors: ['Agro'],
      stages: ['ESCALA'],
      ticketMin: 5_000_000,
      ticketMax: 10_000_000,
      city: 'São Paulo',
      state: 'SP',
      impactAreas: [],
    });
    expect(r.score).toBe(0);
    expect(r.highlights).toEqual([]);
  });

  it('aplica os pesos: só setor + estágio = 55', () => {
    const r = scoreMatch(startup, {
      ...idealInvestor,
      ticketMin: 5_000_000,
      ticketMax: 10_000_000,
      city: 'São Paulo',
      state: 'SP',
      impactAreas: [],
    });
    expect(r.score).toBe(55);
  });

  it('estágio vizinho vale meio ponto', () => {
    const r = scoreMatch(startup, { ...idealInvestor, stages: ['TRACAO'] });
    const stage = r.breakdown.find((b) => b.criterion === 'stage')!;
    expect(stage.fit).toBe(0.5);
    expect(r.score).toBe(88); // 100 - 25 * 0.5 = 87.5 → 88
  });

  it('ticket até 25% fora da faixa conta como parcial', () => {
    const r = scoreMatch({ ...startup, ticketNeeded: 600_000 }, idealInvestor);
    const ticket = r.breakdown.find((b) => b.criterion === 'ticket')!;
    expect(ticket.fit).toBe(0.5);
  });

  it('localização: mesmo estado 0,7 e Nordeste 0,4', () => {
    const sameState = scoreMatch(startup, { ...idealInvestor, city: 'Caruaru' });
    expect(sameState.breakdown.find((b) => b.criterion === 'location')!.fit).toBe(0.7);
    const nordeste = scoreMatch(startup, { ...idealInvestor, city: 'Fortaleza', state: 'CE' });
    expect(nordeste.breakdown.find((b) => b.criterion === 'location')!.fit).toBe(0.4);
  });

  it('para mentores o ticket não se aplica e o peso é redistribuído', () => {
    const r = scoreMatch(startup, {
      kind: 'MENTOR',
      sectors: ['SaaS'],
      stages: ['MVP'],
      city: 'Recife',
      state: 'PE',
      impactAreas: ['Inclusão financeira'],
    });
    expect(r.breakdown.map((b) => b.criterion)).not.toContain('ticket');
    expect(r.score).toBe(100);
    const sector = r.breakdown.find((b) => b.criterion === 'sector')!;
    expect(sector.weight).toBeCloseTo(0.3 / 0.8, 3);
  });

  it('sem ticket informado pela startup, o critério é ignorado em vez de zerar', () => {
    const r = scoreMatch({ ...startup, ticketNeeded: null }, idealInvestor);
    expect(r.breakdown.map((b) => b.criterion)).not.toContain('ticket');
    expect(r.score).toBe(100);
  });
});
