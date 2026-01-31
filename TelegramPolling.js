/**
 * =====================================================
 * نظام محمود المحاسبي - Telegram Polling
 * بديل للـ Webhook - يعمل مع Google Apps Script
 * =====================================================
 */

// مفتاح لتخزين آخر update_id
const LAST_UPDATE_KEY = 'last_update_id';

/**
 * الدالة الرئيسية للفحص الدوري
 * يتم تشغيلها كل دقيقة عبر Trigger
 */
function checkForUpdates() {
  try {
    const lastUpdateId = getLastUpdateId();
    const updates = getUpdates(lastUpdateId);

    if (updates && updates.length > 0) {
      Logger.log('Found ' + updates.length + ' new updates');

      updates.forEach(update => {
        processUpdate(update);
        saveLastUpdateId(update.update_id);
      });
    }
  } catch (error) {
    Logger.log('Error in checkForUpdates: ' + error.toString());
  }
}

/**
 * جلب التحديثات من Telegram
 * @param {number} offset - آخر update_id + 1
 * @returns {Array} قائمة التحديثات
 */
function getUpdates(offset) {
  try {
    const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates';

    const payload = {
      offset: offset ? offset + 1 : 0,
      limit: 100,
      timeout: 0
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.ok) {
      return result.result;
    } else {
      Logger.log('Telegram API error: ' + JSON.stringify(result));
      return [];
    }
  } catch (error) {
    Logger.log('Error getting updates: ' + error.toString());
    return [];
  }
}

/**
 * جلب آخر update_id من الإعدادات
 * @returns {number|null}
 */
function getLastUpdateId() {
  try {
    const props = PropertiesService.getScriptProperties();
    const value = props.getProperty(LAST_UPDATE_KEY);
    return value ? parseInt(value) : null;
  } catch (error) {
    return null;
  }
}

/**
 * حفظ آخر update_id
 * @param {number} updateId
 */
function saveLastUpdateId(updateId) {
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty(LAST_UPDATE_KEY, updateId.toString());
  } catch (error) {
    Logger.log('Error saving update ID: ' + error.toString());
  }
}

/**
 * معالجة التحديث الوارد
 * @param {Object} update - كائن التحديث من Telegram
 */
function processUpdate(update) {
  try {
    Logger.log('Processing update: ' + JSON.stringify(update));

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
 * معالجة الرسالة الواردة
 * @param {Object} message - كائن الرسالة
 */
function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const userName = message.from.first_name || 'مستخدم';
  const username = message.from.username || '';
  const text = message.text || '';

  Logger.log('Message from ' + userName + ' (' + userId + '): ' + text);

  // التحقق من المستخدم
  let user = getUserByTelegramId(userId);

  // تسجيل تلقائي للـ Admin
  if (!user && userId == 786700586) {
    addUser({
      telegram_id: userId.toString(),
      name: userName,
      username: username,
      role: ROLES.ADMIN
    });
    user = getUserByTelegramId(userId);
  }

  // مستخدم غير مسجل
  if (!user) {
    sendMessage(chatId,
      `⚠️ عذراً، أنت غير مسجل في النظام.\n\n` +
      `تواصل مع المسؤول لإضافتك.\n\n` +
      `🆔 Your Telegram ID: \`${userId}\``
    );
    return;
  }

  // مستخدم معطل
  if (!user.active) {
    sendMessage(chatId, '⚠️ حسابك معطل. تواصل مع المسؤول.');
    return;
  }

  // تحديث آخر نشاط
  updateUserActivity(userId);

  // معالجة الأوامر
  if (text.startsWith('/')) {
    handleCommand(chatId, text, user);
    return;
  }

  // معالجة الرسالة بالذكاء الاصطناعي
  processUserMessage(chatId, text, user);
}

/**
 * معالجة الأوامر
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
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/wife':
    case '/الزوجة':
      if (canViewReports(user)) {
        const report = generateWifeReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/siblings':
    case '/الاخوة':
      if (canViewReports(user)) {
        const report = generateSiblingsReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/gold':
    case '/الذهب':
      if (canViewReports(user)) {
        const report = generateGoldReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/associations':
    case '/الجمعيات':
      if (canViewReports(user)) {
        const report = generateAssociationsReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/savings':
    case '/المدخرات':
      if (canViewReports(user)) {
        const report = generateSavingsReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/loans':
    case '/السلف':
      if (canViewReports(user)) {
        const report = generateLoansReport();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/balance':
    case '/الرصيد':
      if (canViewReports(user)) {
        sendBalanceSummary(chatId);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية.');
      }
      break;

    case '/id':
      sendMessage(chatId, `🆔 Your Telegram ID: \`${user.telegram_id}\``);
      break;

    default:
      sendMessage(chatId, '❓ أمر غير معروف. استخدم /help للمساعدة.');
  }
}

/**
 * معالجة رسائل المستخدم العادية بالذكاء الاصطناعي
 */
function processUserMessage(chatId, text, user) {
  // إرسال حالة "يكتب"
  sendChatAction(chatId, 'typing');

  // تحليل الرسالة بـ Gemini
  const parsed = parseMessageWithGemini(text, user.name);

  if (!parsed.success) {
    if (parsed.needs_clarification) {
      sendMessage(chatId, `❓ ${parsed.clarification_question}`);
    } else {
      sendMessage(chatId, parsed.message || '❌ لم أستطع فهم الرسالة. حاول مرة أخرى.');
    }
    return;
  }

  // معالجة كل معاملة
  let successCount = 0;

  if (parsed.transactions && parsed.transactions.length > 0) {
    parsed.transactions.forEach(trans => {
      // إضافة بيانات المستخدم
      trans.user_name = user.name;
      trans.telegram_id = user.telegram_id;

      // حساب سعر الصرف
      if (trans.amount && trans.amount_received) {
        trans.exchange_rate = (trans.amount_received / trans.amount).toFixed(4);
        trans.currency_received = 'EGP';
        recordExchangeRate(trans.exchange_rate, 'SAR', 'EGP');
      }

      // معالجة أنواع مختلفة
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
        addTransaction(trans);

      } else if (trans.type === 'أخذ_سلفة' || trans.type === 'سداد_سلفة') {
        result = addLoanRecord({
          type: trans.type,
          person: trans.contact_name || trans.contact,
          amount: trans.amount,
          currency: trans.currency,
          notes: trans.description
        });
        addTransaction(trans);

      } else {
        result = addTransaction(trans);
      }

      if (result && result.success) {
        successCount++;
      }
    });
  }

  // إرسال التأكيد
  if (successCount > 0) {
    const confirmMsg = parsed.message || `✅ تم تسجيل ${successCount} معاملة بنجاح`;
    sendMessage(chatId, confirmMsg);

    // إشعار المسؤول
    if (user.role === ROLES.LIMITED || user.role === ROLES.USER) {
      notifyAdmin(user.name, text, successCount);
    }
  } else {
    sendMessage(chatId, '❌ لم يتم تسجيل أي معاملات. تأكد من صحة البيانات.');
  }
}

/**
 * إرسال رسالة الترحيب
 */
function sendWelcomeMessage(chatId, user) {
  let message = `مرحباً ${user.name}! 👋\n\n`;
  message += `🏦 *نظام حسابات محمود*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `يمكنك تسجيل معاملاتك بالكتابة الطبيعية:\n\n`;

  message += `💰 *أمثلة:*\n`;
  message += `• استلمت راتب 8500\n`;
  message += `• صرفت 150 غداء\n`;
  message += `• حولت لمراتي 3000 ريال وصلوا 4000 جنيه\n`;
  message += `• دفعت إيجار 2000\n\n`;

  if (canViewReports(user)) {
    message += `📊 *التقارير:* /report\n`;
  }

  message += `\n❓ *المساعدة:* /help`;

  sendMessage(chatId, message);
}

/**
 * إرسال رسالة المساعدة
 */
function sendHelpMessage(chatId, user) {
  let message = `📖 *دليل الاستخدام*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `*تسجيل الدخل:*\n`;
  message += `• نزل الراتب 8500\n`;
  message += `• استلمت عمولة 1200\n\n`;

  message += `*تسجيل المصروفات:*\n`;
  message += `• صرفت 150 غداء\n`;
  message += `• دفعت الإيجار 2000\n\n`;

  message += `*التحويلات:*\n`;
  message += `• حولت لمراتي 3000 ريال وصلوا 4000 جنيه\n`;
  message += `• ساعدت مصطفى بـ 1000 جنيه\n\n`;

  message += `*الذهب:*\n`;
  message += `• اشترت سارة 10 جرام عيار 21\n\n`;

  message += `*الجمعيات:*\n`;
  message += `• دفعت جمعية 5000 جنيه\n\n`;

  if (canViewReports(user)) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*التقارير:*\n`;
    message += `/monthly - الشهري\n`;
    message += `/wife - الزوجة\n`;
    message += `/siblings - الإخوة\n`;
    message += `/gold - الذهب\n`;
    message += `/associations - الجمعيات\n`;
    message += `/savings - المدخرات\n`;
    message += `/loans - السلف\n`;
    message += `/balance - الرصيد\n`;
  }

  sendMessage(chatId, message);
}

/**
 * إرسال قائمة التقارير
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

  sendMessage(chatId, '📊 *اختر التقرير:*', keyboard);
}

/**
 * معالجة الضغط على الأزرار
 */
function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  const user = getUserByTelegramId(userId);
  if (!user || !canViewReports(user)) {
    answerCallbackQuery(callbackQuery.id, '⚠️ ليس لديك صلاحية');
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
 * إرسال ملخص الرصيد
 */
function sendBalanceSummary(chatId) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;

    for (let i = 1; i < data.length; i++) {
      const type = data[i][3];
      const amount = parseFloat(data[i][5]) || 0;

      if (type === 'دخل') totalIncome += amount;
      else if (type === 'مصروف') totalExpense += amount;
      else if (type === 'تحويل') totalTransfer += amount;
    }

    const balance = totalIncome - totalExpense - totalTransfer;

    let message = `💰 *ملخص الرصيد*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📥 إجمالي الدخل: ${formatNumber(totalIncome)} ر.س\n`;
    message += `📤 إجمالي المصروفات: ${formatNumber(totalExpense)} ر.س\n`;
    message += `💸 إجمالي التحويلات: ${formatNumber(totalTransfer)} ر.س\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💵 *الرصيد المتاح:* ${formatNumber(balance)} ر.س`;

    sendMessage(chatId, message);

  } catch (error) {
    sendMessage(chatId, '❌ حدث خطأ في حساب الرصيد');
  }
}

/**
 * التحقق من صلاحية عرض التقارير
 */
function canViewReports(user) {
  return user.role === ROLES.ADMIN ||
         user.role === ROLES.OWNER ||
         user.role === ROLES.USER;
}

/**
 * إشعار المسؤول
 */
function notifyAdmin(userName, message, count) {
  const adminId = 786700586;
  const notification = `📝 *تسجيل جديد*\n\nمن: ${userName}\nالرسالة: ${message}\nالمعاملات: ${count}`;
  sendMessage(adminId, notification);
}

/**
 * إرسال رسالة عبر Telegram
 */
function sendMessage(chatId, text, replyMarkup) {
  try {
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

    const response = UrlFetchApp.fetch(url, options);
    Logger.log('Send message response: ' + response.getContentText());

  } catch (error) {
    Logger.log('Error sending message: ' + error.toString());
  }
}

/**
 * إرسال حالة الكتابة
 */
function sendChatAction(chatId, action) {
  try {
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

  } catch (error) {
    Logger.log('Error sending chat action: ' + error.toString());
  }
}

/**
 * الرد على استعلام الزر
 */
function answerCallbackQuery(callbackQueryId, text) {
  try {
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

  } catch (error) {
    Logger.log('Error answering callback: ' + error.toString());
  }
}

/**
 * إنشاء Trigger للفحص الدوري
 * شغّل هذه الدالة مرة واحدة فقط
 */
function createPollingTrigger() {
  // حذف التريجرات القديمة
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkForUpdates') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // إنشاء تريجر جديد - كل دقيقة
  ScriptApp.newTrigger('checkForUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Polling trigger created successfully!');
  return 'تم إنشاء الفحص الدوري بنجاح! البوت سيفحص الرسائل كل دقيقة.';
}

/**
 * إيقاف الفحص الدوري
 */
function stopPolling() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkForUpdates') {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });

  Logger.log('Stopped ' + count + ' polling triggers');
  return 'تم إيقاف الفحص الدوري.';
}

/**
 * اختبار إرسال رسالة
 */
function testSendMessage() {
  const chatId = 786700586; // Adel's ID
  sendMessage(chatId, '✅ *البوت يعمل بنجاح!*\n\nنظام حسابات محمود جاهز للاستخدام.\n\nأرسل /start للبدء.');
  return 'تم إرسال رسالة الاختبار';
}

/**
 * فحص يدوي للرسائل
 */
function manualCheck() {
  checkForUpdates();
  return 'تم الفحص';
}
