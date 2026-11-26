import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestedForStartup(userId: string) {
    const startup = await this.prisma.startupProfile.findUnique({ where: { userId } });
    if (!startup) throw new NotFoundException('Preencha o perfil da startup antes de consultar editais');

    const calls = await this.prisma.publicCall.findMany({
      where: { reviewStatus: 'REVIEWED' },
      orderBy: { applicationDeadline: 'asc' },
    });

    return calls.map((call) => {
      const reasons: string[] = [];
      const missingInformation: string[] = [];
      let score = 0;
      if (call.sectors.some((sector) => startup.sectors.some((s) => s.toLowerCase() === sector.toLowerCase()))) {
        score += 50;
        reasons.push('Setor compatível com o perfil informado');
      }
      if (call.eligibleStages.length === 0 || call.eligibleStages.includes(startup.stage)) {
        score += 30;
        reasons.push('Estágio compatível ou não restringido no edital');
      }
      if (call.eligibleRegions.length === 0 || call.eligibleRegions.some((region) =>
        [startup.state, 'BRASIL', 'NACIONAL'].some((value) => value.toLowerCase() === region.toLowerCase()),
      )) {
        score += 20;
        reasons.push('Região compatível ou não restringida no edital');
      }
      if (!startup.ticketNeeded) missingInformation.push('Valor de captação da startup não informado');
      if (!call.applicationDeadline) missingInformation.push('Prazo do edital não confirmado na fonte');
      return {
        edital: call,
        score,
        motivosCompatibilidade: reasons,
        informacoesPendentes: missingInformation,
      };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  }
}
