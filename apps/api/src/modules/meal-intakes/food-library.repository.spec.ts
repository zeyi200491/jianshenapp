import { validateSync } from 'class-validator';
import { FoodLibraryRepository } from './food-library.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFoodLibraryItemDto, PatchFoodLibraryItemDto } from './dto/upsert-food-library-item.dto';

describe('FoodLibraryRepository', () => {
  it('uses the active PrismaService delegate instead of realClient for searchFoodLibrary', async () => {
    const prisma = new PrismaService();
    const activeDelegate = {
      findMany: jest.fn().mockResolvedValue([
        {
          code: 'custom-grain-bowl',
          name: 'Custom grain bowl',
          aliases: ['alias'],
          sceneTags: ['canteen'],
          suggestedMealTypes: ['breakfast'],
          calories: 510,
          proteinG: 26,
          carbG: 58,
          fatG: 16,
        },
      ]),
      findFirst: jest.fn(),
    };

    (prisma as any).foodLibraryItem = activeDelegate;
    (prisma.realClient as any).foodLibraryItem = {
      findMany: jest.fn().mockRejectedValue(new Error('realClient should not be used')),
      findFirst: jest.fn(),
    };

    const repository = new FoodLibraryRepository(prisma);

    const result = await repository.searchFoodLibrary('grain bowl', 'canteen', 'breakfast');

    expect(activeDelegate.findMany).toHaveBeenCalled();
    expect(result[0].code).toBe('custom-grain-bowl');
  });

  it('prioritizes exact-name and current-meal matches ahead of alias-only matches', async () => {
    const prisma = new PrismaService();
    const activeDelegate = {
      findMany: jest.fn().mockResolvedValue([
        {
          code: 'spicy-chicken-bowl',
          name: '麻辣鸡腿饭',
          aliases: ['鸡腿饭', '香辣鸡腿饭'],
          sceneTags: ['cookable'],
          suggestedMealTypes: ['dinner'],
          calories: 720,
          proteinG: 32,
          carbG: 88,
          fatG: 26,
          sortOrder: 3,
          updatedAt: new Date('2026-04-20T00:00:00.000Z'),
        },
        {
          code: 'chicken-salad',
          name: '鸡肉沙拉',
          aliases: ['轻食鸡肉沙拉', '鸡腿饭沙拉版'],
          sceneTags: ['cookable'],
          suggestedMealTypes: ['dinner'],
          calories: 430,
          proteinG: 35,
          carbG: 18,
          fatG: 20,
          sortOrder: 1,
          updatedAt: new Date('2026-04-22T00:00:00.000Z'),
        },
        {
          code: 'chicken-wrap',
          name: '香煎鸡肉卷',
          aliases: ['鸡腿饭卷', '鸡肉卷'],
          sceneTags: ['cookable'],
          suggestedMealTypes: ['breakfast'],
          calories: 460,
          proteinG: 28,
          carbG: 40,
          fatG: 16,
          sortOrder: 2,
          updatedAt: new Date('2026-04-21T00:00:00.000Z'),
        },
      ]),
      findFirst: jest.fn(),
    };

    (prisma as any).foodLibraryItem = activeDelegate;
    const repository = new FoodLibraryRepository(prisma);

    const result = await repository.searchFoodLibrary('鸡腿饭', 'cookable', 'dinner');

    expect(result.map((item) => item.code)).toEqual([
      'spicy-chicken-bowl',
      'chicken-salad',
      'chicken-wrap',
    ]);
  });

  it('reads foodLibraryItem from the mock delegate after PrismaService switches to mock mode', async () => {
    const prisma = new PrismaService();
    const mockDelegate = {
      findMany: jest.fn().mockResolvedValue([
        {
          code: 'fried-rice',
          name: 'Fried rice',
          aliases: ['alias'],
          sceneTags: ['canteen'],
          suggestedMealTypes: ['lunch'],
          calories: 680,
          proteinG: 18,
          carbG: 92,
          fatG: 24,
        },
      ]),
      findFirst: jest.fn().mockResolvedValue({
        code: 'fried-rice',
        name: 'Fried rice',
        aliases: ['alias'],
        sceneTags: ['canteen'],
        suggestedMealTypes: ['lunch'],
        calories: 680,
        proteinG: 18,
        carbG: 92,
        fatG: 24,
      }),
    };

    (prisma as any).activeMode = 'mock';
    (prisma as any).mockStore.foodLibraryItem = mockDelegate;
    (prisma as any).bindDelegates();

    const repository = new FoodLibraryRepository(prisma);

    const result = await repository.findFoodByCode('fried-rice');

    expect((prisma as any).foodLibraryItem).toBeDefined();
    expect(mockDelegate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          code: 'fried-rice',
          status: 'active',
        }),
      }),
    );
    expect(result.code).toBe('fried-rice');
  });

  it('filters admin food library items by keyword, status and scene', async () => {
    const prisma = new PrismaService();
    const activeDelegate = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'food-1',
          code: 'fried-rice',
          name: 'Fried rice',
          aliases: ['alias'],
          sceneTags: ['canteen'],
          suggestedMealTypes: ['lunch'],
          calories: 680,
          proteinG: 18,
          carbG: 92,
          fatG: 24,
          status: 'active',
          sortOrder: 1,
        },
        {
          id: 'food-2',
          code: 'egg-noodles',
          name: 'Egg noodles',
          aliases: ['alias'],
          sceneTags: ['cookable'],
          suggestedMealTypes: ['breakfast'],
          calories: 540,
          proteinG: 20,
          carbG: 78,
          fatG: 16,
          status: 'inactive',
          sortOrder: 2,
        },
      ]),
    };

    (prisma as any).foodLibraryItem = activeDelegate;
    const repository = new FoodLibraryRepository(prisma);

    const result = await repository.listAdminFoodLibraryItems({
      keyword: 'rice',
      status: 'active',
      scene: 'canteen',
    });

    expect(activeDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'active',
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'food-1',
        code: 'fried-rice',
        status: 'active',
        sceneTags: ['canteen'],
      }),
    );
  });

  it('reads a food library item by id for admin use', async () => {
    const prisma = new PrismaService();
    const activeDelegate = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'food-1',
        code: 'fried-rice',
        name: 'Fried rice',
        aliases: ['alias'],
        sceneTags: ['canteen'],
        suggestedMealTypes: ['lunch'],
        calories: 680,
        proteinG: 18,
        carbG: 92,
        fatG: 24,
        status: 'active',
        sortOrder: 1,
      }),
    };

    (prisma as any).foodLibraryItem = activeDelegate;
    const repository = new FoodLibraryRepository(prisma);

    await repository.findAdminFoodLibraryItemById('food-1');

    expect(activeDelegate.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'food-1',
      },
    });
  });

  it('requires nutrition fields on create dto but keeps patch dto partial', async () => {
    const createDto = Object.assign(new CreateFoodLibraryItemDto(), {
      code: 'test-create',
      name: 'Test create',
      aliases: ['alias'],
      sceneTags: ['cookable'],
      suggestedMealTypes: ['lunch'],
      status: 'active',
      sortOrder: 1,
    });

    const patchDto = Object.assign(new PatchFoodLibraryItemDto(), {
      name: 'Test patch',
    });

    const createErrors = validateSync(createDto);
    const patchErrors = validateSync(patchDto);

    expect(createErrors.some((error) => error.property === 'calories')).toBe(true);
    expect(createErrors.some((error) => error.property === 'proteinG')).toBe(true);
    expect(createErrors.some((error) => error.property === 'carbG')).toBe(true);
    expect(createErrors.some((error) => error.property === 'fatG')).toBe(true);
    expect(patchErrors.filter((error) => ['calories', 'proteinG', 'carbG', 'fatG'].includes(error.property))).toHaveLength(0);
  });

  it('runs admin get-by-id/create/update through the real mock foodLibraryItem delegate', async () => {
    const prisma = new PrismaService();
    (prisma as any).activeMode = 'mock';
    (prisma as any).bindDelegates();

    const repository = new FoodLibraryRepository(prisma);

    const created = await repository.createAdminFoodLibraryItem({
      code: 'test-mock-pasta',
      name: 'Test mock pasta',
      aliases: ['alias'],
      sceneTags: ['cookable'],
      suggestedMealTypes: ['lunch'],
      calories: 600,
      proteinG: 28,
      carbG: 74,
      fatG: 18,
      status: 'inactive',
      sortOrder: 21,
    });

    const found = await repository.findAdminFoodLibraryItemById(created.id);
    const updated = await repository.updateAdminFoodLibraryItem(created.id, {
      name: 'Test mock pasta deluxe',
      status: 'active',
      sortOrder: 22,
    });

    expect(created).toEqual(
      expect.objectContaining({
        code: 'test-mock-pasta',
        name: 'Test mock pasta',
        aliases: ['alias'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['lunch'],
        calories: 600,
        proteinG: 28,
        carbG: 74,
        fatG: 18,
        status: 'inactive',
        sortOrder: 21,
      }),
    );
    expect(found).toEqual(
      expect.objectContaining({
        id: created.id,
        code: 'test-mock-pasta',
        name: 'Test mock pasta',
        status: 'inactive',
      }),
    );
    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        code: 'test-mock-pasta',
        name: 'Test mock pasta deluxe',
        status: 'active',
        sortOrder: 22,
      }),
    );
  });

  it('converts missing admin update into a 404 AppException', async () => {
    const prisma = new PrismaService();
    (prisma as any).activeMode = 'mock';
    (prisma as any).bindDelegates();

    const repository = new FoodLibraryRepository(prisma);

    await expect(
      repository.updateAdminFoodLibraryItem('missing-food-id', {
        name: 'Should not exist',
      }),
    ).rejects.toMatchObject({
      status: 404,
      response: {
        code: 'NOT_FOUND',
        message: 'Food library item not found.',
      },
    });
  });

  it('creates a food library item for admin use', async () => {
    const prisma = new PrismaService();
    const activeDelegate = {
      create: jest.fn().mockResolvedValue({
        id: 'food-3',
        code: 'tomato-beef-pasta',
        name: 'Tomato beef pasta',
        aliases: ['alias'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['lunch'],
        calories: 650,
        proteinG: 30,
        carbG: 82,
        fatG: 18,
        status: 'inactive',
        sortOrder: 12,
      }),
    };

    (prisma as any).foodLibraryItem = activeDelegate;
    const repository = new FoodLibraryRepository(prisma);

    await repository.createAdminFoodLibraryItem({
      code: 'tomato-beef-pasta',
      name: 'Tomato beef pasta',
      aliases: ['alias'],
      sceneTags: ['cookable'],
      suggestedMealTypes: ['lunch'],
      calories: 650,
      proteinG: 30,
      carbG: 82,
      fatG: 18,
      status: 'inactive',
      sortOrder: 12,
    });

    expect(activeDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'tomato-beef-pasta',
          name: 'Tomato beef pasta',
          aliases: ['alias'],
          sceneTags: ['cookable'],
          suggestedMealTypes: ['lunch'],
          calories: 650,
          proteinG: 30,
          carbG: 82,
          fatG: 18,
          status: 'inactive',
          sortOrder: 12,
        }),
      }),
    );
  });

  it('updates a food library item for admin use', async () => {
    const prisma = new PrismaService();
    const activeDelegate = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'food-3',
        code: 'tomato-beef-pasta',
        name: 'Tomato beef pasta',
        aliases: ['alias'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['lunch'],
        calories: 650,
        proteinG: 30,
        carbG: 82,
        fatG: 18,
        status: 'inactive',
        sortOrder: 12,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'food-3',
        code: 'tomato-beef-pasta',
        name: 'Tomato beef pasta deluxe',
        aliases: ['alias'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['lunch', 'dinner'],
        calories: 720,
        proteinG: 34,
        carbG: 84,
        fatG: 20,
        status: 'active',
        sortOrder: 8,
      }),
    };

    (prisma as any).foodLibraryItem = activeDelegate;
    const repository = new FoodLibraryRepository(prisma);

    await repository.updateAdminFoodLibraryItem('food-3', {
      name: 'Tomato beef pasta deluxe',
      suggestedMealTypes: ['lunch', 'dinner'],
      calories: 720,
      proteinG: 34,
      carbG: 84,
      fatG: 20,
      status: 'active',
      sortOrder: 8,
    });

    expect(activeDelegate.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'food-3',
      },
    });
    expect(activeDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'food-3',
        },
        data: expect.objectContaining({
          name: 'Tomato beef pasta deluxe',
          suggestedMealTypes: ['lunch', 'dinner'],
          calories: 720,
          proteinG: 34,
          carbG: 84,
          fatG: 20,
          status: 'active',
          sortOrder: 8,
        }),
      }),
    );
  });
});

