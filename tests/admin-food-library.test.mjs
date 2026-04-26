import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "../apps/admin/node_modules/typescript/lib/typescript.js";

const rootDirectory = process.cwd();
const adminRequire = createRequire(resolve(rootDirectory, "apps/admin/package.json"));

function stripBom(content) {
  return content.replace(/^\uFEFF/u, "");
}

function loadGetAdminAuthHeaders() {
  return loadCommonJsModule(resolve(rootDirectory, "apps/admin/lib/api-client.ts")).getAdminAuthHeaders;
}

function loadFoodLibrarySchemas() {
  return loadCommonJsModule(resolve(rootDirectory, "apps/admin/lib/validation.ts"));
}

function loadCommonJsModule(filePath) {
  const source = stripBom(readFileSync(filePath, "utf8"));
  const emitted = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const module = { exports: {} };
  const context = vm.createContext({
    Buffer,
    clearTimeout,
    console,
    exports: module.exports,
    global,
    module,
    process,
    require: adminRequire,
    setTimeout,
  });

  new vm.Script(emitted, { filename: filePath }).runInContext(context);
  return module.exports;
}

test("food library admin route files exist", () => {
  assert.equal(
    existsSync(resolve(rootDirectory, "apps/admin/app/api/v1/admin/food-library-items/route.ts")),
    true,
  );
  assert.equal(
    existsSync(resolve(rootDirectory, "apps/admin/app/api/v1/admin/food-library-items/[id]/route.ts")),
    true,
  );
});

test("contracts exposes food library item types", () => {
  const contracts = stripBom(readFileSync(resolve(rootDirectory, "apps/admin/lib/contracts.ts"), "utf8"));

  assert.match(contracts, /export\s+type\s+FoodLibraryItemStatus\s*=\s*/);
  assert.match(contracts, /export\s+type\s+FoodLibraryItem\s*=\s*/);
});

test("food library auth helper prefers Bearer header and falls back to campusfit cookie", () => {
  const getAdminAuthHeaders = loadGetAdminAuthHeaders();

  const bearerHeaders = getAdminAuthHeaders(
    new Request("http://localhost", {
      headers: {
        authorization: "Bearer inbound-token",
        cookie: "campusfit_admin_session=cookie-token",
      },
    }),
  );
  assert.equal(bearerHeaders.Authorization, "Bearer inbound-token");

  const nonBearerHeaders = getAdminAuthHeaders(
    new Request("http://localhost", {
      headers: {
        authorization: "Basic abc123",
        cookie: "campusfit_admin_session=cookie-token",
      },
    }),
  );
  assert.equal(nonBearerHeaders.Authorization, "Bearer cookie-token");

  const cookieHeaders = getAdminAuthHeaders(
    new Request("http://localhost", {
      headers: {
        cookie: "campusfit_admin_session=cookie-token",
      },
    }),
  );
  assert.equal(cookieHeaders.Authorization, "Bearer cookie-token");
});

test("food library schemas enforce non-empty strings, non-negative numbers, and non-empty patch payloads", () => {
  const { foodLibraryItemCreateSchema, foodLibraryItemPatchSchema } = loadFoodLibrarySchemas();

  assert.equal(
    foodLibraryItemCreateSchema.safeParse({
      code: "",
      name: "rice-bowl",
      calories: 10,
      proteinG: 1,
      carbG: 1,
      fatG: 1,
    }).success,
    false,
  );

  assert.equal(
    foodLibraryItemCreateSchema.safeParse({
      code: "rice-bowl",
      name: "",
      calories: 10,
      proteinG: 1,
      carbG: 1,
      fatG: 1,
    }).success,
    false,
  );

  assert.equal(
    foodLibraryItemCreateSchema.safeParse({
      code: "rice-bowl",
      name: "rice-bowl",
      calories: -1,
      proteinG: 1,
      carbG: 1,
      fatG: 1,
    }).success,
    false,
  );

  assert.equal(foodLibraryItemPatchSchema.safeParse({}).success, false);
});

test("food library route encodes id before proxying", () => {
  const routeById = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/api/v1/admin/food-library-items/[id]/route.ts"), "utf8"),
  );

  assert.match(routeById, /encodeURIComponent\(id\)/);
});

test("food library admin pages and form files exist", () => {
  assert.equal(existsSync(resolve(rootDirectory, "apps/admin/components/admin/food-library-item-form.tsx")), true);
  assert.equal(existsSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/page.tsx")), true);
  assert.equal(existsSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/new/page.tsx")), true);
  assert.equal(existsSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/[id]/page.tsx")), true);
  assert.equal(existsSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/[id]/edit/page.tsx")), true);
});

test("food library list page uses the admin food library api", () => {
  const listPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/page.tsx"), "utf8"),
  );

  assert.match(listPage, /\/api\/v1\/admin\/food-library-items/);
});

test("food library new and edit pages reuse the shared form", () => {
  const newPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/new/page.tsx"), "utf8"),
  );
  const editPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items\/\[id\]\/edit\/page.tsx"), "utf8"),
  );

  assert.match(newPage, /food-library-item-form/);
  assert.match(editPage, /food-library-item-form/);
});

test("food library form uses structured selection for scene and meal tags", () => {
  const formFile = stripBom(readFileSync(resolve(rootDirectory, "apps/admin/components/admin/food-library-item-form.tsx"), "utf8"));

  assert.match(formFile, /multiple/);
  assert.match(formFile, /sceneTags/i);
  assert.match(formFile, /suggestedMealTypes/i);
  assert.doesNotMatch(formFile, /splitLines\(values\.sceneTags\)/);
  assert.doesNotMatch(formFile, /splitLines\(values\.suggestedMealTypes\)/);
  assert.match(formFile, /path\.startsWith\("sceneTags"\)/);
  assert.match(formFile, /path\.startsWith\("suggestedMealTypes"\)/);
});

test("food library pages reuse shared options and label sources", () => {
  const listPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/page.tsx"), "utf8"),
  );
  const detailPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/[id]/page.tsx"), "utf8"),
  );

  assert.match(listPage, /foodLibrarySceneOptions/);
  assert.match(listPage, /foodLibrarySceneLabelMap/);
  assert.match(listPage, /foodLibraryStatusLabelMap/);
  assert.match(detailPage, /foodLibrarySceneLabelMap/);
  assert.match(detailPage, /foodLibraryMealTypeLabelMap/);
  assert.match(detailPage, /foodLibraryStatusLabelMap/);
});

test("food library pages contain readable chinese copy", () => {
  const listPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/page.tsx"), "utf8"),
  );
  const newPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/new/page.tsx"), "utf8"),
  );
  const detailPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/[id]/page.tsx"), "utf8"),
  );
  const editPage = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/app/(admin)/food-library-items/[id]/edit/page.tsx"), "utf8"),
  );
  const formFile = stripBom(
    readFileSync(resolve(rootDirectory, "apps/admin/components/admin/food-library-item-form.tsx"), "utf8"),
  );

  assert.match(listPage, /食物库管理/);
  assert.match(listPage, /维护食物编码、营养值、适用场景与推荐餐次/);
  assert.match(newPage, /新建食物/);
  assert.match(detailPage, /食物编码/);
  assert.match(detailPage, /推荐餐次/);
  assert.match(detailPage, /编辑食物/);
  assert.match(editPage, /编辑：/);
  assert.match(formFile, /食物编码/);
  assert.match(formFile, /推荐餐次/);
  assert.match(formFile, /保存食物/);
});
