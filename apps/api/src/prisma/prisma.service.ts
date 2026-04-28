import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MockPrismaStore } from './mock-store';

type RequestedDataMode = 'auto' | 'database' | 'mock';

function normalizeRequestedMode(value: string | undefined): RequestedDataMode {
  if (value === 'database' || value === 'mock') {
    return value;
  }

  return 'auto';
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly requestedMode = normalizeRequestedMode((process.env.API_DATA_MODE ?? 'auto').toLowerCase());
  readonly realClient = new PrismaClient();
  private readonly mockStore = new MockPrismaStore();
  private activeMode: 'database' | 'mock' = this.requestedMode === 'mock' ? 'mock' : 'database';

  user: any;
  authAccount: any;
  userProfile: any;
  bodyMetric: any;
  dailyPlan: any;
  dietPlan: any;
  dietPlanItem: any;
  mealIntakeOverride: any;
  foodLibraryItem: any;
  trainingPlan: any;
  trainingPlanItem: any;
  userTrainingTemplate: any;
  userTrainingTemplateDay: any;
  userTrainingTemplateItem: any;
  dailyTrainingOverride: any;
  dailyTrainingOverrideItem: any;
  checkIn: any;
  weeklyReview: any;
  weeklyReviewActionItem: any;

  constructor() {
    this.bindDelegates();
  }

  async onModuleInit() {
    if (this.activeMode === 'mock') {
      this.logger.warn('API_DATA_MODE=mock，API 使用内置演示数据运行。');
      return;
    }

    try {
      await this.realClient.$connect();
      this.logger.log('PostgreSQL 连接成功，API 使用数据库模式运行。');
    } catch (error) {
      if (this.requestedMode === 'database') {
        this.logger.error(
          `PostgreSQL 连接失败，API_DATA_MODE=database 不允许回退到演示数据模式：${error instanceof Error ? error.message : 'unknown error'}`,
        );
        throw error;
      }

      this.activeMode = 'mock';
      this.bindDelegates();
      this.logger.warn(
        `PostgreSQL 连接失败，已自动切换到演示数据模式：${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.activeMode === 'database') {
      await this.realClient.$disconnect();
    }
  }

  async $connect() {
    if (this.activeMode === 'database') {
      await this.realClient.$connect();
      return;
    }
    await this.mockStore.$connect();
  }

  async $disconnect() {
    if (this.activeMode === 'database') {
      await this.realClient.$disconnect();
      return;
    }
    await this.mockStore.$disconnect();
  }

  async $transaction<T>(input: (tx: any) => Promise<T>): Promise<T> {
    if (this.activeMode === 'database') {
      return this.realClient.$transaction(async (tx) => input(tx as any));
    }
    return this.mockStore.$transaction(input);
  }

  async $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> {
    if (this.activeMode === 'database') {
      return (this.realClient as any).$queryRawUnsafe(query, ...values);
    }
    return this.mockStore.$queryRawUnsafe(query, ...values);
  }

  getMode() {
    return this.activeMode;
  }

  private bindDelegates() {
    const source = this.activeMode === 'database' ? (this.realClient as any) : this.mockStore;
    this.user = source.user;
    this.authAccount = source.authAccount;
    this.userProfile = source.userProfile;
    this.bodyMetric = source.bodyMetric;
    this.dailyPlan = source.dailyPlan;
    this.dietPlan = source.dietPlan;
    this.dietPlanItem = source.dietPlanItem;
    this.mealIntakeOverride = source.mealIntakeOverride;
    this.foodLibraryItem = source.foodLibraryItem;
    this.trainingPlan = source.trainingPlan;
    this.trainingPlanItem = source.trainingPlanItem;
    this.userTrainingTemplate = source.userTrainingTemplate;
    this.userTrainingTemplateDay = source.userTrainingTemplateDay;
    this.userTrainingTemplateItem = source.userTrainingTemplateItem;
    this.dailyTrainingOverride = source.dailyTrainingOverride;
    this.dailyTrainingOverrideItem = source.dailyTrainingOverrideItem;
    this.checkIn = source.checkIn;
    this.weeklyReview = source.weeklyReview;
    this.weeklyReviewActionItem = source.weeklyReviewActionItem;
  }
}
