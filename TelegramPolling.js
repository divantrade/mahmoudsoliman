/**
 * =====================================================
 * نظام محمود المحاسبي - Telegram Polling (Enhanced)
 * فحص كل 10 ثواني بدلاً من كل دقيقة
 * =====================================================
 */

// مفتاح لتخزين آخر update_id
const LAST_UPDATE_KEY = 'last_update_id';

/**
 * الدالة الرئيسية للفحص الدوري المحسّن
 * تفحص الرسائل 5 مرات خلال 50 ثانية
 */
function checkForUpdates() {
  const CHECK_INTERVAL = 10000; // 10 ثواني
  const MAX_CHECKS = 5;         // 5 مرات = 50 ثانية

  for (let i = 0; i < MAX_CHECKS; i++) {
    try {
      Logger.log(`Check #${i + 1} at ${new Date().toLocaleTimeString()}`);

      const lastUpdateId = getLastUpdateId();
      const updates = getUpdates(lastUpdateId);

      if (updates && updates.length > 0) {
        Logger.log('Found ' + updates.length + ' new updates');

        updates.forEach(update => {
          try {
            processUpdate(update);
          } catch (e) {
            Logger.log('Error processing update: ' + e.toString());
          }
          saveLastUpdateId(update.update_id);
        });
      }

      // انتظر 10 ثواني قبل الفحص التالي (إلا إذا كان آخر فحص)
      if (i < MAX_CHECKS - 1) {
        Utilities.sleep(CHECK_INTERVAL);
      }

    } catch (error) {
      Logger.log('Error in check #' + (i + 1) + ': ' + error.toString());
    }
  }
}

/**
 * جلب التحديثات من Telegram
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
 * جلب آخر update_id
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
 * معالجة التحديث
 */
function processUpdate(update) {
  try {
    Logger.log('Processing update: ' + JSON.stringify(update).substring(0, 200));

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
 * معالجة الرسالة
 */
function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const userName = message.from.first_name || 'مستخدم';
  const username = message.from.username || '';
  const text = message.text || '';

  Logger.log('=== New Message ===');
  Logger.log('From: ' + userName + ' (' + userId + ')');
  Logger.log('Text: ' + text);

  // التحقق من المستخدم
  let user = getUserByTelegramId(userId);

  // تسجيل تلقائي للـ Admin
  if (!user && userId == 786700586) {
    Logger.log('Auto-registering admin user');
    addUser({
      telegram_id: userId.toString(),
      name: userName,
      username: username,
      role: ROLES.ADMIN
    });
    user = getUserByTelegramId(userId);
  }

  // مستخدم غير مسجل - نسجله تلقائياً كـ owner للتجربة
  if (!user) {
    Logger.log('Registering new user: ' + userName);
    addUser({
      telegram_id: userId.toString(),
      name: userName,
      username: username,
      role: ROLES.OWNER  // صلاحيات كاملة للتجربة
    });
    user = getUserByTelegramId(userId);

    if (!user) {
      sendMessage(chatId,
        `⚠️ حدث خطأ في التسجيل.\n\n🆔 Your ID: \`${userId}\``
      );
      return;
    }
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
  Logger.log('Command: ' + command);

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
 * معالجة رسائل المستخدم بالذكاء الاصطناعي
 */
function processUserMessage(chatId, text, user) {
  Logger.log('Processing with AI: ' + text);

  // إرسال حالة "يكتب"
  sendChatAction(chatId, 'typing');

  // تحليل الرسالة بـ Gemini
  const parsed = parseMessageWithGemini(text, user.name);
  Logger.log('Gemini response: ' + JSON.stringify(parsed));

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
  let responseMessages = [];

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
        // بناء رسالة التأكيد
        const currencySymbol = trans.currency === 'EGP' ? 'ج.م' : 'ر.س';
        responseMessages.push(`${trans.type}: ${trans.amount} ${currencySymbol}`);
      }
    });
  }

  // إرسال التأكيد
  if (successCount > 0) {
    let confirmMsg = `✅ تم تسجيل ${successCount} معاملة:\n\n`;
    responseMessages.forEach(msg => {
      confirmMsg += `• ${msg}\n`;
    });

    if (parsed.message) {
      confirmMsg = parsed.message;
    }

    sendMessage(chatId, confirmMsg);

    // إشعار المسؤول
    if (user.role === ROLES.LIMITED || user.role === ROLES.USER) {
      notifyAdmin(user.name, text, successCount);
    }
  } else {
    sendMessage(chatId, '❌ لم يتم تسجيل أي معاملات. تأكد من صحة البيانات.\n\n💡 مثال: استلمت راتب 5000 ريال');
  }
}

/**
 * إرسال رسالة الترحيب مع الأزرار
 */
function sendWelcomeMessage(chatId, user) {
  let message = `مرحباً ${user.name}! 👋\n\n`;
  message += `🏦 *نظام حسابات محمود*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `يمكنك تسجيل معاملاتك بالكتابة:\n\n`;

  message += `💰 *أمثلة:*\n`;
  message += `• استلمت راتب 8500 ريال\n`;
  message += `• صرفت 150 غداء\n`;
  message += `• حولت لمراتي 3000 ريال\n`;
  message += `• دفعت إيجار 2000\n\n`;

  message += `📊 للتقارير: /report\n`;
  message += `❓ للمساعدة: /help`;

  // أزرار سريعة
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 التقارير', callback_data: 'menu_reports' },
        { text: '💰 الرصيد', callback_data: 'report_balance' }
      ],
      [
        { text: '❓ المساعدة', callback_data: 'menu_help' }
      ]
    ]
  };

  sendMessage(chatId, message, keyboard);
}

/**
 * إرسال رسالة المساعدة
 */
function sendHelpMessage(chatId, user) {
  let message = `📖 *دليل الاستخدام*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `*💵 تسجيل الدخل:*\n`;
  message += `• نزل الراتب 8500\n`;
  message += `• استلمت عمولة 1200\n\n`;

  message += `*💸 تسجيل المصروفات:*\n`;
  message += `• صرفت 150 غداء\n`;
  message += `• دفعت الإيجار 2000\n`;
  message += `• فاتورة الكهرباء 300\n\n`;

  message += `*📤 التحويلات:*\n`;
  message += `• حولت لمراتي 3000 ريال وصلوا 4000 جنيه\n`;
  message += `• ساعدت مصطفى بـ 1000 جنيه\n\n`;

  message += `*💍 الذهب:*\n`;
  message += `• اشترت سارة 10 جرام عيار 21\n\n`;

  message += `*🔄 الجمعيات:*\n`;
  message += `• دفعت جمعية 5000 جنيه\n\n`;

  if (canViewReports(user)) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*📊 أوامر التقارير:*\n`;
    message += `/report - قائمة التقارير\n`;
    message += `/balance - الرصيد\n`;
    message += `/monthly - الشهري\n`;
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
        { text: '💰 الرصيد', callback_data: 'report_balance' }
      ],
      [
        { text: '💕 الزوجة', callback_data: 'report_wife' },
        { text: '👨‍👩‍👧‍👦 الإخوة', callback_data: 'report_siblings' }
      ],
      [
        { text: '💍 الذهب', callback_data: 'report_gold' },
        { text: '🔄 الجمعيات', callback_data: 'report_associations' }
      ],
      [
        { text: '🏦 المدخرات', callback_data: 'report_savings' },
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

  Logger.log('Callback: ' + data);

  const user = getUserByTelegramId(userId);
  if (!user) {
    answerCallbackQuery(callbackQuery.id, '⚠️ يرجى إرسال /start أولاً');
    return;
  }

  // معالجة الأزرار
  switch (data) {
    case 'menu_reports':
      sendReportMenu(chatId);
      break;

    case 'menu_help':
      sendHelpMessage(chatId, user);
      break;

    case 'report_balance':
      sendBalanceSummary(chatId);
      break;

    case 'report_monthly':
      if (canViewReports(user)) {
        const report = generateMonthlySummary();
        sendMessage(chatId, report);
      } else {
        sendMessage(chatId, '⚠️ ليس لديك صلاحية');
      }
      break;

    case 'report_wife':
      if (canViewReports(user)) {
        const report = generateWifeReport();
        sendMessage(chatId, report);
      }
      break;

    case 'report_siblings':
      if (canViewReports(user)) {
        const report = generateSiblingsReport();
        sendMessage(chatId, report);
      }
      break;

    case 'report_gold':
      if (canViewReports(user)) {
        const report = generateGoldReport();
        sendMessage(chatId, report);
      }
      break;

    case 'report_associations':
      if (canViewReports(user)) {
        const report = generateAssociationsReport();
        sendMessage(chatId, report);
      }
      break;

    case 'report_savings':
      if (canViewReports(user)) {
        const report = generateSavingsReport();
        sendMessage(chatId, report);
      }
      break;

    case 'report_loans':
      if (canViewReports(user)) {
        const report = generateLoansReport();
        sendMessage(chatId, report);
      }
      break;
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
    message += `📥 الدخل: ${formatNumber(totalIncome)} ر.س\n`;
    message += `📤 المصروفات: ${formatNumber(totalExpense)} ر.س\n`;
    message += `💸 التحويلات: ${formatNumber(totalTransfer)} ر.س\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💵 *الرصيد:* ${formatNumber(balance)} ر.س`;

    sendMessage(chatId, message);

  } catch (error) {
    Logger.log('Error in balance: ' + error.toString());
    sendMessage(chatId, '❌ حدث خطأ في حساب الرصيد');
  }
}

/**
 * التحقق من صلاحية التقارير
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
 * إرسال رسالة
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
    Logger.log('Message sent: ' + response.getContentText().substring(0, 100));

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
 * الرد على الزر
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
 */
function createPollingTrigger() {
  // حذف التريجرات القديمة
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkForUpdates') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // إنشاء تريجر جديد - كل دقيقة (سيفحص 5 مرات داخلياً)
  ScriptApp.newTrigger('checkForUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Enhanced polling trigger created! (checks every ~10 seconds)');
  return 'تم إنشاء الفحص المحسّن! البوت سيفحص كل ~10 ثواني';
}

/**
 * إيقاف الفحص
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
  const chatId = 786700586;
  sendMessage(chatId,
    '✅ *البوت يعمل بنجاح!*\n\n' +
    'نظام حسابات محمود جاهز.\n\n' +
    '⚡ الفحص كل ~10 ثواني\n\n' +
    'أرسل /start للبدء.'
  );
  return 'تم إرسال رسالة الاختبار';
}

/**
 * فحص يدوي
 */
function manualCheck() {
  checkForUpdates();
  return 'تم الفحص';
}
