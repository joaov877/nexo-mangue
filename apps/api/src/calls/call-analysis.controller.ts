import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
}