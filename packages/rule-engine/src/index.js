"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNutritionTargets = calculateNutritionTargets;
exports.buildInitialProfileSummary = buildInitialProfileSummary;
exports.generateDietPlan = generateDietPlan;
exports.generateTrainingPlan = generateTrainingPlan;
exports.generateWeeklyReview = generateWeeklyReview;
const ACTIVITY_FACTORS = {
    low: 1.2,
    light: 1.35,
    moderate: 1.5,
    high: 1.65,
    athlete: 1.8,
};
const TARGET_ADJUSTMENTS = {
    cut: -450,
    maintain: 0,
    bulk: 300,
};
const PROTEIN_FACTORS = {
    cut: 2,
    maintain: 1.8,
    bulk: 1.9,
};
const FAT_FACTORS = {
    cut: 0.8,
    maintain: 0.85,
    bulk: 0.9,
};
const MEAL_SPLITS = [
    { mealType: 'breakfast', ratio: 0.25 },
    { mealType: 'lunch', ratio: 0.35 },
    { mealType: 'dinner', ratio: 0.3 },
    { mealType: 'snack', ratio: 0.1 },
];
function roundToNearest(value, base) {
    return Math.round(value / base) * base;
}
function getAge(referenceDate, birthYear) {
    return Math.max(referenceDate.getUTCFullYear() - birthYear, 16);
}
function getTrainingWeekdays(days) {
    const normalized = Math.max(0, Math.min(days, 7));
    const presets = {
        0: [],
        1: [3],
        2: [2, 5],
        3: [1, 3, 5],
        4: [1, 2, 4, 6],
        5: [1, 2, 3, 5, 6],
        6: [1, 2, 3, 4, 5, 6],
        7: [0, 1, 2, 3, 4, 5, 6],
    };
    return presets[normalized];
}
function getWeekday(date) {
    return date.getUTCDay();
}
function countTrainingSlotsBeforeDate(days, date) {
    const weekdays = getTrainingWeekdays(days);
    const currentWeekday = getWeekday(date);
    return weekdays.filter((weekday) => weekday <= currentWeekday).length;
}
function buildMealSuggestion(scene, mealType, targetType) {
    const templates = {
        canteen: {
            breakfast: {
                title: '早餐补蛋白',
                suggestion: targetType === 'cut' ? '优先选择鸡蛋、无糖豆浆和全麦主食，避免油炸早点。' : '选择鸡蛋、牛奶和主食组合，保证上午能量。',
                alternatives: ['茶叶蛋 + 燕麦杯', '鸡蛋饼 + 无糖酸奶'],
            },
            lunch: {
                title: '食堂正餐',
                suggestion: '一份高蛋白菜品 + 两份蔬菜 + 一份主食，优先蒸煮炖菜。',
                alternatives: ['鸡腿去皮 + 西兰花 + 米饭', '番茄牛肉 + 青菜 + 玉米'],
            },
            dinner: {
                title: '晚餐控油',
                suggestion: '延续高蛋白和蔬菜优先，晚餐主食可按训练量灵活加减。',
                alternatives: ['清蒸鱼 + 青菜 + 半份米饭', '瘦牛肉 + 时蔬 + 红薯'],
            },
            snack: {
                title: '加餐兜底',
                suggestion: '训练前后可用便利店高蛋白加餐补齐营养目标。',
                alternatives: ['无糖酸奶 + 香蕉', '蛋白牛奶 + 全麦面包'],
            },
        },
        dorm: {
            breakfast: {
                title: '宿舍速配早餐',
                suggestion: '用即食燕麦、牛奶和鸡蛋完成低门槛早餐。',
                alternatives: ['燕麦 + 奶粉 + 坚果', '全麦面包 + 鸡蛋 + 牛奶'],
            },
            lunch: {
                title: '外卖主餐',
                suggestion: '优先点轻食饭盒或双拼套餐，备注少油少酱。',
                alternatives: ['鸡胸肉饭盒', '牛肉时蔬沙拉配玉米'],
            },
            dinner: {
                title: '宿舍晚餐',
                suggestion: '控制油脂和夜宵冲动，尽量保持固定晚餐时间。',
                alternatives: ['金枪鱼全麦三明治', '即食鸡胸肉 + 玉米 + 水果'],
            },
            snack: {
                title: '便携加餐',
                suggestion: '优先低糖高蛋白零食，避免奶茶和高糖饼干。',
                alternatives: ['蛋白棒', '希腊酸奶'],
            },
        },
        home: {
            breakfast: {
                title: '家庭早餐',
                suggestion: '蛋白质、主食和蔬果同时到位，降低上午饥饿。',
                alternatives: ['鸡蛋 + 全麦吐司 + 苹果', '牛奶燕麦粥 + 鸡蛋'],
            },
            lunch: {
                title: '家庭午餐',
                suggestion: '采用半盘蔬菜、四分之一主食、四分之一蛋白质的配比。',
                alternatives: ['清炒虾仁 + 米饭 + 青菜', '鸡胸肉 + 南瓜 + 菠菜'],
            },
            dinner: {
                title: '家庭晚餐',
                suggestion: '晚餐以清淡烹饪为主，训练后适度补碳。',
                alternatives: ['番茄牛腩 + 米饭 + 生菜', '蒸鱼 + 紫薯 + 蔬菜'],
            },
            snack: {
                title: '家庭加餐',
                suggestion: '把水果和乳制品作为优先选项，补足蛋白与微量营养。',
                alternatives: ['酸奶 + 蓝莓', '牛奶 + 香蕉'],
            },
        },
    };
    const item = templates[scene][mealType];
    return {
        title: item.title,
        suggestionText: item.suggestion,
        alternatives: item.alternatives,
    };
}
function buildSupplementNotes(profile) {
    if (!profile.supplementOptIn) {
        return [];
    }
    const notes = ['乳清蛋白可作为蛋白补足工具，不替代正餐。'];
    if (profile.trainingDaysPerWeek >= 3) {
        notes.push('肌酸可作为力量训练阶段的基础补剂，每天固定摄入更稳定。');
    }
    if (profile.targetType === 'cut') {
        notes.push('减脂期优先保证总热量赤字，补剂只做执行辅助。');
    }
    return notes;
}
function buildRestPlan() {
    return {
        splitType: 'rest',
        title: '休息 / 轻活动日',
        durationMinutes: 20,
        intensityLevel: 'low',
        notes: '今天不安排正式力量训练，重点做轻活动、步行与拉伸恢复。',
        items: [
            {
                exerciseCode: 'walk',
                exerciseName: '快走或轻松骑行',
                sets: 1,
                reps: '20-30 分钟',
                restSeconds: 0,
                notes: '以能正常说话的强度进行，促进恢复。',
                displayOrder: 1,
            },
            {
                exerciseCode: 'mobility',
                exerciseName: '全身拉伸',
                sets: 1,
                reps: '8-10 分钟',
                restSeconds: 0,
                notes: '放松胸椎、髋部和腿后侧，缓解久坐僵硬。',
                displayOrder: 2,
            },
        ],
    };
}
function buildBeginnerTemplate(slotIndex) {
    const isTemplateA = slotIndex % 2 === 1;
    const items = isTemplateA
        ? [
            ['goblet_squat', '高杯深蹲', 3, '10-12 次', 75, '保持核心收紧，下降时膝盖朝脚尖方向。'],
            ['push_up', '俯卧撑', 3, '8-12 次', 60, '做不了标准版时可以抬高支撑面。'],
            ['dumbbell_row', '哑铃划船', 3, '10-12 次', 60, '先稳定躯干，再发力拉肘。'],
            ['romanian_deadlift', '罗马尼亚硬拉', 3, '10 次', 75, '以髋主导发力，背部保持平直。'],
            ['plank', '平板支撑', 3, '30-45 秒', 45, '避免塌腰，保持呼吸。'],
        ]
        : [
            ['split_squat', '分腿蹲', 3, '10 次/侧', 75, '控制重心，下降速度放慢。'],
            ['incline_press', '上斜哑铃卧推', 3, '10-12 次', 60, '肩胛后缩下沉，避免耸肩。'],
            ['lat_pulldown', '高位下拉', 3, '10-12 次', 60, '下拉至锁骨附近，避免借力。'],
            ['hip_thrust', '臀桥', 3, '12 次', 60, '顶峰停顿 1 秒，感受臀部发力。'],
            ['dead_bug', '死虫', 3, '10 次/侧', 45, '骨盆保持稳定，动作缓慢。'],
        ];
    return {
        splitType: 'full_body',
        title: isTemplateA ? '全身训练 A' : '全身训练 B',
        durationMinutes: 50,
        intensityLevel: 'medium',
        notes: '新手阶段优先建立动作模式和稳定训练频率，每组保留 2-3 次余力。',
        items: items.map((item, index) => ({
            exerciseCode: item[0],
            exerciseName: item[1],
            sets: item[2],
            reps: item[3],
            restSeconds: item[4],
            notes: item[5],
            displayOrder: index + 1,
        })),
    };
}
function buildIntermediateTemplate(days, slotIndex) {
    const cycleIndex = (slotIndex - 1) % (days >= 5 ? 3 : 2);
    if (days >= 5) {
        const templates = [
            {
                title: 'Push 日',
                notes: '以推类动作为主，控制卧推和肩推总量。',
                items: [
                    ['bench_press', '杠铃卧推', 4, '6-8 次', 120, '肩胛收紧，杠铃下放至胸部中下段。'],
                    ['incline_dumbbell_press', '上斜哑铃卧推', 3, '8-10 次', 90, '保持肘部略低于肩线。'],
                    ['seated_shoulder_press', '坐姿肩推', 3, '8-10 次', 90, '避免腰部过度后仰。'],
                    ['cable_fly', '绳索夹胸', 3, '12-15 次', 60, '感受胸部收缩，不追求大重量。'],
                    ['triceps_pushdown', '下压', 3, '12-15 次', 60, '固定上臂，专注肘关节伸展。'],
                ],
            },
            {
                title: 'Pull 日',
                notes: '以拉类动作为主和后链为主，先做大肌群再做孤立。',
                items: [
                    ['deadlift', '硬拉', 4, '4-6 次', 150, '保持背部中立，起杆时腿和髋同时发力。'],
                    ['pull_up', '引体向上', 4, '6-10 次', 90, '无法完成时可使用辅助弹力带。'],
                    ['barbell_row', '杠铃划船', 3, '8-10 次', 90, '躯干角度固定，避免耸肩。'],
                    ['face_pull', '面拉', 3, '12-15 次', 60, '拉向额头，强化后束和肩胛控制。'],
                    ['biceps_curl', '哑铃弯举', 3, '10-12 次', 60, '不要前后摆动借力。'],
                ],
            },
            {
                title: 'Leg 日',
                notes: '下肢日优先做深蹲或腿举，保证动作深度和稳定。',
                items: [
                    ['back_squat', '杠铃深蹲', 4, '6-8 次', 150, '下降过程控制膝盖轨迹，保持核心稳定。'],
                    ['romanian_deadlift', '罗马尼亚硬拉', 3, '8-10 次', 90, '感受腿后侧拉伸。'],
                    ['leg_press', '腿举', 3, '10-12 次', 90, '注意下背部贴紧靠垫。'],
                    ['walking_lunge', '行进弓步', 3, '10 步/侧', 75, '保持步幅稳定。'],
                    ['calf_raise', '提踵', 4, '12-15 次', 45, '顶峰停顿 1 秒。'],
                ],
            },
        ];
        const template = templates[cycleIndex];
        return {
            splitType: 'push_pull_legs',
            title: template.title,
            durationMinutes: 70,
            intensityLevel: 'high',
            notes: template.notes,
            items: template.items.map((item, index) => ({
                exerciseCode: item[0],
                exerciseName: item[1],
                sets: item[2],
                reps: item[3],
                restSeconds: item[4],
                notes: item[5],
                displayOrder: index + 1,
            })),
        };
    }
    const templates = [
        {
            title: '上肢训练',
            notes: '上肢日兼顾水平推拉和垂直推拉，训练后注意肩袖放松。',
            items: [
                ['bench_press', '杠铃卧推', 4, '6-8 次', 120, '卧推动作保持下背稳定。'],
                ['one_arm_row', '单臂划船', 4, '8-10 次', 75, '拉起时肘部靠近身体。'],
                ['shoulder_press', '哑铃肩推', 3, '8-10 次', 90, '不要用腰部顶重量。'],
                ['lat_pulldown', '高位下拉', 3, '10-12 次', 75, '离心阶段放慢。'],
                ['lateral_raise', '侧平举', 3, '12-15 次', 45, '重量轻一些，专注肩中束发力。'],
            ],
        },
        {
            title: '下肢训练',
            notes: '下肢日优先深蹲模式和髋主导动作，最后补核心。',
            items: [
                ['back_squat', '杠铃深蹲', 4, '6-8 次', 150, '每组前先固定脚掌受力。'],
                ['romanian_deadlift', '罗马尼亚硬拉', 4, '8 次', 120, '收紧腘绳肌和臀部。'],
                ['leg_curl', '腿弯举', 3, '10-12 次', 60, '离心慢放，感受腿后侧。'],
                ['bulgarian_split_squat', '保加利亚分腿蹲', 3, '8-10 次/侧', 75, '注意躯干稳定。'],
                ['hanging_knee_raise', '悬垂举腿', 3, '12 次', 45, '避免借惯性甩腿。'],
            ],
        },
    ];
    const template = templates[cycleIndex];
    return {
        splitType: 'upper_lower',
        title: template.title,
        durationMinutes: 65,
        intensityLevel: 'medium',
        notes: template.notes,
        items: template.items.map((item, index) => ({
            exerciseCode: item[0],
            exerciseName: item[1],
            sets: item[2],
            reps: item[3],
            restSeconds: item[4],
            notes: item[5],
            displayOrder: index + 1,
        })),
    };
}
function calculateNutritionTargets(profile, date = new Date()) {
    const age = getAge(date, profile.birthYear);
    const genderAdjustment = profile.gender === 'male' ? 5 : profile.gender === 'female' ? -161 : -78;
    const bmr = 10 * profile.currentWeightKg + 6.25 * profile.heightCm - 5 * age + genderAdjustment;
    const maintenanceCalories = roundToNearest(bmr * ACTIVITY_FACTORS[profile.activityLevel], 50);
    const calorieTarget = roundToNearest(maintenanceCalories + TARGET_ADJUSTMENTS[profile.targetType], 50);
    const proteinTargetG = Math.round(profile.currentWeightKg * PROTEIN_FACTORS[profile.targetType]);
    const fatTargetG = Math.round(profile.currentWeightKg * FAT_FACTORS[profile.targetType]);
    const carbTargetG = Math.max(80, Math.round((calorieTarget - proteinTargetG * 4 - fatTargetG * 9) / 4));
    return {
        calorieTarget,
        proteinTargetG,
        carbTargetG,
        fatTargetG,
        maintenanceCalories,
    };
}
function buildInitialProfileSummary(profile) {
    const nutrition = calculateNutritionTargets(profile);
    const trainingSuggestion = profile.trainingExperience === 'beginner'
        ? `建议每周训练 ${profile.trainingDaysPerWeek} 天，先以全身训练建立动作基础。`
        : profile.trainingDaysPerWeek >= 5
            ? `建议每周训练 ${profile.trainingDaysPerWeek} 天，采用推拉腿分化更容易覆盖训练量。`
            : `建议每周训练 ${profile.trainingDaysPerWeek} 天，采用上下肢分化兼顾恢复。`;
    return {
        nutrition,
        trainingSuggestion,
    };
}
function generateDietPlan(profile, nutrition) {
    const items = MEAL_SPLITS.map(({ mealType, ratio }, index) => {
        const suggestion = buildMealSuggestion(profile.dietScene, mealType, profile.targetType);
        return {
            mealType,
            title: suggestion.title,
            targetCalories: Math.round(nutrition.calorieTarget * ratio),
            proteinG: Math.max(10, Math.round(nutrition.proteinTargetG * ratio)),
            carbsG: Math.max(10, Math.round(nutrition.carbTargetG * ratio)),
            fatG: Math.max(5, Math.round(nutrition.fatTargetG * ratio)),
            suggestionText: suggestion.suggestionText,
            alternatives: suggestion.alternatives,
            displayOrder: index + 1,
        };
    });
    const sceneLabelMap = {
        canteen: '校园食堂',
        dorm: '宿舍简做',
        home: '家庭烹饪',
    };
    return {
        scene: profile.dietScene,
        summary: `${sceneLabelMap[profile.dietScene]}${profile.targetType === 'cut' ? '减脂' : profile.targetType === 'bulk' ? '增肌' : '维持'}日方案，以高蛋白、稳定执行为优先。`,
        supplementNotes: buildSupplementNotes(profile),
        items,
    };
}
function generateTrainingPlan(profile, date = new Date()) {
    const weekdays = getTrainingWeekdays(profile.trainingDaysPerWeek);
    const weekday = getWeekday(date);
    if (!weekdays.includes(weekday)) {
        return buildRestPlan();
    }
    const slotIndex = countTrainingSlotsBeforeDate(profile.trainingDaysPerWeek, date);
    return profile.trainingExperience === 'beginner'
        ? buildBeginnerTemplate(slotIndex)
        : buildIntermediateTemplate(profile.trainingDaysPerWeek, slotIndex);
}
function generateWeeklyReview(input) {
    const planDays = input.planDates.length;
    const checkedInDays = input.checkIns.length;
    const avgDietCompletionRate = checkedInDays === 0 ? 0 : Math.round(input.checkIns.reduce((sum, item) => sum + item.dietCompletionRate, 0) / checkedInDays);
    const avgTrainingCompletionRate = checkedInDays === 0 ? 0 : Math.round(input.checkIns.reduce((sum, item) => sum + item.trainingCompletionRate, 0) / checkedInDays);
    const weights = input.checkIns.map((item) => item.weightKg).filter((value) => value !== null);
    const weightChangeKg = weights.length >= 2 ? Number((weights[weights.length - 1] - weights[0]).toFixed(2)) : 0;
    const highlights = [];
    const risks = [];
    const recommendations = [];
    if (checkedInDays >= Math.max(3, Math.ceil(planDays * 0.7))) {
        highlights.push('本周打卡频率稳定，执行习惯正在形成。');
    }
    if (avgTrainingCompletionRate >= 80) {
        highlights.push('训练完成度较高，说明训练安排与当前节奏匹配。');
    }
    if (avgDietCompletionRate >= 75) {
        highlights.push('饮食执行整体在线，宏量营养目标有较好落地基础。');
    }
    const lowEnergyDays = input.checkIns.filter((item) => item.energyLevel <= 2).length;
    const highFatigueDays = input.checkIns.filter((item) => item.fatigueLevel >= 4).length;
    if (checkedInDays < Math.max(2, Math.ceil(planDays * 0.5))) {
        risks.push('本周打卡偏少，复盘信号不足，建议下周先稳定记录。');
    }
    if (lowEnergyDays >= 2) {
        risks.push('低精力反馈偏多，可能存在睡眠、恢复或热量安排不足。');
    }
    if (highFatigueDays >= 2) {
        risks.push('疲劳感偏高，下周应优先控制训练总量和恢复质量。');
    }
    if (input.targetType === 'cut' && weightChangeKg >= 0.5) {
        risks.push('减脂目标下体重没有下降趋势，需检查热量执行偏差。');
    }
    if (input.targetType === 'bulk' && weightChangeKg < 0) {
        risks.push('增肌目标下体重下降，说明摄入可能不足。');
    }
    recommendations.push(checkedInDays === 0
        ? '下周先把打卡频率提升到至少 4 天，优先获取稳定反馈数据。'
        : '下周继续保持固定训练和饮食节奏，不要频繁更改计划模板。');
    if (avgDietCompletionRate < 70) {
        recommendations.push('饮食先做一到两个关键动作，例如固定早餐蛋白和晚餐主食份量。');
    }
    if (avgTrainingCompletionRate < 70) {
        recommendations.push('训练完成度偏低时，优先缩短单次训练时长，而不是完全中断。');
    }
    if (highFatigueDays >= 2) {
        recommendations.push('增加一次主动恢复或完整休息日，观察疲劳变化。');
    }
    const narrativeText = checkedInDays === 0
        ? '本周缺少足够的执行记录，当前更重要的是先把记录习惯建立起来。'
        : `本周共完成 ${checkedInDays} 天打卡，饮食平均完成度 ${avgDietCompletionRate}%，训练平均完成度 ${avgTrainingCompletionRate}%。` +
            (risks.length > 0 ? ` 需要重点关注：${risks[0]}` : ' 整体执行节奏比较稳定，可以继续沿用当前策略。');
    return {
        planDays,
        checkedInDays,
        avgDietCompletionRate,
        avgTrainingCompletionRate,
        weightChangeKg,
        highlights,
        risks,
        recommendations,
        narrativeText,
    };
}
