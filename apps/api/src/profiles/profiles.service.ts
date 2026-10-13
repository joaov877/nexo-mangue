import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvestorProfileDto, MentorProfileDto, StartupProfileDto } from './dto';

const DTO_BY_ROLE = {
  STARTUP: StartupProfileDto,
  MENTOR: MentorProfileDto,
  INVESTOR: InvestorProfileDto,
} as const;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMine(userId: string, role: Role) {
    const profile = await this.find(userId, role);
    if (!profile) throw new NotFoundException('Perfil ainda não preenchido');
    return profile;
  }

  /** Cria ou atualiza o perfil do usuário logado, validando os campos do tipo de perfil dele. */
  async upsertMine(userId: string, role: Role, body: unknown) {
    if (role === 'ADMIN') throw new ForbiddenException('Administradores não têm perfil de matchmaking');
    const Dto = DTO_BY_ROLE[role] as new () => object;
    const dto: object = plainToInstance(Dto, (body ?? {}) as object);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
      throw new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})));
    }

    let result;
    if (role === 'STARTUP') {
      const data = dto as StartupProfileDto;
      result = await this.prisma.startupProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
    } else if (role === 'MENTOR') {
      const data = dto as MentorProfileDto;
      result = await this.prisma.mentorProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    } else {
      const data = dto as InvestorProfileDto;
      if (data.ticketMin > data.ticketMax) {
        throw new BadRequestException(['ticketMin não pode ser maior que ticketMax']);
      }
      result = await this.prisma.investorProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    }
    await this.audit.log('profile.upsert', userId, role, result.id);
    return result;
  }

  private find(userId: string, role: Role) {
    if (role === 'STARTUP') return this.prisma.startupProfile.findUnique({ where: { userId } });
    if (role === 'MENTOR') return this.prisma.mentorProfile.findUnique({ where: { userId } });
    if (role === 'INVESTOR') return this.prisma.investorProfile.findUnique({ where: { userId } });
    return Promise.resolve(null);
  }
}
