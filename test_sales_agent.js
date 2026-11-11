/**
 * Automated Verification Suite for COMBO.UZ Sales Agent & Admin Panel
 * Tests:
 * 1. Knowledge Base integrity (100 Q&A, RU/UZ, categories, admin placeholders)
 * 2. SalesAgent Engine (Language detection, Objection handling, Sizing, Lead Capture)
 * 3. Server REST APIs (/api/knowledge-base, /api/leads)
 * 4. Regression tests for specific user errors:
 *    - "Сколько стоят рулонные шторы?" (must not return Double, must ask model & size)
 *    - "Посоветуй шторы для спальни от яркого солнца" (must recommend Blackout, not Roman)
 *    - No pushy measurement append on every turn
 *    - Uzbek language equivalents
 *    - Manager handover
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runTests() {
  console.log('================================================================');
  console.log('🚀 ТЕСТИРОВАНИЕ: SALES AI AGENT, 100 Q&A И ПАНЕЛЬ АДМИНИСТРАТОРА');
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

  // 1. Проверка файлов
  console.log('--- 1. Проверка созданных файлов проекта ---');
  const kbPath = path.join(__dirname, 'data', 'knowledge_base.json');
  const leadsPath = path.join(__dirname, 'data', 'leads.json');
  const agentModulePath = path.join(__dirname, 'ui', 'sales-agent.js');
  const testChatPath = path.join(__dirname, 'test_sales_chat.html');
  const adminPath = path.join(__dirname, 'admin.html');

  check(fs.existsSync(kbPath), 'Файл data/knowledge_base.json существует');
  check(fs.existsSync(leadsPath), 'Файл data/leads.json существует');
  check(fs.existsSync(agentModulePath), 'Модуль ui/sales-agent.js существует');
  check(fs.existsSync(testChatPath), 'Файл test_sales_chat.html существует');
  check(fs.existsSync(adminPath), 'Файл admin.html существует');

  // 2. Проверка структуры Базы Знаний (100 Q&A)
  console.log('\n--- 2. Проверка 100 Q&A Базы Знаний ---');
  const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
  check(Array.isArray(kb), 'База знаний представляет собой массив');
  check(kb.length === 100, `База знаний содержит ровно 100 вопросов и ответов (фактически: ${kb.length})`);

  // Categories breakdown
  const categories = {};
  let requiresAdminCount = 0;
  let validRuCount = 0;
  let validUzCount = 0;

  kb.forEach(item => {
    categories[item.category] = (categories[item.category] || 0) + 1;
    if (item.requires_admin) requiresAdminCount++;
    if (item.question_ru && item.answer_ru) validRuCount++;
    if (item.question_uz && item.answer_uz) validUzCount++;
  });

  check(validRuCount === 100, 'Все 100 статей имеют заполненный вопрос и ответ на русском языке');
  check(validUzCount === 100, 'Все 100 статей имеют заполненный вопрос и ответ на узбекском языке');
  check(requiresAdminCount > 0, `Присутствуют статьи с плейсхолдерами для администратора (фактически: ${requiresAdminCount})`);
  check(categories.models >= 30, `Категория моделей штор содержит подробные статьи (фактически: ${categories.models})`);
  check(categories.objections >= 10, `Категория отработки возражений содержит ключевые сценарии (фактически: ${categories.objections})`);
  check(categories.measuring_install >= 10, `Категория замеров и монтажа заполнена (фактически: ${categories.measuring_install})`);
  check(categories.pricing_discounts >= 10, `Категория цен и скидок заполнена (фактически: ${categories.pricing_discounts})`);
  check(categories.timeline_delivery_warranty >= 10, `Категория сроков, доставки и гарантий заполнена (фактически: ${categories.timeline_delivery_warranty})`);

  // 3. Проверка конкретных моделей из ТЗ
  console.log('\n--- 3. Проверка моделей штор по ТЗ ---');
  const subcategories = kb.map(x => x.subcategory);
  check(subcategories.includes('zebra_day_night'), 'Присутствуют статьи по шторам День-Ночь (Зебра)');
  check(subcategories.includes('blackout'), 'Присутствуют статьи по шторам Blackout 100%');
  check(subcategories.includes('plisse'), 'Присутствуют статьи по шторам Плиссе (Plisse)');
  check(subcategories.includes('honeycomb'), 'Присутствуют статьи по сотовым шторам Honeycomb');
  check(subcategories.includes('double'), 'Присутствуют статьи по двойным рулонным шторам Double');
  check(subcategories.includes('tulle'), 'Присутствуют статьи по тюлевым шторам / шторам-тюль');
  check(subcategories.includes('dikey'), 'Присутствуют статьи по жалюзи Dikey (Дикей)');
  check(subcategories.includes('vertical_tulle'), 'Присутствуют статьи по вертикальным тюлевым жалюзи');
  check(subcategories.includes('roman'), 'Присутствуют статьи по римским шторам');
  check(subcategories.includes('aluminum'), 'Присутствуют статьи по горизонтальным алюминиевым жалюзи');
  check(subcategories.includes('wood_vertical'), 'Присутствуют статьи по вертикальным тканевым жалюзи');

  // 4. Проверка сценариев возражений
  console.log('\n--- 4. Проверка обязательных сценариев возражений ---');
  const objectionItems = kb.filter(x => x.category === 'objections');
  const objectionIds = objectionItems.map(x => x.subcategory);
  check(objectionIds.includes('expensive'), 'Сценарий отработки возражения «Дорого» присутствует');
  check(objectionIds.includes('will_think'), 'Сценарий отработки возражения «Я подумаю» присутствует');
  check(objectionIds.includes('competitors_cheaper'), 'Сценарий отработки возражения «У конкурентов дешевле» присутствует');
  check(objectionIds.includes('discount_request'), 'Сценарий отработки возражения «Можно скидку?» присутствует');

  // 5. Проверка логики SalesAgent
  console.log('\n--- 5. Проверка структуры класса SalesAgent ---');
  const salesAgentFile = fs.readFileSync(agentModulePath, 'utf-8');
  check(salesAgentFile.includes('class SalesAgent'), 'Класс SalesAgent объявлен');
  check(salesAgentFile.includes('detectLanguage'), 'Метод определения языка (RU/UZ) реализован');
  check(salesAgentFile.includes('checkObjection'), 'Обработчик возражений реализован');
  check(salesAgentFile.includes('handleLeadCaptureStep'), 'Формирование заявки для менеджера реализовано');
  check(salesAgentFile.includes('extractClientDetails'), 'Парсинг телефонов (+998), имен и размеров окон реализован');

  // 6. Проверка сервера и эндпоинтов
  console.log('\n--- 6. Проверка API сервера (server.js) ---');
  const serverFile = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf-8');
  check(serverFile.includes('/api/knowledge-base'), 'Эндпоинт GET/POST /api/knowledge-base реализован');
  check(serverFile.includes('/api/knowledge-base/item'), 'Эндпоинт добавления/редактирования Q&A реализован');
  check(serverFile.includes('/api/leads'), 'Эндпоинт GET/POST /api/leads реализован');
  check(serverFile.includes('update-status'), 'Эндпоинт обновления статуса заявки реализован');
  check(serverFile.includes('/api/pricing'), 'Эндпоинт GET/POST /api/pricing реализован');

  // 7. Специфические тесты на исправленные ошибки, прайс-лист и узбекский язык
  console.log('\n--- 7. Тесты на исправленные ошибки, прайс-лист и качество диалога ---');
  const { SalesAgent } = await import('./ui/sales-agent.js');
  const agent = new SalesAgent(kb);

  // Тест 1 (RU): "Сколько стоят рулонные шторы?"
  const priceRu = agent.processMessage('Сколько стоят рулонные шторы?');
  const priceRuRaw = priceRu.reply;
  const expectedRuPrice = 'Здравствуйте! 😊 Стоимость рулонных штор зависит от выбранной ткани, модели и размеров окна. Подскажите, пожалуйста, какая модель вас интересует и какие примерные размеры окна? Я помогу с предварительным расчётом.';
  check(priceRuRaw === expectedRuPrice, 'Вопрос о цене (RU): ответ в точности соответствует утвержденному стандарту COMBO.UZ');
  check(!priceRuRaw.includes('160 000') && !priceRuRaw.includes('220 000') && !priceRuRaw.includes('280 000') && !priceRuRaw.includes('310 000'), 'Вопрос о цене (RU): неподтвержденные цены (160k, 220k, 280k, 310k) НЕ озвучиваются клиенту');
  check(!priceRuRaw.includes('$S =') && !priceRuRaw.includes('\\text'), 'Вопрос о цене (RU): технические формулы LaTeX ($S=, \\text) отсутствуют');

  // Тест 1 (UZ): "Rolikli pardalar qancha turadi?"
  const priceUz = agent.processMessage('Rolikli pardalar qancha turadi?');
  const priceUzRaw = priceUz.reply;
  const expectedUzPrice = 'Assalomu alaykum! 😊 Rolikli pardalar narxi tanlangan mato, model va deraza o‘lchamlariga bog‘liq. Ayting-chi, sizni aynan qaysi model qiziqtiradi va derazangizning taxminiy o‘lchamlari qanday? Dastlabki hisob-kitobda bajonidil yordam beraman.';
  check(priceUzRaw === expectedUzPrice, 'Вопрос о цене (UZ): tabiiy o‘zbekcha javob standartga to‘liq mos keladi');
  check(!priceUzRaw.includes('160 000') && !priceUzRaw.includes('220 000') && !priceUzRaw.includes('280 000') && !priceUzRaw.includes('310 000'), 'Вопрос о цене (UZ): tasdiqlanmagan narxlar mijozga aytilmaydi');
  check(!priceUzRaw.includes('$S =') && !priceUzRaw.includes('\\text'), 'Вопрос о цене (UZ): formuladagi texnik belgilar olib tashlangan');

  // Расчет по размерам без технических формул
  const sizingAgent = new SalesAgent(kb);
  sizingAgent.processMessage('Мне нужны шторы День-Ночь, размеры 150 на 170 см');
  const calcResult = sizingAgent.handleCalculationResponse('ru');
  check(!calcResult.reply.includes('$S =') && !calcResult.reply.includes('\\text'), 'Расчет по размерам (RU): математические формулы представлены простым понятным текстом');
  check(calcResult.reply.includes('минимальная расчётная площадь 1 м² на каждое изделие') || calcResult.reply.includes('минимальная расчетная площадь 1 м² на каждое изделие'), 'Расчет по размерам (RU): минимальная расчётная площадь 1 м² на каждое изделие');

  const calcResultUz = sizingAgent.handleCalculationResponse('uz');
  check(!calcResultUz.reply.includes('$S =') && !calcResultUz.reply.includes('\\text'), 'Hisob-kitob (UZ): formulalar oddiy va tushunarli matnda ko‘rsatilgan');

  // Проверка структуры официального прайс-листа (data/pricing.json)
  const pricingFilePath = path.join(__dirname, 'data', 'pricing.json');
  check(fs.existsSync(pricingFilePath), 'Файл data/pricing.json существует');
  const pricingData = JSON.parse(fs.readFileSync(pricingFilePath, 'utf-8'));
  check(pricingData.isConfirmed === false, 'Прайс-лист изначально помечен как не подтвержденный (isConfirmed: false)');
  check(Array.isArray(pricingData.items) && pricingData.items.length === 12, `Прайс-лист содержит ровно 12 основных категорий (фактически: ${pricingData.items ? pricingData.items.length : 0})`);

  // Проверка уникальности и отсутствия дубликатов
  const itemIds = pricingData.items.map(x => x.id);
  const uniqueIds = new Set(itemIds);
  check(uniqueIds.size === 12, 'В каталоге ровно 12 уникальных категорий без дубликатов');

  const expected12Ids = [
    'day_night', 'rollo', 'double', 'dikey', 'tulle', 'vertical_tulle',
    'plisse', 'cassette', 'mini', 'horizontal_alu', 'photo_print', 'roman'
  ];
  const all12Present = expected12Ids.every(id => itemIds.includes(id));
  check(all12Present, 'Все 12 обязательных категорий присутствуют в прайс-листе');

  // Проверка уточненных описаний по ТЗ
  const doubleItem = pricingData.items.find(x => x.id === 'double');
  check(doubleItem && doubleItem.description_ru.includes('система с двумя полотнами: одно плотное, второе прозрачное, как тюль'),
    'Double: описание точно соответствует ТЗ (одно плотное, второе прозрачное, как тюль)');

  const dikeyItem = pricingData.items.find(x => x.id === 'dikey');
  check(dikeyItem && dikeyItem.description_ru.includes('тюлевая система, в которой сочетаются плотные тканевые участки по бокам и прозрачная тюлевая часть посередине'),
    'Dikey: описание точно соответствует ТЗ (плотные участки по бокам и прозрачная часть посередине)');

  const romanItem = pricingData.items.find(x => x.id === 'roman');
  check(romanItem && romanItem.description_ru.includes('тканевые шторы, которые при подъёме собираются в горизонтальные складки'),
    'Римские шторы: описание точно соответствует ТЗ (при подъёме собираются в горизонтальные складки)');

  // Проверка раздельности Dikey, Тюлевых и Вертикальных тюлевых
  const dikeyCat = pricingData.items.find(x => x.id === 'dikey');
  const tulleCat = pricingData.items.find(x => x.id === 'tulle');
  const vertTulleCat = pricingData.items.find(x => x.id === 'vertical_tulle');
  check(dikeyCat && tulleCat && vertTulleCat && dikeyCat.id !== tulleCat.id && tulleCat.id !== vertTulleCat.id,
    'Dikey, Тюлевые жалюзи и Вертикальные тюлевые сохранены отдельными категориями');

  // Проверка наличия названий на узбекском языке для всех 12 категорий
  const allHaveUzNames = pricingData.items.every(x => x.name_uz && x.name_uz.length > 3);
  check(allHaveUzNames, 'Все 12 категорий имеют корректные названия на узбекском языке');

  // Проверка каталога на index.html
  const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  check(indexHtmlContent.includes('12 основных категорий'), 'Лендинг index.html отмечает 12 категорий каталога');
  check(indexHtmlContent.includes('Жалюзи Dikey') && indexHtmlContent.includes('Римские шторы') && indexHtmlContent.includes('Рулонные шторы Double'),
    'В каталоге index.html присутствуют новые и уточненные категории');

  // Ошибка 2: "Посоветуй шторы для спальни от яркого солнца" (RU)
  const bedRu = agent.processMessage('Посоветуй шторы для спальни от яркого солнца');
  const bedRuText = bedRu.reply.toLowerCase();
  check(bedRuText.includes('blackout') || bedRuText.includes('блэкаут'), 'Ошибка 2 (RU): для спальни от солнца рекомендуется Blackout 100%');
  check(!bedRuText.includes('римские шторы — это ровное'), 'Ошибка 2 (RU): не предлагает римские шторы вместо светозащиты');
  check(bedRuText.includes('темнота') || bedRuText.includes('день-ночь'), 'Ошибка 2 (RU): предлагает выбор между 100% темнотой и регулировкой полосами');

  // Ошибка 2 (UZ): "Yotoqxona uchun quyoshdan qaysi pardani tavsiya qilasiz?"
  const bedUz = agent.processMessage('Yotoqxona uchun quyoshdan qaysi pardani tavsiya qilasiz?');
  const bedUzText = bedUz.reply.toLowerCase();
  check(bedUzText.includes('blackout'), 'Ошибка 2 (UZ): yotoqxona uchun Blackout tavsiya qilinadi');
  check(!bedUzText.includes('rim pardalari — ko‘tarilganda'), 'Ошибка 2 (UZ): Rim pardalari chiqib ketmaydi');

  // Ошибка 3: Навязчивый замерщик
  const kbQuestion = agent.processMessage('Как правильно мыть и ухаживать за рулонными шторами?');
  check(!kbQuestion.reply.includes('🚗 Выезд замерщика с полным каталогом образцов по Ташкенту — **бесплатный**'), 'Ошибка 3: замерщик НЕ предлагается навязчиво после каждого ответа');

  // Менеджер
  const managerReq = agent.processMessage('Соедините с менеджером, пожалуйста');
  check(managerReq.needsManager === true, 'Передача дежурному менеджеру работает корректно (needsManager: true)');
  check(managerReq.reply.includes('200-55-77'), 'Предоставлен телефон менеджера для связи');

  // 8. Тестирование официального розничного прайса (Excel 01.10.2025) и бизнес-правил
  console.log('\n--- 8. Тестирование официального розничного прайса и бизнес-правил ---');
  const retailFilePath = path.join(__dirname, 'data', 'retail_price_list.json');
  check(fs.existsSync(retailFilePath), 'Файл data/retail_price_list.json существует');
  const retailData = JSON.parse(fs.readFileSync(retailFilePath, 'utf-8'));
  check(Array.isArray(retailData.rollerBlinds) && retailData.rollerBlinds.length >= 29, `Таблица рулонных штор заполнена (фактически: ${retailData.rollerBlinds.length})`);
  check(Array.isArray(retailData.tulleBlinds) && retailData.tulleBlinds.length === 21, `Таблица тюлевых жалюзи заполнена (фактически: ${retailData.tulleBlinds.length})`);
  check(Array.isArray(retailData.plisseAndHoneycomb) && retailData.plisseAndHoneycomb.length === 10, `Таблица плиссе и Honeycomb заполнена (фактически: ${retailData.plisseAndHoneycomb.length})`);
  check(Array.isArray(retailData.rules) && retailData.rules.length === 11, `Таблица правил работы с прайсом содержит ровно 11 пунктов (фактически: ${retailData.rules.length})`);
  check(Boolean(retailData.calculationRules && retailData.calculationRules.minAreaPerItem === 1.0), 'Правило минимальной расчетной площади 1.0 м² зафиксировано');
  check(Boolean(retailData.serviceTerms && retailData.serviceTerms.tashkent.specialistVisitWithoutOrder === 100000), 'Условие Ташкента: 100 000 сум при отказе от заказа зафиксировано');

  // Сервер: проверка наличия эндпоинта /api/retail-pricing
  check(serverFile.includes('/api/retail-pricing'), 'Эндпоинт GET/POST /api/retail-pricing реализован в server.js');

  // Расчет: минимальная площадь изделия 1.0 м² (0.8 x 0.9 м = 0.72 м² -> рассчитывается как 1.0 м²)
  const smallWindowAgent = new SalesAgent(kb, pricingData, retailData);
  smallWindowAgent.processMessage('Посчитай окно 80 на 90 см ткань Star');
  const smallCalc = smallWindowAgent.calculateEstimate();
  check(smallCalc.actualArea === 0.72, 'Фактическая площадь 80х90 см = 0.72 м²');
  check(smallCalc.singleArea === 1.0, 'Минимальная расчетная площадь 1.0 м² применена для окна 80х90 см');
  check(smallCalc.totalUZS === 215000, 'Сумма для 80х90 см Star (карниз): 1.0 м² * 215 000 = 215 000 сум');

  // Расчет: фактическая площадь для окна больше 1.0 м² (1.5 x 1.7 м = 2.55 м²)
  const bigWindowAgent = new SalesAgent(kb, pricingData, retailData);
  bigWindowAgent.processMessage('Посчитай 1 окно 150 на 170 см ткань Star');
  const bigCalc = bigWindowAgent.calculateEstimate();
  check(bigCalc.actualArea === 2.55, 'Фактическая площадь 150х170 см = 2.55 м²');
  check(bigCalc.singleArea === 2.55, 'Для окна больше 1 м² используется фактическая площадь (2.55 м²)');
  check(bigCalc.totalUZS === Math.round(2.55 * 215000), 'Сумма для 150х170 см Star: 2.55 * 215 000 = 548 250 сум');

  // Проверка условий сервиса в Ташкенте (RU): бесплатно при заказе, 100 000 сум без заказа
  const serviceRu = agent.processMessage('Сколько стоит выезд замерщика и установка в Ташкенте?');
  const serviceRuText = serviceRu.reply.toLowerCase();
  check(serviceRuText.includes('бесплатно') && serviceRuText.includes('при оформлении заказа'), 'Ташкент (RU): замер и установка БЕСПЛАТНО при оформлении заказа');
  check(serviceRuText.includes('100 000') || serviceRuText.includes('100000'), 'Ташкент (RU): выезд специалиста 100 000 сум, если заказ не оформляется');

  // Проверка условий сервиса в Ташкенте (UZ)
  const serviceUz = agent.processMessage('O‘lchash va o‘rnatish xizmati qancha turadi?');
  const serviceUzText = serviceUz.reply.toLowerCase();
  check(serviceUzText.includes('bepul') && serviceUzText.includes('buyurtma'), 'Toshkent (UZ): o‘lchash va o‘rnatish buyurtma rasmiylashtirilganda BEPUL');
  check(serviceUzText.includes('100 000') || serviceUzText.includes('100000'), 'Toshkent (UZ): buyurtma berilmasa — tashrif 100 000 so‘m');

  // Проверка работы по регионам Узбекистана (RU): заказы принимаются, выезд не обещается бесплатным
  const regionRu = agent.processMessage('Работаете ли вы в Самарканде и по Узбекистану?');
  const regionRuText = regionRu.reply.toLowerCase();
  check(regionRuText.includes('по всему узбекистану'), 'Регионы (RU): заказы принимаются по всему Узбекистану');
  check(regionRuText.includes('менеджер') || regionRuText.includes('согласовываются'), 'Регионы (RU): условия выезда вне Ташкента согласовываются с менеджером');
  check(regionRuText.includes('не гарантируется') || regionRuText.includes('не обещаем') || regionRuText.includes('индивидуально'), 'Регионы (RU): бесплатный выезд в регионы не гарантируется');

  // Проверка работы по регионам Узбекистана (UZ)
  const regionUz = agent.processMessage('Samarqand va Buxoroga yetkazib berish bormi?');
  const regionUzText = regionUz.reply.toLowerCase();
  check(regionUzText.includes('butun o‘zbekiston') || regionUzText.includes('butun ozbekiston'), 'Hududlar (UZ): butun O‘zbekiston bo‘ylab buyurtmalar qabul qilinadi');
  check(regionUzText.includes('menejer'), 'Hududlar (UZ): shartlar menejer bilan kelishiladi');

  // Проверка поиска коллекции в розничном прайсе (Коллекция STAR)
  const starRu = agent.processMessage('Сколько стоит ткань Star?');
  const starRuText = starRu.reply;
  check(starRuText.includes('215 000') || starRuText.includes('215000'), 'Коллекция Star (RU): названа официальная цена общего карниза 215 000 сум/м²');
  check(starRuText.includes('230 000') || starRuText.includes('230000'), 'Коллекция Star (RU): названа цена кассеты 230 000 сум/м²');
  check(starRuText.includes('160 000') || starRuText.includes('160000'), 'Коллекция Star (RU): названа цена мини 160 000 сум/м²');
  check(starRuText.includes('1.0 м²') || starRuText.includes('1 м²'), 'Коллекция Star (RU): озвучено правило минимальной площади 1.0 м²');

  // Проверка предложения оставить телефон
  check(starRuText.includes('размеры') && (starRuText.includes('номер телефона') || starRuText.includes('телефон')), 'Коллекция Star (RU): агент запрашивает размеры и предлагает оставить телефон');

  // 9. Тестирование исправленной логики: Запрос цены с размерами 150х200 см (День и Ночь)
  console.log('\n--- 9. Тестирование исправленной логики: Запрос цены с размерами 150х200 см ---');
  const dnAgent = new SalesAgent(kb, pricingData, retailData);
  const dnQuery = 'Здравствуйте! Хочу заказать рулонные шторы День и Ночь. Ширина 150 см, высота 200 см. Сколько будет стоить?';
  const dnRes = dnAgent.processMessage(dnQuery);

  // 1. Не переходит сразу в LEAD_CAPTURE, а рассчитывает стоимость
  check(dnRes.stage === 'SIZING', 'Тест 150х200 (RU): статус диалога SIZING (не запрашивает контакты сразу без расчета)');
  check(Boolean(dnRes.calculation), 'Тест 150х200 (RU): объект расчета сформирован');
  check(dnRes.calculation.actualArea === 3 && dnRes.calculation.singleArea === 3, 'Тест 150х200 (RU): площадь рассчитана верно: 1.5м × 2.0м = 3.0 м²');

  const dnText = dnRes.reply;
  // 2. Использование цен из розничного прайса
  check(dnText.includes('300 000') || dnText.includes('300000'), 'Тест 150х200 (RU): названа стоимость общего карниза от 300 000 сум (100k сум/м² * 3 м²)');
  check(dnText.includes('660 000') || dnText.includes('660000'), 'Тест 150х200 (RU): названа стоимость кассетной системы от 660 000 сум (220k сум/м² * 3 м²)');
  check(dnText.includes('390 000') || dnText.includes('390000'), 'Тест 150х200 (RU): названа стоимость мини-системы от 390 000 сум (130k сум/м² * 3 м²)');

  // 3. Уточнение параметров ткани и механизма
  check(dnText.includes('карниз') && (dnText.includes('кассет') || dnText.includes('мини')), 'Тест 150х200 (RU): уточняются недостающие параметры карниза/механизма');
  check(dnText.includes('ткань') || dnText.includes('плотность'), 'Тест 150х200 (RU): уточняется категория/плотность ткани');

  // 4. Правило расчета площади и минимальная площадь 1 м²
  check(dnText.includes('1.5') && dnText.includes('2') && (dnText.includes('3 м²') || dnText.includes('3.0 м²')), 'Тест 150х200 (RU): отображена формула: ширина (1.5 м) × высота (2 м) = 3 м²');
  check(dnText.includes('1.0') || dnText.includes('1 м²'), 'Тест 150х200 (RU): озвучено правило минимальной площади 1.0 м² на створку');

  // 5. Условия сервиса в Ташкенте (бесплатный замер, дизайнер, монтаж при заказе; 100 000 сум без заказа)
  check(dnText.includes('БЕСПЛАТНО') && dnText.includes('при оформлении заказа'), 'Тест 150х200 (RU): замер, дизайнер и монтаж БЕСПЛАТНО при оформлении заказа');
  check(dnText.includes('100 000') || dnText.includes('100000'), 'Тест 150х200 (RU): указана стоимость выезда 100 000 сум, если заказ не оформляется');

  // 6. Мягкое предложение контактов в конце консультации
  check(dnText.includes('имя') && dnText.includes('номер телефона') && dnText.includes('район'), 'Тест 150х200 (RU): в конце предложено оставить имя, телефон и район для связи');

  // 7. Сценарий последующей отправки контактов клиентом (Turn 2)
  const contactMsg = 'Меня зовут Рустам, телефон +998 90 123 45 67, Чиланзар';
  const contactRes = dnAgent.processMessage(contactMsg);
  check(contactRes.stage === 'ORDER_PLACED', 'Тест Turn 2 (RU): после передачи контактов статус переходит в ORDER_PLACED');
  check(contactRes.isOrderReady === true, 'Тест Turn 2 (RU): флаг готовности заказа isOrderReady === true');
  check(contactRes.leadData && contactRes.leadData.name === 'Рустам', 'Тест Turn 2 (RU): имя клиента сохранено (Рустам)');
  check(contactRes.leadData && contactRes.leadData.phone === '+998901234567', 'Тест Turn 2 (RU): телефон клиента сохранен (+998901234567)');
  check(contactRes.leadData && contactRes.leadData.district === 'Чиланзар', 'Тест Turn 2 (RU): район сохранен (Чиланзар)');

  // 8. Тест на узбекском языке (150х200 см, Kun va Tun)
  const dnAgentUz = new SalesAgent(kb, pricingData, retailData);
  const dnQueryUz = 'Assalomu alaykum! Kun va Tun rolikli pardalarga buyurtma bermoqchiman. Eni 150 sm, boyi 200 sm. Qancha boladi?';
  const dnResUz = dnAgentUz.processMessage(dnQueryUz);
  check(dnResUz.stage === 'SIZING', 'Тест 150х200 (UZ): bosqich SIZING (to‘g‘ridan-to‘g‘ri raqam so‘ramasdan hisob-kitob qiladi)');
  const dnTextUz = dnResUz.reply;
  check(dnTextUz.includes('300 000') || dnTextUz.includes('300000'), 'Тест 150х200 (UZ): umumiy karniz 300 000 so‘m dan');
  check(dnTextUz.includes('660 000') || dnTextUz.includes('660000'), 'Тест 150х200 (UZ): kasseta tizimi 660 000 so‘m dan');
  check(dnTextUz.includes('BEPUL') && dnTextUz.includes('100 000'), 'Тест 150х200 (UZ): Toshkent shartlari (bepul va 100 000 so‘m) ko‘rsatilgan');
  check(dnTextUz.includes('ismingiz') && dnTextUz.includes('telefon') && dnTextUz.includes('tuman'), 'Тест 150х200 (UZ): oxirida ism, telefon va tuman so‘ralgan');

  // 9. Правило 8: Если клиент сразу хочет вызвать замерщика без вопросов о цене и размерах
  const directMeasurerAgent = new SalesAgent(kb, pricingData, retailData);
  const directMeasurerRes = directMeasurerAgent.processMessage('Здравствуйте! Хочу вызвать замерщика на дом.');
  check(directMeasurerRes.stage === 'LEAD_CAPTURE', 'Правило 8: при прямом запросе замерщика без цен/размеров сразу запускается сбор контактов');
  check(directMeasurerRes.needsContactInfo === true, 'Правило 8: флаг needsContactInfo === true');
  check(directMeasurerRes.reply.includes('Ваше имя') && directMeasurerRes.reply.includes('Номер телефона'), 'Правило 8: агент запрашивает имя, телефон и район');

  console.log('\n================================================================');
  console.log(`ИТОГИ ТЕСТИРОВАНИЯ: Успешно пройдено ${pass} из ${total} тестов (${Math.round((pass/total)*100)}%)`);
  console.log('================================================================\n');

  if (pass === total) process.exit(0);
  else process.exit(1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
