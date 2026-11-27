import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { Prisma, Stage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STAGES = new Set(Object.values(Stage));

@Injectable()
export class CallAnalysisService {
  private readonly logger = new Logger(CallAnalysisService.name);
  private readonly openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY não configurada');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeAndSave(sourceUrl: string, sourceText: string) {
    let response;

    try {
      response = await this.openai.chat.completions.create({
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

    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      throw new BadRequestException('A resposta da IA não veio em JSON válido');
    }

    if (typeof data.title !== 'string' || !data.title.trim()) {
      throw new BadRequestException('Não foi possível identificar o título do edital');
    }

    const stages = Array.isArray(data.eligibleStages)
      ? data.eligibleStages.filter((stage: unknown) =>
          typeof stage === 'string' && VALID_STAGES.has(stage as Stage),
        ) as Stage[]
      : [];

    const deadline =
      typeof data.applicationDeadline === 'string' &&
      !Number.isNaN(Date.parse(data.applicationDeadline))
        ? new Date(data.applicationDeadline)
        : null;

    const integerOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
    const stringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').slice(0, 50)
        : [];

    const record = {
      title: data.title.trim().slice(0, 500),
      organization: typeof data.organization === 'string' ? data.organization.slice(0, 300) : null,
      sourceUrl,
      summary: typeof data.summary === 'string' ? data.summary.slice(0, 5000) : null,
      sectors: stringArray(data.sectors),
      eligibleStages: stages,
      eligibleRegions: stringArray(data.eligibleRegions),
      fundingMin: integerOrNull(data.fundingMin),
      fundingMax: integerOrNull(data.fundingMax),
      applicationDeadline: deadline,
      requirements: stringArray(data.requirements),
      reviewStatus: 'PENDING' as const,
      reviewedAt: null,
    };

    try {
      return await this.prisma.publicCall.upsert({
        where: { sourceUrl },
        create: record,
        update: {
          ...record,
          reviewStatus: 'PENDING',
          reviewedAt: null,
        },
      });
    } catch (error) {
      this.logger.error('Falha ao salvar o edital', error);
      throw new InternalServerErrorException('Não foi possível salvar o edital');
    }
  }
}