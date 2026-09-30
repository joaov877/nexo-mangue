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
- **Central de Documentos & Due Diligence**: Compartilhamento seguro de materiais de pitch, métricas e documentos com controle de acesso granular[cite: 1].
-  **Governança e Auditoria**: Controle de acesso por papéis (RBAC) e logs auditáveis para ações relevantes[cite: 1].

---

##  Matriz de Matchmaking (Pesos Propostos para o MVP)

A afinidade entre perfis é estimada através de uma média ponderada baseada em dados estruturados[cite: 1]:

| Categoria | Critério Avaliado | Peso Proposto |
| :--- | :--- | :---: |
| **Setor** | Áreas de atuação / Tese de investimento | **30%**[cite: 1] |
| **Estágio** | Fase de maturidade da startup (Ideação, MVP, Tração, etc.) | **25%**[cite: 1] |
| **Ticket** | Valor necessário vs. Faixa de investimento do investidor | **20%**[cite: 1] |
| **Localização** | Região e ecossistema de atuação | **15%**[cite: 1] |
| **Objetivos** | Impacto e alinhamento estratégico | **10%**[cite: 1] |

---

##  Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite[cite: 1] |
| **UI Components** | shadcn/ui ou Mantine[cite: 1] |
| **Backend** | Node.js, NestJS (API REST + OpenAPI)[cite: 1] |
| **Banco de Dados & ORM** | PostgreSQL + Prisma ORM[cite: 1] |
| **Cache & Queue** | Redis[cite: 1] |
| **Armazenamento** | Object Storage (compatível com AWS S3)[cite: 1] |
| **Autenticação** | JWT + Refresh Tokens[cite: 1] |
| **Infraestrutura** | Docker, AWS, GitHub Actions (CI/CD)[cite: 1] |
| **Observabilidade** | Prometheus + Grafana[cite: 1] |

---


##  Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+)
- **Docker** e **Docker Compose**
- **Git**

