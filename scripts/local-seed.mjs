import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { ROOT_DIR } from './lib/project.mjs';

const requireFromApi = createRequire(resolve(ROOT_DIR, 'apps/api/package.json'));
const { PrismaClient } = requireFromApi('@prisma/client');

const prisma = new PrismaClient();

const FOOD_LIBRARY_ITEMS = [
  { code: 'tea-egg', name: '茶叶蛋', aliases: ['卤蛋', '茶蛋'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 80, proteinG: 7, carbG: 1, fatG: 5 },
  { code: 'boiled-egg', name: '白煮蛋', aliases: ['水煮蛋', '鸡蛋'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 78, proteinG: 7, carbG: 1, fatG: 5 },
  { code: 'soy-milk', name: '豆浆', aliases: ['无糖豆浆', '热豆浆'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 110, proteinG: 8, carbG: 8, fatG: 5 },
  { code: 'milk-oatmeal', name: '牛奶燕麦杯', aliases: ['燕麦牛奶', '牛奶燕麦'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast'], calories: 260, proteinG: 12, carbG: 33, fatG: 8 },
  { code: 'oatmeal-yogurt-bowl', name: '燕麦酸奶碗', aliases: ['酸奶燕麦', '酸奶燕麦碗', '燕麦碗'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 420, proteinG: 24, carbG: 48, fatG: 10 },
  { code: 'peanut-butter-toast', name: '花生酱吐司', aliases: ['全麦花生酱吐司', '吐司花生酱'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast'], calories: 320, proteinG: 12, carbG: 34, fatG: 15 },
  { code: 'whole-wheat-sandwich', name: '全麦三明治', aliases: ['鸡蛋三明治', '全麦吐司三明治'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast', 'dinner'], calories: 460, proteinG: 22, carbG: 46, fatG: 14 },
  { code: 'chicken-sandwich', name: '鸡肉三明治', aliases: ['鸡胸肉三明治', '鸡肉吐司'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast', 'lunch'], calories: 390, proteinG: 26, carbG: 35, fatG: 12 },
  { code: 'tuna-sandwich', name: '金枪鱼三明治', aliases: ['金枪鱼吐司', '吞拿鱼三明治'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast', 'lunch'], calories: 410, proteinG: 24, carbG: 34, fatG: 15 },
  { code: 'egg-sandwich', name: '鸡蛋三明治', aliases: ['蛋三明治', '鸡蛋吐司'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 340, proteinG: 16, carbG: 33, fatG: 14 },
  { code: 'egg-wrap', name: '鸡蛋卷饼', aliases: ['鸡蛋饼', '蛋饼'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 360, proteinG: 16, carbG: 38, fatG: 15 },
  { code: 'scallion-pancake-egg', name: '手抓饼加蛋', aliases: ['鸡蛋手抓饼', '葱香手抓饼'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 430, proteinG: 14, carbG: 42, fatG: 22 },
  { code: 'whole-wheat-bread-milk', name: '全麦面包配牛奶', aliases: ['全麦面包牛奶', '全麦早餐'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 300, proteinG: 15, carbG: 38, fatG: 9 },
  { code: 'yogurt-fruit-cup', name: '酸奶水果杯', aliases: ['水果酸奶杯', '酸奶水果'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 240, proteinG: 11, carbG: 30, fatG: 8 },
  { code: 'banana-oat-cup', name: '香蕉燕麦杯', aliases: ['香蕉燕麦', '香蕉麦片杯'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast'], calories: 280, proteinG: 9, carbG: 44, fatG: 7 },
  { code: 'millet-porridge', name: '小米粥', aliases: ['小米稀饭', '小米早餐粥'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 180, proteinG: 5, carbG: 34, fatG: 2 },
  { code: 'pumpkin-porridge', name: '南瓜粥', aliases: ['南瓜小米粥', '南瓜稀饭'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 170, proteinG: 4, carbG: 33, fatG: 2 },
  { code: 'plain-congee', name: '白粥', aliases: ['稀饭', '清粥'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 120, proteinG: 3, carbG: 26, fatG: 1 },
  { code: 'corn-cup', name: '玉米杯', aliases: ['甜玉米', '玉米粒杯'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 160, proteinG: 5, carbG: 31, fatG: 2 },
  { code: 'sweet-potato', name: '烤红薯', aliases: ['红薯', '蒸红薯'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 180, proteinG: 3, carbG: 40, fatG: 0 },
  { code: 'purple-sweet-potato', name: '紫薯', aliases: ['蒸紫薯', '烤紫薯'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 170, proteinG: 3, carbG: 38, fatG: 0 },
  { code: 'chicken-breast-wrap', name: '鸡胸肉卷', aliases: ['鸡肉卷', '鸡胸卷饼'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast', 'lunch'], calories: 360, proteinG: 28, carbG: 31, fatG: 11 },
  { code: 'beef-roll', name: '牛肉卷饼', aliases: ['牛肉卷', '牛肉饼卷'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast', 'lunch'], calories: 420, proteinG: 24, carbG: 36, fatG: 18 },
  { code: 'veggie-bun', name: '素包子', aliases: ['青菜包', '菜包'], sceneTags: ['canteen'], suggestedMealTypes: ['breakfast'], calories: 210, proteinG: 7, carbG: 34, fatG: 5 },
  { code: 'chicken-bun', name: '鸡肉包', aliases: ['鸡肉包子', '鸡丁包'], sceneTags: ['canteen'], suggestedMealTypes: ['breakfast'], calories: 240, proteinG: 12, carbG: 31, fatG: 7 },
  { code: 'steamed-dumplings', name: '蒸饺', aliases: ['饺子', '早餐蒸饺'], sceneTags: ['canteen'], suggestedMealTypes: ['breakfast', 'dinner'], calories: 340, proteinG: 13, carbG: 45, fatG: 12 },
  { code: 'black-sesame-bun', name: '黑芝麻包', aliases: ['芝麻包', '黑芝麻馒头'], sceneTags: ['canteen'], suggestedMealTypes: ['breakfast'], calories: 230, proteinG: 6, carbG: 39, fatG: 6 },
  { code: 'chicken-omelet', name: '鸡肉蛋饼', aliases: ['鸡蛋鸡肉饼', '鸡肉煎蛋饼'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast'], calories: 350, proteinG: 27, carbG: 16, fatG: 18 },
  { code: 'protein-yogurt-cup', name: '高蛋白酸奶杯', aliases: ['蛋白酸奶', '希腊酸奶杯'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast'], calories: 230, proteinG: 18, carbG: 20, fatG: 6 },
  { code: 'cereal-milk-bowl', name: '谷物牛奶碗', aliases: ['早餐谷物碗', '麦片牛奶碗'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast'], calories: 300, proteinG: 10, carbG: 42, fatG: 9 },
  { code: 'tuna-egg-toast', name: '金枪鱼鸡蛋吐司', aliases: ['吞拿鱼鸡蛋吐司', '金枪鱼吐司'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast'], calories: 360, proteinG: 23, carbG: 32, fatG: 14 },

  { code: 'fried-rice', name: '蛋炒饭', aliases: ['炒饭', '扬州炒饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 680, proteinG: 18, carbG: 92, fatG: 24 },
  { code: 'yangzhou-fried-rice', name: '扬州炒饭', aliases: ['什锦炒饭', '火腿蛋炒饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 720, proteinG: 20, carbG: 96, fatG: 26 },
  { code: 'beef-fried-rice', name: '牛肉炒饭', aliases: ['牛肉蛋炒饭', '牛肉饭炒饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 760, proteinG: 28, carbG: 92, fatG: 30 },
  { code: 'chicken-cutlet-rice', name: '鸡排饭', aliases: ['炸鸡排饭', '黑椒鸡排饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 780, proteinG: 30, carbG: 88, fatG: 32 },
  { code: 'chicken-leg-rice', name: '鸡腿饭', aliases: ['照烧鸡腿饭', '鸡腿盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 730, proteinG: 29, carbG: 84, fatG: 28 },
  { code: 'black-pepper-chicken-rice', name: '黑椒鸡腿饭', aliases: ['黑椒鸡排饭', '黑椒鸡肉饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 710, proteinG: 31, carbG: 78, fatG: 27 },
  { code: 'teriyaki-chicken-rice', name: '照烧鸡肉饭', aliases: ['照烧鸡腿饭', '照烧鸡胸饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 690, proteinG: 33, carbG: 76, fatG: 22 },
  { code: 'braised-chicken-rice', name: '黄焖鸡米饭', aliases: ['黄焖鸡饭', '黄焖鸡'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 760, proteinG: 32, carbG: 88, fatG: 28 },
  { code: 'curry-chicken-rice', name: '咖喱鸡肉饭', aliases: ['咖喱鸡饭', '咖喱鸡盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 740, proteinG: 29, carbG: 90, fatG: 25 },
  { code: 'kung-pao-chicken-rice', name: '宫保鸡丁饭', aliases: ['宫保鸡肉饭', '宫保鸡丁盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 700, proteinG: 28, carbG: 82, fatG: 24 },
  { code: 'green-pepper-beef-rice', name: '青椒牛肉饭', aliases: ['青椒牛肉盖饭', '牛肉青椒饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 720, proteinG: 31, carbG: 79, fatG: 26 },
  { code: 'tomato-beef-rice', name: '番茄牛肉饭', aliases: ['西红柿牛肉饭', '牛肉盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 710, proteinG: 30, carbG: 82, fatG: 24 },
  { code: 'beef-bowl', name: '牛肉盖饭', aliases: ['肥牛饭', '牛肉饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 740, proteinG: 30, carbG: 86, fatG: 27 },
  { code: 'braised-beef-rice', name: '红烧牛肉饭', aliases: ['牛腩饭', '红烧牛肉盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 760, proteinG: 31, carbG: 88, fatG: 28 },
  { code: 'braised-pork-rice', name: '卤肉饭', aliases: ['台式卤肉饭', '肉燥饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 790, proteinG: 22, carbG: 92, fatG: 35 },
  { code: 'duck-leg-rice', name: '鸭腿饭', aliases: ['卤鸭腿饭', '鸭肉饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 760, proteinG: 27, carbG: 84, fatG: 32 },
  { code: 'mapo-tofu-rice', name: '麻婆豆腐饭', aliases: ['豆腐盖饭', '麻婆豆腐盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 650, proteinG: 19, carbG: 78, fatG: 24 },
  { code: 'tomato-egg-rice', name: '番茄炒蛋盖饭', aliases: ['西红柿炒蛋盖饭', '番茄炒蛋饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 620, proteinG: 18, carbG: 82, fatG: 20 },
  { code: 'shredded-potato-beef-rice', name: '土豆牛肉饭', aliases: ['土豆烧牛肉饭', '牛肉土豆盖饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 730, proteinG: 29, carbG: 84, fatG: 26 },
  { code: 'mushroom-chicken-rice', name: '香菇滑鸡饭', aliases: ['香菇鸡肉饭', '香菇鸡丁饭'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 700, proteinG: 30, carbG: 79, fatG: 23 },
  { code: 'beef-noodle-soup', name: '牛肉面', aliases: ['红烧牛肉面', '牛肉汤面'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 620, proteinG: 28, carbG: 78, fatG: 18 },
  { code: 'tomato-egg-noodles', name: '番茄鸡蛋面', aliases: ['西红柿鸡蛋面', '鸡蛋面'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['breakfast', 'dinner'], calories: 540, proteinG: 20, carbG: 78, fatG: 16 },
  { code: 'chicken-sliced-noodles', name: '鸡片刀削面', aliases: ['鸡肉面', '鸡片面'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 600, proteinG: 27, carbG: 80, fatG: 16 },
  { code: 'wonton-noodle-soup', name: '馄饨面', aliases: ['云吞面', '鲜肉馄饨面'], sceneTags: ['canteen'], suggestedMealTypes: ['breakfast', 'dinner'], calories: 560, proteinG: 22, carbG: 70, fatG: 18 },
  { code: 'shredded-chicken-cold-noodles', name: '鸡丝凉面', aliases: ['凉面', '麻酱鸡丝凉面'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 580, proteinG: 24, carbG: 76, fatG: 18 },
  { code: 'beef-udon', name: '牛肉乌冬面', aliases: ['乌冬面', '牛肉乌冬'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 640, proteinG: 26, carbG: 82, fatG: 20 },
  { code: 'chicken-rice-noodle-soup', name: '鸡肉米线', aliases: ['鸡丝米线', '鸡汤米线'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 570, proteinG: 24, carbG: 72, fatG: 17 },
  { code: 'beef-rice-noodle-soup', name: '牛肉米线', aliases: ['牛肉粉', '牛肉米粉'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 610, proteinG: 27, carbG: 75, fatG: 19 },
  { code: 'chicken-dumplings', name: '鸡肉水饺', aliases: ['鸡肉饺子', '饺子'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 520, proteinG: 22, carbG: 58, fatG: 18 },
  { code: 'beef-dumplings', name: '牛肉水饺', aliases: ['牛肉饺子', '饺子'], sceneTags: ['canteen'], suggestedMealTypes: ['lunch', 'dinner'], calories: 560, proteinG: 24, carbG: 60, fatG: 20 },

  { code: 'egg-noodles', name: '鸡蛋面', aliases: ['家常鸡蛋面', '番茄鸡蛋面'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast', 'dinner'], calories: 540, proteinG: 20, carbG: 78, fatG: 16 },
  { code: 'chicken-rice-bowl', name: '鸡胸肉盖饭', aliases: ['鸡胸肉饭', '鸡胸饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 610, proteinG: 40, carbG: 66, fatG: 14 },
  { code: 'tomato-beef-pasta', name: '番茄牛肉意面', aliases: ['牛肉意面', '番茄意面'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 650, proteinG: 30, carbG: 82, fatG: 18 },
  { code: 'tomato-egg-pasta', name: '番茄炒蛋意面', aliases: ['西红柿炒蛋意面', '番茄蛋意面'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 590, proteinG: 20, carbG: 83, fatG: 17 },
  { code: 'tuna-pasta', name: '金枪鱼意面', aliases: ['吞拿鱼意面', '金枪鱼通心粉'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 610, proteinG: 28, carbG: 76, fatG: 18 },
  { code: 'shrimp-pasta', name: '虾仁意面', aliases: ['鲜虾意面', '虾仁通心粉'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 620, proteinG: 29, carbG: 78, fatG: 17 },
  { code: 'chicken-salad', name: '鸡肉沙拉', aliases: ['鸡胸肉沙拉', '轻食沙拉'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 430, proteinG: 35, carbG: 18, fatG: 20 },
  { code: 'beef-salad', name: '牛肉沙拉', aliases: ['轻食牛肉沙拉', '牛排沙拉'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 470, proteinG: 33, carbG: 22, fatG: 23 },
  { code: 'tofu-salad-bowl', name: '豆腐沙拉碗', aliases: ['豆腐轻食碗', '豆腐沙拉'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 390, proteinG: 20, carbG: 24, fatG: 18 },
  { code: 'chicken-wrap', name: '鸡肉卷', aliases: ['鸡肉卷饼', '鸡胸肉卷'], sceneTags: ['canteen', 'cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 450, proteinG: 28, carbG: 38, fatG: 16 },
  { code: 'tuna-wrap', name: '金枪鱼卷', aliases: ['吞拿鱼卷', '金枪鱼卷饼'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 440, proteinG: 24, carbG: 36, fatG: 17 },
  { code: 'shrimp-rice-bowl', name: '虾仁盖饭', aliases: ['虾仁饭', '虾仁滑蛋饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 560, proteinG: 29, carbG: 66, fatG: 14 },
  { code: 'chicken-broccoli-rice', name: '西兰花鸡胸肉饭', aliases: ['鸡胸西兰花饭', '鸡胸肉饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 520, proteinG: 38, carbG: 50, fatG: 12 },
  { code: 'beef-potato-rice', name: '土豆牛肉饭', aliases: ['牛肉土豆饭', '牛肉盖饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 630, proteinG: 31, carbG: 70, fatG: 18 },
  { code: 'tomato-scrambled-egg-rice', name: '番茄炒蛋饭', aliases: ['西红柿炒蛋饭', '番茄鸡蛋饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 500, proteinG: 18, carbG: 70, fatG: 15 },
  { code: 'curry-beef-rice', name: '咖喱牛肉饭', aliases: ['牛肉咖喱饭', '咖喱牛肉盖饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 660, proteinG: 30, carbG: 74, fatG: 22 },
  { code: 'tofu-mushroom-rice', name: '蘑菇豆腐饭', aliases: ['豆腐蘑菇盖饭', '豆腐盖饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 470, proteinG: 18, carbG: 63, fatG: 15 },
  { code: 'soba-chicken-bowl', name: '荞麦鸡肉碗', aliases: ['鸡肉荞麦面碗', '荞麦鸡胸碗'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 520, proteinG: 30, carbG: 58, fatG: 14 },
  { code: 'chicken-quinoa-bowl', name: '鸡肉藜麦碗', aliases: ['鸡胸藜麦碗', '藜麦鸡肉饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 500, proteinG: 32, carbG: 48, fatG: 14 },
  { code: 'tuna-egg-sandwich', name: '金枪鱼鸡蛋三明治', aliases: ['吞拿鱼鸡蛋三明治', '金枪鱼蛋三明治'], sceneTags: ['cookable'], suggestedMealTypes: ['breakfast', 'lunch'], calories: 370, proteinG: 24, carbG: 30, fatG: 14 },
  { code: 'chicken-soup-noodles', name: '鸡汤面', aliases: ['鸡汤挂面', '鸡肉面'], sceneTags: ['cookable'], suggestedMealTypes: ['dinner'], calories: 510, proteinG: 23, carbG: 70, fatG: 14 },
  { code: 'vegetable-chicken-soup-noodles', name: '蔬菜鸡肉汤面', aliases: ['鸡丝蔬菜面', '鸡汤蔬菜面'], sceneTags: ['cookable'], suggestedMealTypes: ['dinner'], calories: 520, proteinG: 25, carbG: 68, fatG: 15 },
  { code: 'beef-pancake-roll', name: '牛肉卷饼', aliases: ['牛肉饼卷', '牛肉卷'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 490, proteinG: 24, carbG: 44, fatG: 19 },
  { code: 'chicken-omelet-rice', name: '鸡肉蛋包饭', aliases: ['鸡肉欧姆蛋饭', '鸡蛋鸡肉饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 610, proteinG: 29, carbG: 72, fatG: 19 },
  { code: 'shrimp-egg-rice', name: '虾仁滑蛋饭', aliases: ['虾仁鸡蛋饭', '虾仁饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 560, proteinG: 28, carbG: 63, fatG: 16 },
  { code: 'salmon-rice-bowl', name: '三文鱼饭', aliases: ['三文鱼盖饭', '三文鱼拌饭'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 620, proteinG: 30, carbG: 58, fatG: 24 },
  { code: 'chicken-burrito-bowl', name: '鸡肉能量碗', aliases: ['鸡肉卷碗', '鸡肉饭碗'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 580, proteinG: 31, carbG: 62, fatG: 18 },
  { code: 'corn-chicken-salad', name: '玉米鸡肉沙拉', aliases: ['鸡肉玉米沙拉', '鸡胸肉沙拉'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 420, proteinG: 30, carbG: 22, fatG: 16 },
  { code: 'tomato-beef-udon', name: '番茄牛肉乌冬面', aliases: ['牛肉乌冬', '番茄牛肉面'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 640, proteinG: 28, carbG: 80, fatG: 18 },
  { code: 'chicken-mushroom-pasta', name: '蘑菇鸡肉意面', aliases: ['鸡肉蘑菇意面', '鸡胸意面'], sceneTags: ['cookable'], suggestedMealTypes: ['lunch', 'dinner'], calories: 630, proteinG: 31, carbG: 78, fatG: 18 },
];

async function main() {
  await prisma.foodLibraryItem.deleteMany({
    where: {
      code: {
        notIn: FOOD_LIBRARY_ITEMS.map((item) => item.code),
      },
    },
  });

  for (const [index, item] of FOOD_LIBRARY_ITEMS.entries()) {
    await prisma.foodLibraryItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        aliases: item.aliases,
        sceneTags: item.sceneTags,
        suggestedMealTypes: item.suggestedMealTypes,
        calories: item.calories,
        proteinG: item.proteinG,
        carbG: item.carbG,
        fatG: item.fatG,
        status: 'active',
        sortOrder: index + 1,
      },
      create: {
        code: item.code,
        name: item.name,
        aliases: item.aliases,
        sceneTags: item.sceneTags,
        suggestedMealTypes: item.suggestedMealTypes,
        calories: item.calories,
        proteinG: item.proteinG,
        carbG: item.carbG,
        fatG: item.fatG,
        status: 'active',
        sortOrder: index + 1,
      },
    });
  }

  console.log(`[CampusFit DB] Food library seed completed: ${FOOD_LIBRARY_ITEMS.length} items.`);
}

main()
  .catch((error) => {
    console.error('[CampusFit DB] Food library seed failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
