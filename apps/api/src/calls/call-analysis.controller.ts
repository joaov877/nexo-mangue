import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CallReviewStatus } from '@prisma/client';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { AnalyzeCallDto } from './dto/analyze-call.dto';
import { CallAnalysisService } from './call-analysis.service';

@Controller('admin/editais')
@UseGuards(AuthGuard)
@Roles('ADMIN')
export class CallAnalysisController {
  constructor(private readonly analysis: CallAnalysisService) {}

  @Post('analisar')
  analyze(@Body() dto: AnalyzeCallDto) {
    return this.analysis.analyzeAndSave(dto.sourceUrl, dto.sourceText);
  }

  @Get('pendentes')
  listPending() {
    return this.analysis.listPending();
  }

  @Patch(':id/revisao')
  review(@Param('id') id: string, @Body('status') status: CallReviewStatus) {
    if (![CallReviewStatus.REVIEWED, CallReviewStatus.REJECTED].includes(status)) {
      throw new (require('@nestjs/common').BadRequestException)('Status deve ser REVIEWED ou REJECTED');
    }
    return this.analysis.review(id, status);
  }
}
