/**
 * COMBO.UZ Telegram Bot API Integration Service
 * Compliant with official Telegram Bot API specifications:
 * - Webhook update handling (message.text, message.contact, callback_query)
 * - Rich Interactive Keyboards (ReplyKeyboardMarkup, InlineKeyboardMarkup)
 * - Commands: /start, /calc, /catalog, /manager, /lang, /help
 * - Native Contact sharing (request_contact: true) for 1-click lead capture
 * - Human Handover / Manager Alert forwarding
 * - Safe test / sandbox simulation mode when bot token is not yet configured
 */
const https = require('https');
const agentCore = require('./agent-core');
const catalog = require('./catalog');

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function getManagerChatId() {
  return process.env.TELEGRAM_MANAGER_CHAT_ID || '';
}

function isLiveEnabled() {
  return process.env.TELEGRAM_LIVE_ENABLED === 'true';
}

/**
 * Standard Reply Keyboard for Telegram Users
 */
function getTelegramKeyboard(lang = 'ru') {
  const isUz = lang === 'uz';

  return {
    keyboard: [
      [
        { text: isUz ? '📐 Narxni hisoblash' : '📐 Рассчитать стоимость' },
        { text: isUz ? '📖 Pardalar katalogi' : '📖 Каталог штор' }
      ],
      [
        { text: isUz ? '🚗 O‘lchovchini chaqirish' : '🚗 Вызвать замерщика' },
        { text: isUz ? '👨‍💼 Menejer bilan bog‘lanish' : '👨‍💼 Связаться с менеджером' }
      ],
      [
        {
          text: isUz ? '📱 Telefon raqamni yuborish' : '📱 Поделиться номером телефона',
          request_contact: true
        },
        { text: isUz ? '🇷🇺 Язык / Tilni o‘zgartirish' : '🇺🇿 Til / Сменить язык' }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

/**
 * Call Telegram Bot API method
 */
async function callTelegramApi(method, payload) {
  const token = getBotToken();
  const live = isLiveEnabled();

  if (!token || !live) {
    // Sandbox / Test / Safe Mode: token not set or live auto-replies paused
    return {
      simulated: true,
      liveEnabled: false,
      method,
      payload,
      timestamp: new Date().toISOString()
    };
  }

  return new Promise((resolve, reject) => {
    const postBody = JSON.stringify(payload);

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ ok: false, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Telegram request error:', err.message);
      reject(err);
    });

    req.write(postBody);
    req.end();
  });
}

/**
 * Send text message to Telegram user
 */
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  return callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

/**
 * Send photo with caption to Telegram user
 */
async function sendTelegramPhoto(chatId, photoUrl, caption, replyMarkup = null) {
  return callTelegramApi('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'Markdown',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

/**
 * Process incoming Telegram Update
 */
async function handleTelegramUpdate(update, isSimulation = false) {
  if (!update) return { success: false, error: 'Empty update' };

  const message = update.message || update.edited_message || (update.callback_query && update.callback_query.message);
  if (!message) return { success: false, error: 'No message in update' };

  const chatId = String(message.chat ? message.chat.id : (update.callback_query ? update.callback_query.from.id : ''));
  const senderId = String(message.from ? message.from.id : chatId);
  const firstName = message.from ? (message.from.first_name || '') : '';
  const username = message.from && message.from.username ? `@${message.from.username}` : firstName;

  // 1. Handle Contact Sharing (User clicked "Поделиться номером")
  if (message.contact) {
    let phone = message.contact.phone_number || '';
    if (!phone.startsWith('+')) phone = '+' + phone;

    const contactText = `Меня зовут ${message.contact.first_name || firstName}, мой телефон: ${phone}. Хочу вызвать мастера на замер.`;

    const agentResponse = await agentCore.processChannelMessage({
      channel: agentCore.CHANNELS.TELEGRAM,
      senderId,
      senderName: username,
      text: contactText,
      metadata: {
        platform: 'telegram',
        chatId,
        contactShared: true,
        phone
      }
    });

    const isUz = agentResponse.session && agentResponse.session.lang === 'uz';
    const confirmReply = isUz
      ? `✅ **Rahmat, ${message.contact.first_name || 'Hurmatli mijoz'}!**\n\n` +
        `Sizning raqamingiz qabul qilindi: **${phone}**.\n` +
        `Menejerimiz 10 daqiqa ichida siz bilan bog‘lanadi va bepul o‘lchash vaqtini kelishib oladi!`
      : `✅ **Спасибо, ${message.contact.first_name || 'Уважаемый клиент'}!**\n\n` +
        `Ваш номер **${phone}** успешно зафиксирован.\n` +
        `Дежурный менеджер COMBO.UZ свяжется с вами в течение 10 минут для согласования удобного времени бесплатного замера!`;

    const sendRes = await sendTelegramMessage(chatId, confirmReply, getTelegramKeyboard(isUz ? 'uz' : 'ru'));

    return {
      success: true,
      type: 'contact',
      senderId,
      phone,
      agentResponse,
      sendRes
    };
  }

  // 2. Handle Text & Commands
  let userText = (message.text || (update.callback_query && update.callback_query.data) || '').trim();
  if (!userText) return { success: false, error: 'Empty text' };

  // Handle Command /start
  if (userText === '/start') {
    const welcome = `Ассалому алейкум! Здравствуйте! ☀️\n\n` +
      `Добро пожаловать в официальный Telegram-бот компании **COMBO.UZ** — эксперта по жалюзи и рулонным шторам в Ташкенте!\n\n` +
      `Я помогу вам:\n` +
      `• 📐 Рассчитать стоимость штор по вашим размерам в сумах\n` +
      `• 📖 Подобрать ткань из каталога (День-Ночь, Blackout, Плиссе и др.)\n` +
      `• 🚗 Записаться на **бесплатный выезд замерщика** с каталогами образцов\n` +
      `• 👨‍💼 Быстро переключиться на живого менеджера\n\n` +
      `*Выберите действие на клавиатуре ниже или напишите ваш вопрос:*`;

    const sendRes = await sendTelegramMessage(chatId, welcome, getTelegramKeyboard('ru'));
    return { success: true, command: '/start', sendRes };
  }

  // Handle Command /help
  if (userText === '/help') {
    const helpText = `ℹ️ **Команды бота COMBO.UZ:**\n\n` +
      `• /calc — Расчет стоимости по размерам окна\n` +
      `• /catalog — Просмотр коллекций и фотографий штор\n` +
      `• /manager — Перевод на живого сотрудника отдела продаж\n` +
      `• /lang — Сменить язык диалога (RU / UZ)\n` +
      `• /help — Справка по командам\n\n` +
      `📞 Телефон отдела продаж: **+998 (71) 200-55-77**`;

    const sendRes = await sendTelegramMessage(chatId, helpText, getTelegramKeyboard('ru'));
    return { success: true, command: '/help', sendRes };
  }

  // Handle Command /lang or button click for language
  if (userText === '/lang' || userText.includes('Til') || userText.includes('Язык')) {
    const session = await agentCore.getOrCreateSession(agentCore.CHANNELS.TELEGRAM, senderId, username);
    const newLang = session.agent.session.lang === 'ru' ? 'uz' : 'ru';
    session.agent.session.lang = newLang;

    const langReply = newLang === 'uz'
      ? `🇺🇿 **Til o‘zgartirildi: O‘zbek tili.**\nSizga qanday yordam bera olaman? Xohlagan savolingizni yozing!`
      : `🇷🇺 **Язык переключен: Русский.**\nЧем могу помочь? Задайте вопрос о моделях, замерах или ценах!`;

    const sendRes = await sendTelegramMessage(chatId, langReply, getTelegramKeyboard(newLang));
    return { success: true, command: '/lang', newLang, sendRes };
  }

  // Handle Command /catalog
  if (userText === '/catalog' || userText.includes('Каталог') || userText.includes('katalog')) {
    const items = catalog.getCatalog();
    let textSummary = `📖 **Официальный каталог COMBO.UZ в Ташкенте (12 категорий):**\n\n`;
    items.forEach((it, idx) => {
      textSummary += `${idx + 1}. **${it.name_ru}**\n   _${it.priceNote_ru}_\n`;
    });
    textSummary += `\n*Напишите название интересующей модели, чтобы получить подробные фото и расчет!*`;

    const sendRes = await sendTelegramMessage(chatId, textSummary, getTelegramKeyboard('ru'));
    return { success: true, command: '/catalog', sendRes };
  }

  // 3. Dispatch general messages to Unified Agent Core
  const agentResponse = await agentCore.processChannelMessage({
    channel: agentCore.CHANNELS.TELEGRAM,
    senderId,
    senderName: username,
    text: userText,
    metadata: {
      platform: 'telegram',
      chatId,
      messageId: message.message_id
    }
  });

  const isUz = agentResponse.session && agentResponse.session.lang === 'uz';
  const keyboard = getTelegramKeyboard(isUz ? 'uz' : 'ru');

  let sendResult = null;

  // Send photo if available
  if (Array.isArray(agentResponse.photos) && agentResponse.photos.length > 0) {
    for (const p of agentResponse.photos) {
      await sendTelegramPhoto(chatId, p.url, p.caption || '');
    }
  }

  // Send main text response
  if (agentResponse.reply) {
    sendResult = await sendTelegramMessage(chatId, agentResponse.reply, keyboard);
  }

  // If handed over to human manager, notify manager chat if configured
  const managerChat = getManagerChatId();
  if (agentResponse.isHandedOver && managerChat && !isSimulation) {
    const alertText = `🚨 **Внимание, запрос менеджера в Telegram!**\n\n` +
      `👤 Клиент: ${username} (Chat ID: \`${chatId}\`)\n` +
      `💬 Сообщение: "${userText}"\n` +
      `⏱ Время: ${new Date().toLocaleString('ru-RU')}\n\n` +
      `Бот приостановил автоматические ответы для этого чата. Перейдите к диалогу с клиентом.`;
    await sendTelegramMessage(managerChat, alertText);
  }

  return {
    success: true,
    chatId,
    senderId,
    username,
    userText,
    agentResponse,
    sendResult
  };
}

/**
 * Simulation helper for testing Telegram updates without live bot token
 */
async function simulateTelegramMessage(chatId, username, text, contact = null) {
  const fakeChatId = String(chatId || '123456789');
  const mockUpdate = {
    update_id: Date.now(),
    message: {
      message_id: 1001,
      from: {
        id: fakeChatId,
        is_bot: false,
        first_name: username.replace(/^@/, ''),
        username: username.replace(/^@/, '')
      },
      chat: {
        id: fakeChatId,
        first_name: username.replace(/^@/, ''),
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: contact ? undefined : text,
      contact: contact || undefined
    }
  };

  return handleTelegramUpdate(mockUpdate, true);
}

function getTelegramStatus() {
  const token = getBotToken();
  const live = isLiveEnabled();
  return {
    configured: Boolean(token),
    liveEnabled: live,
    mode: (token && live) ? 'LIVE' : (token ? 'PREPARED_PAUSED' : 'SIMULATION_SANDBOX'),
    statusText: (token && live)
      ? 'Подключен и активен (Telegram Bot API)'
      : 'Подготовлен к подключению (Safe Mode: автоответы клиентам в Telegram приостановлены)',
    webhookPath: '/api/webhook/telegram',
    managerChatId: getManagerChatId() || 'Not set',
    commands: ['/start', '/calc', '/catalog', '/manager', '/lang', '/help'],
    features: [
      'Interactive Reply Keyboard',
      'One-click Contact Sharing (request_contact)',
      'Product Photo Previews',
      'Unified 100 Q&A Knowledge Base',
      'CRM Lead Auto-capture with source: TELEGRAM',
      'Human Handover / Manager Notification'
    ]
  };
}

module.exports = {
  handleTelegramUpdate,
  sendTelegramMessage,
  sendTelegramPhoto,
  simulateTelegramMessage,
  getTelegramStatus,
  getTelegramKeyboard
};
