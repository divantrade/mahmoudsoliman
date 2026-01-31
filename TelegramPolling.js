/**
 * =====================================================
 * نظام محمود المحاسبي - Telegram Polling (Optimized)
 * تغطية 92% - فجوة 5 ثواني فقط
 * =====================================================
 */

const LAST_UPDATE_KEY = 'last_update_id';

/**
 * الدالة الرئيسية - تعمل 55 ثانية متواصلة
 * Trigger كل دقيقة → حلقة 55 ثانية → فجوة 5 ثواني
 */
function checkForUpdates() {
  const LOOP_DURATION = 55000;  // 55 ثانية
  const CHECK_INTERVAL = 2000;  // فحص كل 2 ثانية
  const startTime = Date.now();

  Logger.log('🚀 Polling started at ' + new Date().toLocaleTimeString());

  while (Date.now() - startTime < LOOP_DURATION) {
    try {
      const lastUpdateId = getLastUpdateId();
      const updates = getUpdates(lastUpdateId);

      if (updates && updates.length > 0) {
        Logger.log('📨 Found ' + updates.length + ' updates');

        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          try {
            processUpdate(update);
          } catch (e) {
            Logger.log('❌ Error processing: ' + e.toString());
          }
          saveLastUpdateId(update.update_id);
        }
      }

      // انتظر 2 ثانية قبل الفحص التالي
      Utilities.sleep(CHECK_INTERVAL);

    } catch (error) {
      Logger.log('❌ Loop error: ' + error.toString());
      Utilities.sleep(CHECK_INTERVAL);
    }
  }

  Logger.log('✅ Polling ended at ' + new Date().toLocaleTimeString());
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
      timeout: 1  // timeout قصير للرد السريع
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
    }
    return [];
  } catch (error) {
    Logger.log('getUpdates error: ' + error.toString());
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
    Logger.log('Save error: ' + error.toString());
  }
}

/**
 * معالجة التحديث
 */
function processUpdate(update) {
  Logger.log('Processing: ' + JSON.stringify(update).substring(0, 300));

  if (update.message) {
    handleMessage(update.message);
  } else if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
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

  Logger.log('📩 Message from ' + userName + ': ' + text);

  // جلب أو إنشاء المستخدم
  let user = getUserByTelegramId(userId);

  // تسجيل تلقائي لأي مستخدم جديد
  if (!user) {
    Logger.log('📝 Registering new user: ' + userName);
    const role = (userId == 786700586) ? ROLES.ADMIN : ROLES.OWNER;
    addUser({
      telegram_id: userId.toString(),
      name: userName,
      username: username,
      role: role
    });
    user = getUserByTelegramId(userId);
  }

  if (!user) {
    sendMessage(chatId, '⚠️ حدث خطأ. حاول مرة أخرى.\n\n🆔 ID: `' + userId + '`');
    return;
  }

  if (!user.active) {
    sendMessage(chatId, '⚠️ حسابك معطل.');
    return;
  }

  updateUserActivity(userId);

  // معالجة الأوامر
  if (text.startsWith('/')) {
    handleCommand(chatId, text, user);
    return;
  }

  // معالجة أزرار القائمة الدائمة
  if (handleMenuButton(chatId, text, user)) {
    return;
  }

  // معالجة بالذكاء الاصطناعي
  processUserMessage(chatId, text, user);
}

/**
 * معالجة الأوامر
 */
function handleCommand(chatId, text, user) {
  const command = text.split(' ')[0].toLowerCase();
  Logger.log('🔧 Command: ' + command);

  switch (command) {
    case '/start':
      sendWelcomeMessage(chatId, user);
      break;

    case '/help':
      sendHelpMessage(chatId, user);
      break;

    case '/report':
    case '/تقرير':
      sendReportMenu(chatId);
      break;

    case '/balance':
    case '/الرصيد':
      sendBalanceSummary(chatId);
      break;

    case '/monthly':
      sendMessage(chatId, generateMonthlySummary());
      break;

    case '/wife':
      sendMessage(chatId, generateWifeReport());
      break;

    case '/siblings':
      sendMessage(chatId, generateSiblingsReport());
      break;

    case '/gold':
      sendMessage(chatId, generateGoldReport());
      break;

    case '/associations':
      sendMessage(chatId, generateAssociationsReport());
      break;

    case '/savings':
      sendMessage(chatId, generateSavingsReport());
      break;

    case '/loans':
      sendMessage(chatId, generateLoansReport());
      break;

    case '/id':
      sendMessage(chatId, '🆔 Your ID: `' + user.telegram_id + '`');
      break;

    default:
      sendMessage(chatId, '❓ أمر غير معروف.\n\n/help للمساعدة');
  }
}

/**
 * معالجة أزرار القائمة الدائمة
 */
function handleMenuButton(chatId, text, user) {
  switch (text) {
    case '📊 التقارير':
      sendReportMenu(chatId);
      return true;
    case '💰 الرصيد':
      sendBalanceSummary(chatId);
      return true;
    case '📅 تقرير شهري':
      sendMessage(chatId, generateMonthlySummary());
      return true;
    case '💕 تقرير الزوجة':
      sendMessage(chatId, generateWifeReport());
      return true;
    case '👨‍👩‍👧‍👦 الإخوة':
      sendMessage(chatId, generateSiblingsReport());
      return true;
    case '💍 الذهب':
      sendMessage(chatId, generateGoldReport());
      return true;
    case '❓ المساعدة':
      sendHelpMessage(chatId, user);
      return true;
    default:
      return false; // ليس زر قائمة
  }
}

/**
 * معالجة الرسائل بالذكاء الاصطناعي
 */
function processUserMessage(chatId, text, user) {
  Logger.log('🤖 معالجة: ' + text);

  sendChatAction(chatId, 'typing');

  try {
    const parsed = parseMessageWithGemini(text, user.name);
    Logger.log('نتيجة: ' + JSON.stringify(parsed));

    // التحقق من النجاح (يدعم العربي والإنجليزي)
    const isSuccess = parsed && (parsed.نجاح === true || parsed.success === true);
    const message = parsed.رسالة || parsed.message;
    const transactions = parsed.معاملات || parsed.transactions;

    if (!isSuccess) {
      const msg = message || '❌ لم أفهم. جرب:\n\n• استلمت راتب 5000\n• صرفت 100 غداء';
      sendMessage(chatId, msg);
      return;
    }

    let successCount = 0;
    const details = [];

    if (transactions && transactions.length > 0) {
      for (let i = 0; i < transactions.length; i++) {
        const trans = transactions[i];

        // تحويل المفاتيح العربية للإنجليزية للحفظ
        const transData = {
          type: trans.نوع || trans.type,
          amount: trans.مبلغ || trans.amount,
          currency: (trans.عملة === 'ريال' || trans.currency === 'SAR') ? 'SAR' : 'EGP',
          category: trans.تصنيف || trans.category,
          contact: trans.جهة || trans.contact,
          contact_name: trans.اسم_الجهة || trans.contact_name,
          description: trans.وصف || trans.description,
          amount_received: trans.مبلغ_مستلم || trans.amount_received,
          gold_weight: trans.وزن_الذهب || trans.gold_weight,
          gold_karat: trans.عيار_الذهب || trans.gold_karat,
          user_name: user.name,
          telegram_id: user.telegram_id
        };

        // حساب سعر الصرف للتحويلات
        if (transData.amount && transData.amount_received) {
          transData.exchange_rate = (transData.amount_received / transData.amount).toFixed(2);
          transData.currency_received = 'EGP';
        }

        const result = addTransaction(transData);

        if (result && result.success) {
          successCount++;
          const curr = (transData.currency === 'EGP') ? 'ج.م' : 'ر.س';
          details.push(transData.type + ': ' + transData.amount + ' ' + curr);
        }
      }
    }

    if (successCount > 0) {
      let msg = '✅ تم تسجيل ' + successCount + ' معاملة:\n\n';
      for (let i = 0; i < details.length; i++) {
        msg += '• ' + details[i] + '\n';
      }
      if (message) {
        msg += '\n' + message;
      }
      sendMessage(chatId, msg);
    } else {
      sendMessage(chatId, '❌ لم يتم التسجيل.\n\nجرب: استلمت راتب 5000 ريال');
    }

  } catch (error) {
    Logger.log('خطأ: ' + error.toString());
    sendMessage(chatId, '❌ حدث خطأ. حاول مرة أخرى.');
  }
}

/**
 * رسالة الترحيب
 */
function sendWelcomeMessage(chatId, user) {
  const msg = 'مرحباً ' + user.name + '! 👋\n\n' +
    '🏦 *نظام حسابات محمود*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 *سجل معاملاتك بسهولة:*\n' +
    '• استلمت راتب 8500\n' +
    '• صرفت 150 غداء\n' +
    '• حولت لمراتي 3000 ريال\n\n' +
    '📊 /report - التقارير\n' +
    '❓ /help - المساعدة';

  // القائمة الدائمة (Reply Keyboard)
  const replyKeyboard = {
    keyboard: [
      ['📊 التقارير', '💰 الرصيد'],
      ['📅 تقرير شهري', '💕 تقرير الزوجة'],
      ['👨‍👩‍👧‍👦 الإخوة', '💍 الذهب'],
      ['❓ المساعدة']
    ],
    resize_keyboard: true,
    persistent: true
  };

  sendMessage(chatId, msg, replyKeyboard);
}

/**
 * رسالة المساعدة
 */
function sendHelpMessage(chatId, user) {
  const msg = '📖 *دليل الاستخدام*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '*💵 الدخل:*\n' +
    '• نزل الراتب 8500\n' +
    '• استلمت عمولة 1200\n\n' +
    '*💸 المصروفات:*\n' +
    '• صرفت 150 غداء\n' +
    '• دفعت الإيجار 2000\n\n' +
    '*📤 التحويلات:*\n' +
    '• حولت لمراتي 3000 ريال وصلوا 4000 جنيه\n\n' +
    '*📊 التقارير:*\n' +
    '/report - قائمة التقارير\n' +
    '/balance - الرصيد';

  sendMessage(chatId, msg);
}

/**
 * قائمة التقارير
 */
function sendReportMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 الشهري', callback_data: 'rpt_monthly' },
        { text: '💰 الرصيد', callback_data: 'cmd_balance' }
      ],
      [
        { text: '💕 الزوجة', callback_data: 'rpt_wife' },
        { text: '👨‍👩‍👧‍👦 الإخوة', callback_data: 'rpt_siblings' }
      ],
      [
        { text: '💍 الذهب', callback_data: 'rpt_gold' },
        { text: '🔄 الجمعيات', callback_data: 'rpt_assoc' }
      ],
      [
        { text: '🏦 المدخرات', callback_data: 'rpt_savings' },
        { text: '💳 السلف', callback_data: 'rpt_loans' }
      ]
    ]
  };

  sendMessage(chatId, '📊 *اختر التقرير:*', keyboard);
}

/**
 * معالجة أزرار
 */
function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  Logger.log('🔘 Button: ' + data);

  const user = getUserByTelegramId(userId);

  switch (data) {
    case 'menu_reports':
      sendReportMenu(chatId);
      break;
    case 'cmd_help':
      sendHelpMessage(chatId, user);
      break;
    case 'cmd_balance':
      sendBalanceSummary(chatId);
      break;
    case 'rpt_monthly':
      sendMessage(chatId, generateMonthlySummary());
      break;
    case 'rpt_wife':
      sendMessage(chatId, generateWifeReport());
      break;
    case 'rpt_siblings':
      sendMessage(chatId, generateSiblingsReport());
      break;
    case 'rpt_gold':
      sendMessage(chatId, generateGoldReport());
      break;
    case 'rpt_assoc':
      sendMessage(chatId, generateAssociationsReport());
      break;
    case 'rpt_savings':
      sendMessage(chatId, generateSavingsReport());
      break;
    case 'rpt_loans':
      sendMessage(chatId, generateLoansReport());
      break;
  }

  answerCallbackQuery(callbackQuery.id);
}

/**
 * ملخص الرصيد
 */
function sendBalanceSummary(chatId) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    let income = 0, expense = 0, transfer = 0;

    for (let i = 1; i < data.length; i++) {
      const type = data[i][3];
      const amount = parseFloat(data[i][5]) || 0;

      if (type === 'دخل') income += amount;
      else if (type === 'مصروف') expense += amount;
      else if (type === 'تحويل') transfer += amount;
    }

    const balance = income - expense - transfer;

    const msg = '💰 *ملخص الرصيد*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '📥 الدخل: ' + formatNumber(income) + ' ر.س\n' +
      '📤 المصروفات: ' + formatNumber(expense) + ' ر.س\n' +
      '💸 التحويلات: ' + formatNumber(transfer) + ' ر.س\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '💵 *الرصيد:* ' + formatNumber(balance) + ' ر.س';

    sendMessage(chatId, msg);

  } catch (error) {
    Logger.log('Balance error: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في حساب الرصيد');
  }
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
    const result = JSON.parse(response.getContentText());

    if (!result.ok) {
      Logger.log('Send failed: ' + response.getContentText());
    }

  } catch (error) {
    Logger.log('sendMessage error: ' + error.toString());
  }
}

/**
 * حالة الكتابة
 */
function sendChatAction(chatId, action) {
  try {
    const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/sendChatAction';
    UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, action: action }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

/**
 * رد على الزر
 */
function answerCallbackQuery(callbackQueryId) {
  try {
    const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/answerCallbackQuery';
    UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ callback_query_id: callbackQueryId }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

/**
 * إنشاء Trigger
 */
function createPollingTrigger() {
  // حذف القديم
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkForUpdates') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // إنشاء جديد
  ScriptApp.newTrigger('checkForUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Trigger created - 92% coverage!');
  return 'تم! البوت يعمل بتغطية 92%';
}

/**
 * إيقاف
 */
function stopPolling() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkForUpdates') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  return 'تم الإيقاف';
}

/**
 * اختبار
 */
function testSendMessage() {
  sendMessage(786700586,
    '✅ *البوت يعمل!*\n\n' +
    '⚡ تغطية 92%\n' +
    '⏱️ الرد خلال 2-5 ثواني\n\n' +
    'أرسل /start للبدء'
  );
  return 'تم';
}

/**
 * فحص يدوي
 */
function manualCheck() {
  checkForUpdates();
  return 'تم';
}

/**
 * ⭐ إعادة تعيين - شغّل هذا إذا البوت لا يرد
 */
function resetBot() {
  // حذف last_update_id القديم
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(LAST_UPDATE_KEY);
  Logger.log('✅ Reset last_update_id');

  // جلب آخر update وتخطيه
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates';
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ offset: -1, limit: 1 }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());
  Logger.log('Updates response: ' + response.getContentText());

  if (result.ok && result.result && result.result.length > 0) {
    const lastUpdate = result.result[result.result.length - 1];
    props.setProperty(LAST_UPDATE_KEY, lastUpdate.update_id.toString());
    Logger.log('✅ Set last_update_id to: ' + lastUpdate.update_id);
  }

  // إرسال رسالة تأكيد
  sendMessage(786700586, '🔄 *تم إعادة تعيين البوت!*\n\nأرسل أي رسالة الآن للتجربة.');

  return 'تم إعادة التعيين! أرسل رسالة جديدة للتجربة.';
}

/**
 * عرض حالة البوت
 */
function botStatus() {
  const props = PropertiesService.getScriptProperties();
  const lastId = props.getProperty(LAST_UPDATE_KEY);

  // جلب التحديثات المعلقة
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates';
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ offset: lastId ? parseInt(lastId) + 1 : 0, limit: 100 }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());
  const pendingCount = result.ok ? result.result.length : 0;

  Logger.log('=== Bot Status ===');
  Logger.log('Last Update ID: ' + (lastId || 'none'));
  Logger.log('Pending Updates: ' + pendingCount);

  if (pendingCount > 0) {
    Logger.log('First pending: ' + JSON.stringify(result.result[0]));
  }

  return 'Last ID: ' + (lastId || 'none') + ', Pending: ' + pendingCount;
}

/**
 * ⭐⭐⭐ حذف الـ Webhook - شغّل هذا أولاً! ⭐⭐⭐
 * هذا ضروري لأن Webhook يمنع getUpdates من العمل
 */
function deleteWebhook() {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/deleteWebhook';
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ drop_pending_updates: false }),
    muteHttpExceptions: true
  });

  Logger.log('🗑️ Delete Webhook Response: ' + response.getContentText());

  const result = JSON.parse(response.getContentText());
  if (result.ok) {
    Logger.log('✅ Webhook deleted successfully!');
    sendMessage(786700586, '✅ *تم حذف الـ Webhook!*\n\nالآن شغّل `resetBot` ثم أرسل رسالة.');
    return 'تم حذف الـ Webhook بنجاح!';
  } else {
    Logger.log('❌ Failed to delete webhook: ' + result.description);
    return 'فشل: ' + result.description;
  }
}

/**
 * عرض معلومات الـ Webhook الحالي
 */
function getWebhookInfo() {
  const url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getWebhookInfo';
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    muteHttpExceptions: true
  });

  Logger.log('📡 Webhook Info: ' + response.getContentText());
  return response.getContentText();
}

/**
 * ⭐ إعداد كامل للبوت (شغّل هذا بعد deleteWebhook)
 */
function fullSetup() {
  Logger.log('🚀 Starting full setup...');

  // 1. حذف الـ Webhook
  deleteWebhook();

  // 2. انتظر ثانية
  Utilities.sleep(1000);

  // 3. إعادة تعيين
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(LAST_UPDATE_KEY);

  // 4. إنشاء الـ Trigger
  createPollingTrigger();

  // 5. فحص مفتاح Gemini
  const apiKey = CONFIG.GEMINI_API_KEY;
  const geminiStatus = (apiKey && apiKey.length > 10) ? '✅' : '❌';

  // 6. إرسال رسالة
  sendMessage(786700586, '🎉 *تم الإعداد الكامل!*\n\n✅ Webhook محذوف\n✅ Trigger مُفعّل\n' + geminiStatus + ' Gemini API Key\n\nأرسل /start لظهور القائمة!');

  Logger.log('✅ Full setup completed!');
  return 'تم الإعداد الكامل!';
}

/**
 * ⭐ فحص مفتاح Gemini API
 */
function testGeminiKey() {
  const apiKey = CONFIG.GEMINI_API_KEY;

  if (!apiKey || apiKey.length < 10) {
    Logger.log('❌ Gemini API Key غير موجود في Script Properties!');
    Logger.log('اذهب إلى Project Settings → Script Properties → أضف GEMINI_API_KEY');
    return 'مفتاح Gemini غير موجود!';
  }

  Logger.log('🔑 Found API Key: ' + apiKey.substring(0, 10) + '...');

  // اختبار بسيط
  try {
    const apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;
    const payload = {
      contents: [{ parts: [{ text: 'قل مرحبا' }] }],
      generationConfig: { maxOutputTokens: 50 }
    };

    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    Logger.log('Response Code: ' + code);

    if (code === 200) {
      Logger.log('✅ Gemini API يعمل!');
      sendMessage(786700586, '✅ *Gemini API يعمل!*\n\nالبوت جاهز لمعالجة الرسائل.');
      return 'Gemini يعمل!';
    } else {
      Logger.log('❌ Gemini Error: ' + response.getContentText());
      return 'خطأ: ' + response.getContentText();
    }
  } catch (e) {
    Logger.log('❌ Exception: ' + e.toString());
    return 'خطأ: ' + e.toString();
  }
}
