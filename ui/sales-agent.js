/**
 * COMBO.UZ Sales AI Agent Core Engine
 * 
 * Features:
 * - Official Retail Price List integration (roller, tulle, plisse/honeycomb) from 01.10.2025
 * - Strict Calculation Rules: Width (m) × Height (m) × Price per 1 m², minimum billable area 1.0 m² per item
 * - Tashkent Service Conditions: Measuring, designer help, and install FREE with order; 100 000 UZS specialist visit without order
 * - Uzbekistan Nationwide Scope: Orders accepted across all regions, outside Tashkent terms by manager, no free region visit promised
 * - Strict rule: Never invent unconfirmed prices, payment terms, or discounts; transfer to manager and softly capture phone
 * - Accurate Intent Routing (Price Inquiry, Sizing, Room Advisory, Objections, Regions, Manager Escalation)
 * - Clean stopword-filtered Knowledge Base retrieval without false positives
 * - Zero pushy measurement spam after every message
 * - Full bilingual RU & UZ support
 */

import { DEFAULT_RETAIL_PRICING } from './retail-pricing-data.js';

export const SALES_STAGES = {
  GREETING: 'GREETING',
  DISCOVERY: 'DISCOVERY',
  PRICE_INQUIRY: 'PRICE_INQUIRY',
  ROOM_ADVISORY: 'ROOM_ADVISORY',
  MODEL_INQUIRY: 'MODEL_INQUIRY',
  SIZING: 'SIZING',
  OBJECTION: 'OBJECTION',
  LEAD_CAPTURE: 'LEAD_CAPTURE',
  ORDER_PLACED: 'ORDER_PLACED',
  MANAGER_ESCALATION: 'MANAGER_ESCALATION'
};

export const CATALOG_PRICES = {
  day_night: { name_ru: 'Рулонные шторы День и Ночь', name_uz: '«Kun va Tun» rolikli pardalari', fromUZS: 220000 },
  rollo: { name_ru: 'Рулонные шторы Ролло', name_uz: 'Rollo rolikli pardalari', fromUZS: 160000 },
  double: { name_ru: 'Рулонные шторы Double', name_uz: 'Double (Dabl) rolikli pardalari', fromUZS: 330000 },
  dikey: { name_ru: 'Жалюзи Dikey', name_uz: 'Dikey jalyuzilari', fromUZS: 290000 },
  tulle: { name_ru: 'Тюлевые жалюзи', name_uz: 'Tul jalyuzilari', fromUZS: 290000 },
  vertical_tulle: { name_ru: 'Вертикальные тюлевые жалюзи', name_uz: 'Vertikal tul jalyuzilari', fromUZS: 290000 },
  plisse: { name_ru: 'Жалюзи плиссе', name_uz: 'Plisse jalyuzilari', fromUZS: 310000 },
  cassette: { name_ru: 'Кассетные жалюзи', name_uz: 'Kassetali jalyuzilar', fromUZS: 280000 },
  mini: { name_ru: 'Мини-жалюзи', name_uz: 'Mini-jalyuzilar', fromUZS: 160000 },
  horizontal_alu: { name_ru: 'Горизонтальные алюминиевые жалюзи', name_uz: 'Gorizontal alyuminiy jalyuzi', fromUZS: 130000 },
  photo_print: { name_ru: 'Рулонные шторы с фотонанесением', name_uz: 'Fototasvir tushirilgan rolikli pardalar', fromUZS: 250000 },
  roman: { name_ru: 'Римские шторы', name_uz: 'Rim pardalari', fromUZS: 310000 }
};

const GENERIC_STOPWORDS = new Set([
  'шторы', 'штор', 'штора', 'штору', 'шторами', 'жалюзи', 'рулонные', 'рулонных', 'рулонная', 'рулонную',
  'parda', 'pardalar', 'pardalari', 'pardalarni', 'jalyuzi', 'jalyuzilar',
  'какие', 'какая', 'какой', 'какие-то', 'что', 'как', 'посоветуй', 'посоветуйте', 'подскажи', 'подскажите',
  'расскажи', 'расскажите', 'qanday', 'nima', 'qaysi', 'tavsiya', 'uchun', 'для', 'или', 'это', 'мне', 'нам',
  'хочу', 'хотим', 'хотел', 'хотела', 'istayman', 'kerak', 'bor', 'bormi'
]);

const IGNORE_RETAIL_MATCH = new Set([
  'коллекция', 'коллекции', 'раздел', 'шторы', 'штор', 'штора', 'жалюзи', 'рулонные', 'рулонных',
  'ткань', 'ткани', 'модель', 'модели', 'сколько', 'стоит', 'стоят', 'какая', 'цена', 'прайс',
  'parda', 'pardalar', 'jalyuzi', 'narxi', 'qancha', 'mato', 'matosi', 'toifa', 'посоветуй', 'посоветуйте'
]);

export const formatPrice = (num) => String(num || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function formatWindowCount(count, lang = 'ru') {
  const n = Math.abs(Number(count) || 1);
  if (lang === 'uz') {
    return `${n} ta deraza`;
  }
  if (n % 10 === 1 && n % 100 !== 11) {
    return `${n} окно`;
  } else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) {
    return `${n} окна`;
  } else {
    return `${n} окон`;
  }
}

export function formatItemCount(count, lang = 'ru') {
  const n = Math.abs(Number(count) || 1);
  if (lang === 'uz') {
    return `${n} ta mahsulot`;
  }
  if (n % 10 === 1 && n % 100 !== 11) {
    return `${n} изделие`;
  } else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) {
    return `${n} изделия`;
  } else {
    return `${n} изделий`;
  }
}

export function buildContactPrompt(client, lang = 'ru') {
  const missingRu = [];
  const missingUz = [];

  if (!client || !client.name) {
    missingRu.push('ваше **имя**');
    missingUz.push('**ismingiz**');
  }
  if (!client || !client.phone) {
    missingRu.push('**номер телефона**');
    missingUz.push('**telefon raqamingiz**');
  }
  if (!client || (!client.district && !client.region)) {
    missingRu.push('**район Ташкента** (или ваш город)');
    missingUz.push('**tumaningiz** (yoki shahringiz)');
  }

  if (lang === 'uz') {
    if (missingUz.length === 0) {
      return `Barcha kerakli aloqa ma’lumotlari qayd etildi (mijoz: **${client.name}**, tel: **${client.phone}**, hudud: **${client.district || client.region}**). Menejerimiz qulay o‘lchash vaqtini kelishish uchun siz bilan bog‘lanadi!`;
    }
    return `Dastlabki hisobni biriktirish va mutaxassisimiz mato kataloglari bilan borishi uchun, iltimos, ${missingUz.join(', ')}ni qoldira olasizmi?`;
  } else {
    if (missingRu.length === 0) {
      return `Все контактные данные уже зафиксированы (клиент: **${client.name}**, тел: **${client.phone}**, район: **${client.district || client.region}**). Наш менеджер перезвонит вам для согласования удобного времени замера!`;
    }
    return `Чтобы зафиксировать предварительный расчет и направить к вам мастера с каталогами тканей, подскажите, пожалуйста, ${missingRu.join(', ')}!`;
  }
}

export class SalesAgent {
  constructor(knowledgeBase = [], pricing = null, retailPricing = null) {
    this.kb = Array.isArray(knowledgeBase) ? knowledgeBase : [];
    this.pricing = pricing;
    this.retailPricing = retailPricing || DEFAULT_RETAIL_PRICING;
    this.session = {
      lang: 'ru', // 'ru' or 'uz'
      stage: SALES_STAGES.GREETING,
      leadId: null,
      isLeadSubmitted: false,
      client: {
        name: '',
        phone: '',
        district: '',
        region: '',
        address: ''
      },
      order: {
        room: '',
        selectedModel: '',
        selectedCollection: null,
        fabricCollection: '',
        corniceType: '',
        mechanism: 'standardCornice', // standardCornice | cassette | mini
        widthCm: null,
        heightCm: null,
        windowCount: 1,
        isQuantitySpecified: false,
        totalEstimateUZS: 0,
        notes: ''
      },
      history: [],
      matchedKbId: null,
      lastObjection: null,
      needsManager: false
    };
  }

  setKnowledgeBase(kbList) {
    if (Array.isArray(kbList)) {
      this.kb = kbList;
    }
  }

  setPricing(pricingData) {
    this.pricing = pricingData;
  }

  setRetailPricing(retailPricingData) {
    if (retailPricingData) {
      this.retailPricing = retailPricingData;
    }
  }

  setLanguage(lang) {
    if (lang === 'uz' || lang === 'ru') {
      this.session.lang = lang;
    }
  }

  detectLanguage(text) {
    if (!text || typeof text !== 'string') return this.session.lang;
    const uzWords = [
      'qanday', 'qancha', 'narxi', 'kerak', 'mumkinmi', 'boladimi', 'bo‘ladimi',
      'qimmat', 'rahmat', 'buyurtma', 'salom', 'assalomu', 'toshkent', 'parda',
      'jalyuzi', 'olchov', 'o‘lchov', 'xona', 'oyna', 'deraza', 'boshqa', 'chegirma',
      'yotoqxona', 'oshxona', 'zal', 'uyqu', 'chilla', 'bering', 'aytishingiz', 'bormi',
      'viloyat', 'viloyatlarga', 'kelishiladi', 'shartlari'
    ];
    const lower = text.toLowerCase();
    let uzMatches = 0;
    for (const w of uzWords) {
      if (lower.includes(w)) uzMatches++;
    }
    if (/[o‘o']|g['‘]|[қғҳ]/i.test(lower)) uzMatches += 2;

    if (uzMatches >= 2 || (uzMatches >= 1 && !/[а-яё]/i.test(lower))) {
      return 'uz';
    }
    if (/[а-яё]/i.test(lower)) {
      return 'ru';
    }
    return this.session.lang;
  }

  /**
   * Search retail collections from official retail price list
   */
  findRetailItem(query) {
    if (!query || typeof query !== 'string') return null;
    const q = query.toLowerCase().trim();
    const rawTokens = q.split(/[\s,+/_\-\.\?!;:\(\)]+/).filter(t => t.length >= 3 && !IGNORE_RETAIL_MATCH.has(t));
    if (rawTokens.length === 0) return null;

    const retail = this.retailPricing || DEFAULT_RETAIL_PRICING;

    // Honeycomb alias
    if (/(honeycomb|hony comb|сотов|asalari)/i.test(q)) {
      const item = (retail.plisseAndHoneycomb || []).find(x => x.collection.includes('HONY COMB'));
      if (item) return { type: 'plisse', data: item, matchedToken: 'honeycomb' };
    }

    // Double alias
    if (/(double|дабл|двойн)/i.test(q)) {
      const item = (retail.rollerBlinds || []).find(x => x.category === 'Double');
      if (item) return { type: 'roller', data: item, matchedToken: 'double' };
    }

    // Rimskie alias
    if (/(римские|римка|римских|rim pard)/i.test(q)) {
      const item = (retail.rollerBlinds || []).find(x => x.category === 'Римские');
      if (item) return { type: 'roller', data: item, matchedToken: 'римские' };
    }

    // Plisse check if query mentions plisse
    if (/(плиссе|plisse)/i.test(q)) {
      for (const item of (retail.plisseAndHoneycomb || [])) {
        const parts = item.collection.toLowerCase().split(/[\s,/]+/);
        for (const t of rawTokens) {
          if (parts.some(p => p === t || (t.length >= 4 && p.includes(t)))) {
            return { type: 'plisse', data: item, matchedToken: t };
          }
        }
      }
    }

    // Roller blinds check
    for (const item of (retail.rollerBlinds || [])) {
      const parts = item.collections.toLowerCase().split(/[\s,/-]+/).filter(p => !IGNORE_RETAIL_MATCH.has(p) && p.length >= 3);
      for (const t of rawTokens) {
        if (parts.some(p => p === t || (t.length >= 5 && p.includes(t)))) {
          return { type: 'roller', data: item, matchedToken: t };
        }
      }
    }

    // Tulle blinds check
    for (const item of (retail.tulleBlinds || [])) {
      const parts = item.name.toLowerCase().split(/[\s,+/_-]+/).filter(p => !IGNORE_RETAIL_MATCH.has(p) && p.length >= 3);
      for (const t of rawTokens) {
        if (parts.some(p => p === t || (t.length >= 5 && p.includes(t)))) {
          return { type: 'tulle', data: item, matchedToken: t };
        }
      }
    }

    // Plisse general check
    for (const item of (retail.plisseAndHoneycomb || [])) {
      const parts = item.collection.toLowerCase().split(/[\s,/]+/);
      for (const t of rawTokens) {
        if (parts.some(p => p === t || (t.length >= 4 && p.includes(t)))) {
          return { type: 'plisse', data: item, matchedToken: t };
        }
      }
    }

    return null;
  }

  extractClientDetails(text) {
    if (!text || typeof text !== 'string') return;
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Phone regex for Uzbekistan (+998...) or 9-digit direct format
    const phoneMatch = trimmed.match(/(?:\+?998[\s-]?)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/) ||
                       trimmed.match(/(?:тел(?:ефон)?\s*[:=-]?\s*)?(?:\+?998)?[\s-]?([9873]\d[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})\b/);
    if (phoneMatch) {
      let clean = phoneMatch[0].replace(/[^\d+]/g, '');
      if (!clean.startsWith('+')) clean = '+' + clean;
      if (clean.length === 10 && clean.startsWith('+9')) clean = '+998' + clean.slice(2);
      this.session.client.phone = clean;
    }

    // 2. Window dimensions (e.g., "Ширина 150 см, высота 200 см", "150х170", "1.5 на 1.7", "150*170 см", "80х90", "Eni 150 sm, bo‘yi 200 sm")
    let hasDimensions = false;
    const wExp = trimmed.match(/(?:ширина|шириной|ширину|eni)\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(см|sm|м|m)?/i);
    const hExp = trimmed.match(/(?:высота|высотой|высоту|bo[‘']?yi|balandligi)\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(см|sm|м|m)?/i);

    if (wExp && hExp) {
      let valW = parseFloat(wExp[1].replace(',', '.'));
      let unitW = wExp[2] ? wExp[2].toLowerCase() : (valW < 10 ? 'm' : 'cm');
      if (unitW === 'm' || (valW < 10 && unitW !== 'см' && unitW !== 'sm')) valW = valW * 100;

      let valH = parseFloat(hExp[1].replace(',', '.'));
      let unitH = hExp[2] ? hExp[2].toLowerCase() : (valH < 10 ? 'm' : 'cm');
      if (unitH === 'm' || (valH < 10 && unitH !== 'см' && unitH !== 'sm')) valH = valH * 100;

      this.session.order.widthCm = Math.round(valW);
      this.session.order.heightCm = Math.round(valH);
      hasDimensions = true;
    } else {
      const pairMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:см|sm|м|m)?\s*(?:[xх*×]|на|va|ga)\s*(\d+(?:[.,]\d+)?)\s*(?:см|sm|м|m)?/i);
      if (pairMatch) {
        let val1 = parseFloat(pairMatch[1].replace(',', '.'));
        let val2 = parseFloat(pairMatch[2].replace(',', '.'));
        if (val1 < 10) val1 = val1 * 100;
        if (val2 < 10) val2 = val2 * 100;
        this.session.order.widthCm = Math.round(val1);
        this.session.order.heightCm = Math.round(val2);
        hasDimensions = true;
      }
    }

    // 3. Window quantity (e.g., "1 окно", "одно окно", "1 изделие", "одно изделие", "2 окна", "3 створки", "1 ta deraza", "bitta deraza")
    let hasQuantity = false;
    const wordNumbers = {
      'одно': 1, 'одна': 1, 'один': 1, 'одну': 1, 'одного': 1, 'одному': 1, 'одним': 1,
      'два': 2, 'две': 2, 'двух': 2, 'двоих': 2,
      'три': 3, 'трех': 3, 'трёх': 3,
      'четыре': 4, 'четырех': 4, 'четырёх': 4,
      'пять': 5, 'пяти': 5,
      'шесть': 6, 'шести': 6,
      'семь': 7, 'семи': 7,
      'восемь': 8, 'восьми': 8,
      'девять': 9, 'девяти': 9,
      'десять': 10, 'десяти': 10,
      'bitta': 1, 'bir': 1, 'bitta deraza': 1,
      'ikkita': 2, 'ikki': 2,
      'uchta': 3, 'uch': 3,
      'to‘rtta': 4, 'tortta': 4, "to'rtta": 4, 'to‘rt': 4, 'tort': 4,
      'beshta': 5, 'besh': 5,
      'oltita': 6, 'olti': 6,
      'yettita': 7, 'yetti': 7,
      'sakkizta': 8, 'sakkiz': 8,
      'to‘qqizta': 9, 'toqqizta': 9, 'to‘qqiz': 9, 'toqqiz': 9,
      'o‘nta': 10, 'onta': 10, 'o‘n': 10, 'on': 10
    };

    const digitCountMatch = trimmed.match(/(?:на\s+|для\s+|всего\s+)?(\d+)\s*(?:ок[оа]?н[а-яё]*|издели[а-яё]*|створк[а-яё]*|проем[а-яё]*|рам[а-яё]*|шт\.?(?:ук[а-яё]*)?|deraza[a-z‘']*|tabaqa[a-z‘']*|oyna[a-z‘']*|mahsulot[a-z‘']*|dona)(?:\b|\s+|$|[.,;:!?])/i);
    if (digitCountMatch) {
      const parsed = parseInt(digitCountMatch[1], 10);
      if (parsed > 0) {
        this.session.order.windowCount = parsed;
        this.session.order.isQuantitySpecified = true;
        hasQuantity = true;
      }
    } else {
      const wordCountMatch = trimmed.match(/(?:на\s+|для\s+|всего\s+)?(одн[оаиуеы]|дв[аеух]|тр[иехё]|четыр[ехёя]|пят[ьи]|шест[ьи]|сем[ьи]|восем[ьи]|девят[ьи]|десят[ьи]|bitta|bir|ikkita|ikki|uchta|uch|to[‘']?rtta|tortta|beshta|besh)\s+(?:ок[оа]?н[а-яё]*|издели[а-яё]*|створк[а-яё]*|проем[а-яё]*|рам[а-яё]*|шт\.?(?:ук[а-яё]*)?|deraza[a-z‘']*|tabaqa[a-z‘']*|oyna[a-z‘']*|mahsulot[a-z‘']*|dona)(?:\b|\s+|$|[.,;:!?])/i);
      if (wordCountMatch) {
        const wordKey = wordCountMatch[1].toLowerCase();
        let val = wordNumbers[wordKey];
        if (!val) {
          for (const [k, v] of Object.entries(wordNumbers)) {
            if (wordKey.startsWith(k) || k.startsWith(wordKey)) {
              val = v;
              break;
            }
          }
        }
        if (val) {
          this.session.order.windowCount = val;
          this.session.order.isQuantitySpecified = true;
          hasQuantity = true;
        }
      }
    }

    if (!hasQuantity && (this.session.stage === SALES_STAGES.PRICE_INQUIRY || this.session.stage === SALES_STAGES.SIZING || this.session.stage === SALES_STAGES.LEAD_CAPTURE)) {
      const shortCountMatch = trimmed.match(/^(?:на\s+|для\s+)?(\d{1,2})$/i);
      if (shortCountMatch) {
        const parsed = parseInt(shortCountMatch[1], 10);
        if (parsed > 0 && parsed <= 50) {
          this.session.order.windowCount = parsed;
          this.session.order.isQuantitySpecified = true;
          hasQuantity = true;
        }
      } else {
        const shortWordMatch = trimmed.match(/^(?:на\s+|для\s+)?(одн[оаиуеы]|дв[аеух]|тр[иехё]|четыр[ехёя]|пят[ьи]|шест[ьи]|сем[ьи]|восем[ьи]|девят[ьи]|десят[ьи]|bitta|bir|ikkita|ikki|uchta|uch)$/i);
        if (shortWordMatch) {
          const val = wordNumbers[shortWordMatch[1].toLowerCase()];
          if (val) {
            this.session.order.windowCount = val;
            this.session.order.isQuantitySpecified = true;
            hasQuantity = true;
          }
        }
      }
    }

    // 4. Mechanism type & Cornice name
    if (/(кассет|kasset)/i.test(lower)) {
      this.session.order.mechanism = 'cassette';
      this.session.order.corniceType = 'Кассетная система';
    } else if (/(мини|mini)/i.test(lower)) {
      this.session.order.mechanism = 'mini';
      this.session.order.corniceType = 'Мини-система';
    } else if (/(общий карниз|карниз|стандарт|karniz)/i.test(lower)) {
      this.session.order.mechanism = 'standardCornice';
      this.session.order.corniceType = 'Общий карниз';
    }

    // 5. Tashkent districts (all 12 districts with spelling variants)
    const districtPatterns = [
      { name: 'Юнусабад', regex: /(?:юнусабад|yunusobod)/i },
      { name: 'Чиланзар', regex: /(?:чиланзар|чилонзор|chilonzor)/i },
      { name: 'Мирзо-Улугбек', regex: /(?:мирзо[\s-]*улугбек|mirzo[\s-]*ulug[‘']?bek)/i },
      { name: 'Яккасарай', regex: /(?:яккасарай|yakkasaroy)/i },
      { name: 'Мирабад', regex: /(?:мирабад|миробод|mirobod)/i },
      { name: 'Шайхантахур', regex: /(?:шайхант[ао][х]?ур|shayxontohur)/i },
      { name: 'Алмазар', regex: /(?:алмазар|олмазор|olmazor)/i },
      { name: 'Учтепа', regex: /(?:учтепа|uchtepa)/i },
      { name: 'Яшнабад', regex: /(?:яшнабад|яшнобод|yashnobod)/i },
      { name: 'Сергели', regex: /(?:сергели|sergeli)/i },
      { name: 'Бектемир', regex: /(?:бектемир|bektemir)/i },
      { name: 'Янгихаёт', regex: /(?:янгиха[её]т|yangihayot)/i }
    ];
    let districtFoundInThisTurn = false;
    for (const dp of districtPatterns) {
      if (dp.regex.test(trimmed)) {
        this.session.client.district = dp.name;
        districtFoundInThisTurn = true;
        break;
      }
    }

    // 6. Uzbekistan regions
    const regions = [
      'Самарканд', 'Бухара', 'Фергана', 'Андижан', 'Наманган', 'Карши', 'Навои',
      'Термез', 'Нукус', 'Ургенч', 'Джизак', 'Гулистан', 'Хорезм', 'Кашкадарья',
      'Сурхандарья', 'Сырдарья', 'Ташкентская область', 'Таш. область',
      'Samarqand', 'Buxoro', 'Farg‘ona', 'Andijon', 'Namangan', 'Qarshi', 'Navoiy',
      'Termiz', 'Nukus', 'Urganch', 'Jizzax', 'Guliston', 'Xorazm', 'Qashqadaryo',
      'Surxondaryo', 'Sirdaryo'
    ];
    for (const r of regions) {
      if (lower.includes(r.toLowerCase())) {
        this.session.client.region = r;
        districtFoundInThisTurn = true;
        break;
      }
    }

    // 7. Robust Name detection (session memory, avoids re-asking already provided name)
    const nameBefore = this.session.client.name;
    if (!this.session.client.name) {
      const nonNames = new Set([
        'здравствуйте', 'привет', 'добрый', 'салом', 'assalomu', 'assalom', 'salom',
        'шторы', 'жалюзи', 'день', 'ночь', 'ролло', 'rollo', 'зебра', 'zebra',
        'плиссе', 'plisse', 'римские', 'дикей', 'dikey', 'double', 'дабл',
        'общий', 'карниз', 'кассета', 'мини', 'mini', 'kasseta', 'karniz',
        'ташкент', 'чиланзар', 'юнусабад', 'мирабад', 'алмазар', 'яккасарай',
        'сергели', 'учтепа', 'яшнабад', 'бектемир', 'янгихаёт', 'toshkent',
        'chilonzor', 'yunusobod', 'mirobod', 'olmazor', 'yakkasaroy', 'sergeli', 'uchtepa', 'yashnobod',
        'спасибо', 'понятно', 'хорошо', 'да', 'нет', 'ок', 'ok', 'rahmat', 'mayli', 'xo‘p', 'xop',
        'замер', 'выезд', 'установка', 'монтаж', 'цена', 'стоимость', 'расчет', 'заказ', 'заявка',
        'окно', 'окна', 'окон', 'створка', 'створки', 'створок', 'изделие', 'изделия', 'изделий',
        'спальня', 'спальни', 'спальню', 'кухня', 'кухни', 'кухню', 'зал', 'зала', 'гостиная', 'гостиной', 'гостиную',
        'детская', 'детской', 'детскую', 'балкон', 'балкона', 'солнце', 'солнца', 'комната', 'комнаты', 'комнату'
      ]);

      // A. Explicit label: "Имя: Рустам", "Мое имя Рустам", "Mening ismim Sardor", "Ismim Sardor"
      const explicitLabel = trimmed.match(/(?:имя|мо[её]\s+имя|клиент|mening\s+ismim|ismim|ism)\s*[:=-]?\s*([А-ЯЁA-Z][а-яёa-z]+)/i);
      if (explicitLabel && explicitLabel[1] && !nonNames.has(explicitLabel[1].toLowerCase())) {
        this.session.client.name = explicitLabel[1];
      }

      // B. Phrase: "меня зовут Рустам", "я Рустам", "men Sardor"
      if (!this.session.client.name) {
        const phraseMatch = trimmed.match(/(?:меня\s+зовут|зовут|менинг\s+исмим|исмим)\s+([А-ЯЁA-Z][а-яёa-z]+)/i);
        if (phraseMatch && phraseMatch[1] && !nonNames.has(phraseMatch[1].toLowerCase())) {
          this.session.client.name = phraseMatch[1];
        }
      }
      if (!this.session.client.name) {
        const yaMatch = trimmed.match(/(?:^|[.,!?\s])(?:я|men)\s+([А-ЯЁ][а-яё]+)\b/);
        if (yaMatch && yaMatch[1] && !nonNames.has(yaMatch[1].toLowerCase())) {
          this.session.client.name = yaMatch[1];
        }
      }

      // C. Name before phone or district: "Рустам, +998...", "Рустам +998...", "Рустам, Чиланзар"
      if (!this.session.client.name) {
        const leadPattern = trimmed.match(/^([А-ЯЁA-Z][а-яёa-z]{2,20})[\s,]+(?:\+?998|\d{9}|чиланзар|юнусабад|мирабад|алмазар|яккасарай|сергели|учтепа|яшнабад|бектемир|янгиха[её]т|chilonzor|yunusobod|toshkent|ташкент)/i);
        if (leadPattern && leadPattern[1] && !nonNames.has(leadPattern[1].toLowerCase())) {
          this.session.client.name = leadPattern[1];
        }
      }

      // D. Standalone name message (1-2 capitalized words, e.g. "Рустам" or "Сардор Алимов")
      if (!this.session.client.name) {
        const cleanWords = trimmed.split(/[\s,]+/);
        if (cleanWords.length >= 1 && cleanWords.length <= 2) {
          const firstWord = cleanWords[0];
          if (/^[А-ЯЁA-Z][а-яёa-z]{2,20}$/.test(firstWord) && !nonNames.has(firstWord.toLowerCase())) {
            if (cleanWords.length === 2 && /^[А-ЯЁA-Z][а-яёa-z]{2,20}$/.test(cleanWords[1]) && !nonNames.has(cleanWords[1].toLowerCase())) {
              this.session.client.name = `${firstWord} ${cleanWords[1]}`;
            } else if (cleanWords.length === 1) {
              this.session.client.name = firstWord;
            }
          }
        }
      }
    }
    const nameFoundInThisTurn = !nameBefore && Boolean(this.session.client.name);

    // Specific retail collection & Fabric detection
    const retailMatch = this.findRetailItem(trimmed);
    if (retailMatch) {
      this.session.order.selectedCollection = retailMatch;
      if (retailMatch.data) {
        this.session.order.fabricCollection = retailMatch.data.collections || retailMatch.data.name || retailMatch.data.collection;
      }
    }
    if (/(блэкаут|блекаут|blackout|100%)/i.test(lower)) {
      this.session.order.fabricCollection = 'Blackout 100%';
    } else if (/(базов|китай|xitoy|oddiy)/i.test(lower) && !this.session.order.fabricCollection) {
      this.session.order.fabricCollection = 'Базовая (Китай)';
    } else if (/(турци|турецк|turkiya|naqshli)/i.test(lower) && !this.session.order.fabricCollection) {
      this.session.order.fabricCollection = 'Турецкая с узором';
    }

    // Explicit Model selection (strict matching, no substring confusion!)
    if (/(день-ночь|день и ночь|зебра|zebra|kun-tun|kun va tun)/i.test(lower)) {
      this.session.order.selectedModel = 'Рулонные шторы День и Ночь';
    } else if (/(rollo|ролло)/i.test(lower)) {
      this.session.order.selectedModel = 'Рулонные шторы Ролло';
    } else if (/(double|дабл|duo|двойные рулонные)/i.test(lower)) {
      this.session.order.selectedModel = 'Рулонные шторы Double';
    } else if (/(dikey|дикей)/i.test(lower)) {
      this.session.order.selectedModel = 'Жалюзи Dikey';
    } else if (/(вертикальные тюлевые|vertikal tul)/i.test(lower)) {
      this.session.order.selectedModel = 'Вертикальные тюлевые жалюзи';
    } else if (/(жалюзи-тюль|тюлевые жалюзи|tul jalyuzi|тюлевые)/i.test(lower)) {
      this.session.order.selectedModel = 'Тюлевые жалюзи';
    } else if (/(плиссе|plisse|gofre)/i.test(lower)) {
      this.session.order.selectedModel = 'Жалюзи плиссе';
    } else if (/(кассетные|cassette|kassetali)/i.test(lower)) {
      this.session.order.selectedModel = 'Кассетные жалюзи';
    } else if (/(мини-жалюзи|мини жалюзи|mini)/i.test(lower)) {
      this.session.order.selectedModel = 'Мини-жалюзи';
    } else if (/(горизонтальные|алюминиевые|alyuminiy)/i.test(lower)) {
      this.session.order.selectedModel = 'Горизонтальные алюминиевые жалюзи';
    } else if (/(фотонанесени|фотопечать|фотошторы|fototasvir)/i.test(lower)) {
      this.session.order.selectedModel = 'Рулонные шторы с фотонанесением';
    } else if (/(римские|римка|rim pardalari)/i.test(lower)) {
      this.session.order.selectedModel = 'Римские шторы';
    } else if (/(рулонные|рулонных|rolikli|rollo)/i.test(lower) && !this.session.order.selectedModel) {
      this.session.order.selectedModel = 'Рулонные шторы День и Ночь';
    }

    return {
      hasDimensions,
      hasQuantity,
      hasPhone: Boolean(phoneMatch),
      hasNameInMsg: nameFoundInThisTurn,
      hasName: Boolean(this.session.client.name),
      hasDistrictInMsg: districtFoundInThisTurn,
      hasDistrict: Boolean(this.session.client.district || this.session.client.region)
    };
  }

  /**
   * Price calculation according to official business rules:
   * - Formula: Width (m) × Height (m) × Price per 1 m²
   * - Minimum billable area: 1.0 m² per item
   * - If actual area < 1.0 m², bill as 1.0 m²; if > 1.0 m², use actual area
   * - Strictly confirmed prices from official retail price list
   */
  calculateEstimate() {
    if (!this.session.order.widthCm || !this.session.order.heightCm) return null;
    const wM = parseFloat((this.session.order.widthCm / 100).toFixed(2));
    const hM = parseFloat((this.session.order.heightCm / 100).toFixed(2));
    const actualArea = parseFloat((wM * hM).toFixed(2));
    const singleArea = actualArea < 1.0 ? 1.0 : actualArea;
    const windowCount = this.session.order.windowCount || 1;
    const totalArea = parseFloat((singleArea * windowCount).toFixed(2));

    let pricePerM2 = 220000;
    let modelName = this.session.order.selectedModel || 'Рулонные шторы День и Ночь';
    let modelNameUz = '«Kun va Tun» rolikli pardalari';
    let mechanismNameRu = 'Общий карниз';
    let mechanismNameUz = 'Umumiy karniz';
    let isRetailFound = false;
    let isRetailCategory = false;
    let categoryOptions = null;
    let collectionMatchData = null;

    const collectionMatch = this.session.order.selectedCollection;
    const selectedMech = this.session.order.mechanism || 'standardCornice';

    if (collectionMatch) {
      collectionMatchData = collectionMatch.data;
      if (collectionMatch.type === 'roller') {
        const item = collectionMatch.data;
        modelName = `${item.category} (${item.collections})`;
        modelNameUz = `${item.category} (${item.collections})`;
        if (selectedMech === 'cassette' && item.cassette) {
          pricePerM2 = item.cassette;
          mechanismNameRu = 'Кассета';
          mechanismNameUz = 'Kasseta';
        } else if (selectedMech === 'mini' && item.mini) {
          pricePerM2 = item.mini;
          mechanismNameRu = 'Мини';
          mechanismNameUz = 'Mini';
        } else if (item.standardCornice) {
          pricePerM2 = item.standardCornice;
          mechanismNameRu = 'Общий карниз';
          mechanismNameUz = 'Umumiy karniz';
        }
        isRetailFound = true;
      } else if (collectionMatch.type === 'tulle') {
        const item = collectionMatch.data;
        modelName = `Тюлевые жалюзи (${item.name})`;
        modelNameUz = `Tul jalyuzilari (${item.name})`;
        pricePerM2 = item.price;
        mechanismNameRu = 'Стандарт';
        mechanismNameUz = 'Standart';
        isRetailFound = true;
      } else if (collectionMatch.type === 'plisse') {
        const item = collectionMatch.data;
        modelName = `Жалюзи плиссе (${item.collection})`;
        modelNameUz = `Plisse jalyuzilari (${item.collection})`;
        pricePerM2 = singleArea <= 0.5 ? item.upToHalfM2 : item.upToOneM2;
        mechanismNameRu = singleArea <= 0.5 ? 'До 0.5 м²' : 'До 1.0 м²';
        mechanismNameUz = singleArea <= 0.5 ? '0.5 m² gacha' : '1.0 m² gacha';
        isRetailFound = true;
      }
    } else {
      // Check confirmed retail category
      const model = (this.session.order.selectedModel || '').toLowerCase();
      const isDayNight = /день|ночь|zebra|зебра|kun|tun|комбо|combo/i.test(model);
      const isRollo = /ролло|rollo/i.test(model);
      const isRoman = /римск|rim/i.test(model);
      const isTulle = /тюлев|tul/i.test(model);
      const isPlisse = /плиссе|plisse|honeycomb/i.test(model);

      if (isDayNight || !this.session.order.selectedModel) {
        isRetailCategory = true;
        modelName = 'Рулонные шторы День и Ночь (Зебра / Комбо)';
        modelNameUz = '«Kun va Tun» (Zebra / Kombo) rolikli pardalari';
        categoryOptions = {
          categoryType: 'day_night',
          standardCornice: {
            base: { pricePerM2: 100000, totalUZS: Math.round(totalArea * 100000) },
            turkey: { minPricePerM2: 120000, maxPricePerM2: 180000, minTotalUZS: Math.round(totalArea * 120000), maxTotalUZS: Math.round(totalArea * 180000) },
            premium: { minPricePerM2: 200000, maxPricePerM2: 230000, minTotalUZS: Math.round(totalArea * 200000), maxTotalUZS: Math.round(totalArea * 230000) }
          },
          cassette: { minPricePerM2: 220000, maxPricePerM2: 250000, minTotalUZS: Math.round(totalArea * 220000), maxTotalUZS: Math.round(totalArea * 250000) },
          mini: { minPricePerM2: 130000, maxPricePerM2: 150000, minTotalUZS: Math.round(totalArea * 130000), maxTotalUZS: Math.round(totalArea * 150000) }
        };
        if (selectedMech === 'cassette') {
          pricePerM2 = (this.session.order.fabricCollection === 'Blackout 100%') ? 250000 : 220000;
          mechanismNameRu = 'Кассетная система';
          mechanismNameUz = 'Kasseta tizimi';
        } else if (selectedMech === 'mini') {
          pricePerM2 = 130000;
          mechanismNameRu = 'Мини-система';
          mechanismNameUz = 'Mini tizim';
        } else {
          if (this.session.order.fabricCollection === 'Blackout 100%') {
            pricePerM2 = 200000;
          } else if (this.session.order.fabricCollection === 'Турецкая с узором') {
            pricePerM2 = 150000;
          } else {
            pricePerM2 = 100000;
          }
          mechanismNameRu = 'Общий карниз';
          mechanismNameUz = 'Umumiy karniz';
        }
      } else if (isRollo) {
        isRetailCategory = true;
        modelName = 'Рулонные шторы Ролло';
        modelNameUz = 'Rollo rolikli pardalari';
        categoryOptions = {
          categoryType: 'rollo',
          standardCornice: { minPricePerM2: 200000, maxPricePerM2: 215000, minTotalUZS: Math.round(totalArea * 200000), maxTotalUZS: Math.round(totalArea * 215000) },
          cassette: { pricePerM2: 230000, totalUZS: Math.round(totalArea * 230000) },
          mini: { pricePerM2: 160000, totalUZS: Math.round(totalArea * 160000) }
        };
        if (selectedMech === 'cassette') {
          pricePerM2 = 230000;
          mechanismNameRu = 'Кассетная система';
          mechanismNameUz = 'Kasseta tizimi';
        } else if (selectedMech === 'mini') {
          pricePerM2 = 160000;
          mechanismNameRu = 'Мини-система';
          mechanismNameUz = 'Mini tizim';
        } else {
          pricePerM2 = 200000;
          mechanismNameRu = 'Общий карниз';
          mechanismNameUz = 'Umumiy karniz';
        }
      } else if (isRoman) {
        isRetailCategory = true;
        modelName = 'Римские шторы';
        modelNameUz = 'Rim pardalari';
        categoryOptions = {
          categoryType: 'roman',
          standardCornice: { pricePerM2: 270000, totalUZS: Math.round(totalArea * 270000) }
        };
        pricePerM2 = 270000;
      } else if (isTulle) {
        isRetailCategory = true;
        modelName = 'Тюлевые жалюзи';
        modelNameUz = 'Tul jalyuzilari';
        categoryOptions = {
          categoryType: 'tulle',
          standard: { minPricePerM2: 140000, maxPricePerM2: 390000, minTotalUZS: Math.round(totalArea * 140000), maxTotalUZS: Math.round(totalArea * 390000) }
        };
        pricePerM2 = 140000;
      } else if (isPlisse) {
        isRetailCategory = true;
        modelName = 'Жалюзи плиссе / Honeycomb';
        modelNameUz = 'Plisse / Honeycomb jalyuzilari';
        const isHalf = singleArea <= 0.5;
        categoryOptions = {
          categoryType: 'plisse',
          standard: isHalf
            ? { minPrice: 185000, maxPrice: 450000, minTotalUZS: Math.round(windowCount * 185000), maxTotalUZS: Math.round(windowCount * 450000) }
            : { minPrice: 315000, maxPrice: 765000, minTotalUZS: Math.round(windowCount * singleArea * 315000), maxTotalUZS: Math.round(windowCount * singleArea * 765000) }
        };
        pricePerM2 = isHalf ? 185000 : 315000;
      } else if (this.pricing && Array.isArray(this.pricing.items) && this.session.order.selectedModel) {
        for (const item of this.pricing.items) {
          if (item.name_ru.includes(this.session.order.selectedModel) || this.session.order.selectedModel.includes(item.name_ru)) {
            pricePerM2 = item.pricePerM2;
            modelName = item.name_ru;
            modelNameUz = item.name_uz;
            break;
          }
        }
      }
    }

    const isConfirmed = Boolean(isRetailFound || isRetailCategory || (this.pricing && this.pricing.isConfirmed));
    const totalUZS = Math.round(singleArea * windowCount * pricePerM2);
    this.session.order.totalEstimateUZS = totalUZS;

    return {
      wM,
      hM,
      actualArea,
      singleArea,
      totalArea,
      modelName,
      modelNameUz,
      pricePerM2,
      mechanismNameRu,
      mechanismNameUz,
      isConfirmed,
      isRetailFound,
      isRetailCategory,
      categoryOptions,
      collectionMatchData,
      windowCount,
      totalUZS
    };
  }

  /**
   * Refined search in 100 Q&A without generic stopword pollution
   */
  findKbMatch(text, lang = 'ru') {
    if (!this.kb || this.kb.length === 0 || !text) return null;
    const query = text.toLowerCase().trim();

    // Clean tokens without generic stopwords
    const tokens = query
      .split(/[\s,?.!;:—]+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && !GENERIC_STOPWORDS.has(t));

    if (tokens.length === 0) return null;

    let bestItem = null;
    let highestScore = 0;

    for (const item of this.kb) {
      let score = 0;
      const qText = (lang === 'uz' ? (item.question_uz || item.question_ru) : item.question_ru).toLowerCase();
      const aText = (lang === 'uz' ? (item.answer_uz || item.answer_ru) : item.answer_ru).toLowerCase();
      const keywords = item.keywords || [];

      // Keyword match (strict word/phrase match)
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        if (query === kwLower || query.includes(kwLower)) {
          score += 25;
        } else {
          for (const token of tokens) {
            if (kwLower === token) {
              score += 15;
            } else if (kwLower.includes(token) && token.length >= 4) {
              score += 5;
            }
          }
        }
      }

      // Question match
      for (const token of tokens) {
        if (qText.includes(token)) score += 6;
        if (aText.includes(token)) score += 2;
      }

      if (score > highestScore && score >= 12) {
        highestScore = score;
        bestItem = item;
      }
    }

    return bestItem;
  }

  checkObjection(lower) {
    const objections = this.kb.filter(item => item.category === 'objections');

    if (/(дорого|слишком|qimmat)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-089') || objections[0];
    }
    if (/(подумаю|надо подумать|oylab ko|o'ylab ko)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-090') || objections[1];
    }
    if (/(дешевле|конкурент|базар|бозор|у других|boshqalarda arzon)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-091') || objections[2];
    }
    if (/(скидк|уступите|дешевле сделать|chegirma)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-092') || objections[3];
    }
    if (/(боюсь сверлить|испортят окна|rom buziladimi|teshishdan)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-093');
    }
    if (/(выгорит|выгора|quyoshda o'ngib|quyoshda ongib)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-094');
    }
    if (/(не подойдет размер|ошибусь|notogri kelsa)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-095');
    }
    if (/(посоветоваться с|с мужем|с женой|oilam bilan|maslahatlashish)/i.test(lower)) {
      return objections.find(x => x.id === 'kb-096');
    }

    return null;
  }

  /**
   * Main Message Processing
   */
  processMessage(userMessage) {
    if (!userMessage || !userMessage.trim()) {
      return {
        reply: this.session.lang === 'uz'
          ? 'Assalomu alaykum! COMBO.UZ ga xush kelibsiz. Qanday xonaga parda qidiryapsiz va sizga qaysi model ma’qul?'
          : 'Здравствуйте! Добро пожаловать в COMBO.UZ. В какую комнату вы выбираете шторы и какая задача главная (защита от солнца, уединение или декор)?',
        stage: this.session.stage,
        client: this.session.client,
        order: this.session.order
      };
    }

    const lang = this.detectLanguage(userMessage);
    this.session.lang = lang;
    const extractedDetails = this.extractClientDetails(userMessage) || {};

    const lower = userMessage.toLowerCase().trim();

    // =========================================================================
    // 1. ПРЯМАЯ ПРОСЬБА О ЧЕЛОВЕКЕ / МЕНЕДЖЕРЕ
    // =========================================================================
    const isHumanRequest = /(человек|оператор|менеджер|живой|позовите человека|свяжите с человеком|соедините с менеджером|специалист|menejer|operator|tirik odam|mutaxassis)/i.test(lower);
    if (isHumanRequest) {
      this.session.stage = SALES_STAGES.MANAGER_ESCALATION;
      this.session.needsManager = true;

      const reply = lang === 'uz'
        ? `С удовольствием переключаю вас на дежурного менеджера для индивидуальной консультации!\n\n` +
          `Вы можете позвонить нам напрямую по телефону **+998 (71) 200-55-77** или оставить свой номер телефона здесь, и менеджер перезвонит вам в течение 5–10 минут.`
        : `С удовольствием переключаю вас на дежурного менеджера для персональной консультации!\n\n` +
          `Вы можете позвонить нам напрямую по номеру **+998 (71) 200-55-77** или оставить свой телефон, и менеджер наберет вас в течение 5–10 минут.`;

      return {
        reply,
        stage: this.session.stage,
        needsManager: true,
        client: this.session.client,
        order: this.session.order
      };
    }

    // =========================================================================
    // 2. ВОПРОСЫ О РАБОТЕ В РЕГИОНАХ УЗБЕКИСТАНА
    // =========================================================================
    const isRegionalQuestion = /(самарканд|бухар|ферган|андижан|наманган|карши|навои|термез|нукус|ургенч|джизак|гулистан|хорезм|кашкадарь|сурхандарь|сырдарь|ташкентская область|таш.*област|в област|по област|по регионам|другие регион|по всему узбекистан|samarqand|buxoro|farg‘ona|fargona|andijon|namangan|qarshi|navoiy|termiz|nukus|urganch|jizzax|guliston|xorazm|qashqadaryo|surxondaryo|sirdaryo|viloyat|viloyatlar)/i.test(lower);
    if (isRegionalQuestion && !/(заказать|buyurtma)/i.test(lower)) {
      if (lang === 'uz') {
        const reply = `COMBO.UZ butun O‘zbekiston bo‘ylab buyurtmalarni bajonidil qabul qiladi! 🇺🇿\n\n` +
          `Biz pardalarni sizning aniq o‘lchamlaringiz bo‘yicha tayyorlab, respublikamizning istalgan shahar va viloyatiga yetkazib beramiz. Toshkentdan tashqarida o‘lchash, mutaxassis tashrifi va o‘rnatish shartlari navbatchi menejer bilan alohida kelishiladi (e’tibor bering: viloyatlarga bepul tashrif kafolatlanmaydi).\n\n` +
          `Menejerimiz siz bilan bog‘lanishi va yetkazib berish shartlarini aniqlashtirishi uchun telefon raqamingiz va shahringizni yozib qoldira olasizmi?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      } else {
        const reply = `Компания COMBO.UZ с удовольствием принимает заказы по всему Узбекистану! 🇺🇿\n\n` +
          `Мы изготавливаем шторы и жалюзи точно по вашим размерам и организуем доставку в любой город и регион страны. Условия замера, выезда специалиста и монтажа за пределами Ташкента согласовываются с менеджером индивидуально (обратите внимание: бесплатный выезд в регионы не гарантируется).\n\n` +
          `Подскажите, пожалуйста, ваш номер телефона и город, чтобы наш менеджер мог связаться с вами и детально проконсультировать по заказу и доставке!`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      }
    }

    // =========================================================================
    // 3. УСЛОВИЯ ОБСЛУЖИВАНИЯ В ТАШКЕНТЕ (Замер, дизайнер, монтаж, 100 000 сум)
    // =========================================================================
    const hasServiceWord = /(замер|выезд|установк|монтаж|дизайнер|o[‘']?lchash|o[‘']?lchov|o[‘']?rnatish|montaj|tashrif|mutaxassis)/i.test(lower);
    const hasCostWord = /(сколько|цена|стоимост|платн|бесплатн|100\s*000|qancha|narx|pul|tekin|bepul)/i.test(lower);
    const isServiceCostQuestion = hasServiceWord && hasCostWord;
    if (isServiceCostQuestion) {
      if (lang === 'uz') {
        const reply = `COMBO.UZ ning Toshkentdagi xizmat ko‘rsatish shartlari:\n\n` +
          `• **Derazalarni o‘lchash** — buyurtma rasmiylashtirilganda BEPUL.\n` +
          `• Namunalar bilan **dizayner maslahati** — buyurtma rasmiylashtirilganda BEPUL.\n` +
          `• **O‘rnatish (montaj)** — buyurtma rasmiylashtirilganda BEPUL.\n` +
          `• Agar uchrashuvdan so‘ng buyurtma berilmasa, faqat mutaxassisning tashrifi narxi — **100 000 so‘m** to‘lanadi.\n\n` +
          `Toshkentdan tashqarida tashrif va o‘rnatish shartlari menejer bilan alohida kelishiladi.\n\n` +
          `Mutaxassis tashrifi uchun qulay vaqtni kelishishni istaysizmi? Telefon raqamingiz va tumaningizni qoldiring!`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      } else {
        const reply = `Условия обслуживания COMBO.UZ в Ташкенте:\n\n` +
          `• **Замер окон** — БЕСПЛАТНО при оформлении заказа.\n` +
          `• **Помощь дизайнера** с физическими каталогами образцов — БЕСПЛАТНО при оформлении заказа.\n` +
          `• **Установка (монтаж)** — БЕСПЛАТНО при оформлении заказа.\n` +
          `• Если по итогам встречи вы решите пока не оформлять заказ, оплачивается только стандартный выезд специалиста — **100 000 сум**.\n\n` +
          `За пределами Ташкента условия выезда и установки согласовываются с менеджером индивидуально.\n\n` +
          `Хотите согласовать удобное время для визита мастера? Подскажите ваш номер телефона и район!`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      }
    }

    const hasDimensionsInMsg = Boolean(extractedDetails.hasDimensions);
    const hasPhoneInMsg = Boolean(extractedDetails.hasPhone);
    const hasNameInMsg = Boolean(extractedDetails.hasNameInMsg);
    const hasDistrictInMsg = Boolean(extractedDetails.hasDistrictInMsg);
    const hasDimensions = Boolean(this.session.order.widthCm && this.session.order.heightCm);
    const isPriceQuestion = /(сколько.*?(?:сто|выйдет|обойд)|какая цена|какова стоимость|прайс|цены на|почем|расценки|стоимость|посчитай|рассчитай|hisoblab|qancha.*?(?:turadi|bo[‘']?ladi|chiqadi)|narxi|narxlari|necha pul)/i.test(lower);
    const isPriceOrCalc = isPriceQuestion || hasDimensionsInMsg;

    // =========================================================================
    // 4. ГОТОВНОСТЬ К ЗАКАЗУ / СБОР ЛИДА
    // =========================================================================
    const isOrderIntent = /(заказать|хочу заказать|готов оформить|оформите заявку|вызвать замерщика|запишите на замер|оформить заказ|вызов замерщика|buyurtma bermoqchiman|buyurtma qilmoqchiman|usta chaqirmoqchiman|olchovga yozilish)/i.test(lower);

    const isInLeadFlow = this.session.stage === SALES_STAGES.LEAD_CAPTURE ||
                         this.session.stage === SALES_STAGES.PRICE_INQUIRY ||
                         this.session.stage === SALES_STAGES.SIZING ||
                         this.session.stage === SALES_STAGES.ORDER_PLACED;

    const hasAnyClientInfoInMsg = Boolean(hasPhoneInMsg || hasNameInMsg || hasDistrictInMsg);
    const isAffirmative = /(давайте|согласен|согласна|хорошо|подходит|запишите|вызывайте|оформить|оформите|kelishdik|mayli|yozing)/i.test(lower);
    const isCourtesy = /(спасибо|большое спасибо|рахмат|rahmat|katta rahmat|благодарю|отлично|договорились|kutaman|tushunarli)/i.test(lower);

    const isFollowupContact = (hasPhoneInMsg || (isInLeadFlow && (hasAnyClientInfoInMsg || isAffirmative || isCourtesy))) && !isPriceOrCalc;

    if ((isOrderIntent && !isPriceOrCalc) || isFollowupContact) {
      this.session.stage = SALES_STAGES.LEAD_CAPTURE;
      return this.handleLeadCaptureStep(lower);
    }

    // =========================================================================
    // 5. ОТРАБОТКА ВОЗРАЖЕНИЙ (Дорого, Я подумаю, У конкурентов дешевле, Скидка...)
    // =========================================================================
    const objectionMatch = this.checkObjection(lower);
    if (objectionMatch) {
      this.session.stage = SALES_STAGES.OBJECTION;
      this.session.lastObjection = objectionMatch.id;
      return {
        reply: lang === 'uz' ? objectionMatch.answer_uz : objectionMatch.answer_ru,
        stage: this.session.stage,
        matchedKbId: objectionMatch.id,
        isObjection: true,
        client: this.session.client,
        order: this.session.order
      };
    }

    // =========================================================================
    // 6. ВОПРОС О ЦЕНЕ / РАСЧЕТ ПРИ НАЛИЧИИ РАЗМЕРОВ
    // =========================================================================
    if (isPriceOrCalc) {
      this.session.stage = SALES_STAGES.PRICE_INQUIRY;

      // А. Если указаны размеры — рассчитываем
      if (hasDimensions) {
        return this.handleCalculationResponse(lang);
      }

      // Б. Если названа конкретная коллекция из официального розничного прайса
      const retailMatch = this.findRetailItem(userMessage);
      if (retailMatch) {
        return this.handleRetailCollectionInquiry(retailMatch, lang);
      }

      // В. Общий вопрос без размеров и без конкретной коллекции
      // Отвечаем строго по утвержденному стандарту COMBO.UZ без неподтвержденных цен
      if (lang === 'uz') {
        const reply = `Assalomu alaykum! 😊 Rolikli pardalar narxi tanlangan mato, model va deraza o‘lchamlariga bog‘liq. Ayting-chi, sizni aynan qaysi model qiziqtiradi va derazangizning taxminiy o‘lchamlari qanday? Dastlabki hisob-kitobda bajonidil yordam beraman.`;

        return {
          reply,
          stage: this.session.stage,
          client: this.session.client,
          order: this.session.order
        };
      } else {
        const reply = `Здравствуйте! 😊 Стоимость рулонных штор зависит от выбранной ткани, модели и размеров окна. Подскажите, пожалуйста, какая модель вас интересует и какие примерные размеры окна? Я помогу с предварительным расчётом.`;

        return {
          reply,
          stage: this.session.stage,
          client: this.session.client,
          order: this.session.order
        };
      }
    }

    // =========================================================================
    // 7. ПОДБОР ПО ПОМЕЩЕНИЮ И ОСВЕЩЕНИЮ (Спальня, Солнце, Кухня, Зал...)
    // =========================================================================
    const isRoomAdvice = /(посоветуй|подбери|что выбрать|какие выбрать|какие шторы лучше|для спальни|в спальню|от яркого солнца|на кухню|для кухни|в зал|для зала|в детскую|yotoqxona|oshxona|zal|bolalar xonasi|quyoshdan)/i.test(lower);
    if (isRoomAdvice) {
      this.session.stage = SALES_STAGES.ROOM_ADVISORY;
      return this.handleRoomAdvisory(lower, lang);
    }

    // =========================================================================
    // 8. РАСЧЕТ ПРИ НАЛИЧИИ РАЗМЕРОВ
    // =========================================================================
    if (this.session.order.widthCm && this.session.order.heightCm && /(посчитай|рассчитай|сколько будет|hisoblab ber|chiqadi)/i.test(lower)) {
      return this.handleCalculationResponse(lang);
    }

    // =========================================================================
    // 9. ПОИСК ПО БАЗЕ ЗНАНИЙ (100 Q&A)
    // =========================================================================
    const kbMatch = this.findKbMatch(lower, lang);
    if (kbMatch) {
      this.session.matchedKbId = kbMatch.id;
      const reply = lang === 'uz' ? (kbMatch.answer_uz || kbMatch.answer_ru) : kbMatch.answer_ru;

      return {
        reply,
        stage: this.session.stage,
        matchedKbId: kbMatch.id,
        requiresAdmin: kbMatch.requires_admin,
        client: this.session.client,
        order: this.session.order
      };
    }

    // =========================================================================
    // 10. ДЕФОЛТНЫЙ ДИАЛОГ (Короткий и по делу)
    // =========================================================================
    return this.handleGeneralDiscovery(lower, lang);
  }

  handleRetailCollectionInquiry(retailMatch, lang) {
    if (lang === 'uz') {
      let details = '';
      if (retailMatch.type === 'roller') {
        const item = retailMatch.data;
        details = `• **Umumiy karniz:** ${item.standardCornice ? formatPrice(item.standardCornice) + ' so‘m/m²' : 'menejer bilan aniqlanadi'}\n` +
          `• **Kasseta:** ${item.cassette ? formatPrice(item.cassette) + ' so‘m/m²' : 'menejer bilan aniqlanadi'}\n` +
          `• **Mini:** ${item.mini ? formatPrice(item.mini) + ' so‘m/m²' : 'menejer bilan aniqlanadi'}`;
      } else if (retailMatch.type === 'tulle') {
        const item = retailMatch.data;
        details = `• **1 m² narxi:** ${formatPrice(item.price)} so‘m`;
      } else if (retailMatch.type === 'plisse') {
        const item = retailMatch.data;
        details = `• **0.5 m² gacha:** ${formatPrice(item.upToHalfM2)} so‘m\n` +
          `• **1.0 m² gacha:** ${formatPrice(item.upToOneM2)} so‘m`;
      }

      const reply = `Assalomu alaykum! 😊 COMBO.UZ rasmiy chakana narxlar ro‘yxati bo‘yicha tanlangan kolleksiya narxlari:\n\n` +
        details + `\n\n` +
        `📐 **Hisoblash qoidalari:**\n` +
        `• Formula: eni (m) × bo‘yi (m) × 1 m² narxi\n` +
        `• Har bir mahsulotning minimal hisob maydoni — 1.0 m² (o‘lcham 1 m² dan kam bo‘lsa, hisob 1 m² deb olinadi)\n\n` +
        `🚗 **Toshkentda:** o‘lchash, dizayner maslahati va o‘rnatish — buyurtma berilganda **BEPUL** (buyurtma berilmasa — 100 000 so‘m).\n\n` +
        `Iltimos, derazangizning taxminiy o‘lchamlarini (eni va bo‘yi) ayta olasizmi? Shuningdek, telefon raqamingizni qoldirishingiz mumkin, menejerimiz siz bilan bog‘lanib aniq hisoblab beradi.`;

      return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
    } else {
      let details = '';
      if (retailMatch.type === 'roller') {
        const item = retailMatch.data;
        details = `• **Общий карниз:** ${item.standardCornice ? formatPrice(item.standardCornice) + ' сум/м²' : 'уточняется у менеджера'}\n` +
          `• **Кассета:** ${item.cassette ? formatPrice(item.cassette) + ' сум/м²' : 'уточняется у менеджера'}\n` +
          `• **Мини:** ${item.mini ? formatPrice(item.mini) + ' сум/м²' : 'уточняется у менеджера'}`;
      } else if (retailMatch.type === 'tulle') {
        const item = retailMatch.data;
        details = `• **Цена за 1 м²:** ${formatPrice(item.price)} сум`;
      } else if (retailMatch.type === 'plisse') {
        const item = retailMatch.data;
        details = `• **До 0.5 м²:** ${formatPrice(item.upToHalfM2)} сум\n` +
          `• **До 1.0 м²:** ${formatPrice(item.upToOneM2)} сум`;
      }

      const reply = `Здравствуйте! 😊 В официальном розничном прайс-листе COMBO.UZ для выбранной коллекции действуют следующие цены:\n\n` +
        details + `\n\n` +
        `📐 **Правила расчёта:**\n` +
        `• Формула: ширина (м) × высота (м) × цена за 1 м²\n` +
        `• Минимальная расчётная площадь каждого изделия — 1.0 м² (если изделие меньше 1 м², расчёт ведётся как за 1 м²)\n\n` +
        `🚗 **Сервис в Ташкенте:** замер, консультация дизайнера и установка — **БЕСПЛАТНО** при оформлении заказа (если заказ не оформляется — выезд 100 000 сум).\n\n` +
        `Подскажите, пожалуйста, примерные размеры вашего окна (ширину и высоту)? Вы также можете оставить свой номер телефона, и наш менеджер свяжется с вами для консультации и точного расчета.`;

      return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
    }
  }

  handleRoomAdvisory(lower, lang) {
    const isBedroom = /(спальн|yotoqxona|сон|uyqu)/i.test(lower);
    const isSun = /(солнц|ярк|жар|юг|южн|чилля|chilla|quyosh)/i.test(lower);
    const isKitchen = /(кухн|oshxona|плит|мойк)/i.test(lower);
    const isLiving = /(зал|гостин|mehmonxona)/i.test(lower);
    const isKids = /(детск|ребен|bolalar)/i.test(lower);

    // А. Спальня от яркого солнца
    if (isBedroom || (isSun && !isKitchen && !isLiving)) {
      this.session.order.selectedModel = 'Blackout 100%';

      if (lang === 'uz') {
        const reply = `Quyoshli yotoqxona uchun quyidagi modellar eng yaxshi himoyani ta’minlaydi:\n\n` +
          `1. **Kassetali Blackout 100%** — yorug‘likni 100% to‘sadi va yozgi jaziramada issiqlikning 95% gacha qismini qaytaradi, qulay uyqu uchun salqin qorong‘ilik yaratadi.\n` +
          `2. **«Kun-Tun» (Zebra) Blackout matosi bilan** — kunduzi yorug‘likni chiziqlar orqali nozik sozlash, kechasi esa to‘liq qorong‘i qilish imkonini beradi.\n` +
          `3. **Honeycomb Blackout (Asalari uyasi)** — havo katakchalari evaziga kuchli termo- va shovqin izolyatsiyasini ta’minlaydi.\n\n` +
          `Sizga uyqu uchun mutlaq qorong‘ilik (Blackout) muhimroqmi yoki kunduzi yorug‘likni sozlash imkoniyati (Kun-Tun) kerakmi?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      } else {
        const reply = `Для спальни на солнечной стороне лучше всего подходят:\n\n` +
          `1. **Кассетные шторы Blackout 100%** — полностью блокируют свет (100%) и отражают до 95% тепла в чиллю, создавая идеальную темноту и прохладу для сна.\n` +
          `2. **«День-Ночь» (Зебра) с тканью Blackout** — позволяют плавно настраивать полосы света днем и полностью перекрывать окно ночью.\n` +
          `3. **Honeycomb Blackout (Сотовые)** — создают воздушную термоподушку, защищая от перегрева и уличного шума.\n\n` +
          `Вам важнее абсолютная темнота для сна (Blackout) или возможность плавно регулировать свет полосами днем (День-Ночь)?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      }
    }

    // Б. Кухня
    if (isKitchen) {
      if (lang === 'uz') {
        const reply = `Oshxona uchun namlikka chidamli va oson tozalanadigan modellar ma’qul:\n\n` +
          `1. **Gorizontal alyuminiy jalyuzilar** — 100% suv, yog‘ va hidlardan qo‘rqmaydi, sovunli suvda oson yuviladi.\n` +
          `2. **Ixcham rolikli pardalar** — teflon qoplamali bo‘lib, deraza tokchasini bo‘sh qoldiradi.\n` +
          `3. **Rim pardalari** — shinam matoli dizayn, gaz plitasi tomon shamolda uchmaydi.\n\n` +
          `Derazangiz gaz plitasi yoki rakovinaga yaqin joylashganmi?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      } else {
        const reply = `Для кухни важна влагостойкость и простота чистки:\n\n` +
          `1. **Горизонтальные алюминиевые жалюзи** — 100% не боятся пара, жира и запахов, легко моются губкой с мылом прямо на окне.\n` +
          `2. **Компактные рулонные шторы на створку** — имеют тефлоновую грязеотталкивающую пропитку и освобождают подоконник.\n` +
          `3. **Римские шторы** — безопасны, поднимаются на любую высоту и не раздуваются ветром к плите.\n\n` +
          `Окно расположено близко к плите или мойке?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      }
    }

    // В. Зал / Гостиная
    if (isLiving) {
      if (lang === 'uz') {
        const reply = `Mehmonxona va zal uchun quyidagi modellar ajoyib yarashadi:\n\n` +
          `1. **«Kun-Tun» (Zebra)** — zamonaviy chiziqli dizayn va yorug‘likni qulay sozlash.\n` +
          `2. **Tul jalyuzilari** — mayin to‘kiluvchi tul go‘zalligi, balkonga chiqish uchun qulay.\n` +
          `3. **Rim pardalari** — neoklassika va modern uslubidagi hashamatli matoli taxlamalar.\n\n` +
          `Sizga qaysi uslub yaqinroq — zamonaviy chiziqli dizaynmi yoki tulli shinamlikmi?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      } else {
        const reply = `Для гостиной и зала отлично подходят:\n\n` +
          `1. **«День-Ночь» (Зебра)** — стильный современный вид и тонкая настройка естественного света.\n` +
          `2. **Тюлевые жалюзи (Жалюзи-Тюль)** — сочетают уют струящейся тюли и поворотные ламели, через них удобно выходить на балкон.\n` +
          `3. **Римские шторы** — элегантные текстильные складки для стилей модерн и неоклассика.\n\n` +
          `Какой стиль вам ближе — лаконичные полосы или текстильный уют с эффектом тюля?`;

        return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
      }
    }

    // Г. Детская
    if (isKids) {
      const reply = lang === 'uz'
        ? `Bolalar xonasi uchun kunduzgi qulay uyqu beruvchi **Blackout 100%** yoki **Kun-Tun** modelini tavsiya qilamiz. Barcha tizimlarimiz bolalar xavfsizligi qisqichlari (Child Safety) bilan ta’minlanadi.\n\nSizga to‘liq qorong‘ilik kerakmi yoki yumshoq yorug‘lik beruvchi matomi?`
        : `Для детской рекомендуем **Blackout 100%** (для крепкого дневного сна) или систему **День-Ночь**. Все шторы комплектуются фиксаторами безопасности цепочки Child Safety.\n\nВам важнее полное затемнение или мягкий рассеянный свет?`;

      return { reply, stage: this.session.stage, client: this.session.client, order: this.session.order };
    }

    return this.handleGeneralDiscovery(lower, lang);
  }

  handleCalculationResponse(lang) {
    this.session.stage = SALES_STAGES.SIZING;
    const calc = this.calculateEstimate();
    const isConfirmed = Boolean(calc.isConfirmed);

    if (lang === 'uz') {
      const areaExplanationUz = calc.actualArea < 1.0
        ? ` (haqiqiy maydon ${calc.actualArea} m², har bir mahsulot uchun minimal hisob maydoni — 1 m²)`
        : '';

      let priceBlockUz = '';
      let clarificationUz = '';

      if (calc.categoryOptions && calc.categoryOptions.categoryType === 'day_night') {
        const sc = calc.categoryOptions.standardCornice;
        const cs = calc.categoryOptions.cassette;
        const mn = calc.categoryOptions.mini;

        priceBlockUz = `💰 **COMBO.UZ rasmiy chakana narxlar ro‘yxati bo‘yicha variantlar (${calc.totalArea} m² uchun):**\n\n` +
          `• **Umumiy karniz (butun ochilma uchun standart tizim):**\n` +
          `  - Bazaviy matolar (100 000 so‘m/m² dan) — **${formatPrice(sc.base.totalUZS)} so‘m dan**\n` +
          `  - Ommabop turk matolari (120 000 – 180 000 so‘m/m²) — **${formatPrice(sc.turkey.minTotalUZS)} dan ${formatPrice(sc.turkey.maxTotalUZS)} so‘m gacha**\n` +
          `  - Premium va Blackout 100% matolari (200 000 – 230 000 so‘m/m²) — **${formatPrice(sc.premium.minTotalUZS)} dan ${formatPrice(sc.premium.maxTotalUZS)} so‘m gacha**\n` +
          `• **Kasseta tizimi (yo‘naltiruvchi va quti bilan):**\n` +
          `  - (220 000 – 250 000 so‘m/m²) — **${formatPrice(cs.minTotalUZS)} dan ${formatPrice(cs.maxTotalUZS)} so‘m gacha**\n` +
          `• **Mini tizim (tabaqaga ixcham o‘rnatish):**\n` +
          `  - (130 000 – 150 000 so‘m/m²) — **${formatPrice(mn.minTotalUZS)} dan ${formatPrice(mn.maxTotalUZS)} so‘m gacha**\n\n`;

        clarificationUz = !this.session.order.isQuantitySpecified
          ? `Iltimos, aniqlashtiring: sizga nechta deraza (mahsulot) uchun hisob-kitob kerak, qaysi mexanizm turi (umumiy karniz, kasseta yoki mini) va qanday mato zichligi (bazaviy, naqshli turk matosi yoki to‘liq qorong‘i qiluvchi Blackout) ma’qulroq?\n\n`
          : `Ayting-chi, sizga qaysi mexanizm turi (umumiy karniz, kasseta yoki mini) va qanday mato zichligi (bazaviy, naqshli turk matosi yoki to‘liq qorong‘i qiluvchi Blackout) ma’qulroq?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'rollo') {
        const sc = calc.categoryOptions.standardCornice;
        const cs = calc.categoryOptions.cassette;
        const mn = calc.categoryOptions.mini;

        priceBlockUz = `💰 **COMBO.UZ rasmiy chakana prays-listi bo‘yicha variantlar (${calc.totalArea} m² uchun):**\n\n` +
          `• **Umumiy karniz:** (200 000 – 215 000 so‘m/m²) — **${formatPrice(sc.minTotalUZS)} dan ${formatPrice(sc.maxTotalUZS)} so‘m gacha**\n` +
          `• **Kasseta:** (230 000 so‘m/m²) — **${formatPrice(cs.totalUZS)} so‘m**\n` +
          `• **Mini:** (160 000 so‘m/m²) — **${formatPrice(mn.totalUZS)} so‘m**\n\n`;

        clarificationUz = !this.session.order.isQuantitySpecified
          ? `Iltimos, aniqlashtiring: nechta deraza uchun hisob-kitob kerak va qaysi tizim (umumiy karniz, kasseta yoki mini) sizga qulayroq?\n\n`
          : `Qaysi tizim (umumiy karniz, kasseta yoki mini) sizga qulayroq?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'roman') {
        const sc = calc.categoryOptions.standardCornice;
        priceBlockUz = `💰 **COMBO.UZ rasmiy chakana narxi (${calc.totalArea} m² uchun):**\n\n` +
          `• **Rim pardalari (karniz + mato):** 270 000 so‘m/m² — **${formatPrice(sc.totalUZS)} so‘m**\n\n`;
        clarificationUz = !this.session.order.isQuantitySpecified
          ? `Iltimos, aniqlashtiring: nechta deraza uchun hisob-kitob kerak va rim pardalarini qaysi xona uchun tanlayapsiz?\n\n`
          : `Rim pardalarini qaysi xona uchun tanlayapsiz?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'tulle') {
        const st = calc.categoryOptions.standard;
        priceBlockUz = `💰 **COMBO.UZ rasmiy chakana variantlari (${calc.totalArea} m² uchun):**\n\n` +
          `• **Tul jalyuzilari:** (matosiga ko‘ra 140 000 – 390 000 so‘m/m²) — **${formatPrice(st.minTotalUZS)} dan ${formatPrice(st.maxTotalUZS)} so‘m gacha**\n\n`;
        clarificationUz = !this.session.order.isQuantitySpecified
          ? `Iltimos, aniqlashtiring: nechta deraza uchun va sizga qaysi rangdagi tul ma’qulroq?\n\n`
          : `Sizga qaysi rangdagi tul ma’qulroq?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'plisse') {
        const st = calc.categoryOptions.standard;
        priceBlockUz = `💰 **COMBO.UZ rasmiy chakana variantlari:**\n\n` +
          `• **Plisse / Honeycomb jalyuzilari:** — **${formatPrice(st.minTotalUZS)} dan ${formatPrice(st.maxTotalUZS)} so‘m gacha**\n\n`;
        clarificationUz = !this.session.order.isQuantitySpecified
          ? `Iltimos, aniqlashtiring: nechta deraza uchun va oddiy plisse matosimi yoki termoizolyatsiyali Honeycomb kerakmi?\n\n`
          : `Sizga oddiy plisse matosimi yoki termoizolyatsiyali Honeycomb kerakmi?\n\n`;
      } else if (calc.isRetailFound) {
        const item = calc.collectionMatchData;
        let mechAlternatives = '';
        if (item && item.standardCornice && item.cassette && item.mini) {
          mechAlternatives = `\n• Boshqa mexanizmlar: Kasseta — ${formatPrice(item.cassette * calc.totalArea)} so‘m | Mini — ${formatPrice(item.mini * calc.totalArea)} so‘m\n`;
        }
        priceBlockUz = `• **Mato tarifi:** ${formatPrice(calc.pricePerM2)} so‘m/m² (${calc.mechanismNameUz})\n` +
          `• **Dastlabki hisob summasi:** **${formatPrice(calc.totalUZS)} so‘m** (rasmiy chakana narxlar ro‘yxati bo‘yicha)\n` +
          mechAlternatives + '\n';
        clarificationUz = !this.session.order.isQuantitySpecified
          ? `Iltimos, aniqlashtiring: nechta deraza uchun va qaysi mexanizm turi sizga qulayroq?\n\n`
          : `Qaysi mexanizm turi (umumiy karniz, kasseta yoki mini) sizga qulayroq?\n\n`;
      } else if (isConfirmed) {
        priceBlockUz = `• **Mato tarifi:** ${formatPrice(calc.pricePerM2)} so‘m/m² (${calc.mechanismNameUz})\n` +
          `• **Dastlabki hisob summasi:** **${formatPrice(calc.totalUZS)} so‘m**\n\n`;
      } else {
        priceBlockUz = `• **Dastlabki hisob summasi:** [Rasmiy prays-list tasdiqlanish arafasida. Aniq summa mato toifasiga ko‘ra menejer tomonidan hisoblanadi]\n\n`;
      }

      const reply = `📐 **Derazalaringiz bo‘yicha dastlabki hisob:**\n\n` +
        `• **Model / Kolleksiya:** ${calc.modelNameUz}\n` +
        `• **O‘lcham:** ${this.session.order.widthCm} × ${this.session.order.heightCm} sm (${calc.wM} × ${calc.hM} m)\n` +
        `• **Hisoblash qoidasi:** hisob mahsulot maydoni bo‘yicha yuritiladi: eni (${calc.wM} m) × bo‘yi (${calc.hM} m) × 1 m² narxi (har bir mahsulot uchun minimal hisob maydoni — 1 m²)\n` +
        `• **Hisob maydoni:** ${calc.singleArea} m²${areaExplanationUz} (${formatWindowCount(calc.windowCount, 'uz')} = ${calc.totalArea} m²)\n\n` +
        priceBlockUz +
        clarificationUz +
        `🚗 **Toshkentdagi xizmat ko‘rsatish shartlari:**\n` +
        `• **Derazalarni o‘lchash** — buyurtma rasmiylashtirilganda BEPUL.\n` +
        `• Namunalar bilan **dizayner maslahati** — buyurtma rasmiylashtirilganda BEPUL.\n` +
        `• **O‘rnatish (montaj)** — buyurtma rasmiylashtirilganda BEPUL.\n` +
        `• Agar uchrashuvdan so‘ng buyurtma berilmasa, mutaxassis tashrifi narxi — **100 000 so‘m** to‘lanadi.\n` +
        `• **O‘zbekiston bo‘ylab:** barcha hududlardan buyurtmalarni qabul qilamiz, Toshkentdan tashqarida o‘lchash va o‘rnatish shartlari menejer bilan alohida kelishiladi.\n\n` +
        buildContactPrompt(this.session.client, 'uz');

      return { reply, stage: this.session.stage, calculation: calc, client: this.session.client, order: this.session.order };
    } else {
      const areaExplanationRu = calc.actualArea < 1.0
        ? ` (фактическая площадь ${calc.actualArea} м², минимальная расчётная площадь 1 м² на каждое изделие)`
        : '';

      let priceBlockRu = '';
      let clarificationRu = '';

      if (calc.categoryOptions && calc.categoryOptions.categoryType === 'day_night') {
        const sc = calc.categoryOptions.standardCornice;
        const cs = calc.categoryOptions.cassette;
        const mn = calc.categoryOptions.mini;

        priceBlockRu = `💰 **Варианты предварительной стоимости по официальному розничному прайс-листу COMBO.UZ (на ${calc.totalArea} м²):**\n\n` +
          `• **Общий карниз (стандартная система на весь проем):**\n` +
          `  - Базовые ткани (от 100 000 сум/м²) — **от ${formatPrice(sc.base.totalUZS)} сум**\n` +
          `  - Популярные турецкие ткани с узором (120 000 – 180 000 сум/м²) — **от ${formatPrice(sc.turkey.minTotalUZS)} до ${formatPrice(sc.turkey.maxTotalUZS)} сум**\n` +
          `  - Премиум ткани и Blackout 100% (200 000 – 230 000 сум/м²) — **от ${formatPrice(sc.premium.minTotalUZS)} до ${formatPrice(sc.premium.maxTotalUZS)} сум**\n` +
          `• **Кассетная система (с коробом и направляющими на каждую створку):**\n` +
          `  - (220 000 – 250 000 сум/м²) — **от ${formatPrice(cs.minTotalUZS)} до ${formatPrice(cs.maxTotalUZS)} сум**\n` +
          `• **Мини-система (компактная на каждую створку без короба):**\n` +
          `  - (130 000 – 150 000 сум/м²) — **от ${formatPrice(mn.minTotalUZS)} до ${formatPrice(mn.maxTotalUZS)} сум**\n\n`;

        clarificationRu = !this.session.order.isQuantitySpecified
          ? `Подскажите, пожалуйста: на сколько окон (изделий) вам требуется расчет, какой тип карниза вам больше подходит (общий карниз на весь оконный проем, кассета на каждую створку или мини) и какую ткань вы предпочитаете (базовую, турецкую с узором или Blackout)?\n\n`
          : `Подскажите, пожалуйста: какой тип карниза вам больше подходит (общий карниз на весь оконный проем, кассета на каждую створку или мини) и какую ткань вы предпочитаете (базовую, турецкую с узором или Blackout)?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'rollo') {
        const sc = calc.categoryOptions.standardCornice;
        const cs = calc.categoryOptions.cassette;
        const mn = calc.categoryOptions.mini;

        priceBlockRu = `💰 **Варианты предварительной стоимости по официальному розничному прайс-листу COMBO.UZ (на ${calc.totalArea} м²):**\n\n` +
          `• **Общий карниз:** (200 000 – 215 000 сум/м²) — **от ${formatPrice(sc.minTotalUZS)} до ${formatPrice(sc.maxTotalUZS)} сум**\n` +
          `• **Кассетная система:** (230 000 сум/м²) — **${formatPrice(cs.totalUZS)} сум**\n` +
          `• **Мини-система:** (160 000 сум/м²) — **${formatPrice(mn.totalUZS)} сум**\n\n`;

        clarificationRu = !this.session.order.isQuantitySpecified
          ? `Подскажите, на сколько окон вам требуется расчет и какой тип карниза (общий карниз, кассета или мини) вам больше подходит?\n\n`
          : `Подскажите, какой тип карниза (общий карниз, кассета или мини) вам больше подходит?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'roman') {
        const sc = calc.categoryOptions.standardCornice;
        priceBlockRu = `💰 **Предварительная стоимость по розничному прайс-листу COMBO.UZ (на ${calc.totalArea} м²):**\n\n` +
          `• **Римские шторы (карниз + ткань):** 270 000 сум/м² — **${formatPrice(sc.totalUZS)} сум**\n\n`;
        clarificationRu = !this.session.order.isQuantitySpecified
          ? `Подскажите, на сколько окон вам нужен расчет и в какую комнату вы выбираете римские шторы?\n\n`
          : `Подскажите, в какую комнату вы выбираете римские шторы и какие цвета интерьера преобладают?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'tulle') {
        const st = calc.categoryOptions.standard;
        priceBlockRu = `💰 **Варианты предварительной стоимости по розничному прайс-листу COMBO.UZ (на ${calc.totalArea} м²):**\n\n` +
          `• **Тюлевые жалюзи:** (140 000 – 390 000 сум/м² в зависимости от ткани) — **от ${formatPrice(st.minTotalUZS)} до ${formatPrice(st.maxTotalUZS)} сум**\n\n`;
        clarificationRu = !this.session.order.isQuantitySpecified
          ? `Подскажите, на сколько окон нужен расчет и какой оттенок тюли вам ближе — белый, шампань или с узором?\n\n`
          : `Подскажите, какой оттенок тюли вам ближе — классический белый, шампань или с фактурным жаккардовым узором?\n\n`;
      } else if (calc.categoryOptions && calc.categoryOptions.categoryType === 'plisse') {
        const st = calc.categoryOptions.standard;
        priceBlockRu = `💰 **Варианты предварительной стоимости по розничному прайс-листу COMBO.UZ:**\n\n` +
          `• **Жалюзи плиссе / Honeycomb:** — **от ${formatPrice(st.minTotalUZS)} до ${formatPrice(st.maxTotalUZS)} сум**\n\n`;
        clarificationRu = !this.session.order.isQuantitySpecified
          ? `Подскажите, на сколько окон вам нужен расчет и какая ткань требуется — плиссе или термоизолирующая Honeycomb?\n\n`
          : `Подскажите, вам нужна обычная ткань плиссе или сотовая термоизолирующая Honeycomb?\n\n`;
      } else if (calc.isRetailFound) {
        const item = calc.collectionMatchData;
        let mechAlternatives = '';
        if (item && item.standardCornice && item.cassette && item.mini) {
          mechAlternatives = `\n• Другие варианты систем: Кассета — ${formatPrice(item.cassette * calc.totalArea)} сум | Мини — ${formatPrice(item.mini * calc.totalArea)} сум\n`;
        }
        priceBlockRu = `• **Тариф ткани:** ${formatPrice(calc.pricePerM2)} сум/м² (${calc.mechanismNameRu})\n` +
          `• **Предварительная сумма:** **${formatPrice(calc.totalUZS)} сум** (по официальному розничному прайс-листу)\n` +
          mechAlternatives + '\n';
        clarificationRu = !this.session.order.isQuantitySpecified
          ? `Подскажите, пожалуйста: на сколько окон требуется расчет и какой тип системы (общий карниз, кассета или мини) для вас наиболее удобен?\n\n`
          : `Подскажите, пожалуйста, какой тип системы (общий карниз, кассета на створку или мини) для вас наиболее удобен?\n\n`;
      } else if (isConfirmed) {
        priceBlockRu = `• **Тариф ткани:** ${formatPrice(calc.pricePerM2)} сум/м² (${calc.mechanismNameRu})\n` +
          `• **Предварительная сумма:** **${formatPrice(calc.totalUZS)} сум**\n\n`;
      } else {
        priceBlockRu = `• **Ориентировочная сумма:** [Официальный розничный прайс-лист утверждается администратором. Точная сумма рассчитывается менеджером при выборе ткани]\n\n`;
      }

      const reply = `📐 **Предварительный расчет по вашим размерам:**\n\n` +
        `• **Модель / Коллекция:** ${calc.modelName}\n` +
        `• **Размеры:** ${this.session.order.widthCm} × ${this.session.order.heightCm} см (${calc.wM} × ${calc.hM} м)\n` +
        `• **Правило расчета:** расчет ведется по площади изделия: ширина (${calc.wM} м) × высота (${calc.hM} м) × цена за 1 м² (минимальная расчётная площадь 1 м² на каждое изделие)\n` +
        `• **Расчетная площадь:** ${calc.singleArea} м²${areaExplanationRu} (${formatWindowCount(calc.windowCount, 'ru')} = ${calc.totalArea} м²)\n\n` +
        priceBlockRu +
        clarificationRu +
        `🚗 **Условия сервиса в Ташкенте:**\n` +
        `• **Замер окон** — БЕСПЛАТНО при оформлении заказа.\n` +
        `• **Помощь дизайнера** с физическими каталогами образцов — БЕСПЛАТНО при оформлении заказа.\n` +
        `• **Установка (монтаж)** — БЕСПЛАТНО при оформлении заказа.\n` +
        `• Если по итогам встречи вы решите не оформлять заказ, оплачивается только стандартный выезд специалиста — **100 000 сум**.\n` +
        `• **Работа по Узбекистану:** принимаем заказы по всей стране, условия доставки и установки за пределами Ташкента согласовываются с менеджером индивидуально.\n\n` +
        buildContactPrompt(this.session.client, 'ru');

      return { reply, stage: this.session.stage, calculation: calc, client: this.session.client, order: this.session.order };
    }
  }

  handleLeadCaptureStep(lower) {
    const lang = this.session.lang;
    const client = this.session.client;
    const order = this.session.order;

    // Check if lead was already placed and client is just sending courtesy / thank you
    const isCourtesy = /(спасибо|большое спасибо|рахмат|rahmat|katta rahmat|благодарю|отлично|договорились|kutaman|tushunarli)/i.test(lower);
    if (this.session.isLeadSubmitted && isCourtesy) {
      const ackReply = lang === 'uz'
        ? `Arzimaydi, ${client.name || 'hurmatli mijoz'}! 😊 Savollaringiz bo‘lsa, doimo aloqadamiz. Mutaxassisimiz tez orada siz bilan bog‘lanadi!`
        : `Пожалуйста, ${client.name || 'уважаемый клиент'}! 😊 Рады помочь. Если появятся вопросы — обращайтесь. Дежурный менеджер скоро свяжется с вами!`;
      return {
        reply: ackReply,
        stage: this.session.stage,
        isOrderReady: false,
        client: this.session.client,
        order: this.session.order
      };
    }

    const hasPhone = Boolean(client.phone && client.phone.length >= 9);
    const hasName = Boolean(client.name);

    if (hasPhone && hasName) {
      // Ensure estimate is calculated if dimensions are known
      if ((!order.totalEstimateUZS || order.totalEstimateUZS === 0) && order.widthCm && order.heightCm) {
        const c = this.calculateEstimate();
        if (c && c.totalUZS) {
          order.totalEstimateUZS = c.totalUZS;
        }
      }

      this.session.stage = SALES_STAGES.ORDER_PLACED;
      const isFirstSubmission = !this.session.isLeadSubmitted;
      this.session.isLeadSubmitted = true;

      const modelTitle = order.selectedModel || 'Рулонные шторы День и Ночь';
      const winCountFormattedRu = formatWindowCount(order.windowCount || 1, 'ru');
      const winCountFormattedUz = formatWindowCount(order.windowCount || 1, 'uz');
      const sizeTextRu = (order.widthCm && order.heightCm)
        ? `${winCountFormattedRu} (${order.widthCm}×${order.heightCm} см)`
        : winCountFormattedRu;
      const sizeTextUz = (order.widthCm && order.heightCm)
        ? `${winCountFormattedUz} (${order.widthCm}×${order.heightCm} sm)`
        : winCountFormattedUz;

      const corniceRu = order.corniceType || (order.mechanism === 'cassette' ? 'Кассетная система' : order.mechanism === 'mini' ? 'Мини-система' : 'Общий карниз');
      const fabricRu = order.fabricCollection || 'Базовая';

      let reply = '';
      if (lang === 'uz') {
        const titleText = isFirstSubmission ? `🎉 **Rahmat, ${client.name}! Buyurtmangiz qabul qilindi.**` : `✅ **${client.name}, ma’lumotlaringiz yangilandi.**`;
        reply = `${titleText}\n\n` +
          `• **Mijoz:** ${client.name}\n` +
          `• **Telefon:** ${client.phone}\n` +
          `• **Hudud:** ${client.district || client.region || 'Toshkent shahri'}\n` +
          `• **Model:** ${modelTitle}\n` +
          `• **Mato:** ${fabricRu}\n` +
          `• **Karniz turi:** ${corniceRu}\n` +
          `• **O‘lcham va miqdor:** ${sizeTextUz}\n` +
          (order.totalEstimateUZS ? `• **Dastlabki hisob:** ${order.totalEstimateUZS.toLocaleString('ru-RU')} so‘m\n` : '') +
          `\n🚗 **Eslatma:** Toshkentda o‘lchash, dizayner yordami va o‘rnatish buyurtma rasmiylashtirilganda BEPUL (agar buyurtma berilmasa — 100 000 so‘m; boshqa viloyatlarda shartlar menejer bilan kelishiladi).\n` +
          `Navbatchi menejerimiz 10–15 daqiqa ichida siz bilan bog‘lanadi!`;
      } else {
        const titleText = isFirstSubmission ? `🎉 **Спасибо, ${client.name}! Ваша заявка успешно принята.**` : `✅ **${client.name}, данные вашей заявки обновлены.**`;
        reply = `${titleText}\n\n` +
          `• **Клиент:** ${client.name}\n` +
          `• **Телефон:** ${client.phone}\n` +
          `• **Район / Город:** ${client.district || client.region || 'г. Ташкент'}\n` +
          `• **Выбранная модель:** ${modelTitle}\n` +
          `• **Коллекция ткани:** ${fabricRu}\n` +
          `• **Тип карниза:** ${corniceRu}\n` +
          `• **Объем заказа:** ${sizeTextRu}\n` +
          (order.totalEstimateUZS ? `• **Предварительная сумма:** ${order.totalEstimateUZS.toLocaleString('ru-RU')} сум\n` : '') +
          `\n🚗 **Напоминание:** Замер, помощь дизайнера и установка в Ташкенте — БЕСПЛАТНО при оформлении заказа (если заказ не оформляется — выезд специалиста 100 000 сум; в других областях Узбекистана условия согласовываются с менеджером).\n` +
          `Дежурный менеджер COMBO.UZ перезвонит вам в течение 10–15 минут для согласования деталей!`;
      }

      return {
        reply,
        stage: this.session.stage,
        isOrderReady: true,
        isLeadUpdated: !isFirstSubmission,
        leadData: {
          id: this.session.leadId || undefined,
          name: client.name,
          phone: client.phone,
          district: client.district || client.region || 'Ташкент',
          model: modelTitle,
          fabricCollection: fabricRu,
          corniceType: corniceRu,
          dimensions: (order.widthCm && order.heightCm) ? `${order.widthCm}×${order.heightCm} см` : '',
          quantity: order.windowCount || 1,
          totalEstimateUZS: order.totalEstimateUZS || 0,
          notes: order.notes || 'Заявка сформирована AI-консультантом'
        },
        client: this.session.client,
        order: this.session.order
      };
    }

    // Need more info (only ask for what is missing)
    let reply = '';
    const nameGreetingRu = client.name ? `Спасибо, ${client.name}! ` : '';
    const nameGreetingUz = client.name ? `Rahmat, ${client.name}! ` : '';
    if (lang === 'uz') {
      reply = `${nameGreetingUz}Buyurtmani rasmiylashtirish va menejer bilan bog‘lanish uchun, iltimos, quyidagilarni ko‘rsating:\n` +
        (!client.name ? `• Ismingiz\n` : '') +
        (!client.phone ? `• Telefon raqamingiz (+998 ...)\n` : '') +
        (!client.district && !client.region ? `• Toshkentdagi tumaningiz yoki viloyatingiz\n` : '') +
        `\nMenejerimiz siz bilan bog‘lanib, barcha savollaringizga to‘liq javob beradi.`;
    } else {
      reply = `${nameGreetingRu}Чтобы передать заявку менеджеру для точного расчета, пожалуйста, укажите:\n` +
        (!client.name ? `• Ваше имя\n` : '') +
        (!client.phone ? `• Номер телефона для связи (+998 ...)\n` : '') +
        (!client.district && !client.region ? `• Район Ташкента или ваш город\n` : '') +
        `\nМенеджер свяжется с вами и ответит на все вопросы!`;
    }

    return {
      reply,
      stage: this.session.stage,
      needsContactInfo: true,
      client: this.session.client,
      order: this.session.order
    };
  }

  handleGeneralDiscovery(lower, lang) {
    this.session.stage = SALES_STAGES.DISCOVERY;
    let reply = '';

    if (lang === 'uz') {
      reply = `Assalomu alaykum! Men **COMBO.UZ** virtual savdo maslahatchisiman. ☀️\n\n` +
        `Bizda quyoshdan himoya qiluvchi 12 ta asosiy toifadagi parda va jalyuzilar mavjud: Kun va Tun, Rollo, Double, Dikey, Tul jalyuzilari, Vertikal tul, Plisse, Kassetali, Mini-jalyuzi, Alyuminiy, Fototasvir va Rim pardalari.\n\n` +
        `Sizga qaysi xona uchun parda kerak va asosiy vazifa nima (quyoshdan to‘liq to‘sish, chiziqlar bilan yorug‘likni sozlash yoki chiroyli bezak)?`;
    } else {
      reply = `Здравствуйте! Я консультант компании **COMBO.UZ**. ☀️\n\n` +
        `У нас 12 основных категорий штор и жалюзи: День и Ночь, Ролло, Double, Dikey, Тюлевые жалюзи, Вертикальные тюлевые, Жалюзи плиссе, Кассетные, Мини-жалюзи, Алюминиевые, Фотонанесение и Римские шторы.\n\n` +
        `Подскажите, в какую комнату вы выбираете шторы и какая задача главная — 100% темнота от солнца, регулировка света полосами или декор?`;
    }

    return {
      reply,
      stage: this.session.stage,
      client: this.session.client,
      order: this.session.order
    };
  }
}
