import { randomUUID } from 'crypto';

function normalizeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function sameDateOnly(left: Date | string, right: Date | string) {
  return normalizeDate(left).toISOString() === normalizeDate(right).toISOString();
}

function sortByDisplayOrder<T extends { displayOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.displayOrder - right.displayOrder);
}

export class MockPrismaStore {
  private readonly users: any[] = [];
  private readonly authAccounts: any[] = [];
  private readonly userProfiles: any[] = [];
  private readonly bodyMetrics: any[] = [];
  private readonly dailyPlans: any[] = [];
  private readonly dietPlans: any[] = [];
  private readonly dietPlanItems: any[] = [];
  private readonly mealIntakeOverrides: any[] = [];
  private readonly foodLibraryItems: any[] = [];
  private readonly trainingPlans: any[] = [];
  private readonly trainingPlanItems: any[] = [];
  private readonly checkIns: any[] = [];
  private readonly weeklyReviews: any[] = [];
  private readonly weeklyReviewActionItems: any[] = [];
  private readonly productCategories: any[] = [];
  private readonly products: any[] = [];
  private readonly aiConversations: any[] = [];
  private readonly aiMessages: any[] = [];
  private readonly dataDeletionRequests: any[] = [];

  constructor() {
    this.seedProducts();
  }

  readonly user = {
    findUnique: async (args: any) => {
      const user = this.users.find((item) => item.id === args.where.id) ?? null;
      return this.attachUserIncludes(user, args.include);
    },
    create: async (args: any) => {
      const now = new Date();
      const user = {
        id: randomUUID(),
        nickname: args.data.nickname ?? 'CampusFit 用户',
        avatarUrl: args.data.avatarUrl ?? null,
        status: args.data.status ?? 'active',
        createdAt: now,
        updatedAt: now,
      };
      this.users.push(user);

      const authAccount = args.data.authAccounts?.create;
      if (authAccount) {
        this.authAccounts.push({
          id: randomUUID(),
          userId: user.id,
          provider: authAccount.provider,
          openId: authAccount.openId,
          unionId: authAccount.unionId ?? null,
          sessionKeyDigest: authAccount.sessionKeyDigest,
          createdAt: now,
          updatedAt: now,
        });
      }

      return this.attachUserIncludes(user, args.include);
    },
  };

  readonly authAccount = {
    findUnique: async (args: any) => {
      const composite = args.where.provider_openId;
      const account =
        this.authAccounts.find(
          (item) => item.provider === composite.provider && item.openId === composite.openId,
        ) ?? null;

      if (!account) {
        return null;
      }

      if (!args.include?.user) {
        return { ...account };
      }

      const user = this.users.find((item) => item.id === account.userId) ?? null;
      return {
        ...account,
        user: this.attachUserIncludes(user, args.include.user.include),
      };
    },
  };

  readonly userProfile = {
    findUnique: async (args: any) => {
      const profile = this.userProfiles.find((item) => item.userId === args.where.userId) ?? null;
      return profile ? { ...profile } : null;
    },
    upsert: async (args: any) => {
      const now = new Date();
      const index = this.userProfiles.findIndex((item) => item.userId === args.where.userId);
      if (index >= 0) {
        const updated = {
          ...this.userProfiles[index],
          ...args.update,
          updatedAt: now,
        };
        this.userProfiles[index] = updated;
        return { ...updated };
      }

      const created = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.create,
      };
      this.userProfiles.push(created);
      return { ...created };
    },
    update: async (args: any) => {
      const index = this.userProfiles.findIndex((item) => item.userId === args.where.userId);
      const updated = {
        ...this.userProfiles[index],
        ...args.data,
        updatedAt: new Date(),
      };
      this.userProfiles[index] = updated;
      return { ...updated };
    },
  };

  readonly bodyMetric = {
    create: async (args: any) => {
      const created = {
        id: randomUUID(),
        bodyFatRate: null,
        createdAt: new Date(),
        ...args.data,
      };
      this.bodyMetrics.push(created);
      return { ...created };
    },
  };

  readonly dailyPlan = {
    findUnique: async (args: any) => {
      let plan: any = null;
      if (args.where.userId_planDate) {
        plan =
          this.dailyPlans.find(
            (item) =>
              item.userId === args.where.userId_planDate.userId &&
              sameDateOnly(item.planDate, args.where.userId_planDate.planDate),
          ) ?? null;
      } else if (args.where.id) {
        plan = this.dailyPlans.find((item) => item.id === args.where.id) ?? null;
      }
      return this.attachDailyPlanIncludes(plan, args.include);
    },
    findFirst: async (args: any) => {
      const plan =
        this.dailyPlans.find((item) => {
          if (args.where?.id && item.id !== args.where.id) {
            return false;
          }
          if (args.where?.userId && item.userId !== args.where.userId) {
            return false;
          }
          return true;
        }) ?? null;
      return plan ? { ...plan } : null;
    },
    findMany: async (args: any) => {
      return this.dailyPlans
        .filter((item) => {
          if (args.where?.userId && item.userId !== args.where.userId) {
            return false;
          }
          if (args.where?.planDate?.gte && normalizeDate(item.planDate) < normalizeDate(args.where.planDate.gte)) {
            return false;
          }
          if (args.where?.planDate?.lte && normalizeDate(item.planDate) > normalizeDate(args.where.planDate.lte)) {
            return false;
          }
          return true;
        })
        .sort((left, right) => left.planDate.getTime() - right.planDate.getTime())
        .map((item) => ({ ...item }));
    },
    create: async (args: any) => {
      const now = new Date();
      const created = {
        id: randomUUID(),
        generationSource: 'rule_engine',
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };
      this.dailyPlans.push(created);
      return { ...created };
    },
    update: async (args: any) => {
      const index = this.dailyPlans.findIndex((item) => item.id === args.where.id);
      const updated = {
        ...this.dailyPlans[index],
        ...args.data,
        updatedAt: new Date(),
      };
      this.dailyPlans[index] = updated;
      return { ...updated };
    },
    findUniqueOrThrow: async (args: any) => {
      const plan = await this.dailyPlan.findUnique(args);
      if (!plan) {
        throw new Error('dailyPlan not found');
      }
      return plan;
    },
  };

  readonly dietPlan = {
    create: async (args: any) => {
      const now = new Date();
      const created = {
        id: randomUUID(),
        supplementNotes: [],
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };
      this.dietPlans.push(created);
      return { ...created };
    },
    update: async (args: any) => {
      const index = this.dietPlans.findIndex((item) => item.id === args.where.id);
      const updated = {
        ...this.dietPlans[index],
        ...args.data,
        updatedAt: new Date(),
      };
      this.dietPlans[index] = updated;
      return { ...updated };
    },
    findFirst: async (args: any) => {
      const dietPlan =
        this.dietPlans.find((item) => {
          if (args.where?.id && item.id !== args.where.id) {
            return false;
          }
          if (args.where?.dailyPlan?.userId) {
            const dailyPlan = this.dailyPlans.find((plan) => plan.id === item.dailyPlanId);
            if (!dailyPlan || dailyPlan.userId !== args.where.dailyPlan.userId) {
              return false;
            }
          }
          return true;
        }) ?? null;
      return this.attachDietPlanIncludes(dietPlan, args.include);
    },
  };

  readonly dietPlanItem = {
    deleteMany: async (args: any) => {
      for (let index = this.dietPlanItems.length - 1; index >= 0; index -= 1) {
        if (this.dietPlanItems[index].dietPlanId === args.where.dietPlanId) {
          this.dietPlanItems.splice(index, 1);
        }
      }
      return { count: 0 };
    },
    createMany: async (args: any) => {
      const now = new Date();
      args.data.forEach((item: any) => {
        this.dietPlanItems.push({
          id: randomUUID(),
          createdAt: now,
          ...item,
        });
      });
      return { count: args.data.length };
    },
  };

  readonly mealIntakeOverride = {
    findMany: async (args: any) => {
      return this.mealIntakeOverrides
        .filter((item) => {
          if (args.where?.dailyPlanId && item.dailyPlanId !== args.where.dailyPlanId) {
            return false;
          }
          if (args.where?.userId && item.userId !== args.where.userId) {
            return false;
          }
          if (args.where?.mealType && item.mealType !== args.where.mealType) {
            return false;
          }
          return true;
        })
        .map((item) => ({ ...item }));
    },
    upsert: async (args: any) => {
      const composite = args.where.dailyPlanId_mealType;
      const index = this.mealIntakeOverrides.findIndex(
        (item) => item.dailyPlanId === composite.dailyPlanId && item.mealType === composite.mealType,
      );
      const now = new Date();
      if (index >= 0) {
        const updated = {
          ...this.mealIntakeOverrides[index],
          ...args.update,
          updatedAt: now,
        };
        this.mealIntakeOverrides[index] = updated;
        return { ...updated };
      }

      const created = {
        id: randomUUID(),
        source: 'food_library',
        createdAt: now,
        updatedAt: now,
        ...args.create,
      };
      this.mealIntakeOverrides.push(created);
      return { ...created };
    },
    deleteMany: async (args: any) => {
      let count = 0;
      for (let index = this.mealIntakeOverrides.length - 1; index >= 0; index -= 1) {
        const item = this.mealIntakeOverrides[index];
        if (args.where?.dailyPlanId && item.dailyPlanId !== args.where.dailyPlanId) {
          continue;
        }
        if (args.where?.mealType && item.mealType !== args.where.mealType) {
          continue;
        }
        this.mealIntakeOverrides.splice(index, 1);
        count += 1;
      }
      return { count };
    },
  };

  readonly foodLibraryItem = {
    findMany: async (args: any) => {
      return this.foodLibraryItems
        .filter((item) => {
          if (args.where?.status && item.status !== args.where.status) {
            return false;
          }
          if (args.where?.code && item.code !== args.where.code) {
            return false;
          }
          return true;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({ ...item }));
    },
    findUnique: async (args: any) => {
      const food = this.foodLibraryItems.find((item) => item.id === args.where.id) ?? null;
      return food ? { ...food } : null;
    },
    findFirst: async (args: any) => {
      const food =
        this.foodLibraryItems.find((item) => {
          if (args.where?.status && item.status !== args.where.status) {
            return false;
          }
          if (args.where?.code && item.code !== args.where.code) {
            return false;
          }
          return true;
        }) ?? null;
      return food ? { ...food } : null;
    },
    create: async (args: any) => {
      const now = new Date();
      const created = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };
      this.foodLibraryItems.push(created);
      return { ...created };
    },
    update: async (args: any) => {
      const index = this.foodLibraryItems.findIndex((item) => item.id === args.where.id);
      if (index < 0) {
        return null;
      }

      const updated = {
        ...this.foodLibraryItems[index],
        ...args.data,
        updatedAt: new Date(),
      };
      this.foodLibraryItems[index] = updated;
      return { ...updated };
    },
  };

  readonly trainingPlan = {
    create: async (args: any) => {
      const now = new Date();
      const created = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };
      this.trainingPlans.push(created);
      return { ...created };
    },
    update: async (args: any) => {
      const index = this.trainingPlans.findIndex((item) => item.id === args.where.id);
      const updated = {
        ...this.trainingPlans[index],
        ...args.data,
        updatedAt: new Date(),
      };
      this.trainingPlans[index] = updated;
      return { ...updated };
    },
    findFirst: async (args: any) => {
      const trainingPlan =
        this.trainingPlans.find((item) => {
          if (args.where?.id && item.id !== args.where.id) {
            return false;
          }
          if (args.where?.dailyPlan?.userId) {
            const dailyPlan = this.dailyPlans.find((plan) => plan.id === item.dailyPlanId);
            if (!dailyPlan || dailyPlan.userId !== args.where.dailyPlan.userId) {
              return false;
            }
          }
          return true;
        }) ?? null;
      return this.attachTrainingPlanIncludes(trainingPlan, args.include);
    },
  };

  readonly trainingPlanItem = {
    deleteMany: async (args: any) => {
      for (let index = this.trainingPlanItems.length - 1; index >= 0; index -= 1) {
        if (this.trainingPlanItems[index].trainingPlanId === args.where.trainingPlanId) {
          this.trainingPlanItems.splice(index, 1);
        }
      }
      return { count: 0 };
    },
    createMany: async (args: any) => {
      const now = new Date();
      args.data.forEach((item: any) => {
        this.trainingPlanItems.push({
          id: randomUUID(),
          createdAt: now,
          ...item,
        });
      });
      return { count: args.data.length };
    },
  };

  readonly checkIn = {
    findUnique: async (args: any) => {
      const record =
        this.checkIns.find(
          (item) =>
            item.userId === args.where.userId_checkinDate.userId &&
            sameDateOnly(item.checkinDate, args.where.userId_checkinDate.checkinDate),
        ) ?? null;
      return this.attachCheckInIncludes(record, args.include);
    },
    findMany: async (args: any) => {
      return this.checkIns
        .filter((item) => {
          if (args.where?.userId && item.userId !== args.where.userId) {
            return false;
          }
          if (args.where?.checkinDate?.gte && normalizeDate(item.checkinDate) < normalizeDate(args.where.checkinDate.gte)) {
            return false;
          }
          if (args.where?.checkinDate?.lte && normalizeDate(item.checkinDate) > normalizeDate(args.where.checkinDate.lte)) {
            return false;
          }
          return true;
        })
        .sort((left, right) => left.checkinDate.getTime() - right.checkinDate.getTime())
        .map((item) => ({ ...item }));
    },
    upsert: async (args: any) => {
      const index = this.checkIns.findIndex(
        (item) =>
          item.userId === args.where.userId_checkinDate.userId &&
          sameDateOnly(item.checkinDate, args.where.userId_checkinDate.checkinDate),
      );

      const now = new Date();
      let record: any;
      if (index >= 0) {
        record = {
          ...this.checkIns[index],
          ...args.update,
          updatedAt: now,
        };
        this.checkIns[index] = record;
      } else {
        record = {
          id: randomUUID(),
          waterIntakeMl: null,
          stepCount: null,
          weightKg: null,
          note: null,
          createdAt: now,
          updatedAt: now,
          ...args.create,
        };
        this.checkIns.push(record);
      }

      return this.attachCheckInIncludes(record, args.include);
    },
  };

  readonly weeklyReview = {
    findFirst: async (args: any) => {
      const review = this.weeklyReviews
        .filter((item) => item.userId === args.where.userId)
        .sort((left, right) => right.weekStartDate.getTime() - left.weekStartDate.getTime())[0];
      return review ? { ...review } : null;
    },
    findUnique: async (args: any) => {
      const review =
        this.weeklyReviews.find(
          (item) =>
            item.userId === args.where.userId_weekStartDate.userId &&
            sameDateOnly(item.weekStartDate, args.where.userId_weekStartDate.weekStartDate),
        ) ?? null;
      return review ? { ...review } : null;
    },
    upsert: async (args: any) => {
      const index = this.weeklyReviews.findIndex(
        (item) =>
          item.userId === args.where.userId_weekStartDate.userId &&
          sameDateOnly(item.weekStartDate, args.where.userId_weekStartDate.weekStartDate),
      );
      const now = new Date();
      let review: any;
      if (index >= 0) {
        review = {
          ...this.weeklyReviews[index],
          ...args.update,
        };
        this.weeklyReviews[index] = review;
      } else {
        review = {
          id: randomUUID(),
          createdAt: now,
          ...args.create,
        };
        this.weeklyReviews.push(review);
      }
      return { ...review };
    },
  };

  readonly weeklyReviewActionItem = {
    findMany: async (args: any) => {
      return this.weeklyReviewActionItems
        .filter((item) => {
          if (args.where?.userId && item.userId !== args.where.userId) {
            return false;
          }
          if (args.where?.weekStartDate && !sameDateOnly(item.weekStartDate, args.where.weekStartDate)) {
            return false;
          }
          if (args.where?.source && item.source !== args.where.source) {
            return false;
          }
          if (args.where?.status && item.status !== args.where.status) {
            return false;
          }
          if (args.where?.title?.in && !args.where.title.in.includes(item.title)) {
            return false;
          }
          return true;
        })
        .sort((left, right) => {
          const leftSort = left.sortOrder ?? 0;
          const rightSort = right.sortOrder ?? 0;
          if (leftSort !== rightSort) {
            return leftSort - rightSort;
          }
          return left.createdAt.getTime() - right.createdAt.getTime();
        })
        .map((item) => ({ ...item }));
    },
    createMany: async (args: any) => {
      const now = new Date();
      args.data.forEach((item: any) => {
        this.weeklyReviewActionItems.push({
          id: randomUUID(),
          source: 'system_generated',
          status: 'pending',
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          ...item,
        });
      });
      return { count: args.data.length };
    },
    update: async (args: any) => {
      const index = this.weeklyReviewActionItems.findIndex((item) => item.id === args.where.id);
      const updated = {
        ...this.weeklyReviewActionItems[index],
        ...args.data,
        updatedAt: new Date(),
      };
      this.weeklyReviewActionItems[index] = updated;
      return { ...updated };
    },
    deleteMany: async (args: any) => {
      let count = 0;
      for (let index = this.weeklyReviewActionItems.length - 1; index >= 0; index -= 1) {
        const item = this.weeklyReviewActionItems[index];
        if (args.where?.userId && item.userId !== args.where.userId) {
          continue;
        }
        if (args.where?.weekStartDate && !sameDateOnly(item.weekStartDate, args.where.weekStartDate)) {
          continue;
        }
        if (args.where?.source && item.source !== args.where.source) {
          continue;
        }
        if (args.where?.status && item.status !== args.where.status) {
          continue;
        }
        this.weeklyReviewActionItems.splice(index, 1);
        count += 1;
      }
      return { count };
    },
  };

  async $connect() {
    return Promise.resolve();
  }

  async $disconnect() {
    return Promise.resolve();
  }

  async $transaction<T>(input: (tx: MockPrismaStore) => Promise<T>) {
    return input(this);
  }

  async $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> {
    const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();

    if (normalized.includes('from product_categories')) {
      return [...this.productCategories]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          sort_order: item.sortOrder,
        })) as T;
    }

    if (normalized.includes('from products p')) {
      if (normalized.includes('where p.id = $1')) {
        const product = this.products.find((item) => item.id === values[0] && item.status === 'active');
        return (product ? [this.mapProductRow(product)] : []) as T;
      }

      let cursor = 0;
      const category = normalized.includes('c.slug = $') ? String(values[cursor++]) : undefined;
      const targetTag = normalized.includes('p.target_tags @> $') ? this.parseJsonArray(values[cursor++])[0] : undefined;
      const scene = normalized.includes('p.scene_tags @> $') ? this.parseJsonArray(values[cursor++])[0] : undefined;

      return this.products
        .filter((item) => {
          if (item.status !== 'active') {
            return false;
          }
          if (category) {
            const matchedCategory = this.productCategories.find((entry) => entry.id === item.categoryId);
            if (!matchedCategory || matchedCategory.slug !== category) {
              return false;
            }
          }
          if (targetTag && !item.targetTags.includes(targetTag)) {
            return false;
          }
          if (scene && !item.sceneTags.includes(scene)) {
            return false;
          }
          return true;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => this.mapProductRow(item)) as T;
    }

    if (normalized.includes('insert into ai_conversations')) {
      const now = new Date();
      const record = {
        id: randomUUID(),
        userId: String(values[0]),
        title: String(values[1]),
        context: this.parseJsonObject(values[2]),
        createdAt: now,
        updatedAt: now,
      };
      this.aiConversations.push(record);
      return [this.mapConversationRow(record)] as T;
    }

    if (normalized.includes('insert into data_deletion_requests')) {
      const record = {
        id: randomUUID(),
        userId: String(values[0]),
        status: 'pending',
        reason: values[1] ? String(values[1]) : null,
        requestedAt: new Date(),
      };
      this.dataDeletionRequests.push(record);
      return [
        {
          id: record.id,
          user_id: record.userId,
          status: record.status,
          reason: record.reason,
          requested_at: record.requestedAt,
        },
      ] as T;
    }

    if (normalized.includes('from ai_conversations')) {
      const record = this.aiConversations.find((item) => item.id === values[0] && item.userId === values[1]) ?? null;
      return (record ? [this.mapConversationRow(record)] : []) as T;
    }

    if (normalized.includes('update ai_conversations')) {
      const index = this.aiConversations.findIndex((item) => item.id === values[0]);
      if (index < 0) {
        return [] as T;
      }
      const updated = {
        ...this.aiConversations[index],
        title: String(values[1]),
        context: this.parseJsonObject(values[2]),
        updatedAt: new Date(),
      };
      this.aiConversations[index] = updated;
      return [this.mapConversationRow(updated)] as T;
    }

    if (normalized.includes('insert into ai_messages')) {
      const record = {
        id: randomUUID(),
        conversationId: String(values[0]),
        role: String(values[1]),
        content: String(values[2]),
        citations: this.parseJsonObjectArray(values[3]),
        trace: this.parseJsonObjectArray(values[4]),
        createdAt: new Date(),
      };
      this.aiMessages.push(record);
      return [this.mapMessageRow(record)] as T;
    }

    if (normalized.includes('from ai_messages')) {
      return this.aiMessages
        .filter((item) => item.conversationId === values[0])
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((item) => this.mapMessageRow(item)) as T;
    }

    throw new Error(`MockPrismaStore 尚未支持该 SQL: ${normalized.slice(0, 120)}`);
  }

  private attachUserIncludes(user: any, include?: any) {
    if (!user) {
      return null;
    }
    const result: any = { ...user };
    if (include?.profile) {
      result.profile = this.userProfiles.find((item) => item.userId === user.id) ?? null;
    }
    if (include?.authAccounts) {
      result.authAccounts = this.authAccounts.filter((item) => item.userId === user.id).map((item) => ({ ...item }));
    }
    return result;
  }

  private attachDailyPlanIncludes(plan: any, include?: any) {
    if (!plan) {
      return null;
    }
    const result: any = { ...plan };
    if (include?.dietPlan) {
      const dietPlan = this.dietPlans.find((item) => item.dailyPlanId === plan.id) ?? null;
      result.dietPlan = this.attachDietPlanIncludes(dietPlan, include.dietPlan.include);
    }
    if (include?.mealIntakeOverrides) {
      result.mealIntakeOverrides = this.mealIntakeOverrides
        .filter((item) => item.dailyPlanId === plan.id)
        .map((item) => ({ ...item }));
    }
    if (include?.trainingPlan) {
      const trainingPlan = this.trainingPlans.find((item) => item.dailyPlanId === plan.id) ?? null;
      result.trainingPlan = this.attachTrainingPlanIncludes(trainingPlan, include.trainingPlan.include);
    }
    return result;
  }

  private attachDietPlanIncludes(dietPlan: any, include?: any) {
    if (!dietPlan) {
      return null;
    }
    const result: any = { ...dietPlan };
    if (include?.items) {
      result.items = sortByDisplayOrder(
        this.dietPlanItems.filter((item) => item.dietPlanId === dietPlan.id).map((item) => ({ ...item })),
      );
    }
    if (include?.dailyPlan) {
      result.dailyPlan = this.dailyPlans.find((item) => item.id === dietPlan.dailyPlanId) ?? null;
    }
    return result;
  }

  private attachTrainingPlanIncludes(trainingPlan: any, include?: any) {
    if (!trainingPlan) {
      return null;
    }
    const result: any = { ...trainingPlan };
    if (include?.items) {
      result.items = sortByDisplayOrder(
        this.trainingPlanItems.filter((item) => item.trainingPlanId === trainingPlan.id).map((item) => ({ ...item })),
      );
    }
    if (include?.dailyPlan) {
      result.dailyPlan = this.dailyPlans.find((item) => item.id === trainingPlan.dailyPlanId) ?? null;
    }
    return result;
  }

  private attachCheckInIncludes(record: any, include?: any) {
    if (!record) {
      return null;
    }
    const result: any = { ...record };
    if (include?.dailyPlan) {
      result.dailyPlan = this.dailyPlans.find((item) => item.id === record.dailyPlanId) ?? null;
    }
    return result;
  }

  private parseJsonArray(input: unknown) {
    if (typeof input === 'string') {
      return JSON.parse(input) as string[];
    }
    return Array.isArray(input) ? (input as string[]) : [];
  }

  private parseJsonObject(input: unknown) {
    if (typeof input === 'string') {
      return JSON.parse(input) as Record<string, unknown>;
    }
    return (input as Record<string, unknown>) ?? {};
  }

  private parseJsonObjectArray(input: unknown) {
    if (typeof input === 'string') {
      return JSON.parse(input) as Array<Record<string, unknown>>;
    }
    return Array.isArray(input) ? (input as Array<Record<string, unknown>>) : [];
  }

  private mapProductRow(product: any) {
    const category = this.productCategories.find((item) => item.id === product.categoryId);
    return {
      id: product.id,
      category_id: product.categoryId,
      category_name: category?.name ?? '',
      category_slug: category?.slug ?? '',
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      target_tags: product.targetTags,
      scene_tags: product.sceneTags,
      price_cents: product.priceCents,
      cover_image_url: product.coverImageUrl,
      detail_images: product.detailImages,
      status: product.status,
      sort_order: product.sortOrder,
    };
  }

  private mapConversationRow(record: any) {
    return {
      id: record.id,
      user_id: record.userId,
      title: record.title,
      context: record.context,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  private mapMessageRow(record: any) {
    return {
      id: record.id,
      conversation_id: record.conversationId,
      role: record.role,
      content: record.content,
      citations: record.citations,
      trace: record.trace,
      created_at: record.createdAt,
    };
  }

  private seedProducts() {
    const now = new Date();
    const supplementCategory = {
      id: '50000000-0000-0000-0000-000000000001',
      name: '补剂推荐',
      slug: 'supplement',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    };
    const readyMealCategory = {
      id: '50000000-0000-0000-0000-000000000002',
      name: '便捷轻食',
      slug: 'ready-meal',
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    };

    this.productCategories.push(supplementCategory, readyMealCategory);
    this.products.push(
      {
        id: '60000000-0000-0000-0000-000000000001',
        categoryId: supplementCategory.id,
        name: '乳清蛋白基础款',
        subtitle: '适合训练后补充',
        description: '适合减脂和增肌阶段的基础蛋白补充。',
        targetTags: ['cut', 'maintain', 'bulk'],
        sceneTags: ['canteen', 'dorm'],
        priceCents: 12900,
        coverImageUrl: 'https://example.com/product/protein.png',
        detailImages: ['https://example.com/product/protein-detail.png'],
        status: 'active',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '60000000-0000-0000-0000-000000000002',
        categoryId: readyMealCategory.id,
        name: '高蛋白鸡胸便当',
        subtitle: '适合晚自习前快速补餐',
        description: '低油低脂，适合校园场景的快速正餐。',
        targetTags: ['cut', 'maintain'],
        sceneTags: ['dorm', 'home'],
        priceCents: 2590,
        coverImageUrl: 'https://example.com/product/meal.png',
        detailImages: ['https://example.com/product/meal-detail.png'],
        status: 'active',
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    );

    this.foodLibraryItems.push(
      {
        id: '70000000-0000-0000-0000-000000000001',
        code: 'fried-rice',
        name: 'Fried rice',
        aliases: ['炒饭'],
        sceneTags: ['canteen'],
        suggestedMealTypes: ['lunch', 'dinner'],
        calories: 680,
        proteinG: 18,
        carbG: 92,
        fatG: 24,
        status: 'active',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000002',
        code: 'braised-chicken-rice',
        name: 'Braised chicken rice',
        aliases: ['黄焖鸡', '黄焖鸡米饭'],
        sceneTags: ['canteen'],
        suggestedMealTypes: ['lunch', 'dinner'],
        calories: 760,
        proteinG: 32,
        carbG: 88,
        fatG: 28,
        status: 'active',
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000003',
        code: 'beef-noodle-soup',
        name: 'Beef noodle soup',
        aliases: ['红烧牛肉面', '牛肉汤面'],
        sceneTags: ['canteen'],
        suggestedMealTypes: ['lunch', 'dinner'],
        calories: 620,
        proteinG: 28,
        carbG: 78,
        fatG: 18,
        status: 'active',
        sortOrder: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000004',
        code: 'egg-noodles',
        name: 'Egg noodles',
        aliases: ['番茄鸡蛋面', '家常鸡蛋面'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['breakfast', 'dinner'],
        calories: 540,
        proteinG: 20,
        carbG: 78,
        fatG: 16,
        status: 'active',
        sortOrder: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000005',
        code: 'chicken-rice-bowl',
        name: 'Chicken rice bowl',
        aliases: ['鸡胸肉饭', '鸡胸肉饭团'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['lunch', 'dinner'],
        calories: 610,
        proteinG: 40,
        carbG: 66,
        fatG: 14,
        status: 'active',
        sortOrder: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000006',
        code: 'tomato-beef-pasta',
        name: 'Tomato beef pasta',
        aliases: ['牛肉意面', '番茄意面'],
        sceneTags: ['cookable'],
        suggestedMealTypes: ['lunch', 'dinner'],
        calories: 650,
        proteinG: 30,
        carbG: 82,
        fatG: 18,
        status: 'active',
        sortOrder: 6,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000007',
        code: 'oatmeal-yogurt-bowl',
        name: 'Oatmeal yogurt bowl',
        aliases: ['燕麦碗', '酸奶燕麦'],
        sceneTags: ['cookable', 'canteen'],
        suggestedMealTypes: ['breakfast'],
        calories: 420,
        proteinG: 24,
        carbG: 48,
        fatG: 10,
        status: 'active',
        sortOrder: 7,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '70000000-0000-0000-0000-000000000008',
        code: 'whole-wheat-sandwich',
        name: 'Whole wheat sandwich',
        aliases: ['鸡蛋三明治', '金枪鱼三明治'],
        sceneTags: ['cookable', 'canteen'],
        suggestedMealTypes: ['breakfast', 'dinner'],
        calories: 460,
        proteinG: 22,
        carbG: 46,
        fatG: 14,
        status: 'active',
        sortOrder: 8,
        createdAt: now,
        updatedAt: now,
      },
    );
  }
}


