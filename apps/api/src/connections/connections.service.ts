import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/** Startups se conectam com mentores e investidores (e vice-versa). */
const canConnect = (a: Role, b: Role) =>
  (a === 'STARTUP' && (b === 'MENTOR' || b === 'INVESTOR')) || (b === 'STARTUP' && (a === 'MENTOR' || a === 'INVESTOR'));

/**
 * Interesse mútuo (slide 5, passo 3): o contato (e-mail) só é liberado
 * quando os dois lados demonstram interesse.
 */
@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async expressInterest(fromUserId: string, fromRole: Role, toUserId: string) {
    if (fromUserId === toUserId) throw new BadRequestException('Você não pode se conectar com você mesmo');
    const target = await this.prisma.user.findUnique({ where: { id: toUserId } });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (!canConnect(fromRole, target.role)) {
      throw new BadRequestException('Conexões são entre startups e mentores/investidores');
    }

    const existing = await this.prisma.connectionInterest.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
    });
    await this.prisma.connectionInterest.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      create: { fromUserId, toUserId },
      update: {},
    });
    await this.audit.log('connection.interest', fromUserId, 'User', toUserId);

    const actor = await this.prisma.user.findUnique({ where: { id: fromUserId } });
    if (!existing && actor) {
      await this.notifications.interestReceived(target.email, target.name, actor.name);
    }

    const reverse = await this.prisma.connectionInterest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
    });
    if (reverse) {
      await this.audit.log('connection.mutual', fromUserId, 'User', toUserId);
      if (actor) {
        await Promise.all([
          this.notifications.mutualConnection(actor.email, actor.name, target.name),
          this.notifications.mutualConnection(target.email, target.name, actor.name),
        ]);
      }
      return { mutual: true, contact: { name: target.name, email: target.email } };
    }
    return { mutual: false };
  }

  async withdraw(fromUserId: string, toUserId: string) {
    await this.prisma.connectionInterest.deleteMany({ where: { fromUserId, toUserId } });
    return { ok: true };
  }

  /** Conexões confirmadas, com contato liberado */
  async mutual(userId: string) {
    const sent = await this.prisma.connectionInterest.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const received = await this.prisma.connectionInterest.findMany({
      where: { toUserId: userId, fromUserId: { in: sent.map((s) => s.toUserId) } },
      include: { from: { select: { id: true, name: true, email: true, role: true } } },
    });
    return received.map((r) => ({ ...r.from, connectedAt: r.createdAt }));
  }

  /** Quem demonstrou interesse em mim e eu ainda não respondi (sem contato) */
  async pending(userId: string) {
    const sent = await this.prisma.connectionInterest.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const received = await this.prisma.connectionInterest.findMany({
      where: { toUserId: userId, fromUserId: { notIn: sent.map((s) => s.toUserId) } },
      include: { from: { select: { id: true, name: true, role: true } } },
    });
    return received.map((r) => ({ ...r.from, receivedAt: r.createdAt }));
  }
}
