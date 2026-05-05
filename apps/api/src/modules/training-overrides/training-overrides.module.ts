import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { TrainingOverridesController } from './training-overrides.controller';
import { TrainingOverridesRepository } from './training-overrides.repository';
import { TrainingOverridesService } from './training-overrides.service';

@Module({
  imports: [ProfilesModule],
  controllers: [TrainingOverridesController],
  providers: [TrainingOverridesService, TrainingOverridesRepository],
  exports: [TrainingOverridesService, TrainingOverridesRepository],
})
export class TrainingOverridesModule {}
