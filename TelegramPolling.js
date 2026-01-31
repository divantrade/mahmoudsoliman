/**
 * =====================================================
 * نظام محمود المحاسبي - Telegram Polling (Optimized)
 * تغطية 92% - فجوة 5 ثواني فقط
 * =====================================================
 */

var LAST_UPDATE_KEY = 'last_update_id';
var PENDING_TRANS_PREFIX = 'pending_trans_';

/**
 * ⭐ حفظ معاملة معلقة للمراجعة
 */
function savePendingTransaction(chatId, transactionData) {
  try {
    var cache = CacheService.getScriptCache();
    var key = PENDING_TRANS_PREFIX + chatId;
    var jsonData = JSON.stringify(transactionData);
    cache.put(key, jsonData, 300); // 5 دقائق
    Logger.log('Saved pending transaction for chat ' + chatId + ', size: ' + jsonData.length);
    return true;
  } catch (e) {
    Logger.log('ERROR in savePendingTransaction: ' + e.toString());
    return false;
  }
}

/**
 * ⭐ استرجاع معاملة معلقة
 */
function getPendingTransaction(chatId) {
  var cache = CacheService.getScriptCache();
  var key = PENDING_TRANS_PREFIX + chatId;
  var data = cache.get(key);
  if (data) {
    return JSON.parse(data);
  }
  return null;
}

/**
 * ⭐ حذف معاملة معلقة
 */
function removePendingTransaction(chatId) {
  var cache = CacheService.getScriptCache();
  var key = PENDING_TRANS_PREFIX + chatId;
  cache.remove(key);
  Logger.log('Removed pending transaction for chat ' + chatId);
}

/**
 * ⭐ إنشاء نموذج المراجعة
 */
function buildPreviewMessage(transactions) {
  var msg = '📋 *مراجعة قبل الحفظ*\n';
  msg += '━━━━━━━━━━━━━━━━━━━━━\n\n';

  for (var i = 0; i < transactions.length; i++) {
    var t = transactions[i];
    msg += '🔹 *المعاملة ' + (i + 1) + ':*\n';
    msg += '   النوع: ' + (t.type || '-') + '\n';
    msg += '   المبلغ: ' + (t.amount || 0) + ' ' + (t.currency || 'ريال') + '\n';

    if (t.amount_received) {
      msg += '   المستلم: ' + t.amount_received + ' ' + (t.currency_received || 'جنيه') + '\n';
    }
    if (t.exchange_rate) {
      msg += '   سعر الصرف: ' + t.exchange_rate + '\n';
    }
    if (t.category) {
      msg += '   التصنيف: ' + t.category + '\n';
    }
    if (t.contact) {
      msg += '   الجهة: ' + t.contact + '\n';
    }
    if (t.description) {
      msg += '   الوصف: ' + t.description + '\n';
    }
    msg += '\n';
  }

  msg += '━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '⚠️ *هل البيانات صحيحة؟*';

  return msg;
}

/**
 * ⭐ إرسال نموذج المراجعة مع الأزرار
 */
function sendPreviewWithButtons(chatId, transactions, user) {
  var previewMsg = buildPreviewMessage(transactions);

  // حفظ المعاملات المعلقة
  var saved = savePendingTransaction(chatId, {
    transactions: transactions,
    user: user,
    timestamp: new Date().getTime()
  });

  if (!saved) {
    // فشل الحفظ في الكاش - نحفظ مباشرة
    Logger.log('Cache save failed, saving directly');
    throw new Error('فشل حفظ المعاملة في الكاش');
  }

  // أزرار التأكيد والإلغاء
  var keyboard = {
    inline_keyboard: [
      [
        { text: '✅ تأكيد وحفظ', callback_data: 'confirm_save' },
        { text: '❌ إلغاء', callback_data: 'cancel_save' }
      ],
      [
        { text: '✏️ تعديل الرسالة', callback_data: 'edit_message' }
      ]
    ]
  };

  sendMessage(chatId, previewMsg, keyboard);
}

/**
 * الدالة الرئيسية - تعمل 55 ثانية متواصلة
 * Trigger كل دقيقة → حلقة 55 ثانية → فجوة 5 ثواني
 */
function checkForUpdates() {
  var LOOP_DURATION = 55000;  // 55 ثانية
  var CHECK_INTERVAL = 2000;  // فحص كل 2 ثانية
  var startTime = Date.now();

  Logger.log('🚀 Polling started at ' + new Date().toLocaleTimeString());

  while (Date.now() - startTime < LOOP_DURATION) {
    try {
      var lastUpdateId = getLastUpdateId();
      var updates = getUpdates(lastUpdateId);

      if (updates && updates.length > 0) {
        Logger.log('📨 Found ' + updates.length + ' updates');

        for (var i = 0; i < updates.length; i++) {
          var update = updates[i];
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
    var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates';

    var payload = {
      offset: offset ? offset + 1 : 0,
      limit: 100,
      timeout: 1  // timeout قصير للرد السريع
    };

    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

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
    var props = PropertiesService.getScriptProperties();
    var value = props.getProperty(LAST_UPDATE_KEY);
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
    var props = PropertiesService.getScriptProperties();
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

  try {
    if (update.message) {
      handleMessage(update.message);
    } else if (update.callback_query) {
      handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    Logger.log('❌ خطأ في processUpdate: ' + error.toString());
    // محاولة إرسال رسالة خطأ للمستخدم
    try {
      var chatId = null;
      if (update.message && update.message.chat) {
        chatId = update.message.chat.id;
      } else if (update.callback_query && update.callback_query.message && update.callback_query.message.chat) {
        chatId = update.callback_query.message.chat.id;
      }
      if (chatId) {
        sendMessage(chatId, '❌ حدث خطأ غير متوقع. حاول مرة أخرى.');
      }
    } catch (e) {
      Logger.log('Failed to send error message: ' + e.toString());
    }
  }
}

/**
 * معالجة الرسالة
 */
function handleMessage(message) {
  var chatId = message.chat.id;
  var userId = message.from.id;
  var userName = message.from.first_name || 'مستخدم';
  var username = message.from.username || '';
  var text = message.text || '';

  Logger.log('📩 Message from ' + userName + ': ' + text);

  // جلب أو إنشاء المستخدم
  var user = getUserByTelegramId(userId);

  // تسجيل تلقائي لأي مستخدم جديد
  if (!user) {
    Logger.log('📝 Registering new user: ' + userName);
    var role = (userId == 786700586) ? ROLES.ADMIN : ROLES.OWNER;
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
  var command = text.split(' ')[0].toLowerCase();
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

    case '/custody':
    case '/عهدة':
    case '/sara':
      sendCustodyReport(chatId, 'سارة');
      break;

    case '/mostafa':
    case '/مصطفى':
      sendCustodyReport(chatId, 'مصطفى');
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
    case '💼 عهدة سارة':
      sendCustodyReport(chatId, 'سارة');
      return true;
    case '📦 عهدة مصطفى':
      sendCustodyReport(chatId, 'مصطفى');
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
 * إرسال تقرير العهدة
 */
function sendCustodyReport(chatId, custodian) {
  var report = getCustodyReport(custodian);

  if (!report) {
    sendMessage(chatId, '❌ لا توجد بيانات للعهدة');
    return;
  }

  var msg = '💼 *تقرير عهدة ' + custodian + '*\n';
  msg += '━━━━━━━━━━━━━━━━━━━━━\n\n';

  msg += '📥 *إجمالي الإيداعات:* ' + report.total_deposits.toLocaleString() + ' جنيه\n';
  msg += '📤 *إجمالي المصروفات:* ' + report.total_expenses.toLocaleString() + ' جنيه\n';
  msg += '━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '💰 *الرصيد الحالي:* ' + report.current_balance.toLocaleString() + ' جنيه\n\n';

  if (report.transactions && report.transactions.length > 0) {
    msg += '*📋 آخر الحركات:*\n';
    var lastTrans = report.transactions.slice(-5).reverse();
    for (var i = 0; i < lastTrans.length; i++) {
      var t = lastTrans[i];
      var icon = t.type === 'إيداع_عهدة' ? '📥' : '📤';
      msg += icon + ' ' + t.amount + ' - ' + (t.category || t.type) + '\n';
    }
  }

  sendMessage(chatId, msg);
}

/**
 * ⭐⭐⭐ معالجة العهدة مباشرة - بدون Gemini ⭐⭐⭐
 * تستخرج المبلغ والجهة وسعر الصرف من النص مباشرة
 * يدعم: "حولت لسارة 500 ريال ما يعادل 6000 جنيه عهدة"
 */
function processCustodyDirectly(chatId, text, user) {
  Logger.log('=== processCustodyDirectly START ===');
  Logger.log('Text: ' + text);
  Logger.log('User: ' + JSON.stringify(user));

  try {
    // تحويل الأرقام العربية إلى إنجليزية
    var arabicNums = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
    var normalizedText = text;
    for (var ar in arabicNums) {
      normalizedText = normalizedText.replace(new RegExp(ar, 'g'), arabicNums[ar]);
    }
    Logger.log('Normalized text: ' + normalizedText);

    // تحديد أمين العهدة (سارة أو مصطفى)
    var custodian = 'سارة'; // افتراضي
    if (/مصطف[يى]/i.test(text)) {
      custodian = 'مصطفى';
    } else if (/سار[ةه]/i.test(text)) {
      custodian = 'سارة';
    }
    Logger.log('Custodian: ' + custodian);

    // استخراج المبالغ والعملات
    var amount = 0;
    var currency = 'جنيه';
    var amountReceived = null;
    var currencyReceived = 'جنيه';
    var exchangeRate = null;

    // نمط 1: "X ريال ما يعادل Y جنيه" أو "X ريال يعادل Y"
    var exchangePattern = /(\d+)\s*(?:ريال|سعودي)\s*(?:ما\s*)?يعادل\s*(\d+)/i;
    var exchangeMatch = normalizedText.match(exchangePattern);

    if (exchangeMatch) {
      amount = parseInt(exchangeMatch[1]);
      amountReceived = parseInt(exchangeMatch[2]);
      currency = 'ريال';
      currencyReceived = 'جنيه';
      if (amount > 0 && amountReceived > 0) {
        exchangeRate = (amountReceived / amount).toFixed(2);
      }
      Logger.log('Pattern 1 matched - Amount: ' + amount + ' SAR = ' + amountReceived + ' EGP, Rate: ' + exchangeRate);
    } else {
      // نمط 2: "X جنيه" أو "X ريال" (بدون سعر صرف)
      var amounts = normalizedText.match(/(\d+)/g);
      if (amounts && amounts.length > 0) {
        amount = parseInt(amounts[0]);

        // تحديد العملة من السياق
        if (/ريال|سعودي/i.test(text)) {
          currency = 'ريال';
        } else if (/جنيه|مصري/i.test(text)) {
          currency = 'جنيه';
        } else {
          currency = 'جنيه'; // العهدة افتراضياً بالجنيه
        }

        // لو في رقم تاني بعد "يعادل" أو "وصل" أو "وصلوا"
        var secondAmountMatch = normalizedText.match(/(?:يعادل|وصل|وصلوا|وصلت)\s*(\d+)/i);
        if (secondAmountMatch) {
          amountReceived = parseInt(secondAmountMatch[1]);
          currencyReceived = 'جنيه';
          if (amount > 0 && amountReceived > 0) {
            exchangeRate = (amountReceived / amount).toFixed(2);
          }
        }
      }
      Logger.log('Pattern 2 - Amount: ' + amount + ' ' + currency);
    }

    // التحقق من وجود مبلغ
    if (!amount || amount <= 0) {
      Logger.log('ERROR: No amount found');
      sendMessage(chatId, '❌ لم أجد مبلغ في الرسالة.\n\nجرب:\n• حولت لسارة 5000 عهدة\n• حولت لسارة 500 ريال ما يعادل 6000 جنيه عهدة');
      return;
    }

    // إنشاء بيانات المعاملة - تُحفظ في شيت الحركات الرئيسي
    var transData = {
      type: 'إيداع_عهدة',
      amount: amount,
      currency: currency,
      category: 'عهدة ' + custodian,
      contact: custodian,
      contact_name: custodian,
      description: 'إيداع عهدة لـ ' + custodian,
      amount_received: amountReceived,
      currency_received: amountReceived ? currencyReceived : '',
      exchange_rate: exchangeRate,
      user_name: user.name,
      telegram_id: user.telegram_id
    };
    Logger.log('Transaction data: ' + JSON.stringify(transData));

    // ⭐ حفظ مباشر في شيت الحركات
    var result = addTransaction(transData);
    Logger.log('addTransaction result: ' + JSON.stringify(result));

    if (result && result.success) {
      var msg = '✅ تم تسجيل عهدة ' + custodian + '\n';
      msg += '━━━━━━━━━━━━━━━━━━━━━\n\n';
      msg += '🔢 رقم الحركة: #' + result.id + '\n';
      msg += '💰 المبلغ: ' + amount + ' ' + currency + '\n';
      if (amountReceived && exchangeRate) {
        msg += '📥 المستلم: ' + amountReceived + ' ' + currencyReceived + '\n';
        msg += '💱 سعر الصرف: ' + exchangeRate + '\n';
      }
      var balance = calculateCustodyBalanceFromTransactions(custodian);
      msg += '\n💼 رصيد العهدة: ' + balance + ' جنيه';
      sendMessage(chatId, msg);
    } else {
      sendMessage(chatId, '❌ فشل تسجيل العهدة: ' + (result ? result.message : 'خطأ غير معروف'));
    }

  } catch (error) {
    Logger.log('EXCEPTION in processCustodyDirectly: ' + error.toString());
    Logger.log('Stack: ' + (error.stack || 'no stack'));
    sendMessage(chatId, '❌ خطأ في معالجة العهدة:\n' + error.message + '\n\nجرب كتابة الرسالة بشكل أبسط.');
  }

  Logger.log('=== processCustodyDirectly END ===');
}

/**
 * معالجة الرسائل بالذكاء الاصطناعي
 */
function processUserMessage(chatId, text, user) {
  Logger.log('🤖 معالجة: ' + text);

  sendChatAction(chatId, 'typing');

  try {
    // ⭐⭐⭐ فحص كلمة العهدة أولاً - معالجة مباشرة بدون Gemini ⭐⭐⭐
    var textLower = text.toLowerCase();
    var hasOhdaKeyword = (
      textLower.indexOf('عهدة') !== -1 ||
      textLower.indexOf('عهده') !== -1 ||
      textLower.indexOf('العهدة') !== -1 ||
      textLower.indexOf('العهده') !== -1
    );

    Logger.log('Checking for custody keyword in: ' + text);
    Logger.log('Has custody keyword: ' + hasOhdaKeyword);

    if (hasOhdaKeyword) {
      Logger.log('*** CUSTODY KEYWORD DETECTED - Processing directly ***');
      processCustodyDirectly(chatId, text, user);
      return;
    }

    var parsed = parseMessageWithGemini(text, user.name);
    Logger.log('نتيجة: ' + JSON.stringify(parsed));

    // ⭐ إذا فشل الـ API أو أرجع null
    if (!parsed) {
      sendMessage(chatId, '❌ حدث خطأ في الاتصال بالذكاء الاصطناعي.\n\nجرب مرة أخرى.');
      return;
    }

    // التحقق من النجاح (يدعم العربي والإنجليزي)
    var isSuccess = parsed && (parsed.نجاح === true || parsed.success === true);
    var message = parsed.رسالة || parsed.message;
    var transactions = parsed.معاملات || parsed.transactions;

    if (!isSuccess) {
      var msg = message || '❌ لم أفهم. جرب:\n\n• استلمت راتب 5000\n• صرفت 100 غداء';
      sendMessage(chatId, msg);
      return;
    }

    Logger.log('Transactions array: ' + JSON.stringify(transactions));

    if (transactions && transactions.length > 0) {
      Logger.log('Found ' + transactions.length + ' transactions to process');

      // تحويل المعاملات للتنسيق الموحد
      var processedTransactions = [];

      for (var i = 0; i < transactions.length; i++) {
        var trans = transactions[i];
        Logger.log('Transaction ' + i + ': ' + JSON.stringify(trans));

        // تحويل العملة من العربي للكود
        var currencyMap = { 'ريال': 'ريال', 'جنيه': 'جنيه', 'دولار': 'دولار', 'SAR': 'ريال', 'EGP': 'جنيه', 'USD': 'دولار' };
        var rawCurrency = trans.عملة || trans.currency || 'ريال';
        var currency = currencyMap[rawCurrency] || 'ريال';

        var rawCurrencyReceived = trans.عملة_مستلمة || trans.currency_received || 'جنيه';
        var currencyReceived = currencyMap[rawCurrencyReceived] || 'جنيه';

        // تحويل المفاتيح العربية للحفظ
        var transData = {
          type: trans.نوع || trans.type,
          amount: trans.مبلغ || trans.amount,
          currency: currency,
          category: trans.تصنيف || trans.category,
          contact: trans.جهة || trans.contact,
          contact_name: trans.اسم_الجهة || trans.contact_name,
          description: trans.وصف || trans.description,
          amount_received: trans.مبلغ_مستلم || trans.amount_received,
          currency_received: currencyReceived,
          exchange_rate: trans.سعر_الصرف || trans.exchange_rate,
          gold_weight: trans.وزن_الذهب || trans.gold_weight,
          gold_karat: trans.عيار_الذهب || trans.gold_karat,
          user_name: user.name,
          telegram_id: user.telegram_id
        };

        // حساب سعر الصرف إذا لم يُذكر
        if (transData.amount && transData.amount_received && !transData.exchange_rate) {
          transData.exchange_rate = (transData.amount_received / transData.amount).toFixed(2);
        }

        processedTransactions.push(transData);
      }

      // ⭐⭐⭐ إرسال نموذج المراجعة - مع fallback للحفظ المباشر ⭐⭐⭐
      try {
        sendPreviewWithButtons(chatId, processedTransactions, user);
      } catch (previewError) {
        Logger.log('Preview error in processUserMessage, falling back: ' + previewError.toString());
        // Fallback: حفظ مباشر
        var successCount = 0;
        var savedIds = [];
        for (var j = 0; j < processedTransactions.length; j++) {
          var result = addTransaction(processedTransactions[j]);
          if (result && result.success) {
            successCount++;
            savedIds.push(result.id);
          }
        }
        if (successCount > 0) {
          var msg = '✅ تم الحفظ! رقم الحركة: #' + savedIds.join(', #');
          sendMessage(chatId, msg);
        } else {
          sendMessage(chatId, '❌ فشل الحفظ');
        }
      }

    } else {
      Logger.log('No transactions found');
      var errorMsg = '❌ لم أفهم الرسالة.\n\n';
      errorMsg += 'جرب:\n• حولت لسارة 5000 عهدة\n• صرفت 100 غداء';
      sendMessage(chatId, errorMsg);
    }

  } catch (error) {
    Logger.log('❌ خطأ في processUserMessage: ' + error.toString());
    Logger.log('Stack: ' + error.stack);

    // ⭐ رسالة خطأ مفصلة للمستخدم
    var errorMsg = '❌ حدث خطأ في معالجة رسالتك.\n\n';
    errorMsg += '💡 جرب كتابتها بشكل أبسط:\n';
    errorMsg += '• حولت لسارة 5000 عهدة\n';
    errorMsg += '• صرفت 100 غداء\n';
    errorMsg += '• استلمت راتب 8000\n\n';
    errorMsg += '🔧 الخطأ: ' + error.message;

    sendMessage(chatId, errorMsg);
  }
}

/**
 * رسالة الترحيب
 */
function sendWelcomeMessage(chatId, user) {
  var msg = 'مرحباً ' + user.name + '! 👋\n\n' +
    '🏦 *نظام حسابات محمود*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 *سجل معاملاتك بسهولة:*\n' +
    '• استلمت راتب 8500\n' +
    '• صرفت 150 غداء\n' +
    '• حولت لسارة 10000 عهدة\n\n' +
    '📊 /report - التقارير\n' +
    '❓ /help - المساعدة';

  // القائمة الدائمة (Reply Keyboard)
  var replyKeyboard = {
    keyboard: [
      ['📊 التقارير', '💰 الرصيد'],
      ['📅 تقرير شهري', '💕 تقرير الزوجة'],
      ['💼 عهدة سارة', '📦 عهدة مصطفى'],
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
  var msg = '📖 *دليل الاستخدام*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '*💵 الدخل:*\n' +
    '• نزل الراتب 8500\n' +
    '• استلمت عمولة 1200\n\n' +
    '*💸 المصروفات:*\n' +
    '• صرفت 150 غداء\n' +
    '• دفعت الإيجار 2000\n\n' +
    '*📤 التحويلات:*\n' +
    '• حولت لمراتي 3000 ريال سعر 13 وصلوا 39000\n\n' +
    '*💼 العهدة (سارة):*\n' +
    '• حولت لسارة 10000 عهدة\n' +
    '• صرفت 500 جمعية من العهدة (سارة)\n' +
    '• أعطيت محمد 1000 من العهدة (سارة)\n\n' +
    '*📊 التقارير:*\n' +
    '/report - قائمة التقارير\n' +
    '/balance - الرصيد';

  sendMessage(chatId, msg);
}

/**
 * قائمة التقارير
 */
function sendReportMenu(chatId) {
  var keyboard = {
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
  var chatId = callbackQuery.message.chat.id;
  var userId = callbackQuery.from.id;
  var data = callbackQuery.data;

  Logger.log('🔘 Button: ' + data);

  var user = getUserByTelegramId(userId);

  switch (data) {
    // ⭐⭐⭐ أزرار تأكيد/إلغاء المعاملة ⭐⭐⭐
    case 'confirm_save':
      handleConfirmSave(chatId, user);
      break;

    case 'cancel_save':
      handleCancelSave(chatId);
      break;

    case 'edit_message':
      handleEditMessage(chatId);
      break;

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
 * ⭐ معالجة تأكيد الحفظ
 */
function handleConfirmSave(chatId, user) {
  Logger.log('=== handleConfirmSave ===');

  var pending = getPendingTransaction(chatId);
  if (!pending || !pending.transactions) {
    sendMessage(chatId, '⏰ انتهت صلاحية المعاملة. أعد كتابة الرسالة.');
    return;
  }

  var transactions = pending.transactions;
  var successCount = 0;
  var savedIds = [];
  var details = [];

  for (var i = 0; i < transactions.length; i++) {
    var transData = transactions[i];
    transData.user_name = user.name;
    transData.telegram_id = user.telegram_id;

    var result = addTransaction(transData);
    Logger.log('Save result: ' + JSON.stringify(result));

    if (result && result.success) {
      successCount++;
      savedIds.push(result.id);

      var detail = transData.type + ': ' + transData.amount + ' ' + transData.currency;
      if (transData.contact) {
        detail += ' لـ ' + transData.contact;
      }

      // لو عهدة، نحسب الرصيد
      if (transData.type === 'إيداع_عهدة' || transData.type === 'صرف_من_عهدة') {
        var custodian = transData.contact || 'سارة';
        var balance = calculateCustodyBalanceFromTransactions(custodian);
        detail += '\n   💼 رصيد العهدة: ' + balance + ' جنيه';
      }

      details.push(detail);
    }
  }

  // حذف المعاملة المعلقة
  removePendingTransaction(chatId);

  if (successCount > 0) {
    var msg = '✅ *تم الحفظ بنجاح!*\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━\n\n';

    // عرض أرقام الحركات
    msg += '🔢 *رقم الحركة:* ';
    if (savedIds.length === 1) {
      msg += '#' + savedIds[0] + '\n\n';
    } else {
      msg += savedIds.map(function(id) { return '#' + id; }).join('، ') + '\n\n';
    }

    for (var j = 0; j < details.length; j++) {
      msg += '• ' + details[j] + '\n';
    }

    sendMessage(chatId, msg);
  } else {
    sendMessage(chatId, '❌ فشل حفظ المعاملة. حاول مرة أخرى.');
  }
}

/**
 * ⭐ معالجة إلغاء الحفظ
 */
function handleCancelSave(chatId) {
  removePendingTransaction(chatId);
  sendMessage(chatId, '🚫 تم إلغاء المعاملة.\n\nيمكنك إعادة كتابة الرسالة بالتفاصيل الصحيحة.');
}

/**
 * ⭐ معالجة تعديل الرسالة
 */
function handleEditMessage(chatId) {
  removePendingTransaction(chatId);
  sendMessage(chatId, '✏️ أعد كتابة رسالتك بالتفاصيل الصحيحة:\n\n• حولت لسارة 5000 عهدة\n• صرفت 100 غداء\n• استلمت راتب 8000');
}

/**
 * ملخص الرصيد
 */
function sendBalanceSummary(chatId) {
  try {
    var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var data = sheet.getDataRange().getValues();

    var income = 0, expense = 0, transfer = 0;

    for (var i = 1; i < data.length; i++) {
      var type = data[i][3];
      var amount = parseFloat(data[i][5]) || 0;

      if (type === 'دخل') income += amount;
      else if (type === 'مصروف') expense += amount;
      else if (type === 'تحويل') transfer += amount;
    }

    var balance = income - expense - transfer;

    var msg = '💰 *ملخص الرصيد*\n' +
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
    var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';

    var payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    };

    if (replyMarkup) {
      payload.reply_markup = JSON.stringify(replyMarkup);
    }

    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

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
    var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/sendChatAction';
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
    var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/answerCallbackQuery';
    UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ callback_query_id: callbackQueryId }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

/**
 * ⭐ إعداد قائمة البوت الدائمة (تظهر عند الضغط على ☰)
 * شغّل هذه الدالة مرة واحدة فقط
 */
function setupBotMenu() {
  var commands = [
    { command: 'start', description: '🏠 البداية والقائمة الرئيسية' },
    { command: 'report', description: '📊 التقارير' },
    { command: 'balance', description: '💰 الرصيد الحالي' },
    { command: 'monthly', description: '📅 تقرير الشهر' },
    { command: 'wife', description: '💕 تقرير الزوجة' },
    { command: 'sara', description: '💼 عهدة سارة' },
    { command: 'mostafa', description: '📦 عهدة مصطفى' },
    { command: 'siblings', description: '👨‍👩‍👧‍👦 تقرير الإخوة' },
    { command: 'gold', description: '💍 تقرير الذهب' },
    { command: 'help', description: '❓ المساعدة' }
  ];

  try {
    var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/setMyCommands';
    var response = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ commands: commands }),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());
    if (result.ok) {
      Logger.log('✅ تم إعداد قائمة البوت بنجاح!');
      return '✅ تم إعداد قائمة البوت! اضغط على ☰ في تيليجرام لرؤية القائمة';
    } else {
      Logger.log('❌ فشل: ' + response.getContentText());
      return '❌ فشل إعداد القائمة';
    }
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    return '❌ خطأ: ' + error.toString();
  }
}

/**
 * إنشاء Trigger
 */
function createPollingTrigger() {
  // حذف القديم
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
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
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
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
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(LAST_UPDATE_KEY);
  Logger.log('✅ Reset last_update_id');

  // جلب آخر update وتخطيه
  var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates';
  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ offset: -1, limit: 1 }),
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  Logger.log('Updates response: ' + response.getContentText());

  if (result.ok && result.result && result.result.length > 0) {
    var lastUpdate = result.result[result.result.length - 1];
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
  var props = PropertiesService.getScriptProperties();
  var lastId = props.getProperty(LAST_UPDATE_KEY);

  // جلب التحديثات المعلقة
  var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates';
  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ offset: lastId ? parseInt(lastId) + 1 : 0, limit: 100 }),
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  var pendingCount = result.ok ? result.result.length : 0;

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
  var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/deleteWebhook';
  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ drop_pending_updates: false }),
    muteHttpExceptions: true
  });

  Logger.log('🗑️ Delete Webhook Response: ' + response.getContentText());

  var result = JSON.parse(response.getContentText());
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
  var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/getWebhookInfo';
  var response = UrlFetchApp.fetch(url, {
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
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(LAST_UPDATE_KEY);

  // 4. إنشاء الـ Trigger
  createPollingTrigger();

  // 5. فحص مفتاح Gemini
  var apiKey = CONFIG.GEMINI_API_KEY;
  var geminiStatus = (apiKey && apiKey.length > 10) ? '✅' : '❌';

  // 6. إرسال رسالة
  sendMessage(786700586, '🎉 *تم الإعداد الكامل!*\n\n✅ Webhook محذوف\n✅ Trigger مُفعّل\n' + geminiStatus + ' Gemini API Key\n\nأرسل /start لظهور القائمة!');

  Logger.log('✅ Full setup completed!');
  return 'تم الإعداد الكامل!';
}

/**
 * ⭐ فحص مفتاح Gemini API
 */
function testGeminiKey() {
  var apiKey = CONFIG.GEMINI_API_KEY;

  if (!apiKey || apiKey.length < 10) {
    Logger.log('❌ Gemini API Key غير موجود في Script Properties!');
    Logger.log('اذهب إلى Project Settings → Script Properties → أضف GEMINI_API_KEY');
    return 'مفتاح Gemini غير موجود!';
  }

  Logger.log('🔑 Found API Key: ' + apiKey.substring(0, 10) + '...');

  // اختبار بسيط
  try {
    var apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;
    var payload = {
      contents: [{ parts: [{ text: 'قل مرحبا' }] }],
      generationConfig: { maxOutputTokens: 50 }
    };

    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
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
