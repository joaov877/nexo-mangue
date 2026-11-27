import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallAnalysisController } from './call-analysis.controller';
import { CallAnalysisService } from './call-analysis.service';

@Module({
  controllers: [CallsController, CallAnalysisController],
  providers: [CallsService, CallAnalysisService],
})
 export class CallsModule {}