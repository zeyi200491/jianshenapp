import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { DietPlansModule } from './modules/diet-plans/diet-plans.module';
import { MealIntakesModule } from './modules/meal-intakes/meal-intakes.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProductsModule } from './modules/products/products.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { TodayModule } from './modules/today/today.module';
import { TrainingOverridesModule } from './modules/training-overrides/training-overrides.module';
import { TrainingPlansModule } from './modules/training-plans/training-plans.module';
import { TrainingTemplatesModule } from './modules/training-templates/training-templates.module';
import { UsersModule } from './modules/users/users.module';
import { WeeklyReviewsModule } from './modules/weekly-reviews/weekly-reviews.module';
import { PrismaModule } from './prisma/prisma.module';
import { getJwtSecret } from './config/security.config';

function resolveEnvFilePaths() {
  return [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].filter((filePath) =>
    existsSync(filePath),
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePaths(),
    }),
    JwtModule.register({
      global: true,
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    PlansModule,
    TrainingTemplatesModule,
    TrainingOverridesModule,
    DietPlansModule,
    MealIntakesModule,
    TrainingPlansModule,
    TodayModule,
    CheckInsModule,
    WeeklyReviewsModule,
    ProductsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware, RequestLoggingMiddleware).forRoutes('*');
  }
}
