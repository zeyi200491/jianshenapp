import { Module } from '@nestjs/common';
import { TrainingTemplatesController } from './training-templates.controller';
import { TrainingTemplatesRepository } from './training-templates.repository';
import { TrainingTemplatesService } from './training-templates.service';

@Module({
  controllers: [TrainingTemplatesController],
  providers: [TrainingTemplatesService, TrainingTemplatesRepository],
  exports: [TrainingTemplatesService, TrainingTemplatesRepository],
})
export class TrainingTemplatesModule {}
