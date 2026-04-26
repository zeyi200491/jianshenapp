declare module '@prisma/client' {
  export class PrismaClient {
    user: any;
    authAccount: any;
    userProfile: any;
    bodyMetric: any;
    dailyPlan: any;
    dietPlan: any;
    mealIntakeOverride: any;
    trainingPlan: any;
    checkIn: any;
    weeklyReview: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<T>(input: (tx: any) => Promise<T>): Promise<T>;
  }
}

declare module '@prisma/client/runtime/library' {
  export class Decimal {
    toNumber(): number;
  }
}
