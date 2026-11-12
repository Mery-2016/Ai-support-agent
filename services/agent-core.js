/**
 * COMBO.UZ Unified Omnichannel AI Sales Manager Core
 * Powers Instagram Direct, Telegram Bot, and Website chat simultaneously
 * with a single shared Sales Engine, Knowledge Base (100 Q&A), Catalog, and CRM.
 */
const path = require('path');
const db = require('./db');
const catalog = require('./catalog');
const pricing = require('./pricing');

// Channels
const CHANNELS = {
  INSTAGRAM: 'INSTAGRAM',
  TELEGRAM: 'TELEGRAM',
  WEB: 'WEB'
};

// In-memory sessions store: key = `${channel}:${senderId}`
const sessions = new Map();

// Handover registry: key = `${channel}:${senderId}` -> { handedOverAt, reason, clientName }
const handovers = new Map();

let SalesAgentClass = null;
let kbCache = null;

async function getSalesAgentClass() {
  if (!SalesAgentClass) {
    const mod = await import('../ui/sales-agent.js');
    SalesAgentClass = mod.SalesAgent;
  }
  return SalesAgentClass;
}

async function getKnowledgeBase() {
  if (!kbCache) {
    kbCache = await db.getKnowledgeBase();
  }
  return kbCache;
}

/**
 * Get or create an agent session for a given channel and user
 */
async function getOrCreateSession(channel, senderId, senderName = '', metadata = {}) {
  const sessionKey = `${channel}:${senderId}`;

  if (!sessions.has(sessionKey)) {
    const AgentClass = await getSalesAgentClass();
    const kb = await getKnowledgeBase();
    const retailPricingData = pricing.getRetailPricing();
    const officialPricingData = pricing.getOfficialPricing();

    const agent = new AgentClass(kb, officialPricingData, retailPricingData);
    if (senderName) {
      agent.session.client.name = senderName;
    }

    sessions.set(sessionKey, {
      channel,
      senderId,
      senderName,
      agent,
      metadata,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      messages: []
    });
  }

  const s = sessions.get(sessionKey);
  s.lastActiveAt = new Date().toISOString();
  if (senderName && !s.agent.session.client.name) {
    s.agent.session.client.name = senderName;
  }
  return s;
}

/**
 * Check if a chat is currently handed over to a human manager
 */
function isHandedOver(channel, senderId) {
  const key = `${channel}:${senderId}`;
  return handovers.has(key);
}

/**
 * Set handover status (transfer to human or return to bot)
 */
async function setHandover(channel, senderId, shouldHandover, reason = 'Client request', operatorName = 'Менеджер') {
  const key = `${channel}:${senderId}`;
  const session = sessions.get(key);

  if (shouldHandover) {
    handovers.set(key, {
      channel,
      senderId,
      senderName: session ? session.senderName : 'Клиент',
      reason,
      handedOverAt: new Date().toISOString(),
      operatorName
    });

    if (session && session.agent) {
      session.agent.session.needsManager = true;
    }

    // Save escalation in database
    await db.saveCallback({
      name: session ? session.senderName : 'Клиент ' + senderId,
      phone: session && session.agent && session.agent.session.client.phone ? session.agent.session.client.phone : '',
      district: session && session.agent && session.agent.session.client.district ? session.agent.session.client.district : channel,
      reason: `[${channel}] ${reason}`,
      category: 'HANDOVER_TO_HUMAN'
    });

    return { success: true, handedOver: true, message: `Диалог передан живому менеджеру (${channel}: ${senderId})` };
  } else {
    handovers.delete(key);
    if (session && session.agent) {
      session.agent.session.needsManager = false;
    }
    return { success: true, handedOver: false, message: `Бот возобновил автоматические ответы для ${channel}: ${senderId}` };
  }
}

/**
 * Process a message from any channel (Instagram, Telegram, or Web)
 */
async function processChannelMessage({ channel, senderId, senderName = '', text = '', metadata = {} }) {
  const cleanChannel = String(channel || CHANNELS.WEB).toUpperCase();
  const sessionKey = `${cleanChannel}:${senderId}`;
  const session = await getOrCreateSession(cleanChannel, senderId, senderName, metadata);
  const agent = session.agent;

  const userText = String(text || '').trim();
  session.messages.push({ role: 'user', text: userText, timestamp: new Date().toISOString() });

  // 1. Check if chat is already handed over to a human
  if (isHandedOver(cleanChannel, senderId)) {
    return {
      channel: cleanChannel,
      senderId,
      reply: null, // Silent for human takeover: do not auto-reply
      isHandedOver: true,
      handedOverInfo: handovers.get(sessionKey),
      suppressed: true,
      notice: 'Сообщение записано, диалог находится у оператора'
    };
  }

  const lower = userText.toLowerCase();

  // 2. Direct request for a human manager
  const isHumanReq = /(человек|оператор|менеджер|живой|позовите человека|свяжите с человеком|соедините с менеджером|специалист|menejer|operator|tirik odam|mutaxassis|\/manager)/i.test(lower);
  if (isHumanReq) {
    await setHandover(cleanChannel, senderId, true, 'Запрос живого оператора в чате', 'Дежурный менеджер');
    const isUz = agent.detectLanguage(userText) === 'uz';

    const handoverReply = isUz
      ? `👨‍💼 **Sizni navbatchi sotuv menejerimizga ulayapman!**\n\n` +
        `Menejerimiz suhbatga qo‘shilmoqda. Shuningdek, bizga to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qilishingiz mumkin:\n` +
        `📞 **+998 (71) 200-55-77** (COMBO.UZ savdo bo‘limi)\n\n` +
        `Agar telefon raqamingizni yozib qoldirsangiz, menejer 5-10 daqiqa ichida siz bilan bog‘lanadi!`
      : `👨‍💼 **С удовольствием переключаю диалог на дежурного менеджера!**\n\n` +
        `Менеджер уже видит нашу переписку и подключается к диалогу. Также вы можете связаться с нами напрямую:\n` +
        `📞 **+998 (71) 200-55-77** (Отдел продаж COMBO.UZ)\n\n` +
        `Если оставите свой номер телефона, менеджер наберёт вас в течение 5–10 минут!`;

    session.messages.push({ role: 'assistant', text: handoverReply, timestamp: new Date().toISOString() });

    return {
      channel: cleanChannel,
      senderId,
      reply: handoverReply,
      isHandedOver: true,
      needsManager: true,
      photos: []
    };
  }

  // 3. Catalog & Photo inquiry check
  const isPhotoOrCatalogQuery = /(фото|каталог|покажи|посмотреть|образец|rasm|katalog|namuna)/i.test(lower) &&
    !/(замер|оплат|скидк|расчет)/i.test(lower);

  let catalogItem = null;
  if (isPhotoOrCatalogQuery) {
    catalogItem = catalog.findProductByQuery(lower);
  }

  // 4. Run through SalesAgent core engine
  const agentResult = agent.processMessage(userText);
  let replyText = agentResult.reply || '';
  const photos = [];

  // If catalog item was detected, enrich with photo and card
  if (catalogItem) {
    const lang = agent.session.lang || 'ru';
    const card = catalog.formatProductCard(catalogItem, lang);
    if (!replyText || replyText.includes('В какую комнату') || replyText.includes('Стоимость рулонных штор зависит')) {
      replyText = card;
    } else {
      replyText = `${card}\n\n${replyText}`;
    }
    if (catalogItem.imageUrl) {
      photos.push({
        url: catalogItem.imageUrl,
        caption: lang === 'uz' ? catalogItem.name_uz : catalogItem.name_ru
      });
    }
  }

  // 5. If Order/Lead was captured, automatically save into COMBO.UZ CRM
  let savedLead = null;
  if (agentResult.isOrderReady && agentResult.leadData) {
    const channelTag = `[${cleanChannel}]`;
    const leadPayload = {
      ...agentResult.leadData,
      source: cleanChannel,
      notes: `${channelTag} Пользователь: ${senderName || senderId}. ${agentResult.leadData.notes || ''}`.trim()
    };

    if (session.leadId) {
      leadPayload.id = session.leadId;
    }

    try {
      const dbResult = await db.saveLead(leadPayload);
      savedLead = dbResult.lead;
      if (savedLead && savedLead.id) {
        session.leadId = savedLead.id;
        agent.session.leadId = savedLead.id;
        agent.session.isLeadSubmitted = true;
      }
    } catch (err) {
      console.error(`Error saving lead from ${cleanChannel}:`, err.message);
    }
  }

  session.messages.push({ role: 'assistant', text: replyText, timestamp: new Date().toISOString() });

  return {
    channel: cleanChannel,
    senderId,
    senderName,
    reply: replyText,
    photos,
    stage: agentResult.stage,
    isOrderReady: Boolean(agentResult.isOrderReady),
    leadData: savedLead || agentResult.leadData,
    needsManager: Boolean(agentResult.needsManager),
    isHandedOver: false,
    session: {
      lang: agent.session.lang,
      client: agent.session.client,
      order: agent.session.order
    }
  };
}

function getAllSessions() {
  const result = [];
  for (const [key, val] of sessions.entries()) {
    result.push({
      key,
      channel: val.channel,
      senderId: val.senderId,
      senderName: val.senderName,
      createdAt: val.createdAt,
      lastActiveAt: val.lastActiveAt,
      messageCount: val.messages.length,
      leadId: val.leadId || null,
      isHandedOver: isHandedOver(val.channel, val.senderId)
    });
  }
  return result;
}

function getHandoversList() {
  const result = [];
  for (const [key, val] of handovers.entries()) {
    result.push({ key, ...val });
  }
  return result;
}

module.exports = {
  CHANNELS,
  processChannelMessage,
  getOrCreateSession,
  isHandedOver,
  setHandover,
  getAllSessions,
  getHandoversList
};
