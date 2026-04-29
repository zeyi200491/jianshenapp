import { Module } from '@nestjs/common';
import { TrainingTemplatesController } from './training-templates.controller';
import { TrainingTemplateImportPreviewStore } from './training-template-import-preview.store';
import { TrainingTemplatesRepository } from './training-templates.repository';
import { TrainingTemplatesService } from './training-templates.service';

@Module({
  controllers: [TrainingTemplatesController],
  providers: [TrainingTemplatesService, TrainingTemplatesRepository, TrainingTemplateImportPreviewStore],
  exports: [TrainingTemplatesService, TrainingTemplatesRepository, TrainingTemplateImportPreviewStore],
})
export class TrainingTemplatesModule {}
