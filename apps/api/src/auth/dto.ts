import { Equals, IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const PUBLIC_ROLES = ['STARTUP', 'MENTOR', 'INVESTOR'] as const;
export type PublicRole = (typeof PUBLIC_ROLES)[number];

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  /** ADMIN não pode ser escolhido no cadastro público */
  @IsIn(PUBLIC_ROLES)
  role!: PublicRole;

  /** LGPD: consentimento explícito para o tratamento dos dados do perfil */
  @Equals(true, { message: 'É preciso aceitar os termos e a política de privacidade' })
  consent!: boolean;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
