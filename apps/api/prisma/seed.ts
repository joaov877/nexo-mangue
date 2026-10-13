/**
 * Dados FICTÍCIOS para desenvolvimento e demonstração. Não representam pessoas ou empresas reais.
 * Todos os usuários usam a senha: nexo12345
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import { PrismaClient, Role, Stage } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'nexo12345';

async function user(email: string, name: string, role: Role, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash, consentAt: new Date() },
  });
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  const startups = [
    { email: 'mare@demo.nexo', name: 'Equipe Maré Pay', companyName: 'Maré Pay', sectors: ['Fintech'], stage: Stage.MVP, ticketNeeded: 300000, city: 'Recife', state: 'PE', impactAreas: ['Inclusão financeira'], needs: ['investimento seed', 'mentoria em vendas'] },
    { email: 'caranguejo@demo.nexo', name: 'Equipe Caranguejo Tech', companyName: 'Caranguejo Tech', sectors: ['Economia do mar', 'IoT'], stage: Stage.VALIDACAO, ticketNeeded: 150000, city: 'Recife', state: 'PE', impactAreas: ['Sustentabilidade'], needs: ['mentoria técnica'] },
    { email: 'sertao@demo.nexo', name: 'Equipe Sertão Saúde', companyName: 'Sertão Saúde', sectors: ['Healthtech'], stage: Stage.TRACAO, ticketNeeded: 800000, city: 'Caruaru', state: 'PE', impactAreas: ['Saúde'], needs: ['investimento'] },
  ];
  for (const s of startups) {
    const { email, name, ...profile } = s;
    const u = await user(email, name, Role.STARTUP, hash);
    await prisma.startupProfile.upsert({ where: { userId: u.id }, update: profile, create: { userId: u.id, ...profile } });
  }

  const mentors = [
    { email: 'mentora.vendas@demo.nexo', name: 'Ana (mentora fictícia)', headline: 'Vendas B2B e go-to-market', sectors: ['Fintech', 'SaaS'], stages: [Stage.VALIDACAO, Stage.MVP], expertise: ['vendas', 'pitch'], city: 'Recife', state: 'PE', impactAreas: ['Inclusão financeira'] },
    { email: 'mentor.tech@demo.nexo', name: 'Bruno (mentor fictício)', headline: 'Arquitetura de software e IoT', sectors: ['IoT', 'Economia do mar'], stages: [Stage.IDEACAO, Stage.VALIDACAO], expertise: ['arquitetura', 'hardware'], city: 'Olinda', state: 'PE', impactAreas: ['Sustentabilidade'] },
  ];
  for (const m of mentors) {
    const { email, name, ...profile } = m;
    const u = await user(email, name, Role.MENTOR, hash);
    await prisma.mentorProfile.upsert({ where: { userId: u.id }, update: profile, create: { userId: u.id, ...profile } });
  }

  const investors = [
    { email: 'anjo.fintech@demo.nexo', name: 'Carla (investidora fictícia)', thesis: 'Fintechs early stage no Nordeste', sectors: ['Fintech'], stages: [Stage.MVP, Stage.TRACAO], ticketMin: 100000, ticketMax: 500000, city: 'Recife', state: 'PE', impactAreas: ['Inclusão financeira'] },
    { email: 'anjo.saude@demo.nexo', name: 'Davi (investidor fictício)', thesis: 'Saúde digital com tração', sectors: ['Healthtech'], stages: [Stage.TRACAO, Stage.ESCALA], ticketMin: 500000, ticketMax: 2000000, city: 'Fortaleza', state: 'CE', impactAreas: ['Saúde'] },
  ];
  for (const i of investors) {
    const { email, name, ...profile } = i;
    const u = await user(email, name, Role.INVESTOR, hash);
    await prisma.investorProfile.upsert({ where: { userId: u.id }, update: profile, create: { userId: u.id, ...profile } });
  }

  console.log(`Seed concluído: ${startups.length} startups, ${mentors.length} mentores, ${investors.length} investidores (senha: ${PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());