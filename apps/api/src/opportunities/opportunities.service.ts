import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OpportunityStage, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const validStages = Object.values(OpportunityStage);

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async assertMutual(userId: string, counterpartId: string) {
    if (userId === counterpartId) throw new BadRequestException('Você não pode criar uma oportunidade consigo mesmo');
    const [forward, reverse, counterpart] = await Promise.all([
      this.prisma.connectionInterest.findUnique({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId: counterpartId } } }),
      this.prisma.connectionInterest.findUnique({ where: { fromUserId_toUserId: { fromUserId: counterpartId, toUserId: userId } } }),
      this.prisma.user.findUnique({ where: { id: counterpartId }, select: { id: true, name: true, role: true } }),
    ]);
    if (!counterpart) throw new NotFoundException('Usuário da conexão não encontrado');
    if (!forward || !reverse) throw new ForbiddenException('Só é possível abrir uma oportunidade com uma conexão confirmada');
    if (counterpart.role === Role.ADMIN) throw new BadRequestException('Não é possível abrir oportunidade com conta administrativa');
  }

  async list(userId: string) {
    return this.prisma.opportunity.findMany({
      where: { OR: [{ creatorId: userId }, { counterpartId: userId }] },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        counterpart: { select: { id: true, name: true, role: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, body: { counterpartId?: string; title?: string; description?: string; expectedValue?: number; targetDate?: string }) {
    const counterpartId = body.counterpartId?.trim();
    const title = body.title?.trim();
    if (!counterpartId) throw new BadRequestException('Informe o usuário da conexão');
    if (!title || title.length > 140) throw new BadRequestException('O título é obrigatório e deve ter até 140 caracteres');
    if (body.description && body.description.length > 4000) throw new BadRequestException('A descrição deve ter até 4000 caracteres');
    if (body.expectedValue !== undefined && (!Number.isSafeInteger(body.expectedValue) || body.expectedValue < 0)) {
      throw new BadRequestException('O valor esperado deve ser um inteiro não negativo em reais');
    }
    const targetDate = body.targetDate ? new Date(body.targetDate) : undefined;
    if (targetDate && Number.isNaN(targetDate.getTime())) throw new BadRequestException('Data-alvo inválida');
    await this.assertMutual(userId, counterpartId);

    const opportunity = await this.prisma.opportunity.create({
      data: {
        title,
        description: body.description?.trim() || null,
        expectedValue: body.expectedValue,
        targetDate,
        creatorId: userId,
        counterpartId,
        events: { create: { actorId: userId, toStage: OpportunityStage.CONNECTION, note: 'Oportunidade criada' } },
      },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        counterpart: { select: { id: true, name: true, role: true } },
        events: true,
      },
    });
    await this.audit.log('opportunity.created', userId, 'Opportunity', opportunity.id);
    return opportunity;
  }

  async update(userId: string, opportunityId: string, body: { title?: string; description?: string | null; stage?: OpportunityStage; nextStep?: string | null; expectedValue?: number | null; targetDate?: string | null; note?: string }) {
    const existing = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) throw new NotFoundException('Oportunidade não encontrada');
    if (existing.creatorId !== userId && existing.counterpartId !== userId) throw new ForbiddenException('Você não tem acesso a esta oportunidade');

    if (body.stage !== undefined && !validStages.includes(body.stage)) throw new BadRequestException('Etapa da oportunidade inválida');
    if (body.title !== undefined && (!body.title.trim() || body.title.trim().length > 140)) throw new BadRequestException('O título deve ter entre 1 e 140 caracteres');
    if (body.description && body.description.length > 4000) throw new BadRequestException('A descrição deve ter até 4000 caracteres');
    if (body.nextStep && body.nextStep.length > 500) throw new BadRequestException('O próximo passo deve ter até 500 caracteres');
    if (body.expectedValue !== undefined && body.expectedValue !== null && (!Number.isSafeInteger(body.expectedValue) || body.expectedValue < 0)) {
      throw new BadRequestException('O valor esperado deve ser um inteiro não negativo em reais');
    }
    const targetDate = body.targetDate === undefined ? undefined : body.targetDate === null || body.targetDate === '' ? null : new Date(body.targetDate);
    if (targetDate instanceof Date && Number.isNaN(targetDate.getTime())) throw new BadRequestException('Data-alvo inválida');

    const changedStage = body.stage !== undefined && body.stage !== existing.stage;
    const data = {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.stage !== undefined ? { stage: body.stage } : {}),
      ...(body.nextStep !== undefined ? { nextStep: body.nextStep?.trim() || null } : {}),
      ...(body.expectedValue !== undefined ? { expectedValue: body.expectedValue } : {}),
      ...(targetDate !== undefined ? { targetDate } : {}),
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          ...data,
          ...(changedStage ? { events: { create: { actorId: userId, fromStage: existing.stage, toStage: body.stage!, note: body.note?.trim() || null } } } : {}),
        },
        include: {
          creator: { select: { id: true, name: true, role: true } },
          counterpart: { select: { id: true, name: true, role: true } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      });
      return result;
    });
    await this.audit.log(changedStage ? 'opportunity.stage_changed' : 'opportunity.updated', userId, 'Opportunity', opportunityId);
    return updated;
  }
}
