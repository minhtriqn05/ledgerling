import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import apiRouter from "../src/routes/index.js";
import spec, { ERROR_CODES_BY_STATUS } from "../src/config/swagger.js";

// The descriptions of the API must agree with the code: the Swagger spec (/api-docs), docs/api-plan.md and the English
// texts of the client, which translates every error code. A route or an error code added on one side only fails here.

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
const plan = read("../../docs/api-plan.md");
const METHODS = ["get", "post", "put", "patch", "delete"];
const ERROR_CODES = Object.values(ERROR_CODES_BY_STATUS).flat();

// "/goals/:id/contributions/:contributionId" → "/goals/{id}/contributions/{contributionId}", the form of the Swagger spec
const endpoint = (method, path) => `${method.toUpperCase()} ${path.replace(/:(\w+)/g, "{$1}")}`;

// Every endpoint of the Express app: the routes of each router (router.get("/:id", ...)) under the path that
// src/routes/index.js mounts it on (router.use("/categories", ..., categoryRoutes))
async function codeEndpoints() {
  const mounts = [...read("../src/routes/index.js").matchAll(/router\.use\("([^"]+)",.*\b(\w+Routes)\);/g)];
  // The line above found every router that index.js mounts
  expect(mounts).toHaveLength(apiRouter.stack.filter((layer) => layer.handle.stack).length);

  const found = [];
  const addRoutes = (prefix, router) => {
    for (const { route } of router.stack) {
      if (!route) continue;
      const path = route.path === "/" ? prefix : prefix + route.path;
      for (const method of Object.keys(route.methods)) found.push(endpoint(method, path));
    }
  };
  addRoutes("", apiRouter); // GET /health is declared in index.js itself
  for (const [, prefix, name] of mounts) addRoutes(prefix, (await import(`../src/routes/${name}.js`)).default);
  return found;
}

const swaggerEndpoints = Object.entries(spec.paths).flatMap(([path, item]) =>
  METHODS.filter((method) => item[method]).map((method) => endpoint(method, path))
);

// | 7 | GET | `/api/categories/:id` | Yes | Get one category |
const tableRows = [...plan.matchAll(/^\| (\d+) \| (GET|POST|PUT|PATCH|DELETE) \| `\/api([^`]+)` \|/gm)].map(
  ([, number, method, path]) => ({ number: Number(number), endpoint: endpoint(method, path) })
);
// ### 7. GET /api/categories/:id
const sections = [...plan.matchAll(/^### (\d+)\. (GET|POST|PUT|PATCH|DELETE) \/api(\S+)/gm)].map(
  ([, number, method, path]) => ({ number: Number(number), endpoint: endpoint(method, path) })
);

// Replaces every $ref of the spec by what it points to
function resolve(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(resolve);
  if (value.$ref) return resolve(value.$ref.replace("#/", "").split("/").reduce((node, key) => node[key], spec));
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, resolve(inner)]));
}
const hasExample = (value) => /"examples?":/.test(JSON.stringify(value));
const exampleValues = (response) =>
  Object.values(response.content ?? {}).flatMap((media) => [
    ...(media.example === undefined ? [] : [media.example]),
    ...Object.values(media.examples ?? {}).map((example) => example.value),
  ]);

// The text of every file of src/
function sourceFiles(dir = new URL("../src/", import.meta.url)) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(new URL(`${entry.name}/`, dir))
      : entry.name.endsWith(".js")
        ? [{ name: entry.name, text: readFileSync(new URL(entry.name, dir), "utf8") }]
        : []
  );
}
const allCaps = (text) => [...text.matchAll(/"([A-Z][A-Z0-9_]{3,})"/g)].map(([, value]) => value);

// The codes of the tips of GET /insights (insightService.js), which are not error codes
const TIP_CODES = new Set(allCaps(read("../src/services/insightService.js")));
// The other all-caps strings of src/ that are not error codes either
const NOT_ERROR_CODES = new Set([
  "SIGINT", // process signals (server.js, e2e.js)
  "SIGTERM",
  "RIFF", // the first bytes of a WebP file (validateUser.js)
  "WEBP",
  "YYYY", // a date format named in a comment (utils/month.js)
  "IMPORT_CATEGORY_NOT_FOUND", // the code of one refused row in the answer of POST /transactions/import
]);

describe("the API documentation", () => {
  it("the code, the Swagger spec and the endpoint table of docs/api-plan.md list the same endpoints", async () => {
    const code = (await codeEndpoints()).sort();
    expect(new Set(code).size).toBe(code.length);
    expect([...swaggerEndpoints].sort()).toEqual(code);
    expect(tableRows.map((row) => row.endpoint).sort()).toEqual(code);
  });

  it("docs/api-plan.md has one numbered section per endpoint, with its number in the table", () => {
    const numberOf = new Map(tableRows.map((row) => [row.endpoint, row.number]));
    expect(new Set(tableRows.map((row) => row.number)).size).toBe(tableRows.length);
    expect(sections.map((section) => section.endpoint).sort()).toEqual([...numberOf.keys()].sort());
    for (const section of sections) expect(section.number, section.endpoint).toBe(numberOf.get(section.endpoint));
  });

  it("every Swagger operation has a summary and examples, and every error example names its code", () => {
    const problems = [];
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const method of METHODS.filter((name) => item[name])) {
        const operation = resolve(item[method]);
        const name = endpoint(method, path);
        if (!operation.summary) problems.push(`${name}: no summary`);
        if (operation.requestBody && !hasExample(operation.requestBody)) problems.push(`${name}: body without example`);
        if (operation.security && !operation.responses["401"]) problems.push(`${name}: needs a token but has no 401`);
        for (const [status, response] of Object.entries(operation.responses)) {
          if (status.startsWith("2") && response.content && !hasExample(response)) problems.push(`${name}: ${status} without example`);
          if (!/^[45]/.test(status)) continue;
          const examples = exampleValues(response);
          if (examples.length === 0) problems.push(`${name}: ${status} without example`);
          for (const example of examples) {
            if (!ERROR_CODES.includes(example?.code)) problems.push(`${name}: ${status} example with code ${example?.code}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("every error code in src/ is in the Swagger spec, and only those", () => {
    const used = new Set(
      sourceFiles()
        .filter((file) => file.name !== "insightService.js")
        .flatMap((file) => allCaps(file.text))
        .filter((value) => !NOT_ERROR_CODES.has(value))
    );
    expect([...used].sort()).toEqual([...ERROR_CODES].sort());
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    expect(spec.components.schemas.ErrorResponse.properties.code.enum).toEqual(ERROR_CODES);
  });

  it("each code is listed under the status the code really sends it with", () => {
    const statusOf = new Map(Object.entries(ERROR_CODES_BY_STATUS).flatMap(([status, codes]) => codes.map((c) => [c, status])));
    const pairs = sourceFiles().flatMap(({ text }) => [
      // throw httpError(404, "Budget not found", "BUDGET_NOT_FOUND")
      ...[...text.matchAll(/httpError\(\s*(\d{3})\s*,[^;]*?"([A-Z][A-Z0-9_]*)"\s*\)/g)].map(([, status, code]) => [code, status]),
      // validIdParam("id", "Budget not found", "BUDGET_NOT_FOUND"): a malformed id in the URL is a 404
      ...[...text.matchAll(/validIdParam\([^)]*"([A-Z][A-Z0-9_]*)"\s*\)/g)].map(([, code]) => [code, "404"]),
    ]);
    expect(pairs.length).toBeGreaterThan(50);
    for (const [code, status] of pairs) expect(statusOf.get(code), code).toBe(status);
  });

  it("docs/api-plan.md lists the same codes under the same statuses", () => {
    const table = plan.slice(plan.indexOf("### Error codes"), plan.indexOf("### Validation rules"));
    // | 404 | `NOT_FOUND`, `USER_NOT_FOUND`, ... |
    const rows = [...table.matchAll(/^\| ([^|]+?) \| (`[A-Z].*`) \|$/gm)].map(([, status, codes]) => [
      status,
      [...codes.matchAll(/`([A-Z][A-Z0-9_]*)`/g)].map(([, code]) => code).sort(),
    ]);
    const expected = Object.entries(ERROR_CODES_BY_STATUS).map(([status, codes]) => [status, [...codes].sort()]);
    expect(rows).toEqual(expected);
  });

  it("the tips of GET /insights are all in the Swagger spec", () => {
    const text = JSON.stringify(spec.paths["/insights"]);
    expect([...TIP_CODES].filter((code) => !text.includes(code))).toEqual([]);
  });

  it("the client has an English text for every error code", () => {
    const { errors } = JSON.parse(read("../../client/src/locales/en.json"));
    expect([...ERROR_CODES, "IMPORT_CATEGORY_NOT_FOUND"].filter((code) => !errors[code])).toEqual([]);
  });

  it("docs/erd.md draws every model with exactly the fields of its schema", async () => {
    const erd = read("../../docs/erd.md");
    // The lines "        ObjectId userId FK" of the block "    CATEGORY { ... }": the second word is the field
    const fieldsOf = (entity) => {
      const block = erd.match(new RegExp(`^ {4}${entity} \\{\\r?\\n([\\s\\S]*?)^ {4}\\}`, "m"))?.[1];
      expect(block, `${entity} in docs/erd.md`).toBeDefined();
      return [...block.matchAll(/^\s+\S+ (\w+)/gm)].map(([, name]) => name).sort();
    };
    // "preferences.theme" → "preferences"
    const topLevel = (schema) => [...new Set(Object.keys(schema.paths).map((path) => path.split(".")[0]))].filter((p) => p !== "__v");

    const files = readdirSync(new URL("../src/models/", import.meta.url));
    expect(files).toHaveLength(10);
    for (const file of files) {
      const { default: Model } = await import(`../src/models/${file}`);
      // RecurringRule → RECURRING_RULE
      const entity = Model.modelName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
      const fields = topLevel(Model.schema);
      // An array of subdocuments (Goal.contributions) is its own entity (CONTRIBUTION)
      const inner = fields.filter((path) => Model.schema.path(path)?.$isMongooseDocumentArray);
      expect(fieldsOf(entity), entity).toEqual(fields.filter((path) => !inner.includes(path)).sort());
      for (const path of inner) {
        expect(fieldsOf(path.replace(/s$/, "").toUpperCase()), path).toEqual(topLevel(Model.schema.path(path).schema).sort());
      }
    }
  });
});
