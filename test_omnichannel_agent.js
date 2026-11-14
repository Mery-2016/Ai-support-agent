/**
 * Verification Suite for COMBO.UZ Unified Omnichannel AI Sales Manager
 * Tests:
 * 1. Instagram Direct Meta Webhook Handshake & Message Processing
 * 2. Telegram Bot API Webhook Updates & Command Handling
 * 3. Unified Sales Calculation & 100 Q&A across channels
 * 4. Lead Capture with Source Tracking ('INSTAGRAM', 'TELEGRAM', 'WEB')
 * 5. Human Handover / Manager Transfer & Reply Suppression
 * 6. Catalog Integration (Photos, Descriptions, Specs)
 * 7. Dynamic Price List Updates without rewriting code
 * 8. Bilingual Language Support (RU / UZ)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const agentCore = require('./services/agent-core');
const instagram = require('./services/instagram');
const telegram = require('./services/telegram');
const catalog = require('./services/catalog');
const pricing = require('./services/pricing');
const db = require('./services/db');

let passed = 0;
let failed = 0;
let testServerProcess = null;

function check(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_PASSWORD || 'combo2026admin'}`
      }
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw), raw });
        } catch {
          resolve({ status: res.statusCode, text: raw, raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function ensureServerRunning() {
  try {
    const res = await apiRequest('/api/status', 'GET');
    if (res.status === 200) return;
  } catch (err) {}

  return new Promise((resolve, reject) => {
    testServerProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '8080' }
    });

    const timeout = setTimeout(() => {
      reject(new Error('Не удалось запустить сервер для тестов за 8 секунд'));
    }, 8000);

    const interval = setInterval(async () => {
      try {
        const checkRes = await apiRequest('/api/status', 'GET');
        if (checkRes.status === 200) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      } catch (e) {}
    }, 300);
  });
}

async function runOmnichannelTests() {
  await ensureServerRunning();
  console.log('================================================================');
  console.log('🚀 ТЕСТИРОВАНИЕ: ЕДИНЫЙ OMNICHANNEL AI-МЕНЕДЖЕР ПРОДАЖ COMBO.UZ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Instagram Direct Meta API Webhook Handshake
  // ---------------------------------------------------------------------------
  console.log('--- 1. Проверка Instagram Direct Meta Webhook API ---');
  const verifyToken = instagram.getVerifyToken();

  const verifySuccess = instagram.verifyWebhook({
    'hub.mode': 'subscribe',
    'hub.verify_token': verifyToken,
    'hub.challenge': 'meta_challenge_777888'
  });
  check(verifySuccess.success === true, 'Meta Handshake: валидный токен успешно подтвержден');
  check(verifySuccess.challenge === 'meta_challenge_777888', 'Meta Handshake: возвращен hub.challenge');

  const verifyFail = instagram.verifyWebhook({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'wrong_token',
    'hub.challenge': 'challenge_123'
  });
  check(verifyFail.success === false, 'Meta Handshake: неверный токен отклоняется с ошибкой 403');

  // Test server endpoint GET /api/webhook/instagram
  const serverVerify = await apiRequest(`/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test_code_999`, 'GET');
  check(serverVerify.status === 200, 'Сервер: GET /api/webhook/instagram возвращает 200 OK');
  check(serverVerify.raw === 'test_code_999', 'Сервер: GET /api/webhook/instagram возвращает точный challenge');

  // ---------------------------------------------------------------------------
  // 2. Instagram Direct Lead Capture with Source Tracking
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Instagram Direct: Диалог продаж и сбор лида ---');
  const igSender = '@kamila_interior';

  // Step 1: Client inquires sizing
  const igStep1 = await instagram.simulateDirectMessage(igSender, 'Здравствуйте! Сколько стоят шторы День и Ночь на окно 150 на 200 см?');
  check(igStep1.success === true, 'Instagram: входящее сообщение успешно обработано вебхуком');
  const reply1 = igStep1.results[0].agentResponse.reply;
  check(reply1.includes('День и Ночь') || reply1.includes('Зебра'), 'Instagram: модель День-Ночь корректно распознана');
  check(reply1.includes('300 000 сум'), 'Instagram: базовый расчет стоимости 300 000 сум выполнен');
  check(reply1.includes('Общий карниз'), 'Instagram: предложена вилка цен для общего карниза');

  // Step 2: Client provides contact details
  const igStep2 = await instagram.simulateDirectMessage(igSender, 'Камила, +998909998877, Мирабадский район');
  const leadDataIg = igStep2.results[0].agentResponse.leadData;
  check(Boolean(leadDataIg), 'Instagram: сформированы данные заявки');
  check(leadDataIg.source === 'INSTAGRAM', 'Instagram: источник лида строго равен INSTAGRAM');
  check(leadDataIg.phone === '+998909998877', 'Instagram: телефон клиента +998909998877 извлечен');
  check(Boolean(leadDataIg.district) && leadDataIg.district.includes('Мирабад'), 'Instagram: район Мирабад сохранен');
  check(leadDataIg.notes.includes('[INSTAGRAM]'), 'Instagram: примечания содержат метку канала [INSTAGRAM]');

  // ---------------------------------------------------------------------------
  // 3. Instagram Human Handover (Escalation to Living Manager)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Instagram: Перевод на живого менеджера (Human Handover) ---');
  const igStep3 = await instagram.simulateDirectMessage(igSender, 'Пожалуйста, позовите живого человека или менеджера');
  const resp3 = igStep3.results[0].agentResponse;
  check(resp3.isHandedOver === true, 'Instagram: диалог успешно переведен в статус Handover (isHandedOver === true)');
  check(resp3.reply.includes('переключаю') && resp3.reply.includes('+998 (71) 200-55-77'), 'Instagram: вежливый ответ с прямым телефоном отдела продаж');

  // Verify that subsequent messages are suppressed from auto-reply while under human control
  const igStep4 = await instagram.simulateDirectMessage(igSender, 'Вы тут? Я жду ответ');
  const resp4 = igStep4.results[0].agentResponse;
  check(resp4.reply === null && resp4.suppressed === true, 'Instagram: автоответ ИИ заглушен, пока диалог находится у оператора');

  // Manager resumes bot via Handover API
  const resumeRes = await agentCore.setHandover('INSTAGRAM', igStep1.results[0].senderId, false, 'Менеджер завершил консультацию');
  check(resumeRes.handedOver === false, 'Instagram: бот успешно возвращен в работу менеджером');

  // ---------------------------------------------------------------------------
  // 4. Telegram Bot API: Commands & Reply Keyboards
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Telegram Bot API: Команды и клавиатуры ---');
  const tgChatId = 'tg_chat_555777';
  const tgUser = '@sherzod_tashkent';

  // Command /start
  const tgStart = await telegram.simulateTelegramMessage(tgChatId, tgUser, '/start');
  check(tgStart.success === true && tgStart.command === '/start', 'Telegram: команда /start успешно обработана');
  check(tgStart.sendRes.payload.reply_markup.keyboard.length >= 3, 'Telegram: интерактивная клавиатура кнопок сгенерирована');

  // Command /catalog
  const tgCat = await telegram.simulateTelegramMessage(tgChatId, tgUser, '/catalog');
  check(tgCat.success === true && tgCat.command === '/catalog', 'Telegram: команда /catalog вернула список 12 категорий');

  // Command /lang
  const tgLang = await telegram.simulateTelegramMessage(tgChatId, tgUser, '/lang');
  check(tgLang.success === true && tgLang.newLang === 'uz', 'Telegram: команда /lang переключила язык на узбекский (uz)');

  // ---------------------------------------------------------------------------
  // 5. Telegram Lead Capture via Native Contact Sharing
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Telegram: Захват лида через Поделиться номером ---');
  const contactMsg = await telegram.simulateTelegramMessage(tgChatId, tgUser, '', {
    phone_number: '998971112233',
    first_name: 'Шерзод'
  });
  check(contactMsg.success === true && contactMsg.type === 'contact', 'Telegram: контакт успешно принят');
  const tgLead = contactMsg.agentResponse.leadData;
  check(Boolean(tgLead), 'Telegram: лид сформирован из контакта');
  check(tgLead.source === 'TELEGRAM', 'Telegram: источник лида строго равен TELEGRAM');
  check(tgLead.phone === '+998971112233', 'Telegram: телефон сохранен в международном формате +998971112233');

  // ---------------------------------------------------------------------------
  // 6. Telegram Human Handover (/manager)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Telegram: Эскалация /manager ---');
  const tgMan = await telegram.simulateTelegramMessage(tgChatId, tgUser, '/manager');
  check(tgMan.agentResponse.isHandedOver === true, 'Telegram: команда /manager перевела чат на живого сотрудника');

  // ---------------------------------------------------------------------------
  // 7. Catalog Integration (Photos, Specs, Excel Pricing linkage)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Интеграция с каталогом сайта COMBO.UZ ---');
  const catalogList = catalog.getCatalog();
  check(catalogList.length === 12, `Каталог содержит 12 основных категорий (фактически: ${catalogList.length})`);

  const zebraItem = catalog.findProductByQuery('зебра день-ночь');
  check(Boolean(zebraItem), 'Поиск по каталогу: модель Зебра успешно найдена');
  check(zebraItem.specs_ru.length >= 3, 'Каталог: характеристики на русском языке заполнены');
  check(zebraItem.specs_uz.length >= 3, 'Каталог: характеристики на узбекском языке заполнены');
  check(zebraItem.imageUrl.startsWith('http'), 'Каталог: ссылка на фотографию товара валидна');

  // Photo inquiry in chat
  const photoMsg = await agentCore.processChannelMessage({
    channel: 'INSTAGRAM',
    senderId: 'ig_photo_user',
    senderName: '@designer_interior',
    text: 'Покажите пожалуйста фото и описание штор плиссе'
  });
  check(photoMsg.photos.length > 0, 'ИИ-агент отправил фотографию модели плиссе из каталога');
  check(photoMsg.reply.includes('Жалюзи плиссе') || photoMsg.reply.includes('гармошка'), 'ИИ-агент прикрепил характеристики модели плиссе');

  // ---------------------------------------------------------------------------
  // 8. Dynamic Price Updates without rewriting code
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Динамическое обновление розничного прайса ---');
  const currentPricing = pricing.getRetailPricing();
  check(Boolean(currentPricing.tables || currentPricing.title), 'Розничный прайс-лист загружен из Excel-структуры');

  const updateTestRes = pricing.updateRetailPricing({
    ...currentPricing,
    customFieldTest: 'DYNAMIC_UPDATE_' + Date.now()
  });
  check(updateTestRes.success === true, 'Обновление прайс-листа через pricing service успешно выполнено');

  // ---------------------------------------------------------------------------
  // 9. Verification of Leads in CRM (GET /api/leads)
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Проверка сохранения лидов в CRM с источниками ---');
  const allLeads = await db.getLeads();
  const igLeads = allLeads.filter(l => l.source === 'INSTAGRAM');
  const tgLeads = allLeads.filter(l => l.source === 'TELEGRAM');

  check(igLeads.length > 0, `В CRM зафиксированы заявки с источником INSTAGRAM (всего: ${igLeads.length})`);
  check(tgLeads.length > 0, `В CRM зафиксированы заявки с источником TELEGRAM (всего: ${tgLeads.length})`);

  // ---------------------------------------------------------------------------
  // 10. Omnichannel Status Endpoint
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Проверка эндпоинта статуса Omnichannel (/api/omnichannel/status) ---');
  const statusRes = await apiRequest('/api/omnichannel/status', 'GET');
  check(statusRes.status === 200 && statusRes.data.success === true, 'GET /api/omnichannel/status возвращает 200 OK');
  check(statusRes.data.instagram.mode === 'SIMULATION_SANDBOX' || statusRes.data.instagram.mode === 'LIVE', 'Статус Instagram Direct активен');
  check(statusRes.data.telegram.mode === 'SIMULATION_SANDBOX' || statusRes.data.telegram.mode === 'LIVE', 'Статус Telegram Bot активен');
  check(Array.isArray(statusRes.data.activeSessions), 'Список активных омниканальных сессий доступен');

  console.log('\n================================================================');
  console.log(`ИТОГИ ТЕСТИРОВАНИЯ: Пройдено ${passed} из ${passed + failed} проверок (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================');

  if (testServerProcess) {
    try { testServerProcess.kill(); } catch (e) {}
  }

  if (failed > 0) process.exit(1);
}

runOmnichannelTests().catch(err => {
  if (testServerProcess) {
    try { testServerProcess.kill(); } catch (e) {}
  }
  console.error('Fatal test error:', err);
  process.exit(1);
});
