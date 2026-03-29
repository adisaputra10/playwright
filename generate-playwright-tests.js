#!/usr/bin/env node
/**
 * generate-playwright-tests.js
 *
 * OpenAI-compatible CLI tool that:
 *   1. Walks a web-app source directory
 *   2. Extracts routes, controllers, and view/template files
 *   3. Sends a structured prompt to any OpenAI-compatible API
 *   4. Parses code-block responses and writes Playwright test files
 *   5. Optionally runs the tests and verifies they pass
 *
 * Zero external dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   node generate-playwright-tests.js [options]
 *
 * Options:
 *   --repo      <path>       Path to the app source (default: current dir)
 *   --output    <path>       Where to write tests (default: ../playwright/tests)
 *   --base-url  <url>        App URL (default: http://localhost:3000)
 *   --api-key   <key>        OpenAI API key (or set OPENAI_API_KEY env var)
 *   --api-url   <url>        OpenAI-compatible base URL (default: https://api.openai.com/v1)
 *   --model     <name>       Model name (default: gpt-4o)
 *   --admin-email   <email>  Admin e-mail for auth tests
 *   --admin-pass    <pass>   Admin password for auth tests
 *   --max-tokens    <n>      Max tokens for API response (default: 16000)
 *   --dry-run               Print the prompt without calling the API
 *   --run-tests             After writing files, run npx playwright test
 *   --help                  Show this help
 *
 * Examples:
 *   # Express/EJS app
 *   node generate-playwright-tests.js \
 *     --repo d:/repo/test/nodeapp \
 *     --output d:/repo/test/playwright/tests \
 *     --base-url http://localhost:3000 \
 *     --admin-email admin@example.com \
 *     --admin-pass admin123 \
 *     --run-tests
 *
 *   # Use local Ollama (OpenAI-compatible)
 *   node generate-playwright-tests.js \
 *     --api-url http://localhost:11434/v1 \
 *     --model codellama \
 *     --repo ./myapp
 *
 *   # Just preview the prompt
 *   node generate-playwright-tests.js --repo ./myapp --dry-run
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { execSync, spawnSync } = require('child_process');

// ─── CLI argument parser ───────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;           // boolean flag
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args['--help']) {
  console.log(fs.readFileSync(__filename, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[0]);
  process.exit(0);
}

// ─── Configuration ─────────────────────────────────────────────────────────

const REPO_PATH    = path.resolve(args['--repo']        || process.env.REPO_PATH        || process.cwd());
const OUTPUT_DIR   = path.resolve(args['--output']      || process.env.OUTPUT_DIR       || path.join(REPO_PATH, '..', 'playwright', 'tests'));
const APP_BASE_URL = args['--base-url']                 || process.env.APP_BASE_URL     || 'http://localhost:3000';
const API_URL      = args['--api-url']                  || process.env.OPENAI_BASE_URL  || 'https://api.openai.com/v1';
const API_KEY      = args['--api-key']                  || process.env.OPENAI_API_KEY   || '';
const MODEL        = args['--model']                    || process.env.OPENAI_MODEL     || 'gpt-4o';
const ADMIN_EMAIL  = args['--admin-email']              || process.env.ADMIN_EMAIL      || 'admin@example.com';
const ADMIN_PASS   = args['--admin-pass']               || process.env.ADMIN_PASSWORD   || '';
const MAX_TOKENS   = parseInt(args['--max-tokens']      || process.env.MAX_TOKENS       || '16000', 10);
const DRY_RUN      = !!args['--dry-run'];
const RUN_TESTS    = !!args['--run-tests'];

// ─── Utility: read file safely ─────────────────────────────────────────────

function readSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

// ─── Utility: walk directory, collect files matching extensions ─────────────

function walkDir(dir, exts, ignore = [], results = []) {
  if (!fs.existsSync(dir)) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, exts, ignore, results);
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// ─── Utility: truncate long content ────────────────────────────────────────

function truncate(str, maxChars = 3000) {
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars) + `\n... [truncated — ${str.length - maxChars} chars omitted]`;
}

// ─── Phase 1: Detect framework ─────────────────────────────────────────────

function detectFramework() {
  const pkgPath = path.join(REPO_PATH, 'package.json');
  const reqPath  = path.join(REPO_PATH, 'requirements.txt');
  const pyproject= path.join(REPO_PATH, 'pyproject.toml');
  const gemfile  = path.join(REPO_PATH, 'Gemfile');
  const composer = path.join(REPO_PATH, 'composer.json');

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(readSafe(pkgPath) || '{}');
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['next'])            return { name: 'nextjs',     lang: 'js' };
    if (deps['nuxt'])            return { name: 'nuxt',       lang: 'js' };
    if (deps['express'])         return { name: 'express',    lang: 'js' };
    if (deps['fastify'])         return { name: 'fastify',    lang: 'js' };
    if (deps['@nestjs/core'])    return { name: 'nestjs',     lang: 'ts' };
    return { name: 'nodejs',    lang: 'js' };
  }
  if (fs.existsSync(reqPath) || fs.existsSync(pyproject)) {
    const content = readSafe(reqPath) || readSafe(pyproject) || '';
    if (content.includes('fastapi'))  return { name: 'fastapi', lang: 'py' };
    if (content.includes('django'))   return { name: 'django',  lang: 'py' };
    if (content.includes('flask'))    return { name: 'flask',   lang: 'py' };
    return { name: 'python', lang: 'py' };
  }
  if (fs.existsSync(gemfile))  return { name: 'rails',   lang: 'rb' };
  if (fs.existsSync(composer)) return { name: 'laravel', lang: 'php' };
  return { name: 'unknown', lang: '?' };
}

// ─── Phase 2: Collect source files ─────────────────────────────────────────

const IGNORE = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'vendor', 'storage'];

function collectSources(framework) {
  const sections = [];

  // ── Manifest ──────────────────────────────────────────────────────────────
  const manifests = ['package.json','requirements.txt','pyproject.toml','go.mod','Gemfile','composer.json'];
  for (const m of manifests) {
    const content = readSafe(path.join(REPO_PATH, m));
    if (content) sections.push({ label: m, content: truncate(content, 2000) });
  }

  // ── Entry point ───────────────────────────────────────────────────────────
  const entryFiles = ['app.js','server.js','index.js','main.js','main.py','app.py','manage.py','config/routes.rb','routes/web.php'];
  for (const e of entryFiles) {
    const content = readSafe(path.join(REPO_PATH, e));
    if (content) sections.push({ label: e, content: truncate(content, 2000) });
  }

  // ── Route definitions ─────────────────────────────────────────────────────
  const routeDirs = {
    express:  ['routes'],
    nextjs:   ['app', 'pages'],
    django:   [''],           // search whole project for urls.py
    fastapi:  ['routers','api','app'],
    rails:    ['config'],
    laravel:  ['routes'],
  };

  const routeExtMap = {
    express: ['.js','.ts'],
    nextjs:  ['.js','.ts','.jsx','.tsx'],
    django:  ['.py'],
    fastapi: ['.py'],
    rails:   ['.rb'],
    laravel: ['.php'],
  };

  const fw = framework.name;
  const routeDirList = routeDirs[fw] || ['routes','controllers','api'];
  const routeExts    = routeExtMap[fw] || ['.js','.ts','.py','.rb','.php'];

  for (const dir of routeDirList) {
    const fullDir = path.join(REPO_PATH, dir);
    const files   = walkDir(fullDir, routeExts, IGNORE);
    for (const f of files) {
      const rel     = path.relative(REPO_PATH, f);
      const content = readSafe(f);
      if (content) sections.push({ label: rel, content: truncate(content, 3000) });
    }
  }

  // ── Controllers ───────────────────────────────────────────────────────────
  const ctrlExts = ['.js','.ts','.py','.rb','.php'];
  const ctrlDirs = ['controllers','controller','app/controllers','app/Http/Controllers','app/views'];
  for (const d of ctrlDirs) {
    const files = walkDir(path.join(REPO_PATH, d), ctrlExts, IGNORE);
    for (const f of files) {
      const rel     = path.relative(REPO_PATH, f);
      const content = readSafe(f);
      if (content) sections.push({ label: rel, content: truncate(content, 3000) });
    }
  }

  // ── Views / Templates ─────────────────────────────────────────────────────
  const viewExts = ['.ejs','.pug','.hbs','.html','.njk','.twig','.erb','.blade.php','.tsx','.jsx'];
  const viewDirs = ['views','templates','src/app','pages','resources/views'];
  for (const d of viewDirs) {
    const files = walkDir(path.join(REPO_PATH, d), viewExts, IGNORE);
    for (const f of files) {
      const rel     = path.relative(REPO_PATH, f);
      const content = readSafe(f);
      if (content) sections.push({ label: rel, content: truncate(content, 2000) });
    }
  }

  // ── Database schema ───────────────────────────────────────────────────────
  const schemaExts = ['.sql','.prisma','.graphql'];
  const schemaDirs = ['database','db','prisma','migrations','schema'];
  for (const d of schemaDirs) {
    const files = walkDir(path.join(REPO_PATH, d), schemaExts, IGNORE);
    for (const f of files.slice(0, 5)) {        // cap at 5 schema files
      const rel     = path.relative(REPO_PATH, f);
      const content = readSafe(f);
      if (content) sections.push({ label: rel, content: truncate(content, 2000) });
    }
  }

  // ── Middleware / Auth middleware ───────────────────────────────────────────
  const mwFiles = walkDir(path.join(REPO_PATH, 'middleware'), ['.js','.ts','.py'], IGNORE);
  for (const f of mwFiles) {
    const rel     = path.relative(REPO_PATH, f);
    const content = readSafe(f);
    if (content) sections.push({ label: rel, content: truncate(content, 1500) });
  }

  return sections;
}

// ─── Phase 3: Build the LLM prompt ─────────────────────────────────────────

function buildPrompt(framework, sources) {
  const sourceBlock = sources
    .map(s => `### ${s.label}\n\`\`\`\n${s.content}\n\`\`\``)
    .join('\n\n');

  return `
You are a senior QA engineer specialising in Playwright automation.

## App Details
- Framework  : ${framework.name} (${framework.lang})
- App URL    : ${APP_BASE_URL}
- Admin email: ${ADMIN_EMAIL}
- Admin pass : ${ADMIN_PASS}
- Output dir : ${OUTPUT_DIR}

## Source Files
Below are the route definitions, controllers, view templates, and schema files
for the application. Analyse them carefully before generating tests.

${sourceBlock}

---

## Instructions

Generate a **complete Playwright test suite** for this application.

### Mandatory files to produce

1. **tests/helpers/auth.js** — login / logout helpers
2. **tests/auth.spec.js** — home page, login success/failure, register, protected-route redirects, logout
3. **tests/dashboard.spec.js** — dashboard page loads, stat cards visible, nav links work
4. **tests/<resource>.spec.js** — one file per CRUD resource found in the routes (list, create, detail, edit, delete)

### Critical selector rules

1. **Form inputs** — always use \`input[name="field"]\` or \`select[name="field"]\`.
   Never assume an \`id\` attribute exists unless you can see it in the template source.

2. **Duplicate elements** — if the same link appears in both navbar and page body
   (e.g. two \`<a href="/login">\`), append \`.first()\` or scope to a specific
   ancestor to avoid Playwright strict-mode errors.

3. **Dropdown nav** — if logout / user menu is inside a Bootstrap (or other)
   dropdown, click the dropdown toggle and wait for the menu to be visible
   before clicking the logout link.

4. **Post-login redirect** — determine the exact URL the app redirects to after
   successful login from the controller, then assert \`toHaveURL\` against that.

5. **Post-logout redirect** — same as above; read the controller,  do not assume \`/login\`.

6. **Column length limits** — inspect schema/model files for VARCHAR lengths.
   When generating dynamic test data (IDs, emails), ensure they fit. Use
   \`Date.now().toString().slice(-8)\` to keep IDs short.

7. **Post-update redirect** — read the controller for each resource; update
   may redirect to the detail page (\`/resource/:id\`), not the list.
   Use regex: \`/\\/resource\\/\\d+/\`

8. **Delete buttons** — inspect the template; the button may have only a \`title\`
   or \`aria-label\` attribute, not \`type="submit"\`. Use what is actually present.

9. **Conditionally absent buttons** — if the template conditionally omits a
   button for the logged-in user (e.g. cannot delete own account), assert
   \`not.toBeVisible()\`.

10. **Dialog confirm** — register \`page.once('dialog', d => d.accept())\`
    **before** clicking any delete button that triggers \`window.confirm\`.

11. **Sequential execution** — always set \`workers: 1\`, \`fullyParallel: false\`
    when tests share a database.

12. **Test data isolation** — suffix dynamic values with a timestamp so each
    run creates unique records and does not conflict with previous runs.

### Output format

Return **only** fenced code blocks. Use this exact format for each file:

\`\`\`filepath:tests/helpers/auth.js
... file content here ...
\`\`\`

\`\`\`filepath:tests/auth.spec.js
... file content here ...
\`\`\`

Do NOT add prose outside of the code blocks.
Do NOT skip any file.
Do NOT add placeholder comments like "// add more tests here".
Generate fully working, runnable code for every file.
`.trim();
}

// ─── Phase 4: Call the LLM API ─────────────────────────────────────────────

function callApi(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:      MODEL,
      messages:   [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
    });

    const apiUrl  = new URL(`${API_URL.replace(/\/$/, '')}/chat/completions`);
    const isHttps = apiUrl.protocol === 'https:';
    const lib     = isHttps ? https : http;

    const reqOptions = {
      hostname: apiUrl.hostname,
      port:     apiUrl.port || (isHttps ? 443 : 80),
      path:     apiUrl.pathname + apiUrl.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(`API error: ${JSON.stringify(parsed.error)}`));
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch {
          reject(new Error(`Failed to parse API response:\n${raw.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(120_000, () => { req.destroy(new Error('Request timed out after 120s')); });
    req.write(body);
    req.end();
  });
}

// ─── Phase 5: Parse code blocks from LLM response ──────────────────────────

function parseCodeBlocks(response) {
  const files = {};
  // Match ```filepath:<path>\n...content...\n```
  const re = /```filepath:([^\n]+)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(response)) !== null) {
    const filePath  = m[1].trim();
    const content   = m[2];
    files[filePath] = content;
  }
  return files;
}

// ─── Phase 6: Write files ──────────────────────────────────────────────────

function writeFiles(files) {
  if (Object.keys(files).length === 0) {
    console.error('\n❌ No code blocks found in the API response.');
    console.error('   Tip: use --dry-run to inspect the prompt, then check model output format.\n');
    process.exit(1);
  }

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(OUTPUT_DIR, relPath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  ✅ Written: ${path.relative(process.cwd(), fullPath)}`);
  }
}

// ─── Phase 7: Optionally run tests ─────────────────────────────────────────

function runTests() {
  const playwrightDir = path.dirname(OUTPUT_DIR); // tests/ lives inside playwright/
  console.log(`\n🧪 Running: npx playwright test (in ${playwrightDir})\n`);

  const result = spawnSync('npx', ['playwright', 'test'], {
    cwd:   playwrightDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status === 0) {
    console.log('\n✅ All tests passed!\n');
  } else {
    console.error('\n❌ Some tests failed. Check the output above.');
    console.error('   Open the HTML report:');
    console.error(`   npx playwright show-report ${path.join(playwrightDir, 'playwright-report')}\n`);
    process.exit(result.status);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Playwright Test Generator\n');
  console.log(`  Repo    : ${REPO_PATH}`);
  console.log(`  Output  : ${OUTPUT_DIR}`);
  console.log(`  App URL : ${APP_BASE_URL}`);
  console.log(`  Model   : ${MODEL} @ ${API_URL}`);
  console.log(`  Admin   : ${ADMIN_EMAIL}`);
  console.log(`  Dry run : ${DRY_RUN}`);
  console.log(`  Run tests: ${RUN_TESTS}\n`);

  // ── Step 1: detect framework ──────────────────────────────────────────────
  console.log('📦 Detecting framework...');
  const framework = detectFramework();
  console.log(`   → ${framework.name} (${framework.lang})\n`);

  // ── Step 2: collect source files ──────────────────────────────────────────
  console.log('📂 Collecting source files...');
  const sources = collectSources(framework);
  console.log(`   → ${sources.length} file(s) collected\n`);

  if (sources.length === 0) {
    console.error('❌ No source files found. Check --repo path.');
    process.exit(1);
  }

  // ── Step 3: build prompt ──────────────────────────────────────────────────
  const prompt = buildPrompt(framework, sources);
  const promptTokenEstimate = Math.ceil(prompt.length / 4);
  console.log(`📝 Prompt built (≈${promptTokenEstimate.toLocaleString()} tokens)\n`);

  if (DRY_RUN) {
    console.log('─── DRY RUN — prompt preview (first 4000 chars) ───\n');
    console.log(prompt.slice(0, 4000));
    console.log('\n─── (end of preview) ───\n');
    return;
  }

  if (!API_KEY && !API_URL.includes('localhost') && !API_URL.includes('127.0.0.1')) {
    console.error('❌ No API key provided. Set OPENAI_API_KEY or pass --api-key.');
    console.error('   For local models (Ollama, LM Studio) no key is needed.\n');
    process.exit(1);
  }

  // ── Step 4: call the API ──────────────────────────────────────────────────
  console.log(`🤖 Calling ${MODEL}...`);
  let response;
  try {
    response = await callApi(prompt);
  } catch (err) {
    console.error(`❌ API call failed: ${err.message}`);
    process.exit(1);
  }
  console.log(`   → Response received (${response.length.toLocaleString()} chars)\n`);

  // ── Step 5: parse code blocks ─────────────────────────────────────────────
  console.log('🧩 Parsing generated files...');
  const files = parseCodeBlocks(response);
  console.log(`   → ${Object.keys(files).length} file(s) found in response\n`);

  // ── Step 6: write files ───────────────────────────────────────────────────
  console.log('💾 Writing test files...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFiles(files);
  console.log(`\n   All files written to: ${OUTPUT_DIR}\n`);

  // ── Step 7: run tests (optional) ──────────────────────────────────────────
  if (RUN_TESTS) {
    runTests();
  } else {
    console.log('ℹ️  To run the tests:\n');
    const playwrightDir = path.dirname(OUTPUT_DIR);
    console.log(`   cd ${playwrightDir}`);
    console.log('   npm install');
    console.log('   npx playwright install chromium');
    console.log('   npx playwright test\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
