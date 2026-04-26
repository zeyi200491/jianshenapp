import { ApiError } from '@/lib/api';

type ErrorFallback = {
  whatHappened: string;
  nextStep: string;
  dataStatus: string;
};

function buildUserFacingCopy(copy: ErrorFallback) {
  return [
    `发生了什么：${copy.whatHappened}`,
    `现在怎么做：${copy.nextStep}`,
    `数据情况：${copy.dataStatus}`,
  ].join('\n');
}

export function describeUserFacingError(error: unknown, fallback: ErrorFallback) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return buildUserFacingCopy({
        whatHappened: '当前登录状态已经失效。',
        nextStep: '重新登录后再继续刚才的操作。',
        dataStatus: '你之前已经保存的数据不会丢失。',
      });
    }

    if (error.code === 'CONFLICT') {
      return buildUserFacingCopy({
        whatHappened: '当前资料还没有准备完整，这个页面暂时无法继续。',
        nextStep: '先完成建档，再回到当前页面继续。',
        dataStatus: '已经保存的资料会保留，不需要从头开始。',
      });
    }

    if (error.code === 'AI_TIMEOUT' || error.code === 'AI_SAFETY_BLOCKED') {
      return buildUserFacingCopy({
        whatHappened: error.message,
        nextStep: '稍后重试，或换一种更具体的提问方式。',
        dataStatus: '你当前页面里的内容不会丢失。',
      });
    }

    return buildUserFacingCopy({
      whatHappened: error.message || fallback.whatHappened,
      nextStep: fallback.nextStep,
      dataStatus: fallback.dataStatus,
    });
  }

  return buildUserFacingCopy(fallback);
}
