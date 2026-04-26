# Target-Based Training Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 璁╄缁冪被鍨嬩弗鏍肩敱鐢ㄦ埛鐩爣鎺у埗锛屽鑲?缁存寔鍙敓鎴愬姏閲忚缁冿紝鍑忚剛鍙敓鎴愭湁姘ц鍒掋€?
**Architecture:** 瑙勫垯鏀跺彛鍒?`rule-engine`锛孉PI 鍙紶閫掑苟淇濇姢杩欐潯瑙勫垯锛屽墠绔垹闄や笌璇ヨ鍒欏啿绐佺殑浜や簰銆傚厛鍐欏け璐ユ祴璇曪紝鍐嶅仛鏈€灏忓疄鐜帮紝鏈€鍚庤窇閽堝鎬ч獙璇併€?
**Tech Stack:** TypeScript銆丣est銆丯estJS銆丯ext.js銆丳risma

---

### Task 1: 鏀跺彛璁粌鐢熸垚瑙勫垯

**Files:**
- Modify: `packages/rule-engine/src/index.ts`
- Test: `packages/rule-engine/test/index.spec.ts`

- [ ] **Step 1: 鍐欏け璐ユ祴璇?*

琛?3 涓柇瑷€锛?- `bulk` 璁粌鏃ヤ笉浼氱敓鎴?`cardio`
- `maintain` 璁粌鏃ヤ笉浼氱敓鎴?`cardio`
- `cut` 鍗充究浼犲叆 `forcedFocus` 涔熶笉浼氱敓鎴愬姏閲忚鍒?
- [ ] **Step 2: 璺戣鍒欏紩鎿庢祴璇曠‘璁ゅけ璐?*

Run: `npm.cmd test -- --runInBand`
Workdir: `E:\Ai jjfajgsw\jianshenapp\packages\rule-engine`

- [ ] **Step 3: 鏈€灏忓疄鐜?*

鍦?`generateTrainingPlan()` 涓樉寮忔寜 `targetType` 鍒嗘敮锛屽苟闄愬埗 `forcedFocus` 鍙鍔涢噺鐩爣鐢熸晥銆?
- [ ] **Step 4: 鍐嶈窇瑙勫垯寮曟搸娴嬭瘯纭閫氳繃**

Run: `npm.cmd test -- --runInBand`
Workdir: `E:\Ai jjfajgsw\jianshenapp\packages\rule-engine`

### Task 2: 淇濇姢鍑忚剛鐢ㄦ埛鐨勫姏閲忓惊鐜叆鍙?
**Files:**
- Modify: `apps/api/src/modules/profiles/profiles.service.ts`
- Create: `apps/api/src/modules/profiles/profiles.service.spec.ts`

- [ ] **Step 1: 鍐欏け璐ユ祴璇?*

鏂板鐢ㄤ緥锛歚cut` 鐢ㄦ埛璋冪敤 `resetTrainingCycle()` 鎶涘嚭涓氬姟閿欒锛沗maintain` 鐢ㄦ埛浠嶅彲姝ｅ父閲嶇疆銆?
- [ ] **Step 2: 璺戞湇鍔℃祴璇曠‘璁ゅけ璐?*

Run: `npm.cmd test -- profiles.service.spec.ts --runInBand`
Workdir: `E:\Ai jjfajgsw\jianshenapp\apps\api`

- [ ] **Step 3: 鏈€灏忓疄鐜?*

鍦?`ProfilesService.resetTrainingCycle()` 璇诲彇鐢ㄦ埛妗ｆ鍚庯紝鑻?`targetType === 'cut'` 鐩存帴鎶涢敊銆?
- [ ] **Step 4: 鍐嶈窇鏈嶅姟娴嬭瘯纭閫氳繃**

Run: `npm.cmd test -- profiles.service.spec.ts --runInBand`
Workdir: `E:\Ai jjfajgsw\jianshenapp\apps\api`

### Task 3: 鏀舵帀浠婂ぉ椤典笌鐩爣鍐茬獊鐨勫叆鍙?
**Files:**
- Modify: `apps/web/app/today/page.tsx`

- [ ] **Step 1: 鏈€灏忛〉闈㈠洖褰掔偣**

妫€鏌ュ綋鍓?`isCardioPlan`銆乣handleGenerateTodayTraining`銆佹寜閽覆鏌撴潯浠朵笌鐩爣绫诲瀷涔嬮棿鐨勮€﹀悎鐐癸紝鍙繚鐣欏姏閲忕洰鏍囦笅鐨勫姏閲忓叆鍙ｃ€?
- [ ] **Step 2: 鏈€灏忓疄鐜?*

璁╅〉闈㈡牴鎹?`currentUser.profile.targetType` 鍜?`payload.trainingPlan.splitType` 涓€鑷存覆鏌擄細
- `cut` 涓嶆樉绀?`鎸夋帹鏃?鎷夋棩/鑵挎棩鐢熸垚璁″垝`
- `bulk` / `maintain` 涓嶆樉绀烘湁姘т笓灞炴枃妗堝拰鏍囩

- [ ] **Step 3: 璺戝墠绔瀯寤烘垨绫诲瀷妫€鏌?*

Run: `npm.cmd run build`
Workdir: `E:\Ai jjfajgsw\jianshenapp\apps\web`

### Task 4: 绔埌绔洖褰?
**Files:**
- Verify only

- [ ] **Step 1: 璺戣鍒欏紩鎿庢祴璇?*

Run: `npm.cmd test -- --runInBand`
Workdir: `E:\Ai jjfajgsw\jianshenapp\packages\rule-engine`

- [ ] **Step 2: 璺?API 閽堝鎬ф祴璇?*

Run: `npm.cmd test -- profiles.service.spec.ts today.service.spec.ts --runInBand`
Workdir: `E:\Ai jjfajgsw\jianshenapp\apps\api`

- [ ] **Step 3: 璺戝墠绔瀯寤?*

Run: `npm.cmd run build`
Workdir: `E:\Ai jjfajgsw\jianshenapp\apps\web`

- [ ] **Step 4: 璁板綍娈嬩綑椋庨櫓**

閲嶇偣鐪嬩袱绫伙細
- 鍘嗗彶宸茬敓鎴愮殑鏃ц鍒掍笉浼氳嚜鍔ㄩ噸鍐?- 鍓嶇浠婂ぉ椤靛鈥滅洰鏍団€濆拰鈥滆鍒掔被鍨嬧€濈殑鍚屾浠嶄緷璧栨帴鍙ｆ暟鎹強鏃跺埛鏂?
