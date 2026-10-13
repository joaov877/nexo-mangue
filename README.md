 Nexo-mangue
SaaS de Matchmaking para Startups, Mentores e Investidores Anjo do Nordeste (Porto Digital - Recife/PE) Plataforma web para recomendação explicável de conexões, gestão de mentorias, pitchs e due diligence simplificada.

# Plataforma de Matchmaking — Porto Digital

> **Solução SaaS para conexão, descoberta e qualificação de oportunidades entre startups do ecossistema do Porto Digital, investidores anjo do Nordeste e mentores.**

---

##  Sobre o Projeto

O **Porto Digital** (Recife/PE) é um dos maiores polos de inovação do Brasil, reunindo centenas de startups e empresas de tecnologia. A **Plataforma de Matchmaking** foi concebida para simplificar o processo de aproximação entre empreendedores, mentores e investidores, reduzindo buscas manuais e contatos dispersos.

Utilizando um algoritmo de **score explicável**, o sistema cruza critérios estruturados de perfis (setor, estágio, faixa de ticket, localização e objetivos) e sugere recomendações transparentes para apoiar conexões estratégicas e acelerar etapas de investimento e mentoria.

>  **Nota:** O sistema atua como um facilitador de conexões e organização de oportunidades. Ele não realiza decisões automáticas de aporte ou transações financeiras.

---

##  Principais Funcionalidades

-  **Matchmaking Explicável**: Algoritmo ponderado que calcula a taxa de aderência entre perfis e justifica os motivos da recomendação.
-  **Busca e Filtros Avançados**: Descoberta direcionada por setor, estágio de maturidade, faixas de investimento e competências.
-  **Gestão de Mentorias**: Fluxo para solicitação, aceite/recusa e acompanhamento de mentorias.
-  **Agendamento e Reuniões**: Organização de encontros diretamente pela plataforma.
- **Central de Documentos & Due Diligence**: Compartilhamento seguro de materiais de pitch, métricas e documentos com controle de acesso granular.
-  **Governança e Auditoria**: Controle de acesso por papéis (RBAC) e logs auditáveis para ações relevantes.

---

##  Matriz de Matchmaking (Pesos Propostos para o MVP)

A afinidade entre perfis é estimada através de uma média ponderada baseada em dados estruturados:

| Categoria | Critério Avaliado | Peso Proposto |
| :--- | :--- | :---: |
| **Setor** | Áreas de atuação / Tese de investimento | **30%** |
| **Estágio** | Fase de maturidade da startup (Ideação, MVP, Tração, etc.) | **25%** |
| **Ticket** | Valor necessário vs. Faixa de investimento do investidor | **20%** |
| **Localização** | Região e ecossistema de atuação | **15%** |
| **Objetivos** | Impacto e alinhamento estratégico | **10%** |

---

##  Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite |
| **UI Components** | shadcn/ui ou Mantine |
| **Backend** | Node.js, NestJS (API REST + OpenAPI) |
| **Banco de Dados & ORM** | PostgreSQL + Prisma ORM |
| **Cache & Queue** | Redis |
| **Armazenamento** | Object Storage (compatível com AWS S3) |
| **Autenticação** | JWT + Refresh Tokens |
| **Infraestrutura** | Docker, AWS, GitHub Actions (CI/CD) |
| **Observabilidade** | Prometheus + Grafana |

---


##  Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v20+)
- **Docker** e **Docker Compose**
- **Git**

### Passo a passo

```bash
# 1. Instalar as dependências (front-end e API, via npm workspaces)
npm install

# 2. Subir PostgreSQL e Redis
npm run db:up

# 3. Configurar o ambiente da API
cp .env.example apps/api/.env

# 4. Gerar o Prisma Client, criar as tabelas e carregar dados fictícios de exemplo
npm run prisma:generate -w apps/api
npm run db:migrate
npm run db:seed

# 5. Rodar a API (http://localhost:3000/api) e o front-end (http://localhost:5173), em terminais separados
npm run dev:api
npm run dev:web
```

Usuários de demonstração (dados fictícios, senha `nexo12345`): `mare@demo.nexo` (startup), `anjo.fintech@demo.nexo` (investidora), `mentora.vendas@demo.nexo` (mentora).

Para subir também a API em contêiner: `docker compose --profile full up --build`.

### Comandos úteis

| Comando | O que faz |
| :--- | :--- |
| `npm test` | Testes unitários da API (inclui o score de matchmaking) |
| `npm run typecheck` | Checagem de tipos da API e do front-end |
| `npm run build` | Build de produção da API e do front-end |

---

## Estrutura do Repositório

```
apps/
  api/                 API REST (NestJS + Prisma)
    prisma/            schema, migrations e seed
    src/auth/          cadastro, login JWT e controle de acesso por perfil
    src/profiles/      perfis de startup, mentor e investidor
    src/matchmaking/   score explicável (scoring.ts) + recomendações
    src/connections/   interesse mútuo e liberação de contato
    src/audit/         registro das ações importantes
  web/                 Front-end (React + TypeScript + Vite)
    src/pages/         Login, Cadastro e Início (recomendações)
.github/workflows/     CI: tipos, testes, build e imagem Docker
docker-compose.yml     PostgreSQL, Redis e API
```

## Endpoints da API (MVP)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Cadastro (exige consentimento LGPD) |
| `POST` | `/api/auth/login` | Login, retorna o token JWT |
| `GET` | `/api/auth/me` | Usuário logado |
| `GET` / `PUT` | `/api/profiles/me` | Ver / criar ou atualizar o próprio perfil |
| `GET` | `/api/matchmaking/recommendations` | Recomendações com nota e motivos. Filtros: `kind`, `sector`, `stage`, `minScore`, `limit` |
| `POST` / `DELETE` | `/api/connections/:userId/interest` | Demonstrar / retirar interesse |
| `GET` | `/api/connections` | Conexões com interesse mútuo (contato liberado) |
| `GET` | `/api/connections/pending` | Interesses recebidos ainda sem resposta |

## Como o score funciona

O cálculo fica em `apps/api/src/matchmaking/scoring.ts`, isolado do banco para ser fácil de testar e ajustar os pesos.

- **Setor (30%)**: pelo menos um setor em comum.
- **Estágio (25%)**: estágio da startup dentro da preferência = 100%; estágio vizinho = 50%.
- **Ticket (20%)**: valor buscado dentro da faixa do investidor = 100%; até 25% fora = 50%. Não se aplica a mentores.
- **Localização (15%)**: mesma cidade = 100%; mesmo estado = 70%; ambos no Nordeste = 40%.
- **Impacto (10%)**: pelo menos uma área de impacto em comum.

Quando um critério não se aplica (ex.: ticket para mentoria), o peso dele é redistribuído entre os demais. A nota mede aderência aos critérios, **não** a chance de investimento.

