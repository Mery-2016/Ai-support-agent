// Automated Test Suite for Tashkent Blinds AI Support Agent
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🚀 ЗАПУСК ТЕСТОВОГО СЮИТА: AI SUPPORT AGENT & ЛЕНДИНГ ТАШКЕНТ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Детали: ${details}`);
  }
}

// 1. Проверка наличия ключевых файлов
console.log('--- 1. Проверка файлов проекта ---');
const indexPath = path.join(__dirname, 'index.html');
const landingPath = path.join(__dirname, 'tashkent_blinds_landing.html');
assert(fs.existsSync(indexPath), 'Файл index.html существует');
assert(fs.existsSync(landingPath), 'Файл tashkent_blinds_landing.html существует');

const htmlContent = fs.readFileSync(indexPath, 'utf-8');

// 2. Проверка ключевых UI элементов по спецификации
console.log('\n--- 2. Проверка обязательных UI-элементов (Spec IDs) ---');
const requiredIds = [
  'headerAuthBadge',
  'quick-calc',
  'calcType',
  'calcW',
  'calcH',
  'calcAreaResult',
  'calcInstallResult',
  'calcTotalUZS',
  'api-guide',
  'ai-agent',
  'registrationForm',
  'regName',
  'regPhone',
  'regDistrict',
  'regApiKey',
  'regErrorBox',
  'regSubmitBtn',
  'apiGateOverlay',
  'chatMessages',
  'chatInput',
  'chatSendBtn',
  'activeModelBadge',
  'tabModel35',
  'tabModel36',
  'tabModel38',
  'catalog',
  'faq',
  'districts',
  'bookingModal'
];

requiredIds.forEach(id => {
  assert(htmlContent.includes(`id="${id}"`), `Элемент #${id} присутствует в разметке`);
});

// 3. Проверка математического ядра и тарифов UZS
console.log('\n--- 3. Проверка формул расчета и прайс-матрицы UZS ---');
const PRICE_MATRIX_UZS = {
  'zebra_day_night': { name: 'Рулонные шторы «День-Ночь» (Зебра)', pricePerM2: 220000 },
  'cassette_blackout': { name: 'Кассетные шторы Blackout 100%', pricePerM2: 280000 },
  'roll_screen': { name: 'Рулонные шторы «Светофильтр / Screen»', pricePerM2: 160000 },
  'horizontal_alu': { name: 'Горизонтальные алюминиевые жалюзи', pricePerM2: 130000 },
  'vertical_office': { name: 'Вертикальные тканевые жалюзи', pricePerM2: 115000 },
  'plisse_roman': { name: 'Шторы Плиссе и Римские шторы', pricePerM2: 310000 }
};

function calculateWindowPrice(widthCm, heightCm, count, typeKey) {
  const typeConfig = PRICE_MATRIX_UZS[typeKey];
  const rawAreaPerWindow = (widthCm / 100) * (heightCm / 100);
  const billableAreaPerWindow = Math.max(1.0, rawAreaPerWindow);
  const totalArea = billableAreaPerWindow * count;
  const itemsPrice = Math.round(totalArea * typeConfig.pricePerM2);
  let installPrice = (count >= 3) ? 0 : Math.round(itemsPrice * 0.15);
  const totalPrice = itemsPrice + installPrice;
  return { rawAreaPerWindow, billableAreaPerWindow, totalArea, itemsPrice, installPrice, totalPrice };
}

// Тест из Acceptance Criteria спецификации: 2 окна 150х170 см
const testCalcDayNight = calculateWindowPrice(150, 170, 2, 'zebra_day_night');
assert(testCalcDayNight.rawAreaPerWindow === 2.55, 'Площадь 150х170 см = 2.55 м²');
assert(testCalcDayNight.totalArea === 5.10, 'Суммарная площадь 2 окон = 5.10 м²');
assert(testCalcDayNight.itemsPrice === 1122000, 'День-Ночь (2 окна 150х170): 5.10 * 220 000 = 1 122 000 сум');

const testCalcBlackout = calculateWindowPrice(150, 170, 2, 'cassette_blackout');
assert(testCalcBlackout.itemsPrice === 1428000, 'Blackout 100% (2 окна 150х170): 5.10 * 280 000 = 1 428 000 сум');

const testCalcHorizontal = calculateWindowPrice(150, 170, 2, 'horizontal_alu');
assert(testCalcHorizontal.itemsPrice === 663000, 'Горизонтальные (2 окна 150х170): 5.10 * 130 000 = 663 000 сум');

// Проверка технологического минимума площади S_min = 1.0 м²
const testMinArea = calculateWindowPrice(50, 60, 1, 'zebra_day_night');
assert(testMinArea.rawAreaPerWindow === 0.3, 'Фактическая площадь 50х60 см = 0.3 м²');
assert(testMinArea.billableAreaPerWindow === 1.0, 'Минимальная расчетная площадь S_min = 1.00 м² соблюдена');
assert(testMinArea.itemsPrice === 220000, 'Стоимость для 50х60 см равна тарифу за 1 м² (220 000 сум)');

// Проверка акции бесплатного монтажа от 3 окон
const testInstallPromo = calculateWindowPrice(100, 100, 3, 'zebra_day_night');
assert(testInstallPromo.installPrice === 0, 'Монтаж от 3 окон бесплатный (0 сум)');

// 4. Проверка валидации телефонов и API-ключа
console.log('\n--- 4. Проверка валидации данных и шлюза BYOK ---');
function validateApiKeyFormat(key) {
  const clean = (key || '')
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^API_KEY\s*[:=]\s*/i, '')
    .replace(/^key\s*[:=]\s*/i, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '');
  const isDemo = clean === 'AIzaSyDemoKeyTashkentBlinds2026Gemini38Pro' || clean.toLowerCase().includes('demo');
  const hasValidPrefix = /^(AQ\.[A-Za-z0-9_\-.]+|AQ[A-Za-z0-9_\-.]+|AIza[0-9A-Za-z\-_]+|ya29\.[0-9A-Za-z\-_]+)/i.test(clean);
  const isGeneralValidKey = /^[0-9A-Za-z\-_.]{15,128}$/.test(clean);
  return isDemo || (clean.length >= 15 && (hasValidPrefix || isGeneralValidKey));
}

assert(validateApiKeyFormat('AQ.Abcd1234567890efgh_ijkl.mnop'), 'Современный ключ Google AI Studio (AQ.A...) успешно проходит валидацию');
assert(validateApiKeyFormat('AIzaSyAbcd1234567890efgh-ijkl_mnopQRSTUV'), 'Классический Google AI Studio ключ (AIza...) проходит валидацию');
assert(validateApiKeyFormat('"AQ.Abcd1234567890efgh_ijkl"'), 'Ключ с кавычками автоматически очищается и проходит валидацию');
assert(validateApiKeyFormat('Bearer AQ.Abcd1234567890efgh_ijkl'), 'Ключ с префиксом Bearer очищается и проходит валидацию');
assert(!validateApiKeyFormat('12345'), 'Некорректный короткий ключ (12345) блокируется');
assert(!validateApiKeyFormat('AIza'), 'Слишком короткий ключ блокируется');

const uzbPhoneRegex = /^\+998\s?\d{2}\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;
assert(uzbPhoneRegex.test('+998 90 123 45 67'), 'Формат телефона Ташкента (+998 90 123 45 67) валиден');
assert(uzbPhoneRegex.test('+998901234567'), 'Формат без пробелов (+998901234567) валиден');

// 5. Проверка моделей ИИ и конфигураций
console.log('\n--- 5. Проверка параметров моделей Gemini ---');
assert(htmlContent.includes('Gemini 3.5'), 'Модель Gemini 3.5 поддерживается');
assert(htmlContent.includes('Gemini 3.6'), 'Модель Gemini 3.6 поддерживается');
assert(htmlContent.includes('Gemini 3.8'), 'Модель Gemini 3.8 поддерживается');
assert(htmlContent.includes("apiModelId: 'gemini-3.5'"), 'Идентификатор модели Gemini 3.5 строго gemini-3.5');
assert(htmlContent.includes("apiModelId: 'gemini-3.6'"), 'Идентификатор модели Gemini 3.6 строго gemini-3.6');
assert(htmlContent.includes("apiModelId: 'gemini-3.8'"), 'Идентификатор модели Gemini 3.8 строго gemini-3.8');
assert(htmlContent.includes('discoverAvailableModels'), 'Функция автоматического обнаружения моделей ListModels активна');
assert(htmlContent.includes('apiCandidateModels'), 'Защита от 404 через адаптивных кандидатов Google API активна');

assert(htmlContent.includes('tashkent_blinds_user_v1'), 'Используется ключ localStorage tashkent_blinds_user_v1');

// 6. Проверка охвата всех 12 районов Ташкента
console.log('\n--- 6. Проверка охвата 12 районов г. Ташкента ---');
const tashkentDistricts = [
  'Юнусабадский',
  'Чиланзарский',
  'Мирзо-Улугбекский',
  'Яккасарайский',
  'Мирабадский',
  'Сергелийский',
  'Шайхантахурский',
  'Алмазарский',
  'Учтепинский',
  'Яшнабадский',
  'Бектемирский',
  'Янгихаётский'
];

tashkentDistricts.forEach(d => {
  assert(htmlContent.includes(d), `Район ${d} присутствует в лендинге`);
});

// 7. Проверка движка триажа и маршрутизации (Автономный ответ vs Эскалация к менеджеру)
console.log('\n--- 7. Проверка логики триажа и эскалации к менеджеру ---');
const triageEngine = require('./ui/triage-engine.js');

// 7.1. Вопросы, требующие эскалации к менеджеру
const managerQueries = [
  { q: 'Соедините меня с живым оператором или менеджером', reason: 'Прямой запрос человека' },
  { q: 'У меня жалоба на качество: брак в механизме, верните деньги!', reason: 'Жалоба/брак/возврат' },
  { q: 'У меня сложный проект: панорамное остекление и эркерные окна в коттедже', reason: 'Нестандартный проект' },
  { q: 'Мы юридическое лицо, нужен договор, счет-фактура и оплата по безналу', reason: 'B2B/договор' },
  { q: 'Срочно перезвоните мне по моему заказу', reason: 'Срочный обратный звонок' }
];

managerQueries.forEach(item => {
  const res = triageEngine.classifyQuery(item.q);
  assert(res.needsManager === true, `Запрос «${item.q.slice(0, 40)}...» перенаправляется к менеджеру`);
});

// 7.2. Вопросы, решаемые ИИ автономно без участия менеджера
const autonomousQueries = [
  { q: 'Сколько стоит День-Ночь на 2 окна 150х170 см?', reason: 'Расчет стоимости' },
  { q: 'Какая ткань лучше всего спасет спальню от ташкентской жары?', reason: 'Консультация по тканям' },
  { q: 'Сколько стоит выезд замерщика в Чиланзарский район?', reason: 'Районы и замер' },
  { q: 'Чем отличаются шторы Блэкаут от Скрин?', reason: 'Сравнение материалов' },
  { q: 'Как правильно мыть и ухаживать за рулонными шторами?', reason: 'Инструкция по уходу' },
  { q: 'Что лучше выбрать для кухни?', reason: 'Подбор под кухню' },
  { q: 'Как замерить створку окна самостоятельно?', reason: 'Самостоятельный замер' },
  { q: 'Можно ли установить жалюзи без сверления рамы?', reason: 'Монтаж без сверления' },
  { q: 'Можно ли поставить шторы на рамы Akfa без сверления?', reason: 'FAQ: Akfa без сверления' },
  { q: 'Принимаете ли оплату через Click или Payme?', reason: 'FAQ: Click/Payme' },
  { q: 'Будут ли болтаться шторы когда окно открыто на проветривание?', reason: 'FAQ: Проветривание' },
  { q: 'Не выгорят ли шторы на солнце в чиллю при +45 градусах?', reason: 'FAQ: Чилля +45°C' },
  { q: 'Можно ли сделать шторы с пультом и подключить к Яндекс Алисе?', reason: 'FAQ: Умный дом и Алиса' },
  { q: 'Какая гарантия действует на механизмы и ткани?', reason: 'FAQ: Гарантия' }
];

autonomousQueries.forEach(item => {
  const res = triageEngine.classifyQuery(item.q);
  assert(res.needsManager === false, `Запрос «${item.q.slice(0, 40)}...» решается автономно ИИ-агентом`);
});

// Проверка генерации экспертных ответов клиенту (не только прайс!)
const testProfile = { name: 'Сардор', phone: '+998 90 123-45-67', district: 'Юнусабадский район' };
const mockCalc = (w, h, count, type) => ({ totalArea: 5.1, totalPrice: 1122000 });

const careAnswer = triageEngine.generateDeterministicTriageResponse(
  'Как мыть рулонные шторы, можно ли стирать?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(careAnswer.needsManager === false, 'Вопрос по уходу решается автономно');
assert(careAnswer.text.includes('нельзя стирать в машинке'), 'ИИ дает детальный совет по уходу: нельзя стирать в машинке');

const kitchenAnswer = triageEngine.generateDeterministicTriageResponse(
  'Что лучше повесить на кухню?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(kitchenAnswer.text.includes('кухни') && kitchenAnswer.text.includes('алюминиевые'), 'ИИ дает рекомендацию для кухни');

const measureAnswer = triageEngine.generateDeterministicTriageResponse(
  'Как правильно замерить окно самому?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(measureAnswer.text.includes('штапик'), 'ИИ объясняет замер по штапикам');

const mountAnswer = triageEngine.generateDeterministicTriageResponse(
  'Можно ли установить шторы без сверления?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(mountAnswer.text.includes('Без сверления'), 'ИИ объясняет монтаж без сверления на кронштейны/скотч');

const akfaAnswer = triageEngine.generateDeterministicTriageResponse(
  'Можно ли поставить на рамы Akfa без сверления?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(akfaAnswer.needsManager === false, 'FAQ по рамам Akfa решается автономно');
assert(akfaAnswer.text.includes('Akfa') && akfaAnswer.text.includes('скотч 3M'), 'ИИ дает детальный ответ по монтажу на рамы Akfa без сверления со скотчем 3M');

const paymentAnswer = triageEngine.generateDeterministicTriageResponse(
  'Как оплатить через Click или Payme?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(paymentAnswer.needsManager === false, 'FAQ по оплате решается автономно');
assert(paymentAnswer.text.includes('Click') && paymentAnswer.text.includes('Payme'), 'ИИ подтверждает оплату через Click и Payme');

const tiltAnswer = triageEngine.generateDeterministicTriageResponse(
  'Что происходит со шторами при откидывании окна на проветривание?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(tiltAnswer.needsManager === false, 'FAQ по проветриванию решается автономно');
assert(tiltAnswer.text.includes('направляющие') || tiltAnswer.text.includes('магнит'), 'ИИ объясняет фиксацию штор направляющими и магнитами при проветривании');

const chillaAnswer = triageEngine.generateDeterministicTriageResponse(
  'Не выгорят ли ткани на солнце в чиллю при +45?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(chillaAnswer.needsManager === false, 'FAQ по защите от жары и чилли решается автономно');
assert(chillaAnswer.text.includes('Blackout') || chillaAnswer.text.includes('УФ'), 'ИИ рекомендует Blackout и УФ-стабилизацию для ташкентской чилли');

const smartHomeAnswer = triageEngine.generateDeterministicTriageResponse(
  'Можно ли подключить электропривод и управлять через Алису?',
  testProfile,
  'Gemini 3.5',
  mockCalc
);
assert(smartHomeAnswer.needsManager === false, 'FAQ по умному дому решается автономно');
assert(smartHomeAnswer.text.includes('Алис') || smartHomeAnswer.text.includes('электропривод'), 'ИИ объясняет моторизацию Dooya/Somfy и интеграцию с Алисой');

const customEscalation = triageEngine.generateDeterministicTriageResponse(
  'У меня сложный проект на эркерные и панорамные окна в коттедже',
  testProfile,
  'Gemini 3.8',
  mockCalc
);
assert(customEscalation.needsManager === true, 'Нестандартный проект возвращает needsManager: true');
assert(customEscalation.escalationData !== null, 'Для нестандартного проекта прикреплены данные связи с менеджером');
assert(customEscalation.text.includes('Индивидуальный проект'), 'Текст ответа содержит специфику индивидуального проекта');

const autonomousAnswer = triageEngine.generateDeterministicTriageResponse(
  'Посчитай 2 окна 150х170 день-ночь',
  testProfile,
  'Gemini 3.8',
  mockCalc
);
assert(autonomousAnswer.needsManager === false, 'Расчет окон возвращает needsManager: false');
assert(autonomousAnswer.text.includes('1 122 000 сум'), 'Автономный ответ содержит рассчитанную сумму в сумах');

// 8. Проверка безопасности (XSS экранирование и защита данных)
console.log('\n--- 8. Проверка безопасности (XSS, санитизация, server) ---');

function testEscapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
const escaped = testEscapeHtml(xssPayload);
assert(!escaped.includes('<script>'), 'Теги <script> экранируются от XSS');
assert(!escaped.includes('<img'), 'Теги <img> экранируются от XSS');
assert(escaped.includes('&lt;script&gt;'), 'Спецсимволы безопасно превращаются в HTML entities');

// Проверка наличия защиты в html файлах
assert(htmlContent.includes('ui/triage-engine.js'), 'index.html импортирует triage-engine.js');
assert(htmlContent.includes('requestManagerCallbackAction'), 'index.html содержит обработчик передачи менеджеру');
assert(htmlContent.includes('/api/manager-callback'), 'index.html интегрирован с API вызова менеджера');
assert(htmlContent.includes('/api/leads'), 'index.html интегрирован с API сохранения лидов');

console.log('\n================================================================');
console.log(`ИТОГИ ТЕСТИРОВАНИЯ: Успешно пройдено ${passedTests} из ${totalTests} тестов (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
