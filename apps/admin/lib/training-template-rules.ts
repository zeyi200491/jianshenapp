import type { MovementPattern, RestRuleSource, TrainingItem } from "@/lib/contracts";

const compoundKeywords = ["卧推", "深蹲", "硬拉", "引体", "下拉", "划船", "肩推", "推举", "腿举", "弓步", "臂屈伸"];
const isolationKeywords = ["飞鸟", "弯举", "下压", "侧平举", "面拉", "腿弯举", "腿屈伸", "提踵"];
const recoveryKeywords = ["快走", "骑行", "拉伸", "恢复"];

export function detectMovementPattern(exerciseCode: string, exerciseName: string): MovementPattern {
  const normalized = `${exerciseCode} ${exerciseName}`.toLowerCase();

  if (recoveryKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return "recovery";
  }

  if (compoundKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return "compound";
  }

  if (isolationKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return "isolation";
  }

  return "isolation";
}

export function getDefaultRestSeconds(movementPattern: MovementPattern) {
  if (movementPattern === "compound") {
    return 210;
  }

  if (movementPattern === "recovery") {
    return 0;
  }

  return 150;
}

export function getRestHint(movementPattern: MovementPattern, restRuleSource: RestRuleSource) {
  if (movementPattern === "recovery") {
    return "恢复活动无需组间休息，保持轻松节奏即可。";
  }

  if (movementPattern === "compound") {
    return restRuleSource === "manual" ? "复合动作，休息时间已手动覆盖。" : "主项动作，建议更长恢复。";
  }

  return restRuleSource === "manual" ? "孤立动作，休息时间已手动覆盖。" : "辅助动作，恢复时间较短。";
}

export function applyTrainingItemRule(item: TrainingItem): TrainingItem {
  const movementPattern = item.movementPattern ?? detectMovementPattern(item.exerciseCode, item.exerciseName);
  const restRuleSource = item.restRuleSource ?? "system";
  const restSeconds = restRuleSource === "manual" ? item.restSeconds : getDefaultRestSeconds(movementPattern);

  return {
    ...item,
    movementPattern,
    restRuleSource,
    restSeconds,
    restHint: getRestHint(movementPattern, restRuleSource),
  };
}
