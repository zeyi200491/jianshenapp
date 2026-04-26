import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { parseDateOnly, toDateOnlyString } from '../../common/utils/date.util';
import { serializeValue } from '../../common/utils/serialize.util';
import type { CreateCheckInDto } from './dto/create-check-in.dto';
import { CheckInsRepository } from './check-ins.repository';

@Injectable()
export class CheckInsService {
  constructor(private readonly checkInsRepository: CheckInsRepository) {}

  async create(userId: string, dto: CreateCheckInDto) {
    const checkinDate = parseDateOnly(dto.checkinDate);
    const dailyPlan = await this.checkInsRepository.findDailyPlanByIdAndUser(dto.dailyPlanId, userId);
    if (!dailyPlan) {
      throw new AppException('NOT_FOUND', '关联计划不存在', 404);
    }

    if (toDateOnlyString(dailyPlan.planDate) !== toDateOnlyString(checkinDate)) {
      throw new AppException('VALIDATION_ERROR', '打卡日期与计划日期不一致', 400);
    }

    const record = await this.checkInsRepository.upsertCheckIn(userId, {
      dailyPlanId: dto.dailyPlanId,
      checkinDate,
      dietCompletionRate: dto.dietCompletionRate,
      trainingCompletionRate: dto.trainingCompletionRate,
      waterIntakeMl: dto.waterIntakeMl,
      stepCount: dto.stepCount,
      weightKg: dto.weightKg,
      energyLevel: dto.energyLevel,
      satietyLevel: dto.satietyLevel,
      fatigueLevel: dto.fatigueLevel,
      note: dto.note,
    });

    if (dto.weightKg !== undefined) {
      await this.checkInsRepository.createBodyMetric(userId, dto.weightKg, checkinDate);
    }

    return {
      record: serializeValue(record),
      todayStatus: {
        hasCheckedIn: true,
        dietCompletionRate: record.dietCompletionRate,
        trainingCompletionRate: record.trainingCompletionRate,
      },
    };
  }

  async getByDate(userId: string, date: string) {
    const checkIn = await this.checkInsRepository.findByDate(userId, parseDateOnly(date));
    if (!checkIn) {
      throw new AppException('NOT_FOUND', '打卡记录不存在', 404);
    }

    return serializeValue(checkIn);
  }
}
