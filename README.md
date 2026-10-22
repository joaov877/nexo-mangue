# Nexo Mangue

Plataforma web de matchmaking para aproximar startups, mentores e investidores-anjo, com foco no ecossistema de inovação do Nordeste e do Porto Digital (Recife/PE).

O Nexo Mangue é um MVP em evolução. A nota de compatibilidade ajuda a priorizar conexões a partir dos dados dos perfis; ela não representa probabilidade de investimento, recomendação financeira nem garantia de elegibilidade.

## Estado do MVP

### Implementado no repositório
- Cadastro e login com senha armazenada como hash e autenticação por JWT.
- Perfis próprios para startup, mentor e investidor, com criação/edição.
- Recomendações com score explicável e filtros.
- Critérios de setor, estágio, ticket (quando aplicável), localização e impacto.
- Interesses enviados/recebidos e conexão quando há interesse mútuo.
- Registro de eventos importantes em log de auditoria.
- Validação de DTOs, checagem de tipos, testes da API e build no fluxo de CI.

### Em evolução / roadmap
- Refresh tokens com rotação e revogação de sessões.
- Limitação de tentativas de login/cadastro adequada a ambientes com múltiplas instâncias.
- Páginas públicas de detalhes de startups, mentores e investidores.
- Notificações por e-mail via Resend (opcionais, ativadas por variáveis de ambiente), pipeline de oportunidades, agenda, data room e catálogo de editais.
- Observabilidade e implantação de produção completas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| API | Node.js, NestJS |
| Banco e ORM | PostgreSQL, Prisma |
| Autenticação atual | JWT de acesso |
| Infra local | Docker Compose |
| CI | GitHub Actions |

## Requisitos

- Node.js 20 ou superior
- npm
- Docker Desktop com Docker Compose
- Git

## Executar localmente

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/joaov877/nexo-mangue.git
   cd nexo-mangue
   ```

2. Instale as dependências:

   ```bash
   npm ci
   ```

3. Crie o arquivo de ambiente da API a partir do exemplo:

   ```bash
   cp .env.example apps/api/.env
   ```

   No Windows PowerShell, use `Copy-Item .env.example apps/api/.env`. Confira o arquivo e preencha as variáveis necessárias, especialmente `DATABASE_URL` e `JWT_SECRET`. Não compartilhe segredos nem os envie ao Git.

4. Inicie os serviços de banco de dados:

   ```bash
   npm run db:up
   ```

5. Gere o Prisma Client, aplique as migrações e carregue os dados de demonstração:

   ```bash
   npm run prisma:generate -w apps/api
   npm run db:migrate
   npm run db:seed
   ```

6. Em terminais separados, inicie a API e o front-end:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

   Por padrão, a API fica em `http://localhost:3000/api` e o front-end em `http://localhost:5173`.

> Os comandos de banco dependem das variáveis do ambiente e do PostgreSQL disponível. Consulte `docker-compose.yml` e `.env.example` se a configuração local diferir.

## Comandos de validação

```bash
npm run typecheck
npm test
npm run build
```

O workflow em `.github/workflows/ci.yml` executa instalação reproduzível, geração do Prisma Client, checagem de tipos, testes, build e build da imagem Docker da API.

## Fluxos disponíveis

| Área | Fluxo |
| --- | --- |
| Autenticação | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Perfil | `GET /api/profiles/me`, `PUT /api/profiles/me` |
| Recomendações | `GET /api/matchmaking/recommendations` |
| Interesses | `POST /api/connections/:userId/interest`, `DELETE /api/connections/:userId/interest` |
| Conexões | `GET /api/connections`, `GET /api/connections/pending` |
| Saúde | `GET /api/health` |

Consulte os controllers em `apps/api/src` para os parâmetros e formatos atuais das requisições.

## Como o score funciona

O cálculo é uma função pura em `apps/api/src/matchmaking/scoring.ts`, o que permite testar e ajustar pesos sem acesso ao banco.

| Critério | Peso padrão | Regra resumida |
| --- | ---: | --- |
| Setor | 30% | Setor compatível, incluindo alguns sinônimos conhecidos ou correspondência parcial por termo |
| Estágio | 25% | Preferência exata vale 100%; estágio vizinho vale 50% |
| Ticket | 20% | Faixa do investidor; até 25% fora da faixa vale compatibilidade parcial |
| Localização | 15% | Mesma cidade: 100%; mesmo estado: 70%; Nordeste: 40% |
| Impacto | 10% | Área de impacto em comum |

Os pesos são configuráveis ao chamar `scoreMatch`; os pesos padrão permanecem os usados pelo produto. Critérios não aplicáveis (por exemplo, ticket para mentores ou quando falta o valor de captação) são retirados do cálculo e seus pesos são redistribuídos proporcionalmente. Pesos inválidos são rejeitados.

A normalização de setores é intencionalmente simples e usa uma lista pequena de sinônimos mais correspondência de termos. Ela não substitui uma taxonomia de setores validada com usuários. A nota é uma medida de aderência aos dados informados, não da chance de investimento.

## Estrutura principal

```text
apps/
  api/
    prisma/                 Schema, migrações e seed
    src/auth/               Cadastro, login e guarda JWT
    src/profiles/           Perfis de startup, mentor e investidor
    src/matchmaking/        Recomendações, score e testes
    src/connections/        Interesse mútuo
    src/audit/              Log de auditoria
  web/
    src/pages/              Login, cadastro, perfil, painel,
                            recomendações e conexões
.github/workflows/          CI de tipos, testes, build e Docker
docker-compose.yml          Serviços locais
```

## Segurança e limitações conhecidas

- Use um `JWT_SECRET` forte e exclusivo por ambiente.
- Não use dados de demonstração nem credenciais de desenvolvimento em produção.
- O MVP usa token JWT de acesso; refresh token com rotação/revogação ainda não está implementado.
- E-mails transacionais usam Resend quando `RESEND_API_KEY` e `EMAIL_FROM` estão configurados. Sem essas variáveis, a aplicação não envia e-mails. Configure um remetente verificado no provedor e defina `APP_URL` para a URL pública do front-end.
- Rate limiting de autenticação, política de sessão e endurecimento para produção ainda precisam ser concluídos antes de exposição pública ampla.
- O score depende da qualidade dos dados informados e deve ser tratado como apoio à decisão.
