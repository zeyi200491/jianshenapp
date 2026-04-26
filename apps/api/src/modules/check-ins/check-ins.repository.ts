import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CheckInsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByDate(userId: string, checkinDate: Date) {
    return this.prisma.checkIn.findUnique({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate,
        },
      },
      include: {
        dailyPlan: true,
      },
    });
  }

  findDailyPlanByIdAndUser(dailyPlanId: string, userId: string) {
    return this.prisma.dailyPlan.findFirst({
      where: {
        id: dailyPlanId,
        userId,
      },
    });
  }

  async upsertCheckIn(userId: string, payload: {
    dailyPlanId: string;
    checkinDate: Date;
    dietCompletionRate: number;
    trainingCompletionRate: number;
    waterIntakeMl?: number;
    stepCount?: number;
    weightKg?: number;
    energyLevel?: number;
    satietyLevel?: number;
    fatigueLevel?: number;
    note?: string;
  }) {
    return this.prisma.checkIn.upsert({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate: payload.checkinDate,
        },
      },
      create: {
        userId,
        ...payload,
      },
      update: {
        dailyPlanId: payload.dailyPlanId,
        dietCompletionRate: payload.dietCompletionRate,
        trainingCompletionRate: payload.trainingCompletionRate,
        waterIntakeMl: payload.waterIntakeMl,
        stepCount: payload.stepCount,
        weightKg: payload.weightKg,
        energyLevel: payload.energyLevel,
        satietyLevel: payload.satietyLevel,
        fatigueLevel: payload.fatigueLevel,
        note: payload.note,
      },
      include: {
        dailyPlan: true,
      },
    });
  }

  createBodyMetric(userId: string, weightKg: number, measuredAt: Date) {
    return this.prisma.bodyMetric.create({
      data: {
        userId,
        weightKg,
        source: 'checkin',
        measuredAt,
      },
    });
  }
}
