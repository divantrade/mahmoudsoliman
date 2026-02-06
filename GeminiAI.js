/**
 * =====================================================
 * نظام المحاسبة الذكي - Gemini AI Integration
 * الإصدار 2.0 - نظام القيد المزدوج
 * =====================================================
 */

/**
 * ⭐ تحويل الأرقام العربية (٠-٩) للأرقام الغربية (0-9)
 */
function convertArabicToWesternNumerals(str) {
  if (!str) return str;
  var arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (var i = 0; i < 10; i++) {
    str = str.replace(new RegExp(arabicNumerals[i], 'g'), i.toString());
  }
  return str;
}

/**
 * ⭐⭐⭐ تحليل المعاملات المركبة محلياً بدون AI ⭐⭐⭐
 * نمط: "من X الي Y مبلغ ... دفعت/صرفت Z ... والباقي ..."
 */
function parseCompoundTransactionLocally(message) {
  Logger.log('=== parseCompoundTransactionLocally START ===');

  // تحويل الأرقام العربية وتنظيف
  var text = convertArabicToWesternNumerals(message);
  text = text.replace(/[\u064B-\u065F]/g, ''); // إزالة التشكيل

  Logger.log('Normalized: ' + text);

  // قاموس الأسماء
  var nameToAccount = {
    'مصطفى': 'MOSTAFA', 'مصطفي': 'MOSTAFA', 'مصطفا': 'MOSTAFA',
    'سارة': 'SARA', 'ساره': 'SARA', 'سارا': 'SARA',
    'مراتي': 'WIFE', 'زوجتي': 'WIFE', 'الزوجة': 'WIFE', 'الزوجه': 'WIFE',
    'ام سيليا': 'WIFE', 'أم سيليا': 'WIFE', 'مراته': 'WIFE',
    'هاجر': 'HAGAR', 'محمد': 'MOHAMED',
    'حسابي': 'MAIN', 'الخزنة': 'MAIN', 'عندي': 'MAIN'
  };

  var accountToName = {
    'MOSTAFA': 'مصطفى', 'WIFE': 'الزوجة', 'SARA': 'سارة',
    'HAGAR': 'هاجر', 'MOHAMED': 'محمد', 'MAIN': 'الرئيسي'
  };

  // ⭐ نمط "من X الي Y مبلغ"
  var transferPattern = /من\s+([^\s,،]+)\s+(?:الي|الى|إلى|ل)\s+([^\s,،]+)\s+(\d+)/i;
  var transferMatch = text.match(transferPattern);

  if (!transferMatch) {
    Logger.log('No transfer pattern found');
    return null;
  }

  var fromName = transferMatch[1].trim();
  var toName = transferMatch[2].trim();
  var mainAmount = parseFloat(transferMatch[3]);

  Logger.log('Transfer: from=' + fromName + ', to=' + toName + ', amount=' + mainAmount);

  // تحديد الحسابات
  var fromAccount = null;
  var toAccount = null;

  for (var key in nameToAccount) {
    if (fromName.indexOf(key) !== -1 || key.indexOf(fromName) !== -1) {
      fromAccount = nameToAccount[key];
    }
    if (toName.indexOf(key) !== -1 || key.indexOf(toName) !== -1) {
      toAccount = nameToAccount[key];
    }
  }

  if (!fromAccount || !toAccount) {
    Logger.log('Could not identify accounts');
    return null;
  }

  Logger.log('Accounts: from=' + fromAccount + ', to=' + toAccount);

  // تحديد العملة
  var currency = 'جنيه';
  if (/ريال|ر\.?س/.test(text)) currency = 'ريال';
  else if (/دولار|\$/.test(text)) currency = 'دولار';

  var transactions = [];

  // ⭐ المعاملة 1: التحويل الرئيسي
  transactions.push({
    nature: 'تحويل',
    type: 'تحويل',
    category: 'عهدة',
    item: 'تحويل بين عهد',
    amount: mainAmount,
    currency: currency,
    fromAccount: fromAccount,
    from_account: fromAccount,
    toAccount: toAccount,
    to_account: toAccount,
    description: 'تحويل من ' + accountToName[fromAccount] + ' إلى ' + accountToName[toAccount]
  });

  // ⭐ البحث عن المصروفات الفرعية
  var remainingAmount = mainAmount;
  var subExpenses = [];

  // نمط الجمعية: "دفعت جمعية X" أو "جمعيه X"
  var assocPattern = /(?:دفع[ت]?|صرف[ت]?)\s*(?:مراتي|زوجتي|هي)?\s*جمعي[ةه]\s*(?:[^\d]*)?(\d+)/i;
  var assocMatch = text.match(assocPattern);
  if (assocMatch) {
    var assocAmount = parseFloat(assocMatch[1]);
    subExpenses.push({
      type: 'جمعية',
      amount: assocAmount,
      description: 'قسط جمعية'
    });
    remainingAmount -= assocAmount;
    Logger.log('Found association: ' + assocAmount);
  }

  // نمط مصروفات محددة: "دفعت X للبيت" أو "X مصروفات"
  var expensePattern = /(\d+)\s*(?:للبيت|مصروف|مصاريف)/i;
  var expenseMatch = text.match(expensePattern);
  if (expenseMatch) {
    var expAmount = parseFloat(expenseMatch[1]);
    subExpenses.push({
      type: 'مصروفات',
      amount: expAmount,
      description: 'مصروفات منزلية'
    });
    remainingAmount -= expAmount;
    Logger.log('Found expense: ' + expAmount);
  }

  // ⭐ "والباقي مصروفها" أو "والباقي معاها"
  if (/والباقي\s*(?:مصروف|بمصروف|صرف)/i.test(text)) {
    if (remainingAmount > 0) {
      subExpenses.push({
        type: 'مصروفات',
        amount: remainingAmount,
        description: 'مصروفات (الباقي)'
      });
      Logger.log('Remaining as expenses: ' + remainingAmount);
    }
  }

  // ⭐ إضافة المصروفات الفرعية كمعاملات
  for (var i = 0; i < subExpenses.length; i++) {
    var exp = subExpenses[i];
    var cat = exp.type === 'جمعية' ? 'جمعية' : 'معيشة';
    var itm = exp.type === 'جمعية' ? 'قسط جمعية' : 'مصروفات منزلية';

    transactions.push({
      nature: 'مصروف',
      type: 'مصروف',
      category: cat,
      item: itm,
      amount: exp.amount,
      currency: currency,
      fromAccount: toAccount,  // الصرف من حساب المستلم
      from_account: toAccount,
      toAccount: '',
      to_account: '',
      description: exp.description + ' من ' + accountToName[toAccount]
    });
  }

  if (transactions.length > 1) {
    Logger.log('Local parsing successful: ' + transactions.length + ' transactions');
    return {
      success: true,
      نجاح: true,
      transactions: transactions,
      معاملات: transactions,
      message: 'تم تحليل ' + transactions.length + ' حركات',
      رسالة: 'تم تحليل ' + transactions.length + ' حركات'
    };
  }

  Logger.log('Not enough transactions found, falling back to AI');
  return null;
}

/**
 * ⭐ بناء prompt الذكاء الاصطناعي ديناميكياً من الشيتات
 */
function buildAIPrompt() {
  // قراءة البنود من الشيت
  const itemsText = getItemsForAI();

  // قراءة الحسابات من الشيت
  const accountsText = getAccountCodesForAI();

  // قراءة العملات
  const currencies = getAllCurrencies();
  const currenciesText = currencies.map(c => `${c.name} (${c.code})`).join('، ');

  // قراءة جهات الاتصال
  const contactsText = buildContactsPrompt();

  const prompt = `أنت مساعد محاسبي ذكي لنظام المحاسبة الشخصية.
مهمتك تحليل رسائل المستخدم بالعربية واستخراج المعلومات المالية وتحويلها لحركات محاسبية.

═══════════════════════════════════════════════════════════
⭐ نظام القيد المزدوج (مهم جداً)
═══════════════════════════════════════════════════════════
كل حركة مالية لها طرفان:
- من_حساب: الحساب المصدر (الذي يخرج منه المال)
- إلى_حساب: الحساب الوجهة (الذي يدخل إليه المال)

أنواع الحركات:
1. إيراد: المال يدخل للنظام
   - من_حساب: فارغ (مصدر خارجي)
   - إلى_حساب: الحساب المستلم (عادة MAIN)

2. مصروف: المال يخرج من النظام
   - من_حساب: الحساب الذي يُصرف منه
   - إلى_حساب: فارغ (مصروف خارجي)

3. تحويل: المال ينتقل داخل النظام (بين حسابين)
   - من_حساب: الحساب المصدر
   - إلى_حساب: الحساب الوجهة
   - لا يغير المجموع الكلي

4. استثمار: تحويل لأصل (ذهب/أسهم)
   - من_حساب: الحساب الذي يُصرف منه
   - إلى_حساب: محفظة الأصل

═══════════════════════════════════════════════════════════
📊 الحسابات المتاحة (استخدم هذه الأكواد فقط!)
═══════════════════════════════════════════════════════════
${accountsText}

أنواع الحسابات:
- رئيسي: الحساب الشخصي الأساسي (MAIN)
- عهدة: حساب أمين عهدة (SARA، MOSTAFA، WIFE، OM_CELIA)
- مستفيد: شخص يُساعد (ليس له رصيد)
- ادخار: خزنة ادخار
- استثمار: محفظة (ذهب، أسهم)

═══════════════════════════════════════════════════════════
📂 البنود المتاحة (استخدم هذه البنود فقط! لا تخترع بنوداً جديدة!)
═══════════════════════════════════════════════════════════
${itemsText}

⚠️ مهم جداً: استخدم فقط التصنيفات والبنود المذكورة أعلاه.
لا تخترع تصنيفات أو بنود جديدة مثل "مصروفات" - استخدم الموجود فقط!

═══════════════════════════════════════════════════════════
💰 العملات المدعومة
═══════════════════════════════════════════════════════════
${currenciesText}
- الافتراضية: ريال سعودي (SAR)

═══════════════════════════════════════════════════════════
👥 جهات الاتصال وحساباتهم
═══════════════════════════════════════════════════════════
${contactsText}

⭐ ربط الأسماء بالحسابات:
- مصطفى / مصطفي = MOSTAFA
- مراتي / زوجتي / ام سيليا / الزوجة / WIFE = WIFE أو OM_CELIA
- سارة = SARA
- هاجر = HAGAR
- محمد = MOHAMED

═══════════════════════════════════════════════════════════
⭐⭐⭐ قاعدة ذهبية: "من X لـ Y" ⭐⭐⭐
═══════════════════════════════════════════════════════════
عندما يقول المستخدم "من شخص لشخص":
- "من مصطفى لمراتي 4000" = تحويل من MOSTAFA إلى WIFE
- "من سارة لمصطفى 2000" = تحويل من SARA إلى MOSTAFA
- "من العهدة لمراتي" = تحويل من حساب العهدة إلى WIFE

⚠️ مهم: "من X لـ Y" يعني التحويل من حساب X إلى حساب Y
وليس من MAIN! إلا إذا قال "من حسابي" أو "من عندي"

═══════════════════════════════════════════════════════════
📝 أمثلة مفصلة
═══════════════════════════════════════════════════════════

1. دخل:
   "نزل الراتب 8500"
   → طبيعة: إيراد, تصنيف: راتب, بند: راتب أساسي
   → مبلغ: 8500, عملة: ريال
   → من_حساب: "", إلى_حساب: MAIN

2. مصروف مباشر:
   "صرفت 150 غداء"
   → طبيعة: مصروف, تصنيف: معيشة, بند: طعام وشراب
   → مبلغ: 150, عملة: ريال
   → من_حساب: MAIN, إلى_حساب: ""

3. تحويل من MAIN لعهدة:
   "حولت لمراتي 3000"
   → طبيعة: تحويل, تصنيف: عهدة, بند: تحويل لعهدة
   → مبلغ: 3000, عملة: ريال
   → من_حساب: MAIN, إلى_حساب: WIFE

4. ⭐ تحويل بين عهدتين (من X لـ Y):
   "من مصطفى لمراتي 4000 جنيه"
   → طبيعة: تحويل, تصنيف: عهدة, بند: تحويل بين عهد
   → مبلغ: 4000, عملة: جنيه
   → من_حساب: MOSTAFA, إلى_حساب: WIFE

5. ⭐ تحويل من عهدة لعهدة أخرى:
   "من سارة لمصطفى 2000"
   → طبيعة: تحويل, تصنيف: عهدة, بند: تحويل بين عهد
   → مبلغ: 2000, عملة: جنيه
   → من_حساب: SARA, إلى_حساب: MOSTAFA

6. صرف من عهدة:
   "مراتي صرفت 1000 جمعية"
   → طبيعة: مصروف, تصنيف: جمعية, بند: قسط جمعية
   → مبلغ: 1000, عملة: جنيه
   → من_حساب: WIFE, إلى_حساب: ""

═══════════════════════════════════════════════════════════
🔄 الحركات المركبة (رسالة واحدة = عدة حركات)
═══════════════════════════════════════════════════════════

مثال 1: "من مصطفى لمراتي 4000 جنيه تاخد منهم 3000 وتدفع جمعية 1000"

تُقسم لـ 3 حركات:
1. تحويل 4000 جنيه من MOSTAFA → WIFE
   → طبيعة: تحويل, من_حساب: MOSTAFA, إلى_حساب: WIFE

2. مصروف 1000 جنيه (جمعية) من WIFE
   → طبيعة: مصروف, تصنيف: جمعية, بند: قسط جمعية
   → من_حساب: WIFE, إلى_حساب: ""

3. مصروف 3000 جنيه (مصروفات) من WIFE
   → طبيعة: مصروف, تصنيف: معيشة, بند: مصروفات منزلية
   → من_حساب: WIFE, إلى_حساب: ""

مثال 2: "حولت 5000 لسارة منهم 2000 للبيت و1000 جمعية والباقي معاها"

تُقسم لـ 3 حركات:
1. تحويل 5000 من MAIN → SARA
2. مصروف 2000 (مصروفات منزلية) من SARA
3. مصروف 1000 (جمعية) من SARA
(الباقي 2000 يبقى في عهدة سارة)

مثال 3: "من مصطفى الي مراتي 4000 جنيه قامت بدفع جمعية 150 والباقي بمصروفها"

تُقسم لـ 3 حركات:
1. تحويل 4000 جنيه من MOSTAFA → WIFE
   {
     "طبيعة": "تحويل",
     "تصنيف": "عهدة",
     "بند": "تحويل بين عهد",
     "مبلغ": 4000,
     "عملة": "جنيه",
     "من_حساب": "MOSTAFA",
     "إلى_حساب": "WIFE",
     "وصف": "تحويل من مصطفى لمراتي"
   }
2. مصروف 150 جنيه (جمعية) من WIFE
   {
     "طبيعة": "مصروف",
     "تصنيف": "جمعية",
     "بند": "قسط جمعية",
     "مبلغ": 150,
     "عملة": "جنيه",
     "من_حساب": "WIFE",
     "إلى_حساب": "",
     "وصف": "قسط جمعية"
   }
3. مصروف 3850 جنيه (الباقي = مصروفات) من WIFE
   {
     "طبيعة": "مصروف",
     "تصنيف": "معيشة",
     "بند": "مصروفات منزلية",
     "مبلغ": 3850,
     "عملة": "جنيه",
     "من_حساب": "WIFE",
     "إلى_حساب": "",
     "وصف": "مصروفات منزلية"
   }

═══════════════════════════════════════════════════════════
📋 تنسيق الإخراج (JSON) - مثال حقيقي
═══════════════════════════════════════════════════════════
مثال: "من مصطفى لمراتي 4000 جنيه"
{
  "نجاح": true,
  "معاملات": [
    {
      "طبيعة": "تحويل",
      "تصنيف": "عهدة",
      "بند": "تحويل بين عهد",
      "مبلغ": 4000,
      "عملة": "جنيه",
      "من_حساب": "MOSTAFA",
      "إلى_حساب": "WIFE",
      "وصف": "تحويل من عهدة مصطفى لعهدة الزوجة"
    }
  ],
  "رسالة": "تحويل 4000 جنيه من مصطفى للزوجة"
}

⚠️⚠️⚠️ مهم جداً: يجب ملء "من_حساب" و "إلى_حساب" بأكواد الحسابات الفعلية!
- "من مصطفى" = من_حساب: "MOSTAFA"
- "لمراتي" = إلى_حساب: "WIFE"
- لا تترك هذه الحقول فارغة في التحويلات!

═══════════════════════════════════════════════════════════
⚠️⚠️⚠️ قواعد مهمة جداً - يجب اتباعها بدقة ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════

🔴 قاعدة ذهبية 1: "من X الي/لـ Y" = تحويل من حساب X إلى حساب Y
   - "من مصطفى لمراتي" = من_حساب: MOSTAFA، إلى_حساب: WIFE
   - لا تستخدم MAIN إلا إذا قال "من حسابي" أو "من الخزنة"!

🔴 قاعدة ذهبية 2: عند التحويل لشخص ثم صرف منه:
   - أي صرف بعد التحويل يكون من_حساب = حساب المستلم (وليس MAIN!)
   - "حولت لمراتي 4000 دفعت جمعية 150" = الجمعية من_حساب: WIFE

🔴 قاعدة ذهبية 3: لا تخترع تصنيفات!
   - استخدم فقط: عهدة، جمعية، معيشة، طعام، مواصلات، الخ
   - لا تستخدم "تحويل عهدة" كتصنيف - التصنيف الصحيح هو "عهدة"

🔴 قاعدة ذهبية 4: الأسماء والحسابات:
   - مصطفى/مصطفي = MOSTAFA
   - مراتي/زوجتي/أم سيليا = WIFE
   - سارة/ساره = SARA
   - هاجر = HAGAR
   - محمد = MOHAMED

🔴 قاعدة ذهبية 5: "منهم" أو "والباقي" = قسّم لعدة حركات
   - احسب "الباقي" = المبلغ الأصلي - المبالغ المذكورة
   - "4000 دفعت 150 جمعية والباقي مصروفها" = 150 جمعية + 3850 مصروفات

🔴 قاعدة ذهبية 6: العملات
   - جنيه/ليرة = جنيه (مصري)
   - ريال/ر.س = ريال (سعودي)
   - دولار/$ = دولار

أرجع JSON فقط بدون أي نص إضافي.`;

  return prompt;
}

/**
 * بناء نص جهات الاتصال للـ prompt
 */
function buildContactsPrompt() {
  let text = '';
  for (const [code, contact] of Object.entries(CONTACTS)) {
    const custodyNote = contact.isCustody ? '(أمين عهدة - حساب: ' + contact.account + ')' : '(مستفيد)';
    text += `- ${contact.name} ${custodyNote}: ${contact.aliases.slice(0, 3).join('، ')}\n`;
  }
  return text;
}

/**
 * ⭐ تحليل رسالة المستخدم باستخدام Gemini
 */
function parseMessageWithGemini(userMessage, userName) {
  Logger.log('=== parseMessageWithGemini START ===');
  Logger.log('Message: ' + userMessage);
  Logger.log('User: ' + userName);

  try {
    // ⭐⭐⭐ محاولة التحليل المحلي أولاً للمعاملات المركبة ⭐⭐⭐
    var localResult = parseCompoundTransactionLocally(userMessage);
    if (localResult && localResult.success && localResult.transactions && localResult.transactions.length > 0) {
      Logger.log('Local parsing succeeded with ' + localResult.transactions.length + ' transactions');
      return localResult;
    }

    var apiKey = CONFIG.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 10) {
      Logger.log('ERROR: Gemini API Key not configured');
      return {
        success: false,
        نجاح: false,
        message: '❌ مفتاح Gemini API غير مُعد. اتصل بالمسؤول.',
        رسالة: '❌ مفتاح Gemini API غير مُعد. اتصل بالمسؤول.'
      };
    }

    // ⭐ تحويل الأرقام العربية للغربية قبل الإرسال
    var normalizedMessage = convertArabicToWesternNumerals(userMessage);
    Logger.log('Normalized message: ' + normalizedMessage);

    var apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;
    var systemPrompt = buildAIPrompt();

    var prompt = systemPrompt + '\n\nالرسالة من المستخدم "' + userName + '":\n"' + normalizedMessage + '"\n\nحلل هذه الرسالة واستخرج المعاملات المالية. أرجع JSON فقط.';

    var payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048
      }
    };

    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    Logger.log('Calling Gemini API...');
    var response = UrlFetchApp.fetch(apiUrl, options);
    var responseCode = response.getResponseCode();
    Logger.log('Gemini Response Code: ' + responseCode);

    if (responseCode !== 200) {
      Logger.log('Gemini API Error: ' + response.getContentText());
      return {
        success: false,
        نجاح: false,
        message: '❌ خطأ من Gemini API. حاول مرة أخرى.',
        رسالة: '❌ خطأ من Gemini API. حاول مرة أخرى.'
      };
    }

    var result = JSON.parse(response.getContentText());

    if (!result.candidates || result.candidates.length === 0) {
      Logger.log('No candidates in response');
      return {
        success: false,
        نجاح: false,
        message: '❌ لم أستطع معالجة الرسالة. جرب صياغة مختلفة.',
        رسالة: '❌ لم أستطع معالجة الرسالة. جرب صياغة مختلفة.'
      };
    }

    var aiResponse = result.candidates[0].content.parts[0].text;
    Logger.log('AI Response: ' + aiResponse.substring(0, 500));

    // Extract JSON from response
    var jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      Logger.log('No JSON found in response');
      return {
        success: false,
        نجاح: false,
        message: '❌ لم أفهم الرسالة. جرب:\n• صرفت 100 غداء\n• حولت لسارة 5000 عهدة\n• نزل الراتب 8500',
        رسالة: '❌ لم أفهم الرسالة. جرب:\n• صرفت 100 غداء\n• حولت لسارة 5000 عهدة\n• نزل الراتب 8500'
      };
    }

    var parsedData = JSON.parse(jsonMatch[0]);
    Logger.log('Parsed data: ' + JSON.stringify(parsedData));

    // تحويل البيانات للتنسيق الموحد مع تمرير الرسالة الأصلية لتصحيح الحسابات
    var normalizedData = normalizeAIResponse(parsedData, userMessage);

    Logger.log('=== parseMessageWithGemini END ===');
    return normalizedData;

  } catch (error) {
    Logger.log('EXCEPTION in parseMessageWithGemini: ' + error.toString());
    Logger.log('Stack: ' + (error.stack || 'no stack'));
    return {
      success: false,
      نجاح: false,
      message: '❌ حدث خطأ غير متوقع:\n' + error.message + '\n\nجرب مرة أخرى.',
      رسالة: '❌ حدث خطأ غير متوقع:\n' + error.message + '\n\nجرب مرة أخرى.'
    };
  }
}

/**
 * تطبيع استجابة الذكاء الاصطناعي للتنسيق الموحد
 */
function normalizeAIResponse(data, originalMessage) {
  // التحقق من نجاح التحليل
  const success = data.نجاح === true || data.success === true;

  if (!success) {
    return {
      success: false,
      نجاح: false,
      message: data.رسالة || data.message || '❌ لم أفهم الرسالة',
      رسالة: data.رسالة || data.message || '❌ لم أفهم الرسالة',
      needsClarification: data.يحتاج_توضيح || data.needsClarification || false,
      clarificationQuestion: data.سؤال_توضيحي || data.clarificationQuestion || ''
    };
  }

  // ⭐ تحليل الرسالة الأصلية لاستخراج الحسابات الصحيحة
  var msgAccounts = extractAccountsFromOriginalMessage(originalMessage || '');
  Logger.log('Extracted accounts from original: ' + JSON.stringify(msgAccounts));

  // تحويل المعاملات
  var transactions = (data.معاملات || data.transactions || []).map(function(t, index) {
    var trans = {
      nature: t.طبيعة || t.nature || t.نوع || t.type || '',
      category: t.تصنيف || t.category || '',
      item: t.بند || t.item || '',
      amount: parseFloat(t.مبلغ || t.amount) || 0,
      currency: normalizeCurrency(t.عملة || t.currency),
      fromAccount: t.من_حساب || t.fromAccount || t.from_account || '',
      toAccount: t.إلى_حساب || t.toAccount || t.to_account || '',
      convertedAmount: parseFloat(t.مبلغ_محول || t.مبلغ_مستلم || t.convertedAmount || t.amount_received) || null,
      convertedCurrency: normalizeCurrency(t.عملة_محول || t.عملة_مستلمة || t.convertedCurrency || t.currency_received),
      exchangeRate: parseFloat(t.سعر_صرف || t.سعر_الصرف || t.exchangeRate || t.exchange_rate) || null,
      description: t.وصف || t.description || '',
      contact: t.جهة || t.contact || '',

      // للتوافق مع النظام القديم
      type: mapNatureToOldType(t.طبيعة || t.nature || t.نوع || t.type),
      amount_received: parseFloat(t.مبلغ_محول || t.مبلغ_مستلم || t.convertedAmount || t.amount_received) || null,
      currency_received: normalizeCurrency(t.عملة_محول || t.عملة_مستلمة || t.convertedCurrency || t.currency_received),
      exchange_rate: parseFloat(t.سعر_صرف || t.سعر_الصرف || t.exchangeRate || t.exchange_rate) || null
    };

    // ⭐⭐⭐ تصحيح التصنيفات المخترعة ⭐⭐⭐
    trans = fixCategory(trans);

    // ⭐⭐⭐ تصحيح الحسابات ⭐⭐⭐
    // للمعاملة الأولى (التحويل الرئيسي)
    if (index === 0 && msgAccounts.fromAccount && (trans.nature === 'تحويل' || trans.type === 'تحويل')) {
      if (trans.fromAccount === 'MAIN' || !trans.fromAccount) {
        trans.fromAccount = msgAccounts.fromAccount;
        trans.from_account = msgAccounts.fromAccount;
      }
      if (!trans.toAccount && msgAccounts.toAccount) {
        trans.toAccount = msgAccounts.toAccount;
        trans.to_account = msgAccounts.toAccount;
      }
    }

    // للمعاملات اللاحقة (صرف من المستلم)
    if (index > 0 && msgAccounts.toAccount) {
      // إذا كانت الحركة مصروف والحساب MAIN خطأ
      if ((trans.nature === 'مصروف' || trans.type === 'مصروف') &&
          (trans.fromAccount === 'MAIN' || !trans.fromAccount)) {
        trans.fromAccount = msgAccounts.toAccount;
        trans.from_account = msgAccounts.toAccount;
      }
    }

    // استخراج إضافي من الوصف
    if ((trans.nature === 'تحويل' || trans.type === 'تحويل') && (!trans.fromAccount || !trans.toAccount)) {
      var extracted = extractAccountsFromDescription(trans.description);
      if (extracted.fromAccount && !trans.fromAccount) {
        trans.fromAccount = extracted.fromAccount;
        trans.from_account = extracted.fromAccount;
      }
      if (extracted.toAccount && !trans.toAccount) {
        trans.toAccount = extracted.toAccount;
        trans.to_account = extracted.toAccount;
      }
    }

    return trans;
  });

  return {
    success: true,
    نجاح: true,
    transactions: transactions,
    معاملات: transactions,
    message: data.رسالة || data.message || '✅ تم فهم الرسالة',
    رسالة: data.رسالة || data.message || '✅ تم فهم الرسالة',
    needsClarification: data.يحتاج_توضيح || data.needsClarification || false,
    clarificationQuestion: data.سؤال_توضيحي || data.clarificationQuestion || ''
  };
}

/**
 * ⭐ استخراج الحسابات من وصف الحركة
 */
function extractAccountsFromDescription(description) {
  var result = { fromAccount: '', toAccount: '' };
  if (!description) return result;

  // قاموس الأسماء والحسابات
  var nameToAccount = {
    'مصطفى': 'MOSTAFA', 'مصطفي': 'MOSTAFA',
    'سارة': 'SARA', 'ساره': 'SARA',
    'الزوجة': 'WIFE', 'الزوجه': 'WIFE', 'مراتي': 'WIFE', 'زوجتي': 'WIFE',
    'ام سيليا': 'WIFE', 'أم سيليا': 'WIFE',
    'هاجر': 'HAGAR', 'محمد': 'MOHAMED',
    'حسابي': 'MAIN', 'الرئيسي': 'MAIN', 'الخزنة': 'MAIN'
  };

  // البحث عن "من X"
  var fromMatch = description.match(/من عهدة? ([^\s]+)|من ([^\s]+) ل/);
  if (fromMatch) {
    var name = (fromMatch[1] || fromMatch[2] || '').replace(/ة$/, 'ه');
    for (var key in nameToAccount) {
      if (name.indexOf(key) !== -1 || key.indexOf(name) !== -1) {
        result.fromAccount = nameToAccount[key];
        break;
      }
    }
  }

  // البحث عن "لـ Y"
  var toMatch = description.match(/لعهدة? ([^\s]+)|ل([^\s]+)$/);
  if (toMatch) {
    var name2 = (toMatch[1] || toMatch[2] || '').replace(/ة$/, 'ه');
    for (var key2 in nameToAccount) {
      if (name2.indexOf(key2) !== -1 || key2.indexOf(name2) !== -1) {
        result.toAccount = nameToAccount[key2];
        break;
      }
    }
  }

  Logger.log('Extracted: from=' + result.fromAccount + ', to=' + result.toAccount);
  return result;
}

/**
 * ⭐⭐⭐ استخراج الحسابات من الرسالة الأصلية ⭐⭐⭐
 * يحلل نمط "من X الي/لـ Y" بشكل مباشر
 */
function extractAccountsFromOriginalMessage(message) {
  var result = { fromAccount: '', toAccount: '' };
  if (!message) return result;

  // تحويل الأرقام العربية وتنظيف النص
  var text = convertArabicToWesternNumerals(message);
  text = text.replace(/[\u064B-\u065F]/g, ''); // إزالة التشكيل

  Logger.log('Extracting accounts from: ' + text);

  // قاموس الأسماء والحسابات الموسع
  var nameToAccount = {
    'مصطفى': 'MOSTAFA', 'مصطفي': 'MOSTAFA', 'مصطفا': 'MOSTAFA',
    'سارة': 'SARA', 'ساره': 'SARA', 'سارا': 'SARA',
    'مراتي': 'WIFE', 'زوجتي': 'WIFE', 'الزوجة': 'WIFE', 'الزوجه': 'WIFE',
    'ام سيليا': 'WIFE', 'أم سيليا': 'WIFE', 'ام سيلا': 'WIFE',
    'هاجر': 'HAGAR', 'هاجير': 'HAGAR',
    'محمد': 'MOHAMED', 'محمود': 'MOHAMED',
    'حسابي': 'MAIN', 'الرئيسي': 'MAIN', 'الخزنة': 'MAIN', 'عندي': 'MAIN'
  };

  // ⭐ نمط "من X الي/لـ Y" - الأهم
  var transferPattern = /من\s+([^\s,،]+)\s+(?:الي|الى|إلى|ل|لـ)\s+([^\s,،0-9]+)/i;
  var transferMatch = text.match(transferPattern);

  if (transferMatch) {
    var fromName = transferMatch[1].trim();
    var toName = transferMatch[2].trim();

    Logger.log('Transfer pattern found: from=' + fromName + ', to=' + toName);

    // البحث عن الحساب المصدر
    for (var key in nameToAccount) {
      if (fromName.indexOf(key) !== -1 || key.indexOf(fromName) !== -1) {
        result.fromAccount = nameToAccount[key];
        Logger.log('From account matched: ' + key + ' -> ' + result.fromAccount);
        break;
      }
    }

    // البحث عن الحساب الوجهة
    for (var key2 in nameToAccount) {
      if (toName.indexOf(key2) !== -1 || key2.indexOf(toName) !== -1) {
        result.toAccount = nameToAccount[key2];
        Logger.log('To account matched: ' + key2 + ' -> ' + result.toAccount);
        break;
      }
    }
  }

  // ⭐ نمط بديل: "حولت لـ X" أو "لـ X"
  if (!result.toAccount) {
    var toPattern = /(?:حولت?|ارسلت?|بعثت?)\s*(?:ل|لـ|الي|الى|إلى)\s*([^\s,،0-9]+)/i;
    var toMatch = text.match(toPattern);
    if (toMatch) {
      var name = toMatch[1].trim();
      for (var k in nameToAccount) {
        if (name.indexOf(k) !== -1 || k.indexOf(name) !== -1) {
          result.toAccount = nameToAccount[k];
          break;
        }
      }
      // إذا كان "حولت لـ" بدون "من" فالمصدر هو MAIN
      if (result.toAccount && !result.fromAccount) {
        result.fromAccount = 'MAIN';
      }
    }
  }

  Logger.log('Final extracted: from=' + result.fromAccount + ', to=' + result.toAccount);
  return result;
}

/**
 * ⭐⭐⭐ تصحيح التصنيفات المخترعة ⭐⭐⭐
 */
function fixCategory(trans) {
  // قائمة التصنيفات المسموحة
  var validCategories = [
    'راتب', 'دخل إضافي', 'مكافأة', 'استثمار', 'هدية',
    'معيشة', 'طعام', 'مواصلات', 'صحة', 'تعليم', 'ترفيه', 'ملابس', 'اتصالات',
    'سكن', 'خدمات', 'تأمين', 'ضرائب',
    'عهدة', 'جمعية', 'سلف', 'ذهب', 'ادخار',
    'بنك', 'تحويل'
  ];

  // قائمة البنود المسموحة
  var validItems = [
    'راتب أساسي', 'راتب إضافي', 'مكافأة', 'عمولة', 'دخل استثمار', 'إيجار مستلم',
    'طعام وشراب', 'مصروفات منزلية', 'كهرباء', 'ماء', 'غاز', 'إنترنت', 'هاتف',
    'بنزين', 'مواصلات عامة', 'صيانة سيارة',
    'أدوية', 'طبيب', 'مستشفى',
    'مصاريف دراسية', 'كتب', 'دورات',
    'تحويل لعهدة', 'تحويل من عهدة', 'تحويل بين عهد',
    'قسط جمعية', 'قبض جمعية',
    'شراء ذهب', 'بيع ذهب',
    'إيداع ادخار', 'سحب ادخار',
    'سلفة مُعطاة', 'سلفة مُستلمة', 'سداد سلفة'
  ];

  var category = trans.category || '';
  var item = trans.item || '';

  // ⭐ إصلاح "تحويل عهدة" أو "تحويل عهده" -> "عهدة"
  if (category.indexOf('تحويل') !== -1 && category.indexOf('عهد') !== -1) {
    trans.category = 'عهدة';
    if (!item || item.indexOf('تحويل') !== -1) {
      trans.item = 'تحويل بين عهد';
    }
    Logger.log('Fixed category: تحويل عهدة -> عهدة');
  }

  // ⭐ إصلاح "عهدة X" -> "عهدة"
  if (category.indexOf('عهدة') !== -1 || category.indexOf('عهده') !== -1) {
    trans.category = 'عهدة';
  }

  // ⭐ إصلاح تصنيفات الجمعية
  if (category.indexOf('جمعي') !== -1) {
    trans.category = 'جمعية';
    if (!item || trans.nature === 'مصروف') {
      trans.item = 'قسط جمعية';
    } else if (trans.nature === 'إيراد') {
      trans.item = 'قبض جمعية';
    }
  }

  // ⭐ إصلاح "مصروفات" -> "معيشة"
  if (category === 'مصروفات' || category === 'مصروف') {
    trans.category = 'معيشة';
    if (!item) {
      trans.item = 'مصروفات منزلية';
    }
  }

  // ⭐ التحقق من صحة التصنيف
  var isValidCategory = validCategories.some(function(c) {
    return category.indexOf(c) !== -1 || c.indexOf(category) !== -1;
  });

  if (!isValidCategory && category) {
    // محاولة إيجاد أقرب تصنيف
    if (trans.nature === 'تحويل') {
      trans.category = 'عهدة';
    } else if (trans.nature === 'مصروف') {
      trans.category = 'معيشة';
    } else if (trans.nature === 'إيراد') {
      trans.category = 'دخل إضافي';
    }
    Logger.log('Fixed invalid category: ' + category + ' -> ' + trans.category);
  }

  return trans;
}

/**
 * تطبيع اسم العملة
 */
function normalizeCurrency(currency) {
  if (!currency) return 'ريال';

  const map = {
    'sar': 'ريال',
    'ريال': 'ريال',
    'سعودي': 'ريال',
    'egp': 'جنيه',
    'جنيه': 'جنيه',
    'مصري': 'جنيه',
    'usd': 'دولار',
    'دولار': 'دولار',
    'أمريكي': 'دولار',
    'aed': 'درهم',
    'درهم': 'درهم',
    'إماراتي': 'درهم'
  };

  return map[currency.toLowerCase()] || currency;
}

/**
 * تحويل الطبيعة للنوع القديم (للتوافق)
 */
function mapNatureToOldType(nature) {
  const map = {
    'إيراد': 'دخل',
    'مصروف': 'مصروف',
    'تحويل': 'تحويل',
    'استثمار': 'ذهب'
  };
  return map[nature] || nature;
}

/**
 * ⭐ تحويل المعاملات من تنسيق AI للتنسيق الجديد
 */
function convertAITransactionToNew(aiTrans, user) {
  const transaction = {
    nature: aiTrans.nature || aiTrans.طبيعة || '',
    category: aiTrans.category || aiTrans.تصنيف || '',
    item: aiTrans.item || aiTrans.بند || '',
    amount: aiTrans.amount || aiTrans.مبلغ || 0,
    currency: aiTrans.currency || aiTrans.عملة || 'ريال',
    fromAccount: aiTrans.fromAccount || aiTrans.من_حساب || '',
    toAccount: aiTrans.toAccount || aiTrans.إلى_حساب || '',
    convertedAmount: aiTrans.convertedAmount || aiTrans.مبلغ_محول || '',
    convertedCurrency: aiTrans.convertedCurrency || aiTrans.عملة_محول || '',
    exchangeRate: aiTrans.exchangeRate || aiTrans.سعر_صرف || '',
    description: aiTrans.description || aiTrans.وصف || ''
  };

  // تحديد الحسابات تلقائياً إذا لم تُحدد
  if (!transaction.fromAccount && !transaction.toAccount) {
    switch (transaction.nature) {
      case 'إيراد':
        transaction.toAccount = 'MAIN';
        break;
      case 'مصروف':
        transaction.fromAccount = 'MAIN';
        break;
      case 'تحويل':
        transaction.fromAccount = 'MAIN';
        // محاولة تحديد الحساب الوجهة من جهة الاتصال
        if (aiTrans.contact || aiTrans.جهة) {
          const contact = CONTACTS[aiTrans.contact || aiTrans.جهة];
          if (contact && contact.isCustody) {
            transaction.toAccount = contact.account;
          }
        }
        break;
    }
  }

  return transaction;
}

/**
 * توليد استجابة ذكية لاستفسارات المستخدم
 */
function generateSmartResponse(query, context) {
  try {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;

    const prompt = `أنت مساعد محاسبي ذكي. المستخدم يسأل عن بياناته المالية.

البيانات المتاحة:
${JSON.stringify(context, null, 2)}

سؤال المستخدم: "${query}"

أجب بشكل مختصر ومفيد باللغة العربية.`;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    return result.candidates[0].content.parts[0].text;

  } catch (error) {
    Logger.log('Error in generateSmartResponse: ' + error.toString());
    return 'عذراً، لم أستطع معالجة السؤال.';
  }
}

/**
 * تصنيف الحركة تلقائياً
 */
function classifyTransaction(description, nature) {
  try {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;

    const items = getItemsByNature(nature);
    const itemsList = items.map(i => i.item).join('، ');

    const prompt = `صنف هذه الحركة:
الوصف: "${description}"
الطبيعة: ${nature}

البنود المتاحة: ${itemsList}

أرجع اسم البند فقط بدون أي نص إضافي.`;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 50
      }
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    return result.candidates[0].content.parts[0].text.trim();

  } catch (error) {
    Logger.log('Error in classifyTransaction: ' + error.toString());
    return 'أخرى';
  }
}

/**
 * للتوافق: تصنيف التصنيف
 */
function classifyCategory(description, type) {
  const natureMap = {
    'دخل': 'إيراد',
    'مصروف': 'مصروف',
    'تحويل': 'تحويل',
    'صرف_من_عهدة': 'مصروف',
    'إيداع_عهدة': 'تحويل'
  };

  return classifyTransaction(description, natureMap[type] || type);
}
