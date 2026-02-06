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

    // ⭐ التحقق من الحفظ فعلياً
    var verify = cache.get(key);
    if (!verify) {
      Logger.log('WARNING: Cache verification failed for ' + chatId);
      return false;
    }

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
 * ⭐ Escape رموز Markdown الخاصة
 * يمنع كسر التنسيق عند وجود _ أو * في النص
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString()
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`');
}

/**
 * ⭐ حساب رصيد العهدة لأمين العهدة (بالاسم العربي)
 * يحول الاسم العربي لكود الحساب ويستدعي calculateAccountBalance
 */
function calculateCustodyBalanceFromTransactions(custodianName) {
  try {
    var nameToAccount = {
      'مصطفى': 'MOSTAFA', 'مصطفي': 'MOSTAFA',
      'سارة': 'SARA', 'ساره': 'SARA',
      'ام سيليا': 'WIFE', 'أم سيليا': 'WIFE', 'مراتي': 'WIFE', 'زوجتي': 'WIFE',
      'هاجر': 'HAGAR',
      'محمد': 'MOHAMED'
    };

    var accountCode = nameToAccount[custodianName];
    if (!accountCode) {
      // Try lookup via CONTACTS
      for (var key in CONTACTS) {
        var contact = CONTACTS[key];
        if (contact.name && contact.name.indexOf(custodianName) !== -1) {
          accountCode = contact.account;
          break;
        }
        if (contact.aliases) {
          for (var a = 0; a < contact.aliases.length; a++) {
            if (contact.aliases[a] === custodianName) {
              accountCode = contact.account;
              break;
            }
          }
          if (accountCode) break;
        }
      }
    }

    if (!accountCode) {
      Logger.log('⚠️ calculateCustodyBalanceFromTransactions: unknown custodian "' + custodianName + '"');
      return 0;
    }

    var balances = calculateAccountBalance(accountCode);
    // Return EGP balance (primary custody currency)
    return (balances.EGP || 0);
  } catch (error) {
    Logger.log('Error in calculateCustodyBalanceFromTransactions: ' + error.toString());
    return 0;
  }
}

// =====================================================
// ============== نظام النماذج التوضيحية ==============
// =====================================================

/**
 * ⭐ الحصول على نماذج توضيحية حسب نوع المعاملة
 * @param {string} type - نوع المعاملة (expense, income, transfer, compound, custody, association, all)
 * @returns {string} النماذج التوضيحية
 */
function getExamples(type) {
  var examples = {
    // ===== مصروف =====
    expense: '💸 *نماذج المصروفات:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• صرفت 100 غداء\n' +
      '• صرفت 50 ريال مواصلات\n' +
      '• صرفت 200 فواتير\n' +
      '• دفعت 500 إيجار\n' +
      '• اشتريت ملابس بـ 300\n' +
      '• صرفت 80 سجاير\n',

    // ===== دخل =====
    income: '💰 *نماذج الدخل:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• نزل الراتب 8500\n' +
      '• استلمت راتب 8500 ريال\n' +
      '• جالي عمولة 500\n' +
      '• استلمت مكافأة 1000\n',

    // ===== تحويل بسيط =====
    transfer: '📤 *نماذج التحويل البسيط:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• حولت لمراتي 3000 جنيه\n' +
      '• حولت للأهل 2000\n' +
      '• حولت لسارة 5000 جنيه\n' +
      '• حولت 1000 ريال بسعر 12 وصلوا 12000\n',

    // ===== تحويل مركب =====
    compound: '🔄 *نماذج التحويل المركب:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• حولت لمصطفي 300 ريال ما يعادل 9000 جنيه منهم 4000 لمراتي و4000 مصطفي والباقي عهده\n\n' +
      '• حولت لمصطفي 500 ريال يعني 15000 جنيه يعطي مراتي 6000 وياخد 5000 والباقي عهدة\n\n' +
      '• حولت لسارة 400 ريال ما يعادل 12000 جنيه تدفع جمعية 5000 وتعطي محمد 3000 والباقي عهدة\n\n' +
      '*الكلمات المفتاحية:*\n' +
      '├ منهم، يعطي، تعطي، يدفع، تدفع\n' +
      '├ وياخد، ياخد، والباقي، عهدة\n' +
      '└ جمعية، قسط، للأهل\n',

    // ===== العهدة =====
    custody: '🏦 *نماذج العهدة:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '*إيداع عهدة:*\n' +
      '• حولت لسارة 10000 عهدة\n' +
      '• حولت عهده لمصطفى 5000\n' +
      '• عهدة سارة 8000 جنيه\n\n' +
      '*صرف من العهدة (سارة/مصطفى):*\n' +
      '• صرفت 500 جمعية من العهدة\n' +
      '• أعطيت محمد 1000 من الفلوس\n' +
      '• دفعت من العهدة 2000 لهاجر\n',

    // ===== الجمعية =====
    association: '🤝 *نماذج الجمعية:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• دخلت جمعية من شهر 2 لمدة 10 اشهر هقبض الرابع بمبلغ 1000\n' +
      '• جمعية بداية شهر 3 مدة 12 شهر القسط 500 ترتيب القبض 5\n' +
      '• سارة دخلت جمعية 5000 لمدة 10 شهور هنقبض ال 3\n' +
      '• جمعية مع أم محمود من شهر 1 لمدة 12 شهر القسط 2000 هقبض الثامن\n\n' +
      '*العناصر المطلوبة:*\n' +
      '├ قيمة القسط (1000، 500، 5000...)\n' +
      '├ المدة (10 اشهر، 12 شهر...)\n' +
      '├ ترتيب القبض (الرابع، ال 3، الثامن...)\n' +
      '└ تاريخ البداية (اختياري)\n',

    // ===== السلف =====
    loan: '💳 *نماذج السلف:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• سلفت أحمد 1000 ريال\n' +
      '• أخذت سلفة 500 من محمد\n' +
      '• رجعت لمحمد 500 من السلفة\n',

    // ===== الذهب =====
    gold: '🥇 *نماذج الذهب:*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '• اشتريت 10 جرام ذهب عيار 21\n' +
      '• اشتريت ذهب 5 جرام عيار 18 بسعر 250\n'
  };

  // نموذج شامل لكل الأنواع
  examples.all = '📚 *دليل النماذج التوضيحية*\n' +
    '═══════════════════════════════\n\n' +
    examples.income + '\n' +
    examples.expense + '\n' +
    examples.transfer + '\n' +
    examples.compound + '\n' +
    examples.custody + '\n' +
    examples.association;

  // نموذج عند فشل فهم الرسالة
  examples.unknown = '❌ *لم أفهم الرسالة*\n\n' +
    '📝 *إليك بعض النماذج:*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '*دخل:* نزل الراتب 8500\n' +
    '*مصروف:* صرفت 100 غداء\n' +
    '*تحويل:* حولت لمراتي 3000 جنيه\n' +
    '*عهدة:* حولت لسارة 5000 عهدة\n\n' +
    '*تحويل مركب:*\nحولت لمصطفي 300 ريال يعني 9000 جنيه منهم 4000 لمراتي و4000 مصطفي والباقي عهدة\n\n' +
    '*جمعية:*\nدخلت جمعية 1000 لمدة 10 شهور هقبض الرابع\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    '💡 *اكتب /امثلة لرؤية كل النماذج*';

  return examples[type] || examples.unknown;
}

/**
 * ⭐ إرسال النماذج التوضيحية حسب النوع
 * @param {number} chatId - معرف المحادثة
 * @param {string} type - نوع النماذج المطلوبة
 */
function sendExamples(chatId, type) {
  var msg = getExamples(type);
  sendMessage(chatId, msg);
}

/**
 * ⭐ تحليل نوع الخطأ وتقديم النماذج المناسبة
 * @param {string} text - النص الأصلي الذي فشل تحليله
 * @returns {string} نوع النموذج المقترح
 */
function suggestExampleType(text) {
  if (!text) return 'unknown';

  var normalizedText = text.toLowerCase();

  // التحويل المركب
  if (/منهم|يعادل|ما يعادل|يعني|والباقي/.test(normalizedText)) {
    return 'compound';
  }

  // الجمعية
  if (/جمعي[هة]|قسط|هقبض|هنقبض|لمدة.*شهر/.test(normalizedText)) {
    return 'association';
  }

  // العهدة
  if (/عهد[هة]|من العهد|من الفلوس/.test(normalizedText)) {
    return 'custody';
  }

  // التحويل
  if (/حول|بعث|وصل/.test(normalizedText)) {
    return 'transfer';
  }

  // المصروف
  if (/صرف|دفع|اشتري|شريت/.test(normalizedText)) {
    return 'expense';
  }

  // الدخل
  if (/راتب|نزل|استلم|جا|عمول|مكاف/.test(normalizedText)) {
    return 'income';
  }

  return 'unknown';
}

/**
 * ⭐ إنشاء رسالة خطأ مع نماذج توضيحية
 * @param {string} originalText - النص الأصلي
 * @param {string} errorType - نوع الخطأ (optional)
 * @returns {string} رسالة الخطأ مع النماذج
 */
function buildErrorWithExamples(originalText, errorType) {
  var suggestedType = errorType || suggestExampleType(originalText);

  var msg = '❌ *لم أفهم الرسالة*\n\n';

  if (suggestedType !== 'unknown') {
    msg += '🔍 *يبدو أنك تحاول تسجيل: ' + getTypeLabel(suggestedType) + '*\n\n';
    msg += getExamples(suggestedType);
  } else {
    msg = getExamples('unknown');
  }

  return msg;
}

/**
 * ⭐ الحصول على تسمية نوع المعاملة
 */
function getTypeLabel(type) {
  var labels = {
    'expense': 'مصروف',
    'income': 'دخل',
    'transfer': 'تحويل',
    'compound': 'تحويل مركب',
    'custody': 'عهدة',
    'association': 'جمعية',
    'loan': 'سلفة',
    'gold': 'ذهب'
  };
  return labels[type] || 'معاملة';
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

    // استخدام escapeMarkdown لمنع كسر التنسيق
    var typeDisplay = (t.nature || t.type || '-').replace(/_/g, ' ');
    msg += '   النوع: ' + typeDisplay + '\n';
    msg += '   المبلغ: ' + (t.amount || 0) + ' ' + (t.currency || 'ريال') + '\n';

    // ⭐ عرض من حساب وإلى حساب بوضوح
    var fromAccount = t.fromAccount || t.from_account || t.من_حساب;
    var toAccount = t.toAccount || t.to_account || t.إلى_حساب;

    if (fromAccount) {
      var fromName = getAccountDisplayName(fromAccount);
      msg += '   📤 من: ' + escapeMarkdown(fromName) + '\n';
    }
    if (toAccount) {
      var toName = getAccountDisplayName(toAccount);
      msg += '   📥 إلى: ' + escapeMarkdown(toName) + '\n';
    }

    if (t.amount_received || t.convertedAmount) {
      var received = t.amount_received || t.convertedAmount;
      var receivedCurrency = t.currency_received || t.convertedCurrency || 'جنيه';
      msg += '   💱 المحول: ' + received + ' ' + receivedCurrency + '\n';
    }
    if (t.exchange_rate || t.exchangeRate) {
      msg += '   📊 سعر الصرف: ' + (t.exchange_rate || t.exchangeRate) + '\n';
    }
    if (t.category) {
      msg += '   📂 التصنيف: ' + escapeMarkdown(t.category) + '\n';
    }
    if (t.item) {
      msg += '   📝 البند: ' + escapeMarkdown(t.item) + '\n';
    }
    if (t.description) {
      msg += '   💬 الوصف: ' + escapeMarkdown(t.description) + '\n';
    }
    msg += '\n';
  }

  msg += '━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '⚠️ *هل البيانات صحيحة؟*';

  return msg;
}

/**
 * الحصول على اسم الحساب للعرض
 */
function getAccountDisplayName(accountCode) {
  if (!accountCode) return '';

  // محاولة الحصول على الاسم من الشيت
  try {
    var account = getAccountByCode(accountCode);
    if (account && account.name) {
      return account.name + ' (' + accountCode + ')';
    }
  } catch (e) {
    // تجاهل الخطأ
  }

  // إذا لم نجد، نرجع الكود
  return accountCode;
}

/**
 * ⭐ إرسال نموذج المراجعة مع الأزرار
 */
function sendPreviewWithButtons(chatId, transactions, user) {
  // ⭐ تصحيح البنود من قاعدة البيانات قبل العرض
  for (var vi = 0; vi < transactions.length; vi++) {
    var t = transactions[vi];
    // تحويل النوع القديم للطبيعة الجديدة لضمان المطابقة الصحيحة
    var nature = t.nature || '';
    if (!nature && t.type) {
      nature = mapOldTypeToNature(t.type) || t.type;
    }
    // استخراج حسابات من جهة الاتصال إذا لم تكن موجودة
    var resolveFrom = t.fromAccount || t.from_account || '';
    var resolveTo = t.toAccount || t.to_account || '';
    if (nature === 'تحويل' && !resolveTo && t.contact) {
      var contactInfo = CONTACTS[t.contact];
      if (contactInfo && contactInfo.account) {
        resolveTo = contactInfo.account;
        if (!resolveFrom) resolveFrom = 'MAIN';
      }
    }
    var resolved = resolveTransactionItem(
      nature,
      t.category || '',
      t.item || '',
      resolveFrom,
      resolveTo
    );
    transactions[vi].category = resolved.category;
    transactions[vi].item = resolved.item;
  }

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

  // ⭐ تحديث اسم المستخدم إذا كان فارغاً في الشيت
  if (!user.name && userName) {
    Logger.log('📝 Updating empty user name with: ' + userName);
    updateUserName(userId, userName);
    user.name = userName;
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
      sendReportWithPdfOption(chatId, generateUnifiedReport(), 'تقرير_شهري');
      break;

    case '/statement':
    case '/كشف':
      sendStatementAccountMenu(chatId);
      break;

    case '/wife':
      sendReportWithPdfOption(chatId, generateAccountStatement('WIFE'), 'كشف_حساب_الزوجة');
      break;

    case '/siblings':
      sendMessage(chatId, generateSiblingsReport());
      break;

    case '/gold':
      sendReportWithPdfOption(chatId, generateGoldReport(), 'تقرير_الذهب');
      break;

    case '/custody':
    case '/عهدة':
      sendCustodyMenu(chatId);
      break;

    case '/sara':
      sendReportWithPdfOption(chatId, generateAccountStatement('SARA'), 'كشف_حساب_سارة');
      break;

    case '/mostafa':
    case '/مصطفى':
      sendReportWithPdfOption(chatId, generateAccountStatement('MOSTAFA'), 'كشف_حساب_مصطفى');
      break;

    case '/associations':
    case '/assoc':
      sendReportWithPdfOption(chatId, generateAssociationsReport(), 'تقرير_الجمعيات');
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

    case '/امثلة':
    case '/examples':
    case '/نماذج':
      // عرض جميع النماذج التوضيحية
      sendExamples(chatId, 'all');
      break;

    case '/امثلة_مصروف':
      sendExamples(chatId, 'expense');
      break;

    case '/امثلة_دخل':
      sendExamples(chatId, 'income');
      break;

    case '/امثلة_تحويل':
      sendExamples(chatId, 'transfer');
      break;

    case '/امثلة_مركب':
      sendExamples(chatId, 'compound');
      break;

    case '/امثلة_عهدة':
      sendExamples(chatId, 'custody');
      break;

    case '/امثلة_جمعية':
      sendExamples(chatId, 'association');
      break;

    case '/backup':
      // عرض حالة النسخ الاحتياطي
      sendMessage(chatId, getBackupStatus());
      break;

    default:
      sendMessage(chatId, '❓ أمر غير معروف.\n\n/help للمساعدة\n/امثلة لرؤية النماذج');
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
 * إرسال تقرير العهدة - يستخدم كشف الحساب التفصيلي
 */
function sendCustodyReport(chatId, custodian) {
  Logger.log('=== sendCustodyReport ===');
  Logger.log('Requesting report for: ' + custodian);

  try {
    // تحويل اسم الأمين إلى كود الحساب
    var nameToAccount = {
      'سارة': 'SARA', 'ساره': 'SARA',
      'مصطفى': 'MOSTAFA', 'مصطفي': 'MOSTAFA',
      'ام سيليا': 'WIFE', 'مراتي': 'WIFE', 'الزوجة': 'WIFE',
      'هاجر': 'HAGAR', 'محمد': 'MOHAMED'
    };

    var accountCode = nameToAccount[custodian] || custodian;
    var pdfTitle = 'كشف_حساب_' + custodian;
    var report = generateAccountStatement(accountCode);
    sendReportWithPdfOption(chatId, report, pdfTitle);
  } catch (error) {
    Logger.log('Error in sendCustodyReport: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في تقرير العهدة: ' + error.message);
  }
}

/**
 * ⭐⭐⭐ معالجة العهدة مباشرة - بدون Gemini ⭐⭐⭐
 * تستخرج المبلغ والجهة وسعر الصرف من النص مباشرة
 * يدعم: "حولت لسارة 500 ريال ما يعادل 6000 جنيه عهدة"
 */
function processCustodyDirectly(chatId, text, user) {
  Logger.log('=== processCustodyDirectly START ===');
  Logger.log('Text: ' + text);
  Logger.log('User: ' + (user ? JSON.stringify(user) : 'NULL'));

  // التحقق من المدخلات
  if (!chatId) {
    Logger.log('ERROR: chatId is missing');
    return;
  }

  if (!user) {
    Logger.log('ERROR: user is missing');
    sendMessage(chatId, '❌ خطأ: بيانات المستخدم غير موجودة');
    return;
  }

  try {
    // تحويل الأرقام العربية والهندية إلى إنجليزية
    var arabicNums = {
      '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
      '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
    };
    var normalizedText = text;
    for (var ar in arabicNums) {
      normalizedText = normalizedText.replace(new RegExp(ar, 'g'), arabicNums[ar]);
    }
    Logger.log('Normalized text: ' + normalizedText);

    // تحديد أمين العهدة (سارة أو مصطفى أو ام سيليا)
    var custodian = 'سارة'; // افتراضي
    if (/مصطف[يى]|مصطفا/i.test(text)) {
      custodian = 'مصطفى';
    } else if (/ام\s*سيل|أم\s*سيل|مرات[يه]|زوجت[يه]/i.test(text)) {
      custodian = 'ام سيليا';
    } else if (/سار[ةه]|ساره/i.test(text)) {
      custodian = 'سارة';
    }
    Logger.log('Custodian: ' + custodian);

    // ⭐ تحديد نوع العملية: إيداع أو صرف
    var isDisburse = /صرف|دفع[ت]?\s*(?:من|جمعي)|أعط[يت]|اعط[يت]|من\s*العهد[هة]/i.test(text);
    var transactionType = isDisburse ? 'صرف_من_عهدة' : 'إيداع_عهدة';
    Logger.log('Transaction type: ' + transactionType + ' (isDisburse: ' + isDisburse + ')');

    // ⭐ استخراج المستفيد من الصرف (لمن صُرف المبلغ)
    var recipient = '';
    // البحث عن "لـ" متبوعة باسم شخص
    var recipientMatch = text.match(/(?:صرف|دفع|اعط[يت]|أعط[يت])\s*(?:ل|الي|إلي|الى|إلى)\s*(مرات[يه]|زوجت[يه]|ام\s*سيل[اي]|أم\s*سيل[اي]|سار[ةه]|مصطف[يى]|نفس[هو])/i);
    if (recipientMatch) {
      var recipientRaw = recipientMatch[1].trim();
      // تحويل الاسم المستخرج لاسم موحد
      if (/مرات[يه]|زوجت[يه]|ام\s*سيل|أم\s*سيل/i.test(recipientRaw)) {
        recipient = 'ام سيليا';
      } else if (/سار[ةه]/i.test(recipientRaw)) {
        recipient = 'سارة';
      } else if (/مصطف[يى]/i.test(recipientRaw)) {
        recipient = 'مصطفى';
      } else if (/نفس[هو]/i.test(recipientRaw)) {
        recipient = 'نفسه'; // صرف لنفسه
      }
    }
    Logger.log('Recipient: ' + (recipient || 'none'));

    // استخراج المبالغ والعملات
    var amount = 0;
    var currency = 'جنيه';
    var amountReceived = null;
    var currencyReceived = 'جنيه';
    var exchangeRate = null;

    // نمط 1: "X ريال [كلمات اختيارية] ما يعادل Y"
    // يدعم: "1000 ريال ما يعادل 12000" أو "1000 ريال عهده ما يعادل 12000"
    var exchangePattern = /(\d+)\s*(?:ريال|سعودي)(?:\s+\S+)*\s*(?:ما\s*)?يعادل\s*(\d+)/i;
    var exchangeMatch = normalizedText.match(exchangePattern);

    // نمط 2: لو لم يتطابق، نجرب البحث عن الرقم قبل "ريال" والرقم بعد "يعادل" بشكل منفصل
    if (!exchangeMatch) {
      var riyalMatch = normalizedText.match(/(\d+)\s*(?:ريال|سعودي)/i);
      var equivalentMatch = normalizedText.match(/(?:ما\s*)?يعادل\s*(\d+)/i);

      if (riyalMatch && equivalentMatch) {
        exchangeMatch = [null, riyalMatch[1], equivalentMatch[1]];
        Logger.log('Pattern 1b matched (separate): ' + riyalMatch[1] + ' ريال = ' + equivalentMatch[1]);
      }
    }

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
      // نمط 3: "X جنيه" أو "X ريال" (بدون سعر صرف)
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
      Logger.log('Pattern 3 - Amount: ' + amount + ' ' + currency);
    }

    // التحقق من وجود مبلغ
    if (!amount || amount <= 0) {
      Logger.log('ERROR: No amount found in text: ' + normalizedText);
      Logger.log('All numbers found: ' + JSON.stringify(normalizedText.match(/\d+/g)));
      sendMessage(chatId, '❌ لم أجد مبلغ في الرسالة.\n\nجرب:\n• حولت لسارة 5000 عهدة\n• حولت لسارة 500 ريال ما يعادل 6000 جنيه عهدة\n• عملت ايداع عهده لسارة 1000 ريال');
      return;
    }

    Logger.log('Final extraction - Amount: ' + amount + ', Currency: ' + currency + ', AmountReceived: ' + amountReceived + ', Rate: ' + exchangeRate);

    // إنشاء بيانات المعاملة - تُحفظ في شيت الحركات الرئيسي
    // ⭐ الوصف يشمل صاحب العهدة + المستفيد (إن وجد)
    var description;
    if (transactionType === 'صرف_من_عهدة') {
      description = 'صرف من عهدة ' + custodian;
      // إضافة المستفيد للوصف إذا كان مختلفاً عن صاحب العهدة
      if (recipient && recipient !== 'نفسه' && recipient !== custodian) {
        description += ' لـ ' + recipient;
      }
    } else {
      description = 'إيداع عهدة لـ ' + custodian;
    }

    var transData = {
      type: transactionType,
      amount: amount,
      currency: currency,
      category: 'عهدة ' + custodian,
      contact: custodian,
      contact_name: custodian,
      description: description,
      amount_received: amountReceived,
      currency_received: amountReceived ? currencyReceived : '',
      exchange_rate: exchangeRate,
      user_name: user.name,
      telegram_id: user.telegram_id
    };
    Logger.log('Transaction data: ' + JSON.stringify(transData));

    // ⭐ إرسال نموذج المراجعة (نفس المصروفات العادية)
    Logger.log('Sending preview with buttons...');
    try {
      sendPreviewWithButtons(chatId, [transData], user);
      Logger.log('Preview sent successfully');
    } catch (previewError) {
      Logger.log('Preview error: ' + previewError.toString());
      // Fallback: إرسال رسالة تأكيد بسيطة
      var confirmMsg = '📋 *تأكيد العهدة:*\n\n';
      confirmMsg += '💼 أمين العهدة: ' + custodian + '\n';
      confirmMsg += '💰 المبلغ: ' + amount + ' ' + currency + '\n';
      if (amountReceived) {
        confirmMsg += '📥 المستلم: ' + amountReceived + ' جنيه\n';
        confirmMsg += '📊 سعر الصرف: ' + exchangeRate + '\n';
      }
      confirmMsg += '\n⚠️ لم أستطع عرض أزرار التأكيد. أعد إرسال الرسالة.';
      sendMessage(chatId, confirmMsg);
    }

  } catch (error) {
    Logger.log('EXCEPTION in processCustodyDirectly: ' + error.toString());
    Logger.log('Stack: ' + (error.stack || 'no stack'));
    sendMessage(chatId, '❌ خطأ في معالجة العهدة:\n' + error.message + '\n\nجرب كتابة الرسالة بشكل أبسط.');
  }

  Logger.log('=== processCustodyDirectly END ===');
}

/**
 * ⭐⭐⭐ معالجة ذكية للعهدة ⭐⭐⭐
 * يفهم أنماط مثل:
 * - "من مصطفي الي ساره 4000" = تحويل بين العهدات
 * - "من مصطفي الي نفسه 3000" = صرف من العهدة
 * - "من سارة قسط جمعية 1000" = دفع جمعية من العهدة
 * - "من سارة شراء ذهب 5000" = شراء ذهب من العهدة
 */
function processSmartCustodyTransfer(chatId, text, user) {
  Logger.log('=== processSmartCustodyTransfer START ===');
  Logger.log('Text: ' + text);

  try {
    // تحويل الأرقام العربية
    var arabicNums = {
      '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
      '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
    };
    var normalizedText = text;
    for (var ar in arabicNums) {
      normalizedText = normalizedText.replace(new RegExp(ar, 'g'), arabicNums[ar]);
    }

    // ⭐ استخراج المصدر (من أي عهدة)
    var sourceMatch = normalizedText.match(/من\s*(مصطف[يى]|سار[ةه]|مرات[يه]|زوجت[يه]|ام\s*سيل[اي]|أم\s*سيل[اي])(?:\s+(?:اخت[يه]|اخو[يه]ا?|ابي))?/i);
    if (!sourceMatch) {
      sendMessage(chatId, '❌ لم أفهم مصدر التحويل.\n\nجرب: "من مصطفي الي ساره 4000 جنيه"');
      return;
    }

    var sourceRaw = sourceMatch[1];
    var sourceCustodian = 'سارة'; // افتراضي
    if (/مصطف[يى]/i.test(sourceRaw)) {
      sourceCustodian = 'مصطفى';
    } else if (/مرات[يه]|زوجت[يه]|ام\s*سيل|أم\s*سيل/i.test(sourceRaw)) {
      sourceCustodian = 'ام سيليا';
    } else if (/سار[ةه]/i.test(sourceRaw)) {
      sourceCustodian = 'سارة';
    }
    Logger.log('Source custodian: ' + sourceCustodian);

    // ⭐ استخراج الوجهة (إلى أين)
    var destMatch = normalizedText.match(/(?:الي|إلي|الى|إلى|ل)\s*(مصطف[يى]|سار[ةه]|مرات[يه]|زوجت[يه]|ام\s*سيل[اي]|أم\s*سيل[اي]|نفس[هوا])(?:\s+(?:اخت[يه]|اخو[يه]ا?|ابي))?/i);

    var destCustodian = null;
    var isToSelf = false;
    var isToAssociation = /جمعي[ةه]|قسط/i.test(normalizedText);
    var isToGold = /ذهب|دهب/i.test(normalizedText);

    if (destMatch) {
      var destRaw = destMatch[1];
      if (/نفس[هوا]/i.test(destRaw)) {
        isToSelf = true;
      } else if (/مصطف[يى]/i.test(destRaw)) {
        destCustodian = 'مصطفى';
      } else if (/مرات[يه]|زوجت[يه]|ام\s*سيل|أم\s*سيل/i.test(destRaw)) {
        destCustodian = 'ام سيليا';
      } else if (/سار[ةه]/i.test(destRaw)) {
        destCustodian = 'سارة';
      }
    }
    Logger.log('Destination: ' + (destCustodian || (isToSelf ? 'self' : (isToAssociation ? 'association' : (isToGold ? 'gold' : 'unknown')))));

    // ⭐ استخراج المبلغ
    var amountMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:جني[هة]|ريال|الف|ألف)?/i);
    if (!amountMatch) {
      sendMessage(chatId, '❌ لم أجد مبلغ في الرسالة.');
      return;
    }
    var amount = parseFloat(amountMatch[1]);
    var currency = /ريال/i.test(normalizedText) ? 'ريال' : 'جنيه';

    Logger.log('Amount: ' + amount + ' ' + currency);

    // ⭐ تحديد نوع المعاملة وبناء البيانات
    var transactions = [];

    // ⭐ قاموس ربط أسماء أمناء العهد بأكواد الحسابات
    var custodianAccountMap = {
      'مصطفى': 'MOSTAFA', 'مصطفي': 'MOSTAFA',
      'سارة': 'SARA', 'ساره': 'SARA',
      'ام سيليا': 'WIFE', 'أم سيليا': 'WIFE', 'مراتي': 'WIFE', 'زوجتي': 'WIFE',
      'هاجر': 'HAGAR', 'محمد': 'MOHAMED'
    };

    if (destCustodian && destCustodian !== sourceCustodian) {
      // ⭐ تحويل من عهدة لعهدة (معاملة واحدة فقط - قيد مزدوج)
      var sourceAccount = custodianAccountMap[sourceCustodian] || sourceCustodian;
      var destAccount = custodianAccountMap[destCustodian] || destCustodian;

      transactions.push({
        nature: 'تحويل',
        type: 'تحويل',
        category: 'عهدة',
        item: 'تحويل بين عهد',
        amount: amount,
        currency: currency,
        fromAccount: sourceAccount,
        from_account: sourceAccount,
        toAccount: destAccount,
        to_account: destAccount,
        description: 'تحويل من عهدة ' + sourceCustodian + ' إلى عهدة ' + destCustodian,
        user_name: user.name,
        telegram_id: user.telegram_id
      });
    } else if (isToSelf) {
      // ⭐ صرف من العهدة لنفسه (مصروف)
      transactions.push({
        type: 'صرف_من_عهدة',
        amount: amount,
        currency: currency,
        category: 'مصروف شخصي',
        contact: sourceCustodian,
        contact_name: sourceCustodian,
        description: 'صرف من عهدة ' + sourceCustodian + ' لنفسه',
        user_name: user.name,
        telegram_id: user.telegram_id
      });
    } else if (isToAssociation) {
      // ⭐ دفع قسط جمعية من العهدة
      transactions.push({
        type: 'صرف_من_عهدة',
        amount: amount,
        currency: currency,
        category: 'جمعية',
        contact: sourceCustodian,
        contact_name: sourceCustodian,
        description: 'دفع قسط جمعية من عهدة ' + sourceCustodian,
        user_name: user.name,
        telegram_id: user.telegram_id
      });
    } else if (isToGold) {
      // ⭐ شراء ذهب من العهدة
      transactions.push({
        type: 'صرف_من_عهدة',
        amount: amount,
        currency: currency,
        category: 'ذهب',
        contact: sourceCustodian,
        contact_name: sourceCustodian,
        description: 'شراء ذهب من عهدة ' + sourceCustodian,
        user_name: user.name,
        telegram_id: user.telegram_id
      });
    } else {
      // ⭐ صرف عام من العهدة
      transactions.push({
        type: 'صرف_من_عهدة',
        amount: amount,
        currency: currency,
        category: 'مصروفات',
        contact: sourceCustodian,
        contact_name: sourceCustodian,
        description: 'صرف من عهدة ' + sourceCustodian,
        user_name: user.name,
        telegram_id: user.telegram_id
      });
    }

    // ⭐ إرسال المعاينة
    sendPreviewWithButtons(chatId, transactions, user);

  } catch (error) {
    Logger.log('EXCEPTION in processSmartCustodyTransfer: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في معالجة العملية:\n' + error.message);
  }

  Logger.log('=== processSmartCustodyTransfer END ===');
}

/**
 * ⭐ معالجة رسائل الجمعيات مباشرة
 * مثال: "دخلت في جمعية من اول شهر 2 وتستمر لمدة 10 اشهر هقبض القسط الرابع بمبلغ 1000"
 */
function processAssociationDirectly(chatId, text, user) {
  Logger.log('=== processAssociationDirectly START ===');
  Logger.log('Text: ' + text);

  try {
    // استخدام دالة parseAssociationMessage من SheetsManager
    var parsedAssoc = parseAssociationMessage(text);

    // التحقق أن الدالة أرجعت نتيجة
    if (!parsedAssoc) {
      sendMessage(chatId, buildErrorWithExamples(text, 'association'));
      return;
    }

    Logger.log('Parsed association: ' + JSON.stringify(parsedAssoc));

    // التحقق من البيانات المطلوبة والسؤال عن الناقص
    var missingFields = [];
    if (!parsedAssoc.name) missingFields.push('اسم الجمعية');
    if (!parsedAssoc.installment || parsedAssoc.installment <= 0) missingFields.push('قيمة القسط');
    if (!parsedAssoc.duration || parsedAssoc.duration <= 0) missingFields.push('مدة الجمعية');
    if (!parsedAssoc.collectionOrder || parsedAssoc.collectionOrder <= 0) missingFields.push('ترتيب القبض');

    if (missingFields.length > 0) {
      var helpMsg = '⚠️ بيانات ناقصة:\n';
      helpMsg += missingFields.map(function(f) { return '• ' + f; }).join('\n');
      helpMsg += '\n\n📝 مثال صحيح:\n';
      helpMsg += '"دخلت جمعية من شهر 2 لمدة 10 اشهر هقبض الرابع بمبلغ 1000"';
      sendMessage(chatId, helpMsg);
      return;
    }

    // حساب تاريخ القبض المتوقع
    var currentYear = new Date().getFullYear();
    var collectionMonth = parsedAssoc.startMonth + parsedAssoc.collectionOrder - 1;
    var collectionYear = currentYear;
    if (collectionMonth > 12) {
      collectionMonth -= 12;
      collectionYear++;
    }

    // حساب المبلغ الإجمالي
    var totalAmount = parsedAssoc.installment * parsedAssoc.duration;

    // تحديد الشخص المسؤول
    var responsiblePerson = parsedAssoc.responsible || user.name;
    var responsibleAccount = parsedAssoc.account || 'MAIN';

    // استخدام السنة من البيانات المحللة
    var startYear = parsedAssoc.startYear || currentYear;

    // بناء رسالة المعاينة
    var previewMsg = '🤝 *جمعية جديدة*\n';
    previewMsg += '═══════════════════\n\n';
    if (parsedAssoc.name) {
      previewMsg += '📋 الاسم: ' + escapeMarkdown(parsedAssoc.name) + '\n';
    }
    if (responsiblePerson) {
      previewMsg += '👤 المسؤول: ' + escapeMarkdown(responsiblePerson) + '\n';
    }
    previewMsg += '💰 قيمة القسط: ' + formatNumber(parsedAssoc.installment) + ' ' + (parsedAssoc.currency === 'SAR' ? 'ريال' : 'جنيه') + '\n';
    previewMsg += '📅 شهر البداية: ' + parsedAssoc.startMonth + '/' + startYear + '\n';
    previewMsg += '🔢 المدة: ' + parsedAssoc.duration + ' شهر\n';
    previewMsg += '🎯 ترتيب القبض: ' + parsedAssoc.collectionOrder + '\n';
    previewMsg += '📆 تاريخ القبض المتوقع: ' + collectionMonth + '/' + collectionYear + '\n';
    previewMsg += '💵 إجمالي القبض: ' + formatNumber(totalAmount) + ' ' + (parsedAssoc.currency === 'SAR' ? 'ريال' : 'جنيه') + '\n\n';
    previewMsg += '═══════════════════';

    // إنشاء أزرار التأكيد والإلغاء
    var assocDataStr = JSON.stringify({
      type: 'association',
      name: parsedAssoc.name,
      responsible: responsiblePerson,
      account: responsibleAccount,
      installment: parsedAssoc.installment,
      currency: parsedAssoc.currency,
      duration: parsedAssoc.duration,
      totalCollection: totalAmount,
      startMonth: parsedAssoc.startMonth,
      startYear: startYear,
      collectionOrder: parsedAssoc.collectionOrder,
      user_name: user.name,
      telegram_id: user.telegram_id
    });

    // حفظ البيانات في Cache
    var cacheKey = 'assoc_' + chatId;
    CacheService.getScriptCache().put(cacheKey, assocDataStr, 300); // 5 دقائق

    var keyboard = {
      inline_keyboard: [
        [
          { text: '✅ تأكيد', callback_data: 'confirm_assoc_' + cacheKey },
          { text: '❌ إلغاء', callback_data: 'cancel_' + cacheKey }
        ]
      ]
    };

    sendMessage(chatId, previewMsg, keyboard);

  } catch (error) {
    Logger.log('EXCEPTION in processAssociationDirectly: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في معالجة الجمعية:\n' + error.message);
  }

  Logger.log('=== processAssociationDirectly END ===');
}

/**
 * ⭐⭐⭐ معالجة التحويل المركب ⭐⭐⭐
 * مثال: "حولت لمصطفي 300 ريال ما يعادل 9000 جنيه منهم 4000 لمراتي و 4000 مصطفي و 1000 تفضل مع مصطفي في العهده"
 */
function processCompoundTransferDirectly(chatId, text, user) {
  Logger.log('=== processCompoundTransferDirectly START ===');
  Logger.log('Text: ' + text);

  try {
    // استخدام دالة parseCompoundTransactionLocally من GeminiAI
    var parsedCompound = parseCompoundTransactionLocally(text);

    if (!parsedCompound || !parsedCompound.success || !parsedCompound.transactions || parsedCompound.transactions.length === 0) {
      sendMessage(chatId, buildErrorWithExamples(text, 'compound'));
      return;
    }

    Logger.log('Parsed compound: ' + JSON.stringify(parsedCompound));

    // إضافة معلومات المستخدم لكل معاملة
    for (var j = 0; j < parsedCompound.transactions.length; j++) {
      parsedCompound.transactions[j].user_name = user.name;
      parsedCompound.transactions[j].telegram_id = user.telegram_id;
    }

    // استخدام نظام المعاينة الموحد
    sendPreviewWithButtons(chatId, parsedCompound.transactions, user);

  } catch (error) {
    Logger.log('EXCEPTION in processCompoundTransferDirectly: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في معالجة التحويل المركب:\n' + error.message);
  }

  Logger.log('=== processCompoundTransferDirectly END ===');
}

/**
 * معالجة الرسائل بالذكاء الاصطناعي
 */
function processUserMessage(chatId, text, user) {
  Logger.log('🤖 معالجة: ' + text);
  Logger.log('🔍 Text bytes: ' + encodeURIComponent(text));

  sendChatAction(chatId, 'typing');

  try {
    // ⭐⭐⭐ فحص كلمة العهدة أولاً - معالجة مباشرة بدون Gemini ⭐⭐⭐

    // تنظيف النص من الأحرف الخفية (zero-width characters)
    var cleanText = text.replace(/[\u200B-\u200D\u200E\u200F\uFEFF\u00A0]/g, '');

    // توحيد الأحرف العربية المتشابهة للبحث
    var normalizedForSearch = cleanText
      .replace(/[ةه]/g, 'ه')   // توحيد التاء المربوطة والهاء
      .replace(/[يى]/g, 'ي')   // توحيد الياء
      .replace(/[أإآا]/g, 'ا'); // توحيد الألف

    Logger.log('Clean text: ' + cleanText);
    Logger.log('Normalized for search: ' + normalizedForSearch);

    // ⭐⭐⭐ فحص التحويل المركب أولاً (قبل العهدة العادية) ⭐⭐⭐
    // التحويل المركب: تحويل + عملة + يعادل + توزيع
    // يشمل أنماط: "منهم", "يعطي", "وياخد", "الباقي عهده"
    var hasCompoundKeyword = false;

    // شرط 1: يوجد تحويل وعملة وسعر صرف
    var hasTransfer = /حولت|تحويل|ارسلت|بعثت/.test(normalizedForSearch);
    var hasCurrency = /ريال|سعودي/.test(normalizedForSearch);
    var hasExchange = /يعادل|معادل/.test(normalizedForSearch);

    // شرط 2: يوجد توزيع (أي من هذه الكلمات)
    var hasDistribution = (
      /منهم|منها/.test(normalizedForSearch) ||
      /يعطي|تعطي|اعطي|هيدي|يدي/.test(normalizedForSearch) ||
      /ياخد|ياخذ|وياخد|وياخذ|ياخده|لنفسه/.test(normalizedForSearch) ||
      /يحول|يوصل|يبعت/.test(normalizedForSearch) ||
      /الباقي|المتبقي|يتبقي|يفضل|تفضل/.test(normalizedForSearch)
    );

    // ⭐ المسار الأصلي: حولت + ريال + يعادل + توزيع
    var originalCompound = hasTransfer && hasCurrency && hasExchange && hasDistribution;

    // ⭐ مسار جديد: "من شخص الي شخص" + توزيع (بدون اشتراط ريال/يعادل)
    // يدعم: "من مصطفي الي مراتي" و "من مصطفي لمراتي" (ل ملتصقة)
    var hasFromTo = /من\s+\S+\s+(?:الي|الى|إلى|ل|لـ)\s+\S+/i.test(normalizedForSearch) ||
                    /من\s+\S+\s+ل\S+/i.test(normalizedForSearch);
    var newCompound = hasFromTo && hasDistribution;

    hasCompoundKeyword = originalCompound || newCompound;

    Logger.log('Detection: hasTransfer=' + hasTransfer + ', hasCurrency=' + hasCurrency +
               ', hasExchange=' + hasExchange + ', hasDistribution=' + hasDistribution +
               ', hasFromTo=' + hasFromTo);
    Logger.log('Has compound keyword: ' + hasCompoundKeyword + ' (original=' + originalCompound + ', new=' + newCompound + ')');

    if (hasCompoundKeyword) {
      Logger.log('*** COMPOUND TRANSFER DETECTED - Processing directly ***');
      try {
        processCompoundTransferDirectly(chatId, cleanText, user);
      } catch (compoundError) {
        Logger.log('❌ Error in processCompoundTransferDirectly: ' + compoundError.toString());
        sendMessage(chatId, '❌ خطأ في معالجة التحويل المركب: ' + compoundError.message);
      }
      return;
    }

    // ⭐⭐⭐ نمط ذكي: "من [أمين عهدة] إلى [شخص/نفسه/جمعية/ذهب]" ⭐⭐⭐
    var smartCustodyPattern = /من\s*(مصطف[يى]|سار[ةه]|مرات[يه]|زوجت[يه]|ام\s*سيل[اي]|أم\s*سيل[اي]|اخت[يه]|اخو[يه]ا?)(?:\s+اخت[يه]|\s+اخو[يه]ا?)?/i.test(cleanText);

    if (smartCustodyPattern) {
      // ⭐⭐⭐ فحص إذا كانت رسالة مركبة (تحويل + مصروفات فرعية) ⭐⭐⭐
      var hasSubExpenses = (
        /دفع[ت]?\s/i.test(normalizedForSearch) ||
        /صرف[ت]?\s/i.test(normalizedForSearch) ||
        /جمعي[ةه]/i.test(normalizedForSearch) ||
        /منهم|منها/i.test(normalizedForSearch) ||
        /والباقي|المتبقي/i.test(normalizedForSearch)
      );

      if (hasSubExpenses) {
        Logger.log('*** SMART CUSTODY + COMPOUND DETECTED - Using local compound parser ***');
        try {
          var compoundResult = parseCompoundTransactionLocally(cleanText);
          if (compoundResult && compoundResult.success && compoundResult.transactions && compoundResult.transactions.length > 0) {
            // إضافة معلومات المستخدم لكل معاملة
            for (var ci = 0; ci < compoundResult.transactions.length; ci++) {
              compoundResult.transactions[ci].user_name = user.name;
              compoundResult.transactions[ci].telegram_id = user.telegram_id;
            }
            sendPreviewWithButtons(chatId, compoundResult.transactions, user);
            return;
          }
          // إذا فشل التحليل المركب، نكمل للتحويل البسيط
          Logger.log('Compound parsing failed, falling back to simple smart custody');
        } catch (compoundSmartError) {
          Logger.log('❌ Error in compound smart custody: ' + compoundSmartError.toString());
        }
      }

      Logger.log('*** SMART CUSTODY PATTERN DETECTED ***');
      try {
        processSmartCustodyTransfer(chatId, cleanText, user);
      } catch (smartError) {
        Logger.log('❌ Error in processSmartCustodyTransfer: ' + smartError.toString());
        // Fallback to Gemini if smart processing fails
      }
      return;
    }

    // البحث عن كلمة العهدة بأشكالها المختلفة
    // ⭐ أيضاً: تحويل لأمين عهدة (سارة/مصطفى/مراتي) + ريال يعادل جنيه = عهدة تلقائياً
    var hasOhdaKeyword = (
      normalizedForSearch.indexOf('عهده') !== -1 ||
      normalizedForSearch.indexOf('العهده') !== -1 ||
      /عهد[ةه]/i.test(cleanText) ||
      /ايداع/i.test(cleanText) && /سار[ةه]|مصطف[يى]/i.test(cleanText)
    );

    // ⭐ نمط جديد: "حولت لـ [أمين عهدة] X ريال ما يعادل Y" بدون كلمة عهدة
    // هذا يعني تحويل عهدة تلقائياً
    var isCustodyTransfer = (
      /حول[ت]?\s*(?:ل|الي|إلي)\s*(?:سار[ةه]|مصطف[يى]|مرات[يه]|زوجت[يه]|ام\s*سيل|أم\s*سيل)/i.test(cleanText) &&
      /ريال|سعودي/i.test(cleanText) &&
      /يعادل|يساو[يى]/i.test(cleanText)
    );

    if (isCustodyTransfer && !hasOhdaKeyword) {
      Logger.log('*** CUSTODY TRANSFER PATTERN DETECTED (no explicit عهدة keyword) ***');
      hasOhdaKeyword = true;
    }

    Logger.log('Checking for custody keyword');
    Logger.log('Has custody keyword: ' + hasOhdaKeyword);

    if (hasOhdaKeyword) {
      Logger.log('*** CUSTODY KEYWORD DETECTED - Processing directly ***');
      try {
        processCustodyDirectly(chatId, cleanText, user);
      } catch (custodyError) {
        Logger.log('❌ Error in processCustodyDirectly: ' + custodyError.toString());
        sendMessage(chatId, '❌ خطأ في معالجة العهدة: ' + custodyError.message);
      }
      return;
    }

    // ⭐⭐⭐ فحص كلمة الجمعية - معالجة مباشرة ⭐⭐⭐
    var hasAssociationKeyword = (
      normalizedForSearch.indexOf('جمعيه') !== -1 ||
      normalizedForSearch.indexOf('جمعية') !== -1 ||
      /دخلت.*جمعي[ةه]/i.test(cleanText) ||
      /جمعي[ةه].*شهر/i.test(cleanText)
    );

    Logger.log('Has association keyword: ' + hasAssociationKeyword);

    if (hasAssociationKeyword) {
      Logger.log('*** ASSOCIATION KEYWORD DETECTED - Processing directly ***');
      try {
        processAssociationDirectly(chatId, cleanText, user);
      } catch (assocError) {
        Logger.log('❌ Error in processAssociationDirectly: ' + assocError.toString());
        sendMessage(chatId, '❌ خطأ في معالجة الجمعية: ' + assocError.message);
      }
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
      // استخدام النماذج التوضيحية المناسبة
      var errorMsg = message || buildErrorWithExamples(text);
      sendMessage(chatId, errorMsg);
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
          nature: trans.طبيعة || trans.nature || '',
          amount: trans.مبلغ || trans.amount,
          currency: currency,
          category: trans.تصنيف || trans.category,
          item: trans.بند || trans.item || '',
          contact: trans.جهة || trans.contact,
          contact_name: trans.اسم_الجهة || trans.contact_name,
          description: trans.وصف || trans.description,
          fromAccount: trans.من_حساب || trans.fromAccount || trans.from_account || '',
          toAccount: trans.إلى_حساب || trans.toAccount || trans.to_account || '',
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
      sendMessage(chatId, buildErrorWithExamples(text));
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
    '*🔄 التحويل المركب:*\n' +
    '• حولت لمصطفي 300 ريال يعني 9000 منهم 4000 لمراتي و4000 مصطفي والباقي عهدة\n\n' +
    '*💼 العهدة:*\n' +
    '• حولت لسارة 10000 عهدة\n' +
    '• صرفت 500 جمعية من العهدة\n\n' +
    '*🤝 الجمعية:*\n' +
    '• دخلت جمعية 1000 لمدة 10 شهور هقبض الرابع\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    '*📚 الأوامر:*\n' +
    '/امثلة - كل النماذج التوضيحية\n' +
    '/report - قائمة التقارير\n' +
    '/monthly - التقرير الشامل\n' +
    '/custody - تقارير العهد\n' +
    '/statement - كشف حساب تفصيلي\n' +
    '/balance - الأرصدة\n' +
    '/gold - تقرير الذهب\n' +
    '/associations - تقرير الجمعيات\n' +
    '/backup - حالة النسخ الاحتياطي';

  sendMessage(chatId, msg);
}

/**
 * قائمة التقارير الجديدة
 */
function sendReportMenu(chatId) {
  var keyboard = {
    inline_keyboard: [
      [
        { text: '📊 التقرير الشامل', callback_data: 'rpt_monthly' }
      ],
      [
        { text: '📋 كشف حساب', callback_data: 'rpt_statement' },
        { text: '💰 الأرصدة', callback_data: 'cmd_balance' }
      ],
      [
        { text: '🔄 الجمعيات', callback_data: 'rpt_assoc' },
        { text: '💍 الذهب', callback_data: 'rpt_gold' }
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
 * إرسال تقرير مع زر تصدير PDF
 */
function sendReportWithPdfOption(chatId, reportText, pdfTitle) {
  try {
    // إرسال التقرير كرسالة نصية
    var keyboard = {
      inline_keyboard: [
        [
          { text: '📄 تحميل PDF', callback_data: 'pdf_' + pdfTitle }
        ]
      ]
    };

    // إذا كان النص طويل جدا، تقسيمه
    if (reportText.length > 4000) {
      var parts = splitLongMessage(reportText);
      for (var i = 0; i < parts.length - 1; i++) {
        sendMessage(chatId, parts[i]);
      }
      // الجزء الأخير مع زر PDF
      sendMessage(chatId, parts[parts.length - 1], keyboard);
    } else {
      sendMessage(chatId, reportText, keyboard);
    }
  } catch (error) {
    Logger.log('sendReportWithPdfOption error: ' + error.toString());
    sendMessage(chatId, reportText);
  }
}

/**
 * تقسيم رسالة طويلة
 */
function splitLongMessage(text) {
  var maxLen = 4000;
  var parts = [];
  var lines = text.split('\n');
  var current = '';

  for (var i = 0; i < lines.length; i++) {
    if ((current + '\n' + lines[i]).length > maxLen && current.length > 0) {
      parts.push(current);
      current = lines[i];
    } else {
      current = current ? (current + '\n' + lines[i]) : lines[i];
    }
  }
  if (current.length > 0) {
    parts.push(current);
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * قائمة اختيار الحساب لكشف الحساب
 */
function sendStatementAccountMenu(chatId) {
  var keyboard = {
    inline_keyboard: [
      [
        { text: '🏦 الخزنة الرئيسية', callback_data: 'stmt_MAIN' }
      ],
      [
        { text: '💕 الزوجة (سارة)', callback_data: 'stmt_WIFE' },
        { text: '👧 سارة (الأخت)', callback_data: 'stmt_SARA' }
      ],
      [
        { text: '👦 مصطفى', callback_data: 'stmt_MOSTAFA' },
        { text: '👧 هاجر', callback_data: 'stmt_HAGAR' }
      ],
      [
        { text: '👦 محمد', callback_data: 'stmt_MOHAMED' }
      ]
    ]
  };

  sendMessage(chatId, '📋 *اختر الحساب لعرض كشف الحساب:*', keyboard);
}

/**
 * قائمة اختيار العهد
 */
function sendCustodyMenu(chatId) {
  var keyboard = {
    inline_keyboard: [
      [
        { text: '📊 كل العهد', callback_data: 'cust_ALL' }
      ],
      [
        { text: '💕 الزوجة (سارة)', callback_data: 'cust_WIFE' },
        { text: '👧 سارة (الأخت)', callback_data: 'cust_SARA' }
      ],
      [
        { text: '👦 مصطفى', callback_data: 'cust_MOSTAFA' },
        { text: '👧 هاجر', callback_data: 'cust_HAGAR' }
      ],
      [
        { text: '👦 محمد', callback_data: 'cust_MOHAMED' }
      ]
    ]
  };

  sendMessage(chatId, '💼 *اختر العهدة:*', keyboard);
}

/**
 * إرسال ملف PDF عبر تليجرام
 */
function sendDocument(chatId, blob, caption) {
  try {
    var url = CONFIG.TELEGRAM_API_URL + CONFIG.TELEGRAM_BOT_TOKEN + '/sendDocument';

    var boundary = '----FormBoundary' + new Date().getTime();

    // بناء multipart form data
    var payload = Utilities.newBlob('').getBytes();

    // حقل chat_id
    var chatIdPart = '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="chat_id"\r\n\r\n' +
      chatId + '\r\n';

    // حقل caption (اختياري)
    var captionPart = '';
    if (caption) {
      captionPart = '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="caption"\r\n\r\n' +
        caption + '\r\n';
    }

    // حقل الملف
    var filePart = '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="document"; filename="' + blob.getName() + '"\r\n' +
      'Content-Type: application/pdf\r\n\r\n';

    var endPart = '\r\n--' + boundary + '--\r\n';

    // تجميع البيانات
    var requestBody = Utilities.newBlob(chatIdPart + captionPart + filePart).getBytes()
      .concat(blob.getBytes())
      .concat(Utilities.newBlob(endPart).getBytes());

    var options = {
      method: 'POST',
      contentType: 'multipart/form-data; boundary=' + boundary,
      payload: requestBody,
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

    if (!result.ok) {
      Logger.log('sendDocument failed: ' + response.getContentText());
      return false;
    }

    return true;
  } catch (error) {
    Logger.log('sendDocument error: ' + error.toString());
    return false;
  }
}

/**
 * معالجة طلب تصدير PDF
 */
function handlePdfExport(chatId, pdfTitle) {
  try {
    // إعادة توليد التقرير المناسب بناءً على العنوان
    var reportText = '';
    var titleMap = {
      'تقرير_شهري': function() { return generateUnifiedReport(); },
      'تقرير_الذهب': function() { return generateGoldReport(); },
      'تقرير_الجمعيات': function() { return generateAssociationsReport(); },
      'تقرير_المدخرات': function() { return generateSavingsReport(); },
      'تقرير_السلف': function() { return generateLoansReport(); }
    };

    // كشف حساب
    if (pdfTitle.indexOf('كشف_حساب_') === 0) {
      var nameToCode = {
        'الخزنة الرئيسية': 'MAIN', 'الخزنة_الرئيسية': 'MAIN',
        'الزوجة': 'WIFE', 'سارة': 'SARA',
        'مصطفى': 'MOSTAFA', 'هاجر': 'HAGAR', 'محمد': 'MOHAMED'
      };
      var accountName = pdfTitle.replace('كشف_حساب_', '');
      var code = nameToCode[accountName] || accountName;
      reportText = generateAccountStatement(code);
    } else if (titleMap[pdfTitle]) {
      reportText = titleMap[pdfTitle]();
    } else {
      sendMessage(chatId, '❌ لم يتم التعرف على نوع التقرير.');
      return;
    }

    // تصدير كـ PDF
    var pdfResult = exportReportAsPDF(reportText, pdfTitle);

    if (pdfResult.success) {
      var sent = sendDocument(chatId, pdfResult.blob, '📄 ' + pdfTitle.replace(/_/g, ' '));
      if (!sent) {
        sendMessage(chatId, '❌ فشل إرسال ملف PDF. حاول مرة أخرى.');
      }
    } else {
      sendMessage(chatId, '❌ فشل تصدير PDF: ' + (pdfResult.error || 'خطأ غير معروف'));
    }
  } catch (error) {
    Logger.log('handlePdfExport error: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في تصدير PDF: ' + error.message);
  }
}

/**
 * معالجة أزرار
 */
function handleCallbackQuery(callbackQuery) {
  var chatId = callbackQuery.message.chat.id;
  var userId = callbackQuery.from.id;
  var userName = callbackQuery.from.first_name || 'مستخدم';
  var data = callbackQuery.data;

  Logger.log('🔘 Button: ' + data);

  var user = getUserByTelegramId(userId);

  // ⭐ تحديث اسم المستخدم إذا كان فارغاً في الشيت
  if (user && !user.name && userName) {
    Logger.log('📝 Updating empty user name in callback with: ' + userName);
    updateUserName(userId, userName);
    user.name = userName;
  }

  // ⭐ معالجة أزرار الجمعيات
  if (data.indexOf('confirm_assoc_') === 0) {
    handleConfirmAssociation(chatId, data, user);
    answerCallbackQuery(callbackQuery.id);
    return;
  }

  // ⭐ معالجة أزرار التحويل المركب
  if (data.indexOf('confirm_compound_') === 0) {
    handleConfirmCompound(chatId, data, user);
    answerCallbackQuery(callbackQuery.id);
    return;
  }

  // ⭐ معالجة الإلغاء (للجمعيات والتحويلات المركبة)
  if (data.indexOf('cancel_') === 0) {
    var cancelKey = data.replace('cancel_', '');
    CacheService.getScriptCache().remove(cancelKey);
    sendMessage(chatId, '❌ تم الإلغاء.');
    answerCallbackQuery(callbackQuery.id);
    return;
  }

  // ⭐ معالجة أزرار العهد
  if (data.indexOf('cust_') === 0) {
    var custCode = data.replace('cust_', '');
    sendChatAction(chatId, 'typing');
    try {
      if (custCode === 'ALL') {
        // تقرير كل العهد
        sendReportWithPdfOption(chatId, generateCustodyReport(), 'تقرير_العهد');
      } else {
        // تقرير عهدة فردية = كشف حساب
        var custNames = {
          'WIFE': 'الزوجة', 'SARA': 'سارة', 'MOSTAFA': 'مصطفى',
          'HAGAR': 'هاجر', 'MOHAMED': 'محمد'
        };
        var pdfTitle = 'كشف_حساب_' + (custNames[custCode] || custCode);
        var custReport = generateAccountStatement(custCode);
        sendReportWithPdfOption(chatId, custReport, pdfTitle);
      }
    } catch (error) {
      Logger.log('Custody report error: ' + error.toString());
      sendMessage(chatId, '❌ خطأ في تقرير العهدة: ' + error.message);
    }
    answerCallbackQuery(callbackQuery.id);
    return;
  }

  // ⭐ معالجة أزرار كشف الحساب
  if (data.indexOf('stmt_') === 0) {
    var accountCode = data.replace('stmt_', '');
    sendChatAction(chatId, 'typing');
    var accountNames = {
      'MAIN': 'الخزنة الرئيسية',
      'WIFE': 'الزوجة',
      'SARA': 'سارة',
      'MOSTAFA': 'مصطفى',
      'HAGAR': 'هاجر',
      'MOHAMED': 'محمد'
    };
    var pdfTitle = 'كشف_حساب_' + (accountNames[accountCode] || accountCode);
    try {
      var stmtReport = generateAccountStatement(accountCode);
      sendReportWithPdfOption(chatId, stmtReport, pdfTitle);
    } catch (error) {
      Logger.log('Statement error: ' + error.toString());
      sendMessage(chatId, '❌ خطأ في إنشاء كشف الحساب: ' + error.message);
    }
    answerCallbackQuery(callbackQuery.id);
    return;
  }

  // ⭐ معالجة أزرار تصدير PDF
  if (data.indexOf('pdf_') === 0) {
    var pdfTitle = data.replace('pdf_', '');
    sendChatAction(chatId, 'upload_document');
    handlePdfExport(chatId, pdfTitle);
    answerCallbackQuery(callbackQuery.id);
    return;
  }

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

    // ⭐ التقارير الجديدة
    case 'rpt_monthly':
      sendChatAction(chatId, 'typing');
      sendReportWithPdfOption(chatId, generateUnifiedReport(), 'تقرير_شهري');
      break;
    case 'rpt_statement':
      sendStatementAccountMenu(chatId);
      break;
    case 'rpt_gold':
      sendChatAction(chatId, 'typing');
      sendReportWithPdfOption(chatId, generateGoldReport(), 'تقرير_الذهب');
      break;
    case 'rpt_assoc':
      sendChatAction(chatId, 'typing');
      sendReportWithPdfOption(chatId, generateAssociationsReport(), 'تقرير_الجمعيات');
      break;
    case 'rpt_savings':
      sendChatAction(chatId, 'typing');
      sendReportWithPdfOption(chatId, generateSavingsReport(), 'تقرير_المدخرات');
      break;
    case 'rpt_loans':
      sendChatAction(chatId, 'typing');
      sendReportWithPdfOption(chatId, generateLoansReport(), 'تقرير_السلف');
      break;
  }

  answerCallbackQuery(callbackQuery.id);
}

/**
 * ⭐ معالجة تأكيد إضافة جمعية
 */
function handleConfirmAssociation(chatId, data, user) {
  Logger.log('=== handleConfirmAssociation ===');
  Logger.log('Data: ' + data);

  try {
    // استخراج مفتاح الكاش من الـ callback data
    var cacheKey = data.replace('confirm_assoc_', '');
    var assocDataStr = CacheService.getScriptCache().get(cacheKey);

    if (!assocDataStr) {
      sendMessage(chatId, '⏰ انتهت صلاحية البيانات. أعد كتابة رسالة الجمعية.');
      return;
    }

    var assocData = JSON.parse(assocDataStr);
    Logger.log('Association data: ' + JSON.stringify(assocData));

    // إضافة الجمعية باستخدام الدالة الجديدة
    var result = addAssociation({
      name: assocData.name || 'جمعية جديدة',
      responsible: assocData.responsible || user.name,
      account: assocData.account || 'MAIN',
      installment: assocData.installment,
      currency: assocData.currency || 'EGP',
      duration: assocData.duration,
      collectionOrder: assocData.collectionOrder,
      startMonth: assocData.startMonth,
      startYear: assocData.startYear || new Date().getFullYear()
    });

    if (result.success) {
      // استخدام البيانات المحسوبة من النتيجة
      var totalAmount = result.data.totalAmount || (assocData.installment * assocData.duration);
      var currencySymbol = (assocData.currency === 'SAR') ? 'ريال' : 'جنيه';

      var successMsg = '✅ *تم تسجيل الجمعية بنجاح!*\n\n';
      successMsg += '📋 الاسم: ' + escapeMarkdown(assocData.name || 'جمعية جديدة') + '\n';
      if (assocData.responsible) {
        successMsg += '👤 المسؤول: ' + escapeMarkdown(assocData.responsible) + '\n';
      }
      successMsg += '💰 القسط الشهري: ' + formatNumber(assocData.installment) + ' ' + currencySymbol + '\n';
      successMsg += '🔢 المدة: ' + assocData.duration + ' شهر\n';
      successMsg += '🎯 ترتيب القبض: ' + assocData.collectionOrder + '\n';
      successMsg += '📅 تاريخ البدء: ' + result.data.startDate + '\n';
      successMsg += '📆 موعد القبض المتوقع: ' + result.data.expectedCollectionDate + '\n';
      successMsg += '💵 إجمالي القبض: ' + formatNumber(totalAmount) + ' ' + currencySymbol + '\n\n';
      successMsg += '📝 يمكنك تسجيل أقساط من القائمة: 🤝 الجمعيات';

      sendMessage(chatId, successMsg);

      // حذف الكاش
      CacheService.getScriptCache().remove(cacheKey);
    } else {
      sendMessage(chatId, '❌ خطأ في حفظ الجمعية: ' + result.message);
    }

  } catch (error) {
    Logger.log('Error in handleConfirmAssociation: ' + error.toString());
    sendMessage(chatId, '❌ خطأ: ' + error.message);
  }
}

/**
 * ⭐⭐⭐ معالجة تأكيد التحويل المركب ⭐⭐⭐
 */
function handleConfirmCompound(chatId, data, user) {
  Logger.log('=== handleConfirmCompound ===');
  Logger.log('Data: ' + data);

  try {
    // استخراج مفتاح الكاش من الـ callback data
    var cacheKey = data.replace('confirm_compound_', '');
    var compoundDataStr = CacheService.getScriptCache().get(cacheKey);

    if (!compoundDataStr) {
      sendMessage(chatId, '⏰ انتهت صلاحية البيانات. أعد كتابة رسالة التحويل المركب.');
      return;
    }

    var compoundData = JSON.parse(compoundDataStr);
    Logger.log('Compound data: ' + JSON.stringify(compoundData));

    var transactions = compoundData.transactions;
    var successCount = 0;
    var savedIds = [];
    var failedCount = 0;

    // حفظ كل معاملة
    for (var i = 0; i < transactions.length; i++) {
      var transData = transactions[i];
      transData.user_name = user.name;
      transData.telegram_id = user.telegram_id;

      Logger.log('Saving transaction ' + (i + 1) + ': ' + JSON.stringify(transData));

      var result = addTransaction(transData);
      Logger.log('Save result: ' + JSON.stringify(result));

      if (result && result.success) {
        successCount++;
        savedIds.push(result.id);
      } else {
        failedCount++;
        Logger.log('Failed to save transaction: ' + JSON.stringify(transData));
      }
    }

    // حذف الكاش
    CacheService.getScriptCache().remove(cacheKey);

    // إرسال رسالة النجاح
    if (successCount > 0) {
      var successMsg = '✅ *تم حفظ التحويل المركب بنجاح!*\n\n';
      successMsg += '📊 *الملخص:*\n';
      successMsg += '• المبلغ الإجمالي: ' + compoundData.totalSAR + ' ريال\n';
      successMsg += '• ما يعادل: ' + compoundData.totalEGP + ' جنيه\n';
      successMsg += '• أمين العهدة: ' + compoundData.custodian + '\n\n';

      successMsg += '📝 *تم حفظ ' + successCount + ' معاملة:*\n';
      successMsg += '🔢 أرقام الحركات: #' + savedIds.join(', #') + '\n\n';

      // حساب رصيد العهدة الحالي
      try {
        var custodyBalance = calculateCustodyBalanceFromTransactions(compoundData.custodian);
        successMsg += '💼 *رصيد العهدة الحالي لـ ' + compoundData.custodian + ':* ' + formatNumber(custodyBalance) + ' جنيه';
      } catch (balErr) {
        Logger.log('Balance calc error in compound (non-fatal): ' + balErr.toString());
      }

      if (failedCount > 0) {
        successMsg += '\n\n⚠️ تنبيه: فشل حفظ ' + failedCount + ' معاملة';
      }

      sendMessage(chatId, successMsg);
    } else {
      sendMessage(chatId, '❌ فشل حفظ جميع المعاملات.');
    }

  } catch (error) {
    Logger.log('Error in handleConfirmCompound: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في حفظ التحويل المركب: ' + error.message);
  }
}

/**
 * ⭐ معالجة تأكيد الحفظ
 */
function handleConfirmSave(chatId, user) {
  Logger.log('=== handleConfirmSave ===');

  try {
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
      // ⭐ استخدام user_name من الكاش إذا كان user.name فارغاً
      transData.user_name = user.name || transData.user_name || (pending.user && pending.user.name) || '';
      transData.telegram_id = user.telegram_id || transData.telegram_id || (pending.user && pending.user.telegram_id) || '';

      var result = addTransaction(transData);
      Logger.log('Save result: ' + JSON.stringify(result));

      if (result && result.success) {
        successCount++;
        savedIds.push(result.id);

        var detail = (transData.type || transData.nature || '') + ': ' + transData.amount + ' ' + transData.currency;
        if (transData.contact) {
          detail += ' لـ ' + transData.contact;
        }

        // لو عهدة، نحسب الرصيد (مع حماية من الأخطاء لعدم تعطيل رسالة النجاح)
        if (transData.type === 'إيداع_عهدة' || transData.type === 'صرف_من_عهدة' || transData.nature === 'تحويل') {
          try {
            var custodian = transData.contact || 'سارة';
            var balance = calculateCustodyBalanceFromTransactions(custodian);
            if (balance !== 0) {
              detail += '\n   💼 رصيد العهدة: ' + balance + ' جنيه';
            }
          } catch (balErr) {
            Logger.log('Balance calc error (non-fatal): ' + balErr.toString());
          }
        }

        details.push(detail);
      }
    }

    // ⭐ إرسال رسالة النجاح أولاً، ثم حذف المعاملة المعلقة
    // هذا يضمن أن المستخدم يرى رسالة التأكيد حتى لو حدث خطأ لاحقاً

    if (successCount > 0) {
      // ⭐ رسالة بسيطة بدون تنسيق معقد
      var msg = 'تم الحفظ بنجاح! رقم الحركة: #' + savedIds.join(', #');

      // ⭐ إرسال مع التحقق من النجاح
      var sent = sendMessage(chatId, msg);
      Logger.log('Success message sent: ' + sent + ' to ' + chatId);

      if (!sent) {
        // محاولة أخيرة برسالة أبسط
        Logger.log('Retrying with simpler message...');
        sendMessage(chatId, 'تم الحفظ #' + savedIds[0]);
      }
    } else {
      sendMessage(chatId, 'فشل حفظ المعاملة. حاول مرة أخرى.');
    }

    // ⭐ حذف المعاملة المعلقة بعد إرسال الرسالة
    removePendingTransaction(chatId);

  } catch (error) {
    Logger.log('Error in handleConfirmSave: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في حفظ المعاملة: ' + error.message);
    // حذف المعاملة المعلقة حتى في حالة الخطأ
    try { removePendingTransaction(chatId); } catch(e) {}
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

    var income = { SAR: 0, EGP: 0 };
    var expense = { SAR: 0, EGP: 0 };
    var transfer = { SAR: 0, EGP: 0 };

    // 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
    for (var i = 1; i < data.length; i++) {
      var nature = data[i][3];
      var amount = parseFloat(data[i][6]) || 0;
      var currency = normalizeCurrency(data[i][7]) || 'SAR';

      if (nature === 'إيراد') {
        income[currency] = (income[currency] || 0) + amount;
      } else if (nature === 'مصروف') {
        expense[currency] = (expense[currency] || 0) + amount;
      } else if (nature === 'تحويل') {
        transfer[currency] = (transfer[currency] || 0) + amount;
      }
    }

    var netSAR = (income.SAR || 0) - (expense.SAR || 0) - (transfer.SAR || 0);
    var netEGP = (income.EGP || 0) - (expense.EGP || 0) - (transfer.EGP || 0);

    var msg = '💰 *ملخص الرصيد*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '📥 *الإيرادات:*\n';
    if (income.SAR) msg += '   ' + formatNumber(income.SAR) + ' ر.س\n';
    if (income.EGP) msg += '   ' + formatNumber(income.EGP) + ' ج.م\n';
    if (!income.SAR && !income.EGP) msg += '   0\n';

    msg += '\n📤 *المصروفات:*\n';
    if (expense.SAR) msg += '   ' + formatNumber(expense.SAR) + ' ر.س\n';
    if (expense.EGP) msg += '   ' + formatNumber(expense.EGP) + ' ج.م\n';
    if (!expense.SAR && !expense.EGP) msg += '   0\n';

    msg += '\n💸 *التحويلات:*\n';
    if (transfer.SAR) msg += '   ' + formatNumber(transfer.SAR) + ' ر.س\n';
    if (transfer.EGP) msg += '   ' + formatNumber(transfer.EGP) + ' ج.م\n';
    if (!transfer.SAR && !transfer.EGP) msg += '   0\n';

    msg += '\n━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '💵 *الصافي:*\n';
    if (netSAR !== 0) msg += '   ' + formatNumber(netSAR) + ' ر.س\n';
    if (netEGP !== 0) msg += '   ' + formatNumber(netEGP) + ' ج.م\n';
    if (netSAR === 0 && netEGP === 0) msg += '   0\n';

    sendMessage(chatId, msg);

  } catch (error) {
    Logger.log('Balance error: ' + error.toString());
    sendMessage(chatId, '❌ خطأ في حساب الرصيد');
  }
}

/**
 * إرسال رسالة
 * @returns {boolean} true إذا نجح الإرسال
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
      Logger.log('Send failed (Markdown): ' + response.getContentText());

      // ⭐ محاولة ثانية بدون Markdown
      payload.parse_mode = undefined;
      delete payload.parse_mode;
      options.payload = JSON.stringify(payload);

      response = UrlFetchApp.fetch(url, options);
      result = JSON.parse(response.getContentText());

      if (!result.ok) {
        Logger.log('Send failed (plain): ' + response.getContentText());
        return false;
      }
    }

    return true;

  } catch (error) {
    Logger.log('sendMessage error: ' + error.toString());
    return false;
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
    { command: 'report', description: '📊 قائمة التقارير' },
    { command: 'monthly', description: '📊 التقرير الشامل الشهري' },
    { command: 'custody', description: '💼 تقارير العهد' },
    { command: 'statement', description: '📋 كشف حساب تفصيلي' },
    { command: 'balance', description: '💰 الأرصدة الحالية' },
    { command: 'associations', description: '🔄 تقرير الجمعيات' },
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
