import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { CallReviewStatus, Stage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STAGES = new Set(Object.values(Stage));

@Injectable()
export class CallAnalysisService {
  private readonly logger = new Logger(CallAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeAndSave(sourceUrl: string, sourceText: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('OPENAI_API_KEY não configurada');

    let response;
    try {
      const openai = new OpenAI({ apiKey });
      response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extraia dados de um edital público a partir do texto fornecido.
Retorne somente JSON válido com estas propriedades:
title (string), organization (string|null), summary (string|null),
sectors (array de strings), eligibleStages (array com valores válidos:
IDEACAO, VALIDACAO, MVP, TRACAO, ESCALA),
eligibleRegions (array de strings), fundingMin (integer|null),
fundingMax (integer|null), applicationDeadline (string ISO-8601|null),
requirements (array de strings).
Não invente informações. Use null ou arrays vazios quando não houver evidência.
Valores monetários devem ser números inteiros em reais. A data deve ser ISO-8601.`,
          },
          { role: 'user', content: sourceText },
        ],
      });
    } catch (error) {
      this.logger.error('Falha ao consultar a OpenAI', error);
      throw new ServiceUnavailableException('Não foi possível analisar o edital agora');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new BadRequestException('A IA não retornou dados para o edital');

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      throw new BadRequestException('A resposta da IA não veio em JSON válido');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('A resposta da IA possui formato inválido');
    }
    const parsed = data as Record<string, unknown>;
    if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
      throw new BadRequestException('Não foi possível identificar o título do edital');
    }

    const stages = Array.isArray(parsed.eligibleStages)
      ? parsed.eligibleStages.filter((stage): stage is Stage =>
          typeof stage === 'string' && VALID_STAGES.has(stage as Stage),
        )
      : [];
    const deadline = typeof parsed.applicationDeadline === 'string' &&
      !Number.isNaN(Date.parse(parsed.applicationDeadline))
      ? new Date(parsed.applicationDeadline)
      : null;
    const integerOrNull = (value: unknown): number | null =>
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
    const stringArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').slice(0, 50)
        : [];

    const record = {
      title: parsed.title.trim().slice(0, 500),
      organization: typeof parsed.organization === 'string' ? parsed.organization.slice(0, 300) : null,
      sourceUrl,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 5000) : null,
      sectors: stringArray(parsed.sectors),
      eligibleStages: stages,
      eligibleRegions: stringArray(parsed.eligibleRegions),
      fundingMin: integerOrNull(parsed.fundingMin),
      fundingMax: integerOrNull(parsed.fundingMax),
      applicationDeadline: deadline,
      requirements: stringArray(parsed.requirements),
      reviewStatus: CallReviewStatus.PENDING,
      reviewedAt: null,
    };

    try {
      return await this.prisma.publicCall.upsert({
        where: { sourceUrl },
        create: record,
        update: record,
      });
    } catch (error) {
      this.logger.error('Falha ao salvar o edital', error);
      throw new InternalServerErrorException('Não foi possível salvar o edital');
    }
  }

  listPending() {
    return this.prisma.publicCall.findMany({
      where: { reviewStatus: CallReviewStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  async review(id: string, status: CallReviewStatus) {
    if (status === CallReviewStatus.PENDING) {
      throw new BadRequestException('A revisão deve aprovar ou rejeitar o edital');
    }
    const existing = await this.prisma.publicCall.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Edital não encontrado');
    return this.prisma.publicCall.update({
      where: { id },
      data: {
        reviewStatus: status,
        reviewedAt: status === CallReviewStatus.REVIEWED ? new Date() : null,
      },
    });
  }
}
