import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateTrainingTemplateDayDto, CreateTrainingTemplateItemDto } from './dto/create-training-template.dto';
import type { UpdateTrainingTemplateDto } from './dto/update-training-template.dto';

export type PersistedTemplateItemInput = CreateTrainingTemplateItemDto & {
  repText?: string | null;
  sourceType?: 'standard' | 'free_text';
  rawInput?: string | null;
};

export type PersistedTemplateDayInput = Omit<CreateTrainingTemplateDayDto, 'items'> & {
  items: PersistedTemplateItemInput[];
};

export type ImportedTemplateDayInput = {
  weekday: string;
  title: string;
  dayType: 'training' | 'rest';
  notes?: string;
  items: Array<{
    exerciseCode: string;
    exerciseName: string;
    sets: number;
    reps: string;
    repText?: string | null;
    sourceType?: 'standard' | 'free_text';
    rawInput?: string | null;
    restSeconds: number;
    notes?: string;
  }>;
};

type ExistingImportedDayRecord = {
  id: string;
  weekday: string;
  splitType: string | null;
  durationMinutes: number | null;
  intensityLevel: string | null;
};

function buildTemplateInclude() {
  return {
    days: {
      orderBy: [{ sortOrder: 'asc' as const }, { dayIndex: 'asc' as const }],
      include: {
        items: {
          orderBy: { displayOrder: 'asc' as const },
        },
      },
    },
  };
}

@Injectable()
export class TrainingTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByUserId(userId: string) {
    return this.prisma.userTrainingTemplate.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { isEnabled: 'desc' }, { createdAt: 'asc' }],
      include: buildTemplateInclude(),
    });
  }

  findByIdAndUserId(id: string, userId: string) {
    return this.prisma.userTrainingTemplate.findFirst({
      where: { id, userId },
      include: buildTemplateInclude(),
    });
  }

  findEnabledByUserId(userId: string) {
    return this.prisma.userTrainingTemplate.findFirst({
      where: {
        userId,
        isEnabled: true,
        status: 'active',
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: buildTemplateInclude(),
    });
  }

  async createTemplate(userId: string, payload: { name: string; status?: string; isEnabled?: boolean; isDefault?: boolean; notes?: string; days: PersistedTemplateDayInput[] }) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.userTrainingTemplate.create({
        data: {
          userId,
          name: payload.name,
          status: payload.status ?? 'active',
          isEnabled: payload.isEnabled ?? false,
          isDefault: payload.isDefault ?? false,
          notes: payload.notes ?? '',
        },
      });

      await this.replaceDays(tx, template.id, payload.days);

      return tx.userTrainingTemplate.findUniqueOrThrow({
        where: { id: template.id },
        include: buildTemplateInclude(),
      });
    });
  }

  async updateTemplate(
    templateId: string,
    userId: string,
    payload: UpdateTrainingTemplateDto & { days?: PersistedTemplateDayInput[] },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userTrainingTemplate.update({
        where: { id: templateId },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.isEnabled !== undefined ? { isEnabled: payload.isEnabled } : {}),
          ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
          ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        },
      });

      if (payload.days) {
        await tx.userTrainingTemplateDay.deleteMany({ where: { templateId } });
        await this.replaceDays(tx, templateId, payload.days);
      }

      return tx.userTrainingTemplate.findUniqueOrThrow({
        where: { id: templateId },
        include: buildTemplateInclude(),
      });
    });
  }

  async replaceTemplateDaysFromImport(
    templateId: string,
    userId: string,
    weekdays: string[],
    importedDays: ImportedTemplateDayInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingDays = (await tx.userTrainingTemplateDay.findMany({
        where: { templateId, weekday: { in: weekdays } },
        orderBy: [{ sortOrder: 'asc' }, { dayIndex: 'asc' }],
      })) as ExistingImportedDayRecord[];

      const dayByWeekday = new Map<string, ExistingImportedDayRecord>(
        existingDays.map((day) => [day.weekday, day]),
      );
      await tx.userTrainingTemplateItem.deleteMany({
        where: {
          templateDayId: {
            in: existingDays.map((day) => day.id),
          },
        },
      });

      for (const importedDay of importedDays) {
        const existingDay = dayByWeekday.get(importedDay.weekday);
        if (!existingDay) {
          continue;
        }

        const nextDayType = importedDay.dayType;
        const nextSplitType =
          nextDayType === 'rest' ? null : existingDay.splitType ?? 'custom_import';
        const nextDurationMinutes =
          nextDayType === 'rest' ? null : existingDay.durationMinutes ?? 45;
        const nextIntensityLevel =
          nextDayType === 'rest' ? null : existingDay.intensityLevel ?? 'medium';

        await tx.userTrainingTemplateDay.update({
          where: { id: existingDay.id },
          data: {
            dayType: nextDayType,
            title: importedDay.title,
            splitType: nextSplitType,
            durationMinutes: nextDurationMinutes,
            intensityLevel: nextIntensityLevel,
            notes: importedDay.notes ?? '',
          },
        });

        if (nextDayType === 'training' && importedDay.items.length > 0) {
          await tx.userTrainingTemplateItem.createMany({
            data: importedDay.items.map((item, index) => ({
              templateDayId: existingDay.id,
              exerciseCode: item.exerciseCode,
              exerciseName: item.exerciseName,
              sets: item.sets,
              reps: item.reps,
              repText: item.repText ?? item.reps,
              sourceType: item.sourceType ?? 'standard',
              rawInput: item.rawInput ?? null,
              restSeconds: item.restSeconds,
              notes: item.notes ?? '',
              displayOrder: index,
            })),
          });
        }
      }

      return tx.userTrainingTemplate.findFirstOrThrow({
        where: { id: templateId, userId },
        include: buildTemplateInclude(),
      });
    });
  }

  async setEnabledTemplate(userId: string, templateId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userTrainingTemplate.updateMany({
        where: { userId },
        data: { isEnabled: false },
      });
      await tx.userTrainingTemplate.update({
        where: { id: templateId },
        data: { isEnabled: true },
      });

      return tx.userTrainingTemplate.findUniqueOrThrow({
        where: { id: templateId },
        include: buildTemplateInclude(),
      });
    });
  }

  async setDefaultTemplate(userId: string, templateId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userTrainingTemplate.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      await tx.userTrainingTemplate.update({
        where: { id: templateId },
        data: { isDefault: true },
      });

      return tx.userTrainingTemplate.findUniqueOrThrow({
        where: { id: templateId },
        include: buildTemplateInclude(),
      });
    });
  }

  private async replaceDays(tx: any, templateId: string, days: PersistedTemplateDayInput[]) {
    for (const [index, day] of days.entries()) {
      const createdDay = await tx.userTrainingTemplateDay.create({
        data: {
          templateId,
          weekday: day.weekday,
          dayType: day.dayType,
          sortOrder: index,
          dayIndex: index,
          splitType: day.splitType ?? null,
          title: day.title,
          durationMinutes: day.durationMinutes ?? null,
          intensityLevel: day.intensityLevel ?? null,
          notes: day.notes ?? '',
        },
      });

      if (day.items.length > 0) {
        await tx.userTrainingTemplateItem.createMany({
          data: day.items.map((item, itemIndex) => ({
            templateDayId: createdDay.id,
            exerciseCode: item.exerciseCode,
            exerciseName: item.exerciseName,
            sets: item.sets,
            reps: item.reps,
            repText: item.repText ?? item.reps,
            sourceType: item.sourceType ?? 'standard',
            rawInput: item.rawInput ?? null,
            restSeconds: item.restSeconds,
            notes: item.notes ?? '',
            displayOrder: itemIndex,
          })),
        });
      }
    }
  }
}
