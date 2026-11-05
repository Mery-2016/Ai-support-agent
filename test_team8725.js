const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🚀 驗證測試：Team 8725 MistyPanther 官方網站與 Web App 入口');
console.log('================================================================\n');

let pass = 0;
let total = 0;

function check(cond, name, detail = '') {
  total++;
  if (cond) {
    console.log(`  ✅ [PASS] ${name}`);
    pass++;
  } else {
    console.error(`  ❌ [FAIL] ${name} ${detail}`);
  }
}

// 1. 檢查樣式分層
console.log('--- 1. 檢查樣式分層與規範遵守 (docs/04-frontend.md) ---');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
check(html.includes('href="styles/fonts.css"'), '引入 styles/fonts.css');
check(html.includes('href="styles/tokens.css"'), '引入 styles/tokens.css');
check(html.includes('href="styles/base.css"'), '引入 styles/base.css');
check(html.includes('href="styles/app.css"'), '引入 styles/app.css');

// 檢查順序
const posFonts = html.indexOf('styles/fonts.css');
const posTokens = html.indexOf('styles/tokens.css');
const posBase = html.indexOf('styles/base.css');
const posApp = html.indexOf('styles/app.css');
check(posFonts < posTokens && posTokens < posBase && posBase < posApp, '樣式分層順序嚴格符合規範 (fonts -> tokens -> base -> app)');

// 2. 驗證 app.css 零色碼外溢
console.log('\n--- 2. 驗證 app.css 零色碼外溢 (docs/04-frontend.md §1) ---');
const appCss = fs.readFileSync(path.join(__dirname, 'styles/app.css'), 'utf-8');
const colorRegex = /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/g;
const colorMatches = appCss.match(colorRegex) || [];
check(colorMatches.length === 0, 'app.css 完全無硬編碼色碼（匹配數：0，一律使用 var(--color-*)）');

// 3. 驗證共用檔案 byte-identical
console.log('\n--- 3. 驗證 canonical 檔案一致性 ---');
const dsTokens = fs.readFileSync(path.join(__dirname, 'FRC8725_docs/FRC8725-Website-Design-Docs-main/design-system/tokens/tokens.css'), 'utf-8');
const localTokens = fs.readFileSync(path.join(__dirname, 'styles/tokens.css'), 'utf-8');
check(dsTokens === localTokens, 'tokens.css 與 design-system 逐字元相同 (diff: 0)');

const dsBase = fs.readFileSync(path.join(__dirname, 'FRC8725_docs/FRC8725-Website-Design-Docs-main/design-system/base/base.css'), 'utf-8');
const localBase = fs.readFileSync(path.join(__dirname, 'styles/base.css'), 'utf-8');
check(dsBase === localBase, 'base.css 與 design-system 逐字元相同 (diff: 0)');

// 4. 驗證外殼結構 (docs/04-frontend.md §2)
console.log('\n--- 4. 驗證 App Shell 外殼結構 ---');
check(html.includes('class="skip-link"'), '包含 skip-link 無障礙跳轉');
check(html.includes('class="shell" id="app-shell"'), '包含 .shell#app-shell');
check(html.includes('class="rail" id="rail"'), '包含 .rail#rail');
check(html.includes('data-sidebar-toggle'), '包含 .sidebar-toggle 側邊欄收合控制');
check(html.includes('class="brand"'), '包含 .brand 品牌區');
check(html.includes('data-nav-toggle'), '包含 .nav-toggle 行動漢堡鈕');
check(html.includes('class="nav-panel" id="nav-panel"'), '包含 .nav-panel');
check(html.includes('class="nav-group" id="nav-group"'), '包含 .nav-group');
check(html.includes('class="rail-foot" id="rail-foot"'), '包含 .rail-foot 使用者身分區');
check(html.includes('class="main" id="main-content"'), '包含 .main#main-content');
check(html.includes('class="toast-region" id="toast-region"'), '包含 #toast-region');
check(html.includes('id="dialog-root"'), '包含 #dialog-root');

// 5. 驗證 4 大 Web App 模組與戰隊首頁整合
console.log('\n--- 5. 驗證 Team 8725 核心模組 ---');
check(html.includes('id="view-overview"'), '包含 戰隊首頁與賽季簡介 (Overview)');
check(html.includes('id="view-robots"'), '包含 歷屆機器人技術規格 (Robots)');
check(html.includes('id="view-tasks"'), '包含 MistTasks 任務管理系統');
check(html.includes('id="view-parts"'), '包含 MistParts 零件加工隊列');
check(html.includes('id="view-scout"'), '包含 MistScout 偵察分析系統');
check(html.includes('id="view-storage"'), '包含 MistStorage 庫存備品管理');
check(html.includes('id="view-ai"'), '包含 MistAI 智能技術助理 (Gemini 3.8 Pro)');
check(html.includes('id="view-docs"'), '包含 Design Docs 規範中心');

console.log('\n================================================================');
console.log(`測試結果：共通過 ${pass} / ${total} 項驗證 (${Math.round((pass/total)*100)}%)`);
console.log('================================================================\n');

if (pass === total) process.exit(0);
else process.exit(1);
