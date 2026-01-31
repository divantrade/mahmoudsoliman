/**
 * =====================================================
 * نظام محمود المحاسبي - Telegram Bot Handler
 * =====================================================
 */

/**
 * Handle incoming webhook from Telegram
 * @param {Object} e - Event object from Google Apps Script
 */
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    processUpdate(update);
    return ContentService.createTextOutput('OK');
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput('Error');
  }
}

/**
 * Process Telegram update
 * @param {Object} update - Telegram update object
 */
function processUpdate(update) {
  try {
    if (update.message) {
      handleMessage(update.message);
    } else if (update.callback_query) {
      handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    Logger.log('Error in processUpdate: ' + error.toString());
  }
}

/**
 * Handle incoming message
 * @param {Object} message - Telegram message object
 */
function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const userName = message.from.first_name || 'مستخدم';
  const username = message.from.username || '';
  const text = message.text || '';

  // Check if user exists and has permission
  let user = getUserByTelegramId(userId);

  // Auto-register admin
  if (!user && userId == 786700586) {
    addUser({
      telegram_id: userId,
      name: userName,
      username: username,
      role: ROLES.ADMIN
    });
    user = getUserByTelegramId(userId);
  }

  // Check if user is registered
  if (!user) {
    sendMessage(chatId, `⚠️ عذراً، أنت غير مسجل في النظام.\n\nتواصل مع المسؤول لإضافتك.\n\nYour Telegram ID: \`${userId}\``);
    return;
  }

  // Check if user is active
  if (!user.active) {
    sendMessage(chatId, '⚠️ حسابك معطل. تواصل مع المسؤول.');
    return;
  }

  // Update user activity
  updateUserActivity(userId);

  // Handle commands
  if (text.startsWith('/')) {
    handleCommand(chatId, text, user);
    return;
  }

  // Process message with AI
  processUserMessage(chatId, text, user);
}

/**
 * Handle bot commands
 * @param {number} chatId - Chat ID
 * @param {string} text - Command text
 * @param {Object} user - User object
 */
function handleCommand(chatId, text, user) {
  const command = text.split(' ')[0].toLowerCase();

  switch (command) {
    case '/start':
      sendWelcomeMessage(chatId, user);
      break;

    case '/help':
      sendHelpMessage(chatId, user);
      break;

    case '/report':
    case '/تقرير':
      if (canViewReports(user)) {
        sendReportMenu(chatId);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/monthly':
    case '/شهري':
      if (canViewReports(user)) {
        const report = generateMonthlySummary();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/wife':
    case '/الزوجة':
      if (canViewReports(user)) {
        const report = generateWifeReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/siblings':
    case '/الاخوة':
      if (canViewReports(user)) {
        const report = generateSiblingsReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/gold':
    case '/الذهب':
      if (canViewReports(user)) {
        const report = generateGoldReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/associations':
    case '/الجمعيات':
      if (canViewReports(user)) {
        const report = generateAssociationsReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/savings':
    case '/المدخرات':
      if (canViewReports(user)) {
        const report = generateSavingsReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/loans':
    case '/السلف':
      if (canViewReports(user)) {
        const report = generateLoansReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية لعرض التقارير.');
      }
      break;

    case '/init':
      if (user.role === ROLES.ADMIN) {
        const result = initializeAllSheets();
        sendMessage(chatId, '✅ ' + result);
      } else {
        sendMessage(chatId, '⚠️ هذا الأمر للمسؤول فقط.');
      }
      break;

    default:
      sendMessage(chatId, 'أمر غير معروف. استخدم /help لعرض الأوامر المتاحة.');
  }
}

/**
 * Process user message with AI
 * @param {number} chatId - Chat ID
 * @param {string} text - Message text
 * @param {Object} user - User object
 */
function processUserMessage(chatId, text, user) {
  // Send typing action
  sendChatAction(chatId, 'typing');

  // Parse message with Gemini
  const parsed = parseMessageWithGemini(text, user.name);

  if (!parsed.success) {
    if (parsed.needs_clarification) {
      sendMessage(chatId, `❓ ${parsed.clarification_question}`);
    } else {
      sendMessage(chatId, parsed.message || 'لم أستطع فهم الرسالة. حاول مرة أخرى.');
    }
    return;
  }

  // Process each transaction
  let successCount = 0;
  let responseMessages = [];

  if (parsed.transactions && parsed.transactions.length > 0) {
    parsed.transactions.forEach(trans => {
      // Add user info
      trans.user_name = user.name;
      trans.telegram_id = user.telegram_id;

      // Calculate exchange rate if applicable
      if (trans.amount && trans.amount_received) {
        trans.exchange_rate = (trans.amount_received / trans.amount).toFixed(4);
        trans.currency_received = 'EGP';

        // Record exchange rate
        recordExchangeRate(trans.exchange_rate, 'SAR', 'EGP');
      }

      // Handle different transaction types
      let result;

      if (trans.type === 'ذهب' || trans.gold_weight) {
        result = addGoldPurchase({
          weight: trans.gold_weight,
          karat: trans.gold_karat || 21,
          price: trans.amount,
          currency: trans.currency || 'EGP',
          buyer: trans.contact_name || '',
          description: trans.description
        });

        // Also add as regular transaction
        addTransaction(trans);

      } else if (trans.type === 'أخذ_سلفة' || trans.type === 'سداد_سلفة') {
        result = addLoanRecord({
          type: trans.type,
          person: trans.contact_name || trans.contact,
          amount: trans.amount,
          currency: trans.currency,
          notes: trans.description
        });

        // Also add as regular transaction
        addTransaction(trans);

      } else {
        result = addTransaction(trans);
      }

      if (result.success) {
        successCount++;
      }
    });
  }

  // Send confirmation
  if (successCount > 0) {
    const confirmMsg = parsed.message || `✅ تم تسجيل ${successCount} معاملة بنجاح`;
    sendMessage(chatId, confirmMsg);

    // Notify admin if wife records something
    if (user.role === ROLES.LIMITED || user.role === ROLES.USER) {
      notifyAdmin(user.name, text, successCount);
    }
  } else {
    sendMessage(chatId, '❌ لم يتم تسجيل أي معاملات. تأكد من صحة البيانات.');
  }
}

/**
 * Send welcome message
 * @param {number} chatId - Chat ID
 * @param {Object} user - User object
 */
function sendWelcomeMessage(chatId, user) {
  let message = `مرحباً ${user.name}! 👋\n\n`;
  message += `🏦 *نظام محمود المحاسبي*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `يمكنك تسجيل معاملاتك بالكتابة الطبيعية:\n\n`;

  message += `💰 *أمثلة:*\n`;
  message += `• نزل الراتب 8500\n`;
  message += `• صرفت 150 غداء\n`;
  message += `• حولت لمراتي 3000 ريال وصلوا 4000 جنيه\n`;
  message += `• دفعت إيجار 2000\n`;
  message += `• اشترت سارة ذهب 10 جرام عيار 21\n\n`;

  if (canViewReports(user)) {
    message += `📊 *التقارير:*\n`;
    message += `/report - قائمة التقارير\n`;
    message += `/monthly - التقرير الشهري\n`;
  }

  message += `\n/help - المساعدة`;

  sendMessage(chatId, message);
}

/**
 * Send help message
 * @param {number} chatId - Chat ID
 * @param {Object} user - User object
 */
function sendHelpMessage(chatId, user) {
  let message = `📖 *دليل الاستخدام*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `*تسجيل الدخل:*\n`;
  message += `• نزل الراتب 8500\n`;
  message += `• عمولة 1200 ريال\n`;
  message += `• قبضت جمعية 10000 جنيه\n\n`;

  message += `*تسجيل المصروفات:*\n`;
  message += `• صرفت 150 غداء\n`;
  message += `• دفعت الإيجار 2000\n`;
  message += `• فاتورة النت 200 ريال\n\n`;

  message += `*التحويلات:*\n`;
  message += `• حولت لمراتي 3000 ريال وصلوا 4000 جنيه\n`;
  message += `• أعطت سارة مراتي 2000 جنيه\n`;
  message += `• ساعدت مصطفى بـ 1000 جنيه\n\n`;

  message += `*الذهب:*\n`;
  message += `• اشترت سارة 10 جرام عيار 21 بـ 4500\n`;
  message += `• ذهب 5 جرام عيار 18\n\n`;

  message += `*الجمعيات:*\n`;
  message += `• دفعت جمعية 5000 جنيه\n`;
  message += `• قبضت جمعية 50000\n\n`;

  message += `*السلف:*\n`;
  message += `• أخذت سلفة من محمد 2000 ريال\n`;
  message += `• رجعت لمحمد 500 ريال\n\n`;

  if (canViewReports(user)) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*أوامر التقارير:*\n`;
    message += `/monthly - التقرير الشهري\n`;
    message += `/wife - تقرير الزوجة\n`;
    message += `/siblings - تقرير الإخوة\n`;
    message += `/gold - تقرير الذهب\n`;
    message += `/associations - تقرير الجمعيات\n`;
    message += `/savings - تقرير المدخرات\n`;
    message += `/loans - تقرير السلف\n`;
  }

  sendMessage(chatId, message);
}

/**
 * Send report menu
 * @param {number} chatId - Chat ID
 */
function sendReportMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 الشهري', callback_data: 'report_monthly' },
        { text: '💕 الزوجة', callback_data: 'report_wife' }
      ],
      [
        { text: '👨‍👩‍👧‍👦 الإخوة', callback_data: 'report_siblings' },
        { text: '💍 الذهب', callback_data: 'report_gold' }
      ],
      [
        { text: '🔄 الجمعيات', callback_data: 'report_associations' },
        { text: '🏦 المدخرات', callback_data: 'report_savings' }
      ],
      [
        { text: '💳 السلف', callback_data: 'report_loans' }
      ]
    ]
  };

  sendMessage(chatId, '📊 *اختر التقرير المطلوب:*', keyboard);
}

/**
 * Handle callback query (button press)
 * @param {Object} callbackQuery - Callback query object
 */
function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  const user = getUserByTelegramId(userId);
  if (!user || !canViewReports(user)) {
    answerCallbackQuery(callbackQuery.id, 'ليس لديك صلاحية');
    return;
  }

  let report = '';

  switch (data) {
    case 'report_monthly':
      report = generateMonthlySummary();
      break;
    case 'report_wife':
      report = generateWifeReport();
      break;
    case 'report_siblings':
      report = generateSiblingsReport();
      break;
    case 'report_gold':
      report = generateGoldReport();
      break;
    case 'report_associations':
      report = generateAssociationsReport();
      break;
    case 'report_savings':
      report = generateSavingsReport();
      break;
    case 'report_loans':
      report = generateLoansReport();
      break;
  }

  if (report) {
    sendMessage(chatId, report);
  }

  answerCallbackQuery(callbackQuery.id);
}

/**
 * Check if user can view reports
 * @param {Object} user - User object
 * @returns {boolean}
 */
function canViewReports(user) {
  return user.role === ROLES.ADMIN ||
         user.role === ROLES.OWNER ||
         user.role === ROLES.USER;
}

/**
 * Notify admin about user activity
 * @param {string} userName - User name
 * @param {string} message - Original message
 * @param {number} count - Number of transactions
 */
function notifyAdmin(userName, message, count) {
  const adminId = 786700586; // Adel's Telegram ID
  const notification = `📝 *تسجيل جديد*\n\nمن: ${userName}\nالرسالة: ${message}\nالمعاملات: ${count}`;
  sendMessage(adminId, notification);
}

/**
 * Send message to Telegram
 * @param {number} chatId - Chat ID
 * @param {string} text - Message text
 * @param {Object} replyMarkup - Optional reply markup
 */
function sendMessage(chatId, text, replyMarkup) {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * Send chat action (typing indicator)
 * @param {number} chatId - Chat ID
 * @param {string} action - Action type
 */
function sendChatAction(chatId, action) {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/sendChatAction';

  const payload = {
    chat_id: chatId,
    action: action
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * Answer callback query
 * @param {string} callbackQueryId - Callback query ID
 * @param {string} text - Optional text
 */
function answerCallbackQuery(callbackQueryId, text) {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/answerCallbackQuery';

  const payload = {
    callback_query_id: callbackQueryId
  };

  if (text) {
    payload.text = text;
  }

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * Set webhook for Telegram bot
 * Run this function once to set up the webhook
 */
function setWebhook() {
  const webAppUrl = ScriptApp.getService().getUrl();
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/setWebhook?url=' + webAppUrl;

  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());

  return response.getContentText();
}

/**
 * Delete webhook
 */
function deleteWebhook() {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/deleteWebhook';
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  return response.getContentText();
}

/**
 * Get webhook info
 */
function getWebhookInfo() {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getWebhookInfo';
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  return response.getContentText();
}
