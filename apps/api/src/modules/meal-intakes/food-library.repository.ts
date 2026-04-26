import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeDisplayDietScene, type MealFood, type MealType } from './food-library';
import type { AdminFoodLibraryQueryDto } from './dto/admin-food-library-query.dto';
import type { UpsertFoodLibraryItemDto } from './dto/upsert-food-library-item.dto';

type AdminFoodLibraryItem = {
  id: string;
  code: string;
  name: string;
  aliases: string[];
  sceneTags: Array<'canteen' | 'cookable'>;
  suggestedMealTypes: MealType[];
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  status: string;
  sortOrder: number;
};

type SearchRanking = {
  mealTypeMatched: number;
  nameExact: number;
  nameStartsWith: number;
  nameContains: number;
  aliasExact: number;
  aliasStartsWith: number;
  aliasContains: number;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item));
}

function toMealTypeArray(value: unknown): MealType[] {
  return toStringArray(value).filter((item): item is MealType => item === 'breakfast' || item === 'lunch' || item === 'dinner');
}

function toAdminSceneTagArray(value: unknown): Array<'canteen' | 'cookable'> {
  return toStringArray(value).filter(
    (scene): scene is 'canteen' | 'cookable' => scene === 'canteen' || scene === 'cookable',
  );
}

function toMealFood(item: any): MealFood {
  return {
    code: item.code,
    name: item.name,
    aliases: toStringArray(item.aliases),
    sceneTags: toStringArray(item.sceneTags).filter(
      (scene): scene is NonNullable<MealFood['sceneTags'][number]> => scene === 'canteen' || scene === 'cookable',
    ),
    suggestedMealTypes: toMealTypeArray(item.suggestedMealTypes),
    nutritionPerMedium: {
      calories: Number(item.calories),
      proteinG: Number(item.proteinG),
      carbG: Number(item.carbG),
      fatG: Number(item.fatG),
    },
    sortOrder: Number(item.sortOrder ?? 0),
  };
}

function toAdminFoodLibraryItem(item: any): AdminFoodLibraryItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    aliases: toStringArray(item.aliases),
    sceneTags: toAdminSceneTagArray(item.sceneTags),
    suggestedMealTypes: toMealTypeArray(item.suggestedMealTypes),
    calories: Number(item.calories),
    proteinG: Number(item.proteinG),
    carbG: Number(item.carbG),
    fatG: Number(item.fatG),
    status: String(item.status ?? 'active'),
    sortOrder: Number(item.sortOrder ?? 0),
  };
}

function buildFoodLibraryWriteData(dto: Partial<UpsertFoodLibraryItemDto>) {
  return {
    ...(dto.code !== undefined ? { code: dto.code } : {}),
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.aliases !== undefined ? { aliases: dto.aliases } : {}),
    ...(dto.sceneTags !== undefined ? { sceneTags: dto.sceneTags } : {}),
    ...(dto.suggestedMealTypes !== undefined ? { suggestedMealTypes: dto.suggestedMealTypes } : {}),
    ...(dto.calories !== undefined ? { calories: dto.calories } : {}),
    ...(dto.proteinG !== undefined ? { proteinG: dto.proteinG } : {}),
    ...(dto.carbG !== undefined ? { carbG: dto.carbG } : {}),
    ...(dto.fatG !== undefined ? { fatG: dto.fatG } : {}),
    ...(dto.status !== undefined ? { status: dto.status } : {}),
    ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
  };
}

function buildSearchRanking(item: MealFood, normalizedKeyword: string, mealType?: MealType): SearchRanking {
  const normalizedName = item.name.toLowerCase();
  const normalizedAliases = item.aliases.map((entry) => entry.toLowerCase());

  return {
    mealTypeMatched: mealType && item.suggestedMealTypes.includes(mealType) ? 1 : 0,
    nameExact: normalizedName === normalizedKeyword ? 1 : 0,
    nameStartsWith: normalizedKeyword ? Number(normalizedName.startsWith(normalizedKeyword)) : 0,
    nameContains: normalizedKeyword ? Number(normalizedName.includes(normalizedKeyword)) : 0,
    aliasExact: normalizedAliases.some((entry) => entry === normalizedKeyword) ? 1 : 0,
    aliasStartsWith: normalizedKeyword ? Number(normalizedAliases.some((entry) => entry.startsWith(normalizedKeyword))) : 0,
    aliasContains: normalizedKeyword ? Number(normalizedAliases.some((entry) => entry.includes(normalizedKeyword))) : 0,
  };
}

function compareSearchRanking(
  left: { item: MealFood; ranking: SearchRanking },
  right: { item: MealFood; ranking: SearchRanking },
) {
  const keys: Array<keyof SearchRanking> = [
    'mealTypeMatched',
    'nameExact',
    'nameStartsWith',
    'nameContains',
    'aliasExact',
    'aliasStartsWith',
    'aliasContains',
  ];

  for (const key of keys) {
    if (left.ranking[key] !== right.ranking[key]) {
      return right.ranking[key] - left.ranking[key];
    }
  }

  const leftSortOrder = left.item.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightSortOrder = right.item.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder;
  }

  return left.item.code.localeCompare(right.item.code);
}

@Injectable()
export class FoodLibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchFoodLibrary(keyword: string, scene?: string, mealType?: MealType): Promise<MealFood[]> {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const normalizedScene = normalizeDisplayDietScene(scene);
    const foods = await this.prisma.foodLibraryItem.findMany({
      where: {
        status: 'active',
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    return foods
      .map(toMealFood)
      .filter((item: MealFood) => {
        if (normalizedScene && !item.sceneTags.includes(normalizedScene)) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        const haystacks = [item.name, ...item.aliases].map((entry) => entry.toLowerCase());
        return haystacks.some((entry) => entry.includes(normalizedKeyword));
      })
      .map((item) => ({
        item,
        ranking: buildSearchRanking(item, normalizedKeyword, mealType),
      }))
      .sort(compareSearchRanking)
      .map(({ item }) => item);
  }

  async findFoodByCode(code: string): Promise<MealFood> {
    const food = await this.prisma.foodLibraryItem.findFirst({
      where: {
        code,
        status: 'active',
      },
    });

    if (!food) {
      throw new AppException('NOT_FOUND', 'Food library item not found.', 404);
    }

    return toMealFood(food);
  }

  async listAdminFoodLibraryItems(query: AdminFoodLibraryQueryDto): Promise<AdminFoodLibraryItem[]> {
    const foods = await this.prisma.foodLibraryItem.findMany({
      where: query.status && query.status !== 'all' ? { status: query.status } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    const normalizedKeyword = query.keyword?.trim().toLowerCase() ?? '';
    const normalizedScene = normalizeDisplayDietScene(query.scene);

    return foods
      .map(toAdminFoodLibraryItem)
      .filter((item: AdminFoodLibraryItem) => {
        if (normalizedScene && !item.sceneTags.includes(normalizedScene as 'canteen' | 'cookable')) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        const haystacks = [item.code, item.name, ...item.aliases].map((entry) => entry.toLowerCase());
        return haystacks.some((entry) => entry.includes(normalizedKeyword));
      });
  }

  async findAdminFoodLibraryItemById(id: string): Promise<AdminFoodLibraryItem> {
    const food = await this.prisma.foodLibraryItem.findUnique({
      where: { id },
    });

    if (!food) {
      throw new AppException('NOT_FOUND', 'Food library item not found.', 404);
    }

    return toAdminFoodLibraryItem(food);
  }

  async createAdminFoodLibraryItem(dto: UpsertFoodLibraryItemDto): Promise<AdminFoodLibraryItem> {
    const food = await this.prisma.foodLibraryItem.create({
      data: buildFoodLibraryWriteData(dto),
    });

    return toAdminFoodLibraryItem(food);
  }

  async updateAdminFoodLibraryItem(id: string, dto: Partial<UpsertFoodLibraryItemDto>): Promise<AdminFoodLibraryItem> {
    const existing = await this.prisma.foodLibraryItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppException('NOT_FOUND', 'Food library item not found.', 404);
    }

    const food = await this.prisma.foodLibraryItem.update({
      where: { id },
      data: buildFoodLibraryWriteData(dto),
    });

    return toAdminFoodLibraryItem(food);
  }
}
