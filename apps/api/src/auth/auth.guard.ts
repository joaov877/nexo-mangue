import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Restringe a rota a alguns perfis. Ex.: @Roles('STARTUP') */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Valida o JWT (Bearer) e, se houver @Roles, o perfil do usuário. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Faça login para continuar');

    try {
      req.user = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Sessão expirada ou inválida');
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles && !roles.includes(req.user.role)) {
      throw new ForbiddenException('Seu perfil não tem acesso a este recurso');
    }
    return true;
  }
}
