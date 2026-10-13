import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Registro das ações importantes (cadastro, login, interesse, contato liberado). */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(action: string, userId?: string | null, entity?: string, entityId?: string) {
    try {
      await this.prisma.auditLog.create({ data: { action, userId: userId ?? null, entity, entityId } });
    } catch (err) {
      // auditoria nunca deve derrubar a requisição principal
      this.logger.warn(`Falha ao registrar auditoria "${action}": ${(err as Error).message}`);
    }
  }
}
