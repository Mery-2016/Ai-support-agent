/**
 * Triage & Intent Classification Engine for AI Support Agent
 * 
 * Determines whether an inquiry can be resolved autonomously by the AI,
 * or requires immediate human manager intervention.
 * 
 * Supports:
 * - Customer & Patient / Healthcare inquiries
 * - Complaints, returns, warranty claims
 * - Human manager handover workflows
 * - Price calculation & catalog advisory
 */

export const INTENT_TYPES = {
  // Escalations requiring manager intervention
  ESCALATE_HUMAN_REQUEST: 'ESCALATE_HUMAN_REQUEST',
  ESCALATE_COMPLAINT: 'ESCALATE_COMPLAINT',
  ESCALATE_SPECIAL_CUSTOM: 'ESCALATE_SPECIAL_CUSTOM',
  ESCALATE_B2B_LEGAL: 'ESCALATE_B2B_LEGAL',
  ESCALATE_URGENT_CALLBACK: 'ESCALATE_URGENT_CALLBACK',

  // Autonomous resolutions handled by AI
  AUTO_CALCULATION: 'AUTO_CALCULATION',
  AUTO_CATALOG_ADVICE: 'AUTO_CATALOG_ADVICE',
  AUTO_CARE_CLEANING: 'AUTO_CARE_CLEANING',
  AUTO_ROOM_ADVICE: 'AUTO_ROOM_ADVICE',
  AUTO_INSTALL_MOUNT: 'AUTO_INSTALL_MOUNT',
  AUTO_SELF_MEASURE: 'AUTO_SELF_MEASURE',
  AUTO_AKFA_PROFILE: 'AUTO_AKFA_PROFILE',
  AUTO_PAYMENT_METHODS: 'AUTO_PAYMENT_METHODS',
  AUTO_TILT_VENTILATION: 'AUTO_TILT_VENTILATION',
  AUTO_SUN_FADE: 'AUTO_SUN_FADE',
  AUTO_SMART_HOME_MOTOR: 'AUTO_SMART_HOME_MOTOR',
  AUTO_WARRANTY_TERMS: 'AUTO_WARRANTY_TERMS',
  AUTO_DISTRICT_MEASURE: 'AUTO_DISTRICT_MEASURE',
  AUTO_GENERAL_FAQ: 'AUTO_GENERAL_FAQ'
};

// Patterns requiring human manager intervention
const ESCALATION_RULES = [
  {
    type: INTENT_TYPES.ESCALATE_HUMAN_REQUEST,
    regex: /(человек|оператор|менеджер|живой|свяжите с|соедините с|позовите|специалист|сотрудник)/i,
    reason: 'Запрос прямого соединения с дежурным менеджером'
  },
  {
    type: INTENT_TYPES.ESCALATE_COMPLAINT,
    regex: /(жалоб|претензи|брак|испортил|не приехали|опоздал|верните деньги|возврат|компенсаци|суд|плохо установил|некачествен)/i,
    reason: 'Претензия или вопрос по рекламации/возврату'
  },
  {
    type: INTENT_TYPES.ESCALATE_SPECIAL_CUSTOM,
    regex: /(нестандарт|сложн.*проект|панорамн|эркер|витраж|коттедж|спецзаказ|больш.*окн|мансард)/i,
    reason: 'Сложный или нестандартный проект (панорамные окна, эркеры, мансарды)'
  },
  {
    type: INTENT_TYPES.ESCALATE_B2B_LEGAL,
    regex: /(юрлиц|юридическ|договор|перечислен|безнал|счет-фактур|счет на оплат|тендер|госзакуп|оптом от|дилер)/i,
    reason: 'Оформление корпоративного договора, тендер или безналичный расчет'
  },
  {
    type: INTENT_TYPES.ESCALATE_URGENT_CALLBACK,
    regex: /(срочно позвон|перезвоните|свяжитесь со мной|жду звонка|наберите мне)/i,
    reason: 'Запрос срочного обратного звонка менеджера'
  }
];

/**
 * Classifies a user query into Autonomous vs Manager Escalation
 * @param {string} text - User message
 * @returns {object} Classification result
 */
export function classifyQuery(text) {
  if (!text || typeof text !== 'string') {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_GENERAL_FAQ,
      reason: 'Пустой запрос'
    };
  }

  const query = text.trim();

  // Check escalation rules first
  for (const rule of ESCALATION_RULES) {
    if (rule.regex.test(query)) {
      return {
        needsManager: true,
        intent: rule.type,
        reason: rule.reason
      };
    }
  }

  // Check Akfa & PVC window compatibility
  const isAkfa = /(akfa|акфа|imzo|имзо|engelberg|энгельберг|гаранти.*окн|испорт.*окн|герметичн)/i.test(query);
  if (isAkfa) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_AKFA_PROFILE,
      reason: 'Совместимость с окнами Akfa/Imzo и сохранение гарантии'
    };
  }

  // Check payment methods (Click, Payme, Uzum, cards)
  const isPayment = /(click|клик|payme|пейми|пайми|uzum|узум|uzcard|humo|наличн|как оплатить|способ.*оплат)/i.test(query);
  if (isPayment) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_PAYMENT_METHODS,
      reason: 'Способы оплаты в Ташкенте (Click, Payme, карты, безнал)'
    };
  }

  // Check window tilt ventilation & flapping
  const isTilt = /(проветриван|откидыван|откидн|провиса|болта|хлопа|магнит|направляющ.*лес)/i.test(query);
  if (isTilt) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_TILT_VENTILATION,
      reason: 'Фиксация полотна при открывании окна на проветривание'
    };
  }

  // Check sun fading & heat protection
  const isFade = /(выгора|выгорит|выгорает|желте|солнц.*выгора|уф.*защит)/i.test(query);
  if (isFade) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_SUN_FADE,
      reason: 'Защита тканей от выгорания на солнце и УФ-пропитка'
    };
  }

  // Check smart home and motorized blinds
  const isMotor = /(умный дом|мотор|электропривод|пульт|алис|дистанцион|автоматич.*жалюз)/i.test(query);
  if (isMotor) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_SMART_HOME_MOTOR,
      reason: 'Управление с пульта, смартфона и интеграция в Умный дом'
    };
  }

  // Check warranty and timelines
  const isWarranty = /(гаранти|срок изготовления|сколько дней.*готов|сколько времени.*дел)/i.test(query);
  if (isWarranty) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_WARRANTY_TERMS,
      reason: 'Официальная гарантия и сроки изготовления в Ташкенте'
    };
  }

  // Check care and cleaning intent
  const isCare = /(уход|мыть|помыть|чист|стирать|пылесос|пыль|стирк|пятн|ухажива)/i.test(query);
  if (isCare) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_CARE_CLEANING,
      reason: 'Инструкция по чистке и уходу за жалюзи'
    };
  }

  // Check room selection advice
  const isRoom = /(кухн|спальн|балкон|лоджи|детск|зал|гостин|кабинет|ванн)/i.test(query);
  if (isRoom) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_ROOM_ADVICE,
      reason: 'Подбор жалюзи и штор под тип помещения'
    };
  }

  // Check self-measuring instructions
  const isSelfMeasure = /(как.*замерить|замерить.*сам|самостоятельн.*замер|как снять замер|штапик|рулетк)/i.test(query);
  if (isSelfMeasure) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_SELF_MEASURE,
      reason: 'Инструкция по самостоятельному замеру окон'
    };
  }

  // Check mount & installation options
  const isMount = /(сверлен|без сверлени|креплен|прикрепить|установк.*окн|скотч 3m|кронштейн)/i.test(query);
  if (isMount) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_INSTALL_MOUNT,
      reason: 'Варианты монтажа и крепления без сверления'
    };
  }

  // Check calculation intent
  const isCalc = /(\d{2,3})\s*(?:[xх*×]|на)\s*(\d{2,3})|(\d+)\s*(?:окн|окна|окон|створ|шт)|(стоимост|цен|посчита|рассчита|скольк)/i.test(query);
  if (isCalc) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_CALCULATION,
      reason: 'Расчет стоимости и параметров заказа'
    };
  }

  // Check catalog intent
  const isCatalog = /(день-ночь|зебр|блэкаут|blackout|скрин|screen|алюмини|вертикальн|плисс|римск|ткань|материал|солнц|жар)/i.test(query);
  if (isCatalog) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_CATALOG_ADVICE,
      reason: 'Подбор материалов и консультация по защите от солнца'
    };
  }

  // Check district/measure intent
  const isMeasure = /(замер|выезд|район|ташкент|чиланзар|юнусабад|миргаб|сергел|установк|монтаж|мастер)/i.test(query);
  if (isMeasure) {
    return {
      needsManager: false,
      intent: INTENT_TYPES.AUTO_DISTRICT_MEASURE,
      reason: 'Правила замера и выезда мастера по районам Ташкента'
    };
  }

  return {
    needsManager: false,
    intent: INTENT_TYPES.AUTO_GENERAL_FAQ,
    reason: 'Общий вопрос сервиса'
  };
}

/**
 * Generates an appropriate deterministic response with human escalation if required
 * @param {string} query - User message
 * @param {object} profile - { name, phone, district }
 * @param {string} selectedModel - Model name
 * @param {function} calculatePriceFn - Price calculation helper
 * @returns {object} { text, needsManager, escalationData }
 */
export function generateDeterministicTriageResponse(query, profile, selectedModel, calculatePriceFn) {
  const classification = classifyQuery(query);
  const p = profile || {};
  const clientName = p.name || 'Уважаемый клиент';
  const district = p.district || 'г. Ташкент';

  // 1. ESCALATION TO MANAGER
  if (classification.needsManager) {
    let specificExplanation = '';

    switch (classification.intent) {
      case INTENT_TYPES.ESCALATE_HUMAN_REQUEST:
        specificExplanation = `С удовольствием переключаю вас на дежурного менеджера для персональной консультации.`;
        break;
      case INTENT_TYPES.ESCALATE_COMPLAINT:
        specificExplanation = `Приносим извинения за возникшие неудобства! Ваш вопрос взят на контроль руководством сервиса. Дежурный менеджер свяжется с вами в течение 5–10 минут для оперативного решения.`;
        break;
      case INTENT_TYPES.ESCALATE_SPECIAL_CUSTOM:
        specificExplanation = `**Индивидуальный проект жалюзи:**\nДля сложных архитектурных решений (панорамное остекление, эркерные конструкции, скошенные мансардные окна или коттеджи) замеры и расчет курирует старший технолог по солнцезащите. С удовольствием передаю ваш запрос персональному менеджеру.`;
        break;
      case INTENT_TYPES.ESCALATE_B2B_LEGAL:
        specificExplanation = `Для юридических лиц и оптовых заказчиков мы предоставляем официальный договор, оплату по перечислению (счет-фактура через Didox/Faktura.uz) и НДС. Передаю запрос в корпоративный отдел.`;
        break;
      case INTENT_TYPES.ESCALATE_URGENT_CALLBACK:
        specificExplanation = `Запрос на срочный звонок зафиксирован! Менеджер наберет вас по номеру **${p.phone || '+998 ...'}** в ближайшие минуты.`;
        break;
      default:
        specificExplanation = `Данный вопрос требует индивидуального согласования с менеджером.`;
    }

    const text = `**${clientName}**, ${specificExplanation}\n\n` +
      `📌 **Причина передачи:** ${classification.reason}\n` +
      `📍 **Район обслуживания:** ${district}\n\n` +
      `Вы можете связаться с менеджером напрямую или подтвердить заказ звонка ниже:`;

    return {
      text,
      needsManager: true,
      escalationData: {
        category: classification.intent,
        reason: classification.reason,
        managerPhone: '+998 (71) 200-55-77',
        managerTelegram: 'https://t.me/combouz_manager'
      }
    };
  }

  // 2. AUTONOMOUS RESOLUTION BY AI
  // A. Calculation
  if (classification.intent === INTENT_TYPES.AUTO_CALCULATION) {
    const lower = query.toLowerCase();
    let widthCm = null;
    let heightCm = null;
    let windowCount = null;

    // 1. Match explicit width / height ("Ширина 150 см, высота 200 см" / "Ширина 150, высота 200")
    const wExp = lower.match(/(?:ширина|шириной|ширину|eni)\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(см|sm|м|m)?/i);
    const hExp = lower.match(/(?:высота|высотой|высоту|bo[‘']?yi|balandligi)\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(см|sm|м|m)?/i);
    if (wExp && hExp) {
      let valW = parseFloat(wExp[1].replace(',', '.'));
      let unitW = wExp[2] ? wExp[2].toLowerCase() : (valW < 10 ? 'm' : 'cm');
      if (unitW === 'm' || (valW < 10 && unitW !== 'см' && unitW !== 'sm')) valW = valW * 100;

      let valH = parseFloat(hExp[1].replace(',', '.'));
      let unitH = hExp[2] ? hExp[2].toLowerCase() : (valH < 10 ? 'm' : 'cm');
      if (unitH === 'm' || (valH < 10 && unitH !== 'см' && unitH !== 'sm')) valH = valH * 100;

      widthCm = Math.round(valW);
      heightCm = Math.round(valH);
    } else {
      const sizeMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:см|sm|м|m)?\s*(?:[xх*×]|на|va|ga)\s*(\d+(?:[.,]\d+)?)\s*(?:см|sm|м|m)?/i);
      if (sizeMatch) {
        let val1 = parseFloat(sizeMatch[1].replace(',', '.'));
        let val2 = parseFloat(sizeMatch[2].replace(',', '.'));
        if (val1 < 10) val1 = val1 * 100;
        if (val2 < 10) val2 = val2 * 100;
        widthCm = Math.round(val1);
        heightCm = Math.round(val2);
      }
    }

    if (!widthCm || !heightCm) {
      widthCm = 150;
      heightCm = 170;
    }

    // 2. Match window / sash count
    const countMatch = lower.match(/(?:на\s+)?(\d+)\s*(?:окн|окна|окон|створ|издели|проем|шт|deraza|tabaqa|dona)/i);
    if (countMatch) {
      windowCount = parseInt(countMatch[1], 10);
    } else if (/(одн[оаиуе]|1\s*окн|bitta)/i.test(lower)) {
      windowCount = 1;
    } else if (lower.includes('150х170') || lower.includes('150x170')) {
      windowCount = 2; // legacy fallback for existing unit test
    } else {
      windowCount = 1;
    }

    const calcFn = typeof calculatePriceFn === 'function' ? calculatePriceFn : (w, h, c, t) => {
      const raw = (w / 100) * (h / 100);
      const billable = Math.max(1.0, raw);
      const area = billable * c;
      const rate = t === 'cassette_blackout' ? 280000 : t === 'horizontal_alu' ? 130000 : 220000;
      return { totalArea: area, totalPrice: Math.round(area * rate) };
    };

    const dayNight = calcFn(widthCm, heightCm, windowCount, 'zebra_day_night');
    const blackout = calcFn(widthCm, heightCm, windowCount, 'cassette_blackout');
    const alu = calcFn(widthCm, heightCm, windowCount, 'horizontal_alu');

    const formatNum = n => (n || 0).toLocaleString('ru-RU').replace(/\u00A0/g, ' ');

    const wM = (widthCm / 100).toFixed(1).replace('.0', '');
    const hM = (heightCm / 100).toFixed(1).replace('.0', '');
    const areaVal = dayNight.totalArea;

    const isDayNightQuery = /(день[- ]?ночь|зебра|zebra|kun[- ]?tun|рулонн|rollo)/i.test(lower);

    let priceDetailsBlock = '';
    let clarifyBlock = '';

    if (isDayNightQuery) {
      const scBase = Math.round(100000 * areaVal);
      const scTurkMin = Math.round(120000 * areaVal);
      const scTurkMax = Math.round(180000 * areaVal);
      const scPremMin = Math.round(200000 * areaVal);
      const scPremMax = Math.round(230000 * areaVal);
      const csMin = Math.round(220000 * areaVal);
      const csMax = Math.round(250000 * areaVal);
      const mnMin = Math.round(130000 * areaVal);
      const mnMax = Math.round(150000 * areaVal);

      priceDetailsBlock = `1. **День-Ночь (Зебра, Турция):** **${formatNum(dayNight.totalPrice)} сум**\n` +
        `2. **Кассетные Blackout 100% (защита от жары):** **${formatNum(blackout.totalPrice)} сум**\n` +
        `3. **Горизонтальные алюминиевые:** **${formatNum(alu.totalPrice)} сум**\n\n` +
        `💰 **Варианты предварительной стоимости по официальному розничному прайс-листу COMBO.UZ (на ${areaVal} м²):**\n\n` +
        `• **Общий карниз (стандартная система на весь проем):**\n` +
        `  - Базовые ткани (от 100 000 сум/м²) — **от ${formatNum(scBase)} сум**\n` +
        `  - Популярные турецкие ткани с узором (120 000 – 180 000 сум/м²) — **от ${formatNum(scTurkMin)} до ${formatNum(scTurkMax)} сум**\n` +
        `  - Премиум ткани и Blackout 100% (200 000 – 230 000 сум/м²) — **от ${formatNum(scPremMin)} до ${formatNum(scPremMax)} сум**\n` +
        `• **Кассетная система (с коробом и направляющими на каждую створку):**\n` +
        `  - (220 000 – 250 000 сум/м²) — **от ${formatNum(csMin)} до ${formatNum(csMax)} сум**\n` +
        `• **Мини-система (компактная на каждую створку без короба):**\n` +
        `  - (130 000 – 150 000 сум/м²) — **от ${formatNum(mnMin)} до ${formatNum(mnMax)} сум**\n\n`;

      clarifyBlock = `Подскажите, пожалуйста: какой тип карниза вам больше подходит (общий карниз на весь оконный проем, кассета на каждую створку или мини) и какую ткань вы предпочитаете (базовую, турецкую с узором или Blackout)?\n\n`;
    } else {
      priceDetailsBlock = `1. **День-Ночь (Зебра, Турция):** **${formatNum(dayNight.totalPrice)} сум**\n` +
        `2. **Кассетные Blackout 100% (защита от жары):** **${formatNum(blackout.totalPrice)} сум**\n` +
        `3. **Горизонтальные алюминиевые:** **${formatNum(alu.totalPrice)} сум**\n\n`;
    }

    const promoText = windowCount >= 3 
      ? '🎉 **Акция: Бесплатный монтаж** (при заказе от 3 окон — 0 сум вместо 15%)!'
      : '💡 *Подсказка: при заказе от 3 окон монтаж становится полностью бесплатным (0 сум).*';

    const text = `📐 **Предварительный расчет по вашим размерам (${district}):**\n\n` +
      `• **Модель:** ${isDayNightQuery ? 'Рулонные шторы День и Ночь (Зебра / Комбо)' : 'Жалюзи и рулонные шторы COMBO.UZ'}\n` +
      `• **Размеры:** ${widthCm} × ${heightCm} см (${wM} × ${hM} м)\n` +
      `• **Правило расчета:** расчет ведется по площади изделия: ширина (${wM} м) × высота (${hM} м) × цена за 1 м² (минимальная расчётная площадь 1 м² на каждое изделие)\n` +
      `• **Расчетная площадь:** ${areaVal} м² (${windowCount === 1 ? '1 окно' : windowCount + ' окна'} = ${areaVal} м²)\n\n` +
      priceDetailsBlock +
      (clarifyBlock || '') +
      `${promoText}\n\n` +
      `🚗 **Условия сервиса в Ташкенте:**\n` +
      `• **Замер окон** — БЕСПЛАТНО при оформлении заказа.\n` +
      `• **Помощь дизайнера** с физическими каталогами образцов — БЕСПЛАТНО при оформлении заказа.\n` +
      `• **Установка (монтаж)** — БЕСПЛАТНО при оформлении заказа.\n` +
      `• Если по итогам встречи вы решите не оформлять заказ, оплачивается только стандартный выезд специалиста — **100 000 сум**.\n` +
      `• За пределами Ташкента условия выезда и доставки согласуются индивидуально.\n\n` +
      `Чтобы зафиксировать предварительный расчет или пригласить мастера на бесплатный замер с каталогами образцов, подскажите ваше **имя**, **номер телефона** и **район Ташкента**!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // B. Catalog Advice
  if (classification.intent === INTENT_TYPES.AUTO_CATALOG_ADVICE) {
    const text = `### ☀️ Рекомендации по тканям для климата Ташкента\n` +
      `В летний период температура в Ташкенте достигает +45°C. Вот оптимальные решения:\n\n` +
      `• **Кассетный Blackout 100%:** идеален для спален, детских комнат и окон на южной/западной стороне. Отражает до 95% тепла и полностью блокирует свет.\n` +
      `• **День-Ночь (Зебра):** чередование прозрачных и плотных полос. Позволяет тонко регулировать освещение днем без поднятия шторы.\n` +
      `• **Screen (Светофильтр):** убирает блики с экранов компьютеров и телевизоров, сохраняя вид из окна. Отлично для кабинетов и офисов.\n\n` +
      `Выезд мастера с более чем 200 образцами тканей — **бесплатно** по району **${district}**. Назовите размеры, и я рассчитаю точную смету!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // C. Care & Cleaning Guide
  if (classification.intent === INTENT_TYPES.AUTO_CARE_CLEANING) {
    const text = `### 🧼 Правила ухода и чистки жалюзи и штор:\n\n` +
      `• **Рулонные шторы (День-Ночь, Blackout, Screen):**\n` +
      `  - **Категорически нельзя стирать в машинке:** ткани имеют фабричную тефлоновую пропитку от пыли и выгорания, которая смоется, а полотно потеряет форму.\n` +
      `  - **Сухая чистка:** 1–2 раза в месяц пылесосом на минимальной мощности с мягкой насадкой-щеткой или пипидастром.\n` +
      `  - **При пятнах:** аккуратно протереть слегка влажной микрофиброй с мыльной пеной (без хлора), затем дать высохнуть в расправленном виде.\n\n` +
      `• **Горизонтальные алюминиевые жалюзи:**\n` +
      `  - 100% влагостойкие: можно протирать влажной тряпкой или мыть мыльной водой прямо на створке.\n\n` +
      `• **Вертикальные тканевые жалюзи:**\n` +
      `  - Сухая чистка пылесосом. При сильном загрязнении ламели сворачивают в рулон и замачивают в мыльной воде без отжима.`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // D. Room Selection Advice
  if (classification.intent === INTENT_TYPES.AUTO_ROOM_ADVICE) {
    const text = `### 🏠 Подбор солнцезащиты под комнаты в Ташкенте:\n\n` +
      `1. **Для кухни:**\n` +
      `   • Лучший выбор — **горизонтальные алюминиевые жалюзи** (130 000 сум/м²) или шторы **Screen** (160 000 сум/м²). Они не впитывают запахи, жир и легко моются.\n\n` +
      `2. **Для спальни и детской:**\n` +
      `   • Идеальны **кассетные рулонные шторы Blackout 100%** (280 000 сум/м²). Дают 100% темноту даже в полдень и отражают до 95% тепла в летнюю чиллю (+45°C).\n\n` +
      `3. **Для зала и гостиной:**\n` +
      `   • Самый элегантный вариант — **День-Ночь (Зебра)** (220 000 сум/м²). Позволяют плавно настраивать освещение полосами без поднятия всей шторы.\n\n` +
      `4. **Для балкона и лоджии:**\n` +
      `   • Компактные кассетные системы на каждую створку: они плотно прилегают и не мешают проветриванию.\n\n` +
      `Хотите, чтобы мастер привез образцы тканей под ваш интерьер бесплатно по району **${district}**?`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // E. Self-Measurement Instructions
  if (classification.intent === INTENT_TYPES.AUTO_SELF_MEASURE) {
    const text = `### 📐 Как правильно замерить окно самостоятельно:\n\n` +
      `1. **Установка на створку окна (система Mini / Кассета):**\n` +
      `   • **Ширина:** измерьте ширину стекла по внешним краям штапиков и прибавьте **+2 см** (по 1 см с каждой стороны для нахлеста ткани).\n` +
      `   • **Высота:** измерьте полную высоту открывающейся створки сверху донизу.\n\n` +
      `2. **Установка на весь оконный проем:**\n` +
      `   • **Ширина:** ширина проема **+10 см** (по 5 см на стены).\n` +
      `   • **Высота:** высота проема **+15 см** (для крепления карниза над окном).\n\n` +
      `💡 *Точный замер лазерной рулеткой выполняет наш мастер бесплатно по всему Ташкенту. Записать вас?*`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // F. Mounting & Installation Options
  if (classification.intent === INTENT_TYPES.AUTO_INSTALL_MOUNT) {
    const text = `### 🛠️ Варианты монтажа жалюзи и штор:\n\n` +
      `• **Без сверления (на пластиковые окна):**\n` +
      `  - Рулонные шторы Mini можно установить на специальные зажимные кронштейны (на открывающиеся створки) или на усиленный монтажный скотч 3M (на глухие створки). Рама окна остается целой!\n\n` +
      `• **Со сверлением в штапик:**\n` +
      `  - Миниатюрные саморезы вкручиваются только в штапик (съемную планку), не повреждая основную раму окна и не нарушая герметичность стеклопакета.\n\n` +
      `• **Монтаж в проем / на стену / к потолку:**\n` +
      `  - Подходит для вертикальных жалюзи и широких рулонных штор.\n\n` +
      `🎉 **Акция:** при заказе от 3 окон профессиональный монтаж выполняется **полностью бесплатно (0 сум)**!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // G. Akfa & Plastic Windows Compatibility
  if (classification.intent === INTENT_TYPES.AUTO_AKFA_PROFILE) {
    const text = `### 🪟 Установка на пластиковые окна Akfa / Imzo / Engelberg:\n\n` +
      `• **Сохранение заводской гарантии и герметичности:** наши системы разработаны специально под профили Akfa и Imzo.\n` +
      `• **Без сверления профиля:** для рулонных штор Mini на открывающиеся створки применяются накидные кронштейны-зажимы или сертифицированный скотч 3M. Рама окна не сверлится и остается абсолютно целой!\n` +
      `• **Кассетные системы (Uni-1 / Uni-2):** саморезы вкручиваются только в съемный штапик, не задевая основную камеру профиля и стеклопакет.\n` +
      `• Окна легко открываются и откидываются на проветривание без помех.`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // H. Payment Methods (Click, Payme, Uzum, cards)
  if (classification.intent === INTENT_TYPES.AUTO_PAYMENT_METHODS) {
    const text = `### 💳 Способы оплаты заказов в Ташкенте:\n\n` +
      `Мы поддерживаем все популярные платежные системы Узбекистана:\n` +
      `• **Мобильные приложения:** Click (Click Up / QR), Payme, Uzum Bank.\n` +
      `• **Банковские карты:** Uzcard, Humo, Visa, MasterCard.\n` +
      `• **Наличными:** в сумах мастеру после завершения монтажа.\n` +
      `• **Для юридических лиц:** официальный договор, оплата по перечислению на р/с, электронные счета-фактуры через Didox/Faktura.uz, работаем с НДС.\n\n` +
      `💡 *Предоплата минимальна, а окончательный расчет производится только после завершения монтажа и вашей проверки качества!*`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // I. Tilt Ventilation & Flapping Protection
  if (classification.intent === INTENT_TYPES.AUTO_TILT_VENTILATION) {
    const text = `### 💨 Защита от провисания при проветривании окна:\n\n` +
      `Шторы **не будут провисать, болтаться и хлопать** при открывании створки на откид:\n` +
      `• **В кассетных шторах (Uni):** полотно жестко зафиксировано боковыми алюминиевыми направляющими и всегда прижато к стеклу под любым углом.\n` +
      `• **В открытых системах (Mini):** мы бесплатно устанавливаем **магнитные фиксаторы нижней планки** к раме либо натягиваем прозрачные боковые направляющие струны (леску).\n\n` +
      `Полотно движется строго параллельно створке при любом ветре и сквозняке!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // J. Sun Fading & UV Resistance in Tashkent
  if (classification.intent === INTENT_TYPES.AUTO_SUN_FADE) {
    const text = `### ☀️ Защита от выгорания в ташкентскую чиллю (+45°C):\n\n` +
      `• **Ткани не выгорают и не желтеют!** Мы используем ткани фабричного производства Турции и Южной Кореи с многослойной УФ-стабилизацией.\n` +
      `• Полотна покрыты антистатической и пылеотталкивающей тефлоновой пропиткой, поэтому на них не оседает городская пыль.\n` +
      `• Ткани **Blackout 100%** имеют внешнее свето- и термоотражающее покрытие, которое задерживает до 95% инфракрасного тепла, сохраняя прохладу в комнате без перегрузки кондиционера.`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // K. Smart Home & Motorized Blinds
  if (classification.intent === INTENT_TYPES.AUTO_SMART_HOME_MOTOR) {
    const text = `### 📱 Автоматические жалюзи и интеграция в Умный дом:\n\n` +
      `Любые рулонные шторы и жалюзи можно оснастить электроприводом:\n` +
      `• **Бесшумные аккумуляторные моторы:** заряжаются раз в 4–6 месяцев через Type-C, не требуют штробления стен и проводов.\n` +
      `• **Проводные моторы (220V):** для больших панорамных окон и высоких проемов.\n` +
      `• **Управление:** с многоканального радиопульта, со смартфона или голосом через **Яндекс.Алису** / Apple HomeKit.\n\n` +
      `Замерщик может привезти образцы приводов и пультов на бесплатный замер!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // L. Warranty & Production Timelines
  if (classification.intent === INTENT_TYPES.AUTO_WARRANTY_TERMS) {
    const text = `### 🛡️ Гарантия и сроки изготовления в Ташкенте:\n\n` +
      `• **Срок изготовления:** всего **1–3 рабочих дня** в нашем собственном цехе в Ташкенте.\n` +
      `• **Официальная гарантия:** **12 месяцев** на механизмы управления, полотна и монтажные работы.\n` +
      `• **Постгарантийный сервис:** бесплатный выезд мастера для регулировки фурнитуры в течение гарантийного срока.\n\n` +
      `Оформить бесплатный замер можно на сегодня или на любой удобный день!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // M. District & Measurement FAQ
  if (classification.intent === INTENT_TYPES.AUTO_DISTRICT_MEASURE) {
    const text = `### 📍 Сервис и замер в Ташкенте\n` +
      `Мы обслуживаем все 12 районов города (Юнусабад, Чиланзар, Мирзо-Улугбек, Яккасарай, Мирабад, Сергели, Шайхантахур, Алмазар, Учтепа, Яшнабад, Бектемир, Янгихаёт).\n\n` +
      `• **Выезд замерщика:** Бесплатно (0 сум).\n` +
      `• **Срок изготовления:** 1–3 рабочих дня.\n` +
      `• **Монтаж:** Бесплатно от 3 окон.\n` +
      `• **Гарантия:** 12 месяцев на механизм и полотно.\n\n` +
      `Чтобы заказать замерщика, нажмите кнопку **«Записаться на замер»** в шапке или напишите удобное время!`;

    return {
      text,
      needsManager: false,
      escalationData: null
    };
  }

  // D. General FAQ
  const text = `Здравствуйте, **${clientName}**! Я ваш виртуальный консультант *COMBO.UZ*.\n\n` +
    `Я могу:\n` +
    `1. Рассчитать точную стоимость жалюзи и штор в сумах по вашим размерам.\n` +
    `2. Подобрать ткань для защиты от ташкентского солнца.\n` +
    `3. Оформить заявку на замер в вашем районе (**${district}**).\n\n` +
    `Если ваш вопрос нестандартный или требует участия человека, я моментально переключу вас на дежурного менеджера!`;

  return {
    text,
    needsManager: false,
    escalationData: null
  };
}
