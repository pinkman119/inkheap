/* eslint-disable */
// 临时：按 Dockerfile 相同方式（ts.transpileModule）编译并执行 seed.ts，用于本地校验
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'seed.ts');
const outPath = path.join(__dirname, '_seed_run.js');
const src = fs.readFileSync(srcPath, 'utf8');
const out = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2023,
    esModuleInterop: true,
  },
}).outputText;
fs.writeFileSync(outPath, out);
require(outPath);
