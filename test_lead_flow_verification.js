import fs from 'fs';
import http from 'http';
import { SalesAgent, SALES_STAGES, formatWindowCount } from './ui/sales-agent.js';

const KNOWLEDGE_BASE_FILE = './data/knowledge_base.json';
const PRICING_FILE = './data/pricing.json';
const RETAIL_FILE = './data/retail_pricing.json';
const LEADS_FILE = './data/leads.json';

const kbData = JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_FILE, 'utf-8'));
const pricingData = fs.existsSync(PRICING_FILE) ? JSON.parse(fs.readFileSync(PRICING_FILE, 'utf-8')) : null;
const retailData = fs.existsSync(RETAIL_FILE) ? JSON.parse(fs.readFileSync(RETAIL_FILE, 'utf-8')) : null;

let passed = 0;
let failed = 0;

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
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, text: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('🚀 ТЕСТИРОВАНИЕ: ПРОВЕРКА И УЛУЧШЕНИЕ СОХРАНЕНИЯ ЗАЯВОК COMBO.UZ');
  console.log('================================================================\n');

  // --- 1. Проверка грамматики formatWindowCount ---
  console.log('--- 1. Проверка грамматики склонения окон ---');
  check(formatWindowCount(1, 'ru') === '1 окно', '1 окно (не 1 окон)');
  check(formatWindowCount(2, 'ru') === '2 окна', '2 окна');
  check(formatWindowCount(3, 'ru') === '3 окна', '3 окна');
  check(formatWindowCount(4, 'ru') === '4 окна', '4 окна');
  check(formatWindowCount(5, 'ru') === '5 окон', '5 окон');
  check(formatWindowCount(21, 'ru') === '21 окно', '21 окно');
  check(formatWindowCount(22, 'ru') === '22 окна', '22 окна');

  // --- 2. Проверка распознавания количества изделий ---
  console.log('\n--- 2. Определение количества изделий ---');
  {
    const agent1 = new SalesAgent(kbData, pricingData, retailData);
    agent1.processMessage('Хочу 1 окно День и ночь 150х200');
    check(agent1.session.order.windowCount === 1, '«1 окно» распознано как 1 изделие');
    check(agent1.session.order.isQuantitySpecified === true, 'Количество изделий помечено как указанное');

    const agentOne = new SalesAgent(kbData, pricingData, retailData);
    agentOne.processMessage('Здравствуйте, мне нужно одно окно день-ночь 150 на 200');
    check(agentOne.session.order.windowCount === 1, '«одно окно» распознано как 1 изделие');

    const agentPiece = new SalesAgent(kbData, pricingData, retailData);
    agentPiece.processMessage('Заказ на 1 изделие 150х200 день ночь');
    check(agentPiece.session.order.windowCount === 1, '«1 изделие» распознано как 1');

    const agentTwo = new SalesAgent(kbData, pricingData, retailData);
    agentTwo.processMessage('Хочу 2 окна День и ночь 150х200');
    check(agentTwo.session.order.windowCount === 2, '«2 окна» распознано как 2 изделия');
  }

  // --- 3. Многошаговый диалог: расчет, имя, телефон/район, сохранение заявки ---
  console.log('\n--- 3. Тест многошагового диалога и сохранения заявки ---');
  const agent = new SalesAgent(kbData, pricingData, retailData);

  // Шаг 1: Запрос цены с размерами 150х200
  const turn1 = agent.processMessage('Здравствуйте! Хочу заказать рулонные шторы День и Ночь. Ширина 150 см, высота 200 см. Сколько будет стоить?');
  check(turn1.calculation && turn1.calculation.totalArea === 3.0, 'Шаг 1: Площадь 3.0 м² определена верно');
  check(turn1.calculation.totalUZS === 300000, 'Шаг 1: Базовая стоимость 300 000 сум рассчитана');
  check(turn1.reply.includes('минимальная расчётная площадь 1 м² на каждое изделие'), 'Шаг 1: Формулировка «минимальная расчётная площадь 1 м² на каждое изделие»');
  check(!turn1.reply.includes('1 окон'), 'Шаг 1: Нет ошибки «1 окон»');
  check(!turn1.reply.includes('на створку'), 'Шаг 1: Нет формулировки «на створку»');
  check(turn1.reply.includes('БЕСПЛАТНО'), 'Шаг 1: Предложен бесплатный замер, дизайнер и монтаж');

  // Шаг 2: Клиент называет только имя "Рустам"
  const turn2 = agent.processMessage('Рустам');
  check(agent.session.client.name === 'Рустам', 'Шаг 2: Имя «Рустам» успешно сохранено в сессии');
  check(agent.session.stage === SALES_STAGES.LEAD_CAPTURE, 'Шаг 2: Статус диалога LEAD_CAPTURE (не сброшен в DISCOVERY)');
  check(!turn2.reply.includes('В какую комнату вы выбираете шторы'), 'Шаг 2: Агент НЕ сбросил диалог в общий опрос');
  check(!turn2.reply.includes('• Ваше имя'), 'Шаг 2: Агент НЕ запрашивает повторно уже названное имя');
  check(turn2.reply.includes('Номер телефона'), 'Шаг 2: Агент запрашивает недостающий телефон');
  check(turn2.reply.includes('Район'), 'Шаг 2: Агент запрашивает недостающий район');
  check(turn2.reply.includes('Рустам'), 'Шаг 2: Агент вежливо обращается по сохраненному имени');

  // Шаг 3: Клиент отправляет телефон и район
  const turn3 = agent.processMessage('+998 90 123 45 67, Чиланзар');
  check(agent.session.stage === SALES_STAGES.ORDER_PLACED, 'Шаг 3: Статус ORDER_PLACED');
  check(turn3.isOrderReady === true, 'Шаг 3: Флаг isOrderReady === true');
  check(turn3.leadData.name === 'Рустам', 'Шаг 3: Имя в заявке: Рустам');
  check(turn3.leadData.phone === '+998901234567', 'Шаг 3: Телефон в заявке: +998901234567');
  check(turn3.leadData.district === 'Чиланзар', 'Шаг 3: Район в заявке: Чиланзар');
  check(turn3.leadData.dimensions === '150×200 см', 'Шаг 3: Размеры в заявке: 150×200 см');
  check(turn3.leadData.quantity === 1, 'Шаг 3: Количество в заявке: 1');
  check(turn3.leadData.totalEstimateUZS === 300000, 'Шаг 3: Рассчитанная стоимость в заявке: 300 000 сум');
  check(turn3.leadData.model === 'Рулонные шторы День и Ночь', 'Шаг 3: Модель в заявке сохранена');
  check(turn3.leadData.fabricCollection === 'Базовая', 'Шаг 3: Ткань в заявке: Базовая');
  check(turn3.leadData.corniceType === 'Общий карниз', 'Шаг 3: Карниз в заявке: Общий карниз');

  // Регистрация лида на сервере (симуляция поведения фронтенда)
  const serverPostRes = await apiRequest('/api/leads', 'POST', {
    ...turn3.leadData,
    source: 'AI_TEST_SALES_CHAT'
  });
  check(serverPostRes.status === 200 && serverPostRes.data.success, 'Сервер: Заявка успешно сохранена в /api/leads');
  const savedLeadId = serverPostRes.data.leadId;
  agent.session.leadId = savedLeadId;

  // Шаг 4: Клиент благодарит
  const turn4 = agent.processMessage('Спасибо большое, жду звонка!');
  check(turn4.reply.includes('Рустам'), 'Шаг 4: Агент помнит имя в вежливом ответе');
  check(turn4.isOrderReady === false, 'Шаг 4: Агент не генерирует повторную заявку на спасибо');

  // Шаг 5: Клиент дополняет информацию в том же диалоге (время замера)
  const turn5 = agent.processMessage('Кстати, можете приехать завтра в 18:00?');
  const serverUpdateRes = await apiRequest('/api/leads', 'POST', {
    ...turn5.leadData,
    id: savedLeadId,
    notes: 'Клиент просит приехать завтра в 18:00',
    source: 'AI_TEST_SALES_CHAT'
  });
  check(serverUpdateRes.status === 200 && serverUpdateRes.data.success, 'Сервер: Заявка успешно обновлена');
  check(serverUpdateRes.data.isUpdated === true, 'Сервер: Флаг isUpdated === true (заявка обновлена, а не сдублирована)');
  check(serverUpdateRes.data.leadId === savedLeadId, 'Сервер: ID заявки остался прежним');

  // --- 4. Проверка журнала заявок (GET /api/leads) ---
  console.log('\n--- 4. Проверка журнала заявок в админ-панели ---');
  const leadsListRes = await apiRequest('/api/leads', 'GET');
  check(leadsListRes.status === 200, 'GET /api/leads возвращает 200 OK');
  const allLeads = leadsListRes.data.leads || [];
  const foundLead = allLeads.find(l => l.id === savedLeadId);
  check(Boolean(foundLead), 'Созданная заявка присутствует в списке заявок');
  if (foundLead) {
    check(foundLead.totalEstimateUZS === 300000, `Стоимость в сохраненной заявке: ${foundLead.totalEstimateUZS} сум (> 0)`);
    check(foundLead.quantity === 1, `Количество изделий в заявке: ${foundLead.quantity} (1 окно)`);
    check(foundLead.dimensions === '150×200 см', `Размеры в заявке: ${foundLead.dimensions}`);
    check(foundLead.name === 'Рустам', `Имя клиента в заявке: ${foundLead.name}`);
    check(foundLead.phone === '+998901234567', `Телефон клиента: ${foundLead.phone}`);
    check(foundLead.district === 'Чиланзар', `Район клиента: ${foundLead.district}`);
    check(foundLead.notes.includes('18:00'), `Примечания обновлены: ${foundLead.notes}`);
  }

  // Проверка, что исторические заявки НЕ удалены
  const initialLeadsCount = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8')).length;
  check(allLeads.length >= initialLeadsCount, `Исторические заявки сохранены (всего заявок: ${allLeads.length})`);

  console.log('\n================================================================');
  console.log(`ИТОГИ ТЕСТИРОВАНИЯ: Пройдено ${passed} из ${passed + failed} проверок (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
