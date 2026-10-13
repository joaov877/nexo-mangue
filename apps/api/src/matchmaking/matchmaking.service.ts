import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestorProfile, MentorProfile, Role, StartupProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CounterpartInput, MatchScore, scoreMatch, StageValue } from './scoring';

export interface RecommendationFilters {
  /** Só para startups: MENTOR ou INVESTOR */
  kind?: 'MENTOR' | 'INVESTOR';
  sector?: string;
  /** Só para mentores/investidores: filtra startups por estágio */
  stage?: StageValue;
  minScore?: number;
  limit?: number;
}

export interface Recommendation extends MatchScore {
  userId: string;
  name: string;
  kind: 'STARTUP' | 'MENTOR' | 'INVESTOR';
  title: string | null;
  sectors: string[];
  city: string;
  state: string;
  interestSent: boolean;
  description?: string | null;
  stage?: StageValue;
  ticketNeeded?: number | null;
  needs?: string[];
  impactAreas?: string[];
  headline?: string | null;
  expertise?: string[];
  thesis?: string | null;
  stages?: StageValue[];
  ticketMin?: number | null;
  ticketMax?: number | null;
}

const toCounterpart = (p: MentorProfile | InvestorProfile, kind: 'MENTOR' | 'INVESTOR'): CounterpartInput => ({
  kind,
  sectors: p.sectors,
  stages: p.stages as StageValue[],
  ticketMin: 'ticketMin' in p ? p.ticketMin : null,
  ticketMax: 'ticketMax' in p ? p.ticketMax : null,
  city: p.city,
  state: p.state,
  impactAreas: p.impactAreas,
});

const toStartup = (p: StartupProfile) => ({ ...p, stage: p.stage as StageValue });

const normalizeSector = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const hasSector = (sectors: string[], wanted?: string) => {
  if (!wanted?.trim()) return true;
  const query = normalizeSector(wanted);
  return sectors.some((sector) => normalizeSector(sector).includes(query));
};

/**
 * Gera recomendações ranqueadas para o usuário logado.
 * MVP: calcula o score em memória sobre todos os perfis. Com volume maior, o próximo passo é
 * pré-filtrar no banco (setor/estado) e guardar o resultado no Redis.
 */
@Injectable()
export class MatchmakingService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendations(userId: string, role: Role, filters: RecommendationFilters): Promise<Recommendation[]> {
    const limit = Math.min(Math.max(filters.limit ?? 10, 1), 50);
    const minScore = filters.minScore ?? 0;

    const sent = await this.prisma.connectionInterest.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const sentIds = new Set(sent.map((s) => s.toUserId));

    let items: Recommendation[];
    if (role === 'STARTUP') {
      items = await this.forStartup(userId, filters, sentIds);
    } else if (role === 'MENTOR' || role === 'INVESTOR') {
      items = await this.forCounterpart(userId, role, filters, sentIds);
    } else {
      throw new BadRequestException('Recomendações não se aplicam a este perfil');
    }

    return items
      .filter((i) => i.score >= minScore)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  private async forStartup(userId: string, f: RecommendationFilters, sentIds: Set<string>) {
    const me = await this.prisma.startupProfile.findUnique({ where: { userId } });
    if (!me) throw new NotFoundException('Preencha o perfil da startup para receber recomendações');
    const startup = toStartup(me);

    const [mentors, investors] = await Promise.all([
      f.kind === 'INVESTOR' ? [] : this.prisma.mentorProfile.findMany({ include: { user: true } }),
      f.kind === 'MENTOR' ? [] : this.prisma.investorProfile.findMany({ include: { user: true } }),
    ]);

    const build = (p: (MentorProfile | InvestorProfile) & { user: { name: string } }, kind: 'MENTOR' | 'INVESTOR') => ({
      userId: p.userId,
      name: p.user.name,
      kind,
      title: 'headline' in p ? p.headline : (p as InvestorProfile).thesis,
      sectors: p.sectors,
      city: p.city,
      state: p.state,
      interestSent: sentIds.has(p.userId),
      headline: 'headline' in p ? p.headline : null,
      expertise: 'expertise' in p ? p.expertise : [],
      thesis: 'thesis' in p ? p.thesis : null,
      stages: p.stages as StageValue[],
      ticketMin: 'ticketMin' in p ? p.ticketMin : null,
      ticketMax: 'ticketMax' in p ? p.ticketMax : null,
      impactAreas: p.impactAreas,
      ...scoreMatch(startup, toCounterpart(p, kind)),
    });

    return [
      ...mentors.filter((m) => hasSector(m.sectors, f.sector)).map((m) => build(m, 'MENTOR')),
      ...investors.filter((i) => hasSector(i.sectors, f.sector)).map((i) => build(i, 'INVESTOR')),
    ] as Recommendation[];
  }

  private async forCounterpart(userId: string, role: 'MENTOR' | 'INVESTOR', f: RecommendationFilters, sentIds: Set<string>) {
    const me =
      role === 'MENTOR'
        ? await this.prisma.mentorProfile.findUnique({ where: { userId } })
        : await this.prisma.investorProfile.findUnique({ where: { userId } });
    if (!me) throw new NotFoundException('Preencha seu perfil para receber recomendações');
    const counterpart = toCounterpart(me, role);

    const startups = await this.prisma.startupProfile.findMany({
      where: f.stage ? { stage: f.stage } : undefined,
      include: { user: true },
    });

    return startups
      .filter((s) => hasSector(s.sectors, f.sector))
      .map((s) => ({
        userId: s.userId,
        name: s.user.name,
        kind: 'STARTUP' as const,
        title: s.companyName,
        sectors: s.sectors,
        city: s.city,
        state: s.state,
        interestSent: sentIds.has(s.userId),
        description: s.description,
        stage: s.stage as StageValue,
        ticketNeeded: s.ticketNeeded,
        needs: s.needs,
        impactAreas: s.impactAreas,
        ...scoreMatch(toStartup(s), counterpart),
      }));
  }
}
