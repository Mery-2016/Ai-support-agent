const fs = require('fs');
const assert = require('assert');
const path = require('path');
const db = require('./services/db');

console.log('================================================================');
console.log('🚀 ТЕСТИРОВАНИЕ: ПРОВЕРКА ОБНОВЛЕНИЯ FAQ И БАЗЫ ЗНАНИЙ COMBO.UZ');
console.log('================================================================\n');

// 1. Проверка index.html и tashkent_blinds_landing.html
console.log('--- 1. Проверка HTML-страниц ---');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const landingHtml = fs.readFileSync(path.join(__dirname, 'tashkent_blinds_landing.html'), 'utf8');

const expectedRuQuestions = [
  'Какие жалюзи и шторы можно заказать?',
  'Как узнать предварительную стоимость?',
  'Как рассчитывается цена рулонных штор?',
  'Замер, помощь дизайнера и установка платные?',
  'Вы работаете в других городах Узбекистана?',
  'В чём разница между шторами «День и Ночь» и Double?',
  'Можно ли стирать шторы «День и Ночь» в машинке?',
  'Как записаться на замер?'
];

const expectedUzQuestions = [
  'Qanday jalyuzi va pardalarni buyurtma qilish mumkin?',
  'Dastlabki narxni qanday bilish mumkin?',
  'Rolikli pardalar narxi qanday hisoblanadi?',
  'O‘lchash, dizayner yordami va o‘rnatish pullikmi?',
  'O‘zbekistonning boshqa shaharlarida ham ishlaysizmi?',
  '«Kun va Tun» va Double pardalari orasidagi farq nimada?',
  '«Kun va Tun» pardalarini kir yuvish mashinasida yuvsa bo‘ladimi?',
  'O‘lchashga qanday yozilish mumkin?'
];

[ { name: 'index.html', html: indexHtml }, { name: 'tashkent_blinds_landing.html', html: landingHtml } ].forEach(page => {
  console.log(`Проверка ${page.name}:`);
  assert(page.html.includes('id="faq"'), `[${page.name}] Секция #faq присутствует`);
  assert(page.html.includes('setFaqLanguage'), `[${page.name}] Функция переключения языков присутствует`);
  assert(page.html.includes('faq-notice-banner'), `[${page.name}] Баннер с уточнением у менеджера присутствует`);

  expectedRuQuestions.forEach((q, idx) => {
    assert(page.html.includes(q), `[${page.name}] Вопрос ${idx + 1} (RU) присутствует`);
  });
  expectedUzQuestions.forEach((q, idx) => {
    assert(page.html.includes(q), `[${page.name}] Вопрос ${idx + 1} (UZ) присутствует`);
  });
  console.log(`  ✅ [PASS] Все 8 вопросов и ответов на RU и UZ (латиница) присутствуют в ${page.name}`);
});

// 2. Проверка Базы Знаний
console.log('\n--- 2. Проверка Базы Знаний (knowledge_base.json) ---');
const kb = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'knowledge_base.json'), 'utf8'));

assert.strictEqual(kb.length, 100, 'База знаний сохраняет размер ровно 100 элементов');

const checkItems = [
  { id: 'kb-041', qRu: 'Какие жалюзи и шторы можно заказать?', qUz: 'Qanday jalyuzi va pardalarni buyurtma qilish mumkin?' },
  { id: 'kb-058', qRu: 'Как узнать предварительную стоимость?', qUz: 'Dastlabki narxni qanday bilish mumkin?' },
  { id: 'kb-057', qRu: 'Как рассчитывается цена рулонных штор?', qUz: 'Rolikli pardalar narxi qanday hisoblanadi?' },
  { id: 'kb-042', qRu: 'Замер, помощь дизайнера и установка платные?', qUz: 'O‘lchash, dizayner yordami va o‘rnatish pullikmi?' },
  { id: 'kb-073', qRu: 'Вы работаете в других городах Узбекистана?', qUz: 'O‘zbekistonning boshqa shaharlarida ham ishlaysizmi?' },
  { id: 'kb-023', qRu: 'В чём разница между шторами «День и Ночь» и Double?', qUz: '«Kun va Tun» va Double pardalari orasidagi farq nimada?' },
  { id: 'kb-002', qRu: 'Можно ли стирать шторы «День и Ночь» в машинке?', qUz: '«Kun va Tun» pardalarini kir yuvish mashinasida yuvsa bo‘ladimi?' },
  { id: 'kb-054', qRu: 'Как записаться на замер?', qUz: 'O‘lchashga qanday yozilish mumkin?' }
];

checkItems.forEach(item => {
  const found = kb.find(x => x.id === item.id);
  assert(found, `Элемент ${item.id} найден в KB`);
  assert.strictEqual(found.question_ru, item.qRu, `${item.id}: Вопрос RU совпадает`);
  assert.strictEqual(found.question_uz, item.qUz, `${item.id}: Вопрос UZ совпадает`);
  console.log(`  ✅ [PASS] ${item.id}: ${found.question_ru}`);
});

// Проверка правила: при отсутствии подтвержденных данных по срокам, гарантии, оплате — уточнить у менеджера
console.log('\n--- 3. Проверка правила уточнения у менеджера ---');
const escalationChecks = ['kb-060', 'kb-069', 'kb-070'];
escalationChecks.forEach(id => {
  const item = kb.find(x => x.id === id);
  assert(item.answer_ru.includes('уточнить') && item.answer_ru.includes('менеджер'), `${id}: Ответ RU содержит рекомендацию уточнить у менеджера`);
  assert(item.answer_uz.includes('menejer'), `${id}: Ответ UZ содержит рекомендацию обратиться к менеджеру`);
  console.log(`  ✅ [PASS] ${id}: содержит правило эскалации к менеджеру`);
});

console.log('\n================================================================');
console.log('ИТОГИ: Все проверки FAQ и базы знаний успешно пройдены! 🚀');
console.log('================================================================\n');
