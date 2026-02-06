/**
 * =====================================================
 * نظام المحاسبة الذكي - إدارة الشيتات
 * Smart Accounting System - Sheets Manager
 * الإصدار 2.0 - نظام القيد المزدوج
 * =====================================================
 */

// =====================================================
// ============== الدوال الأساسية ==============
// =====================================================

/**
 * الحصول على الـ Spreadsheet
 */
function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('لم يتم العثور على الـ Spreadsheet. تأكد من ربط السكريبت بـ Google Sheet.');
  }
  return ss;
}

/**
 * الحصول على شيت أو إنشاؤه
 */
function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }

  return sheet;
}

/**
 * تهيئة الشيت بالهيدرز
 */
function initializeSheet(sheet, sheetName) {
  const headers = getSheetHeaders(sheetName);
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a73e8')
      .setFontColor('white')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // تعيين عرض الأعمدة
    for (let i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 120);
    }
  }
}

/**
 * الحصول على الهيدرز لكل شيت
 */
function getSheetHeaders(sheetName) {
  const headersMap = {
    // ═══════════════ الإعدادات العامة ═══════════════
    'الإعدادات': [
      'المفتاح', 'القيمة', 'الوصف'
    ],

    // ═══════════════ العملات ═══════════════
    'العملات': [
      'الكود', 'الاسم', 'الرمز', 'سعر_الصرف', 'العملة_الأساسية', 'نشط'
    ],

    // ═══════════════ الحسابات (الخزن) ═══════════════
    'الحسابات': [
      'الكود', 'الاسم', 'النوع', 'الفئة', 'المسؤول', 'العملة',
      'الرصيد_الافتتاحي', 'يؤثر_على_الرصيد', 'نشط', 'ملاحظات'
    ],

    // ═══════════════ البنود (شجرة التصنيفات) ═══════════════
    'البنود': [
      'الطبيعة', 'التصنيف', 'البند', 'الكود', 'الحساب_الافتراضي', 'نشط'
    ],

    // ═══════════════ المستخدمين ═══════════════
    'المستخدمين': [
      'ID', 'Telegram_ID', 'الاسم', 'اسم_المستخدم', 'الصلاحية',
      'الحساب_المرتبط', 'نشط', 'تاريخ_الإضافة', 'آخر_نشاط', 'ملاحظات'
    ],

    // ═══════════════ الحركات (القيد المزدوج) ═══════════════
    'الحركات': [
      'ID', 'التاريخ', 'الوقت', 'الطبيعة', 'التصنيف', 'البند',
      'المبلغ', 'العملة', 'من_حساب', 'إلى_حساب',
      'المبلغ_المحول', 'عملة_التحويل', 'سعر_الصرف',
      'الوصف', 'المستخدم', 'Telegram_ID', 'مرجع', 'ملاحظات'
    ],

    // ═══════════════ الأصول ═══════════════
    'الأصول': [
      'ID', 'التاريخ', 'النوع', 'الأصل', 'الكمية', 'الوحدة',
      'سعر_الوحدة', 'العملة', 'الإجمالي', 'الحساب', 'ملاحظات'
    ],

    // ═══════════════ الجمعيات ═══════════════
    'الجمعيات': [
      'ID', 'الاسم', 'المسؤول', 'الحساب', 'قيمة_القسط', 'العملة',
      'عدد_الأشهر', 'ترتيب_القبض', 'تاريخ_البدء', 'تاريخ_القبض_المتوقع',
      'إجمالي_المدفوع', 'إجمالي_المقبوض', 'الحالة', 'ملاحظات'
    ],

    // ═══════════════ السلف ═══════════════
    'السلف': [
      'ID', 'التاريخ', 'النوع', 'الشخص', 'الحساب', 'المبلغ', 'العملة',
      'المبلغ_المتبقي', 'الحالة', 'ملاحظات'
    ]
  };

  return headersMap[sheetName] || [];
}

// =====================================================
// ============== إنشاء النظام ==============
// =====================================================

/**
 * التحقق من كلمة السر
 */
function verifyAdminPassword(password) {
  return password === CONFIG.ADMIN_PASSWORD;
}

/**
 * إنشاء جميع الشيتات
 */
function initializeAllSheets(password) {
  if (!password || !verifyAdminPassword(password)) {
    throw new Error('⛔ كلمة السر غير صحيحة!');
  }

  const sheetNames = Object.values(SHEETS);

  sheetNames.forEach(sheetName => {
    getOrCreateSheet(sheetName);
  });

  // إضافة البيانات الافتراضية
  addDefaultCurrencies();
  addDefaultAccounts();
  addDefaultItems();
  addDefaultSettings();

  // إضافة القوائم المنسدلة
  addAllDropdowns();

  return '✅ تم إنشاء جميع الشيتات بنجاح!';
}

/**
 * إضافة العملات الافتراضية
 */
function addDefaultCurrencies() {
  const sheet = getOrCreateSheet(SHEETS.CURRENCIES);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const rows = DEFAULT_CURRENCIES.map(c => [
      c.code, c.name, c.symbol, c.rate, c.isBase ? 'نعم' : 'لا', 'نعم'
    ]);
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}

/**
 * إضافة الحسابات الافتراضية
 */
function addDefaultAccounts() {
  const sheet = getOrCreateSheet(SHEETS.ACCOUNTS);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const rows = DEFAULT_ACCOUNTS.map(a => [
      a.code, a.name, a.type, a.category, a.responsible, a.currency,
      a.openingBalance, a.affectsBalance ? 'نعم' : 'لا', a.active ? 'نعم' : 'لا', ''
    ]);
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}

/**
 * إضافة البنود الافتراضية
 */
function addDefaultItems() {
  const sheet = getOrCreateSheet(SHEETS.ITEMS);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const rows = DEFAULT_ITEMS.map(i => [
      i.nature, i.category, i.item, i.code, i.defaultAccount, i.active ? 'نعم' : 'لا'
    ]);
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}

/**
 * إضافة الإعدادات الافتراضية
 */
function addDefaultSettings() {
  const sheet = getOrCreateSheet(SHEETS.SETTINGS);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const settings = [
      ['SYSTEM_NAME', CONFIG.SYSTEM_NAME, 'اسم النظام'],
      ['VERSION', CONFIG.VERSION, 'إصدار النظام'],
      ['DEFAULT_CURRENCY', CONFIG.DEFAULT_CURRENCY, 'العملة الافتراضية'],
      ['TIMEZONE', CONFIG.TIMEZONE, 'المنطقة الزمنية'],
      ['ENABLE_ASSETS', 'نعم', 'تفعيل الأصول (ذهب/أسهم)'],
      ['ENABLE_ASSOCIATIONS', 'نعم', 'تفعيل الجمعيات'],
      ['ENABLE_LOANS', 'نعم', 'تفعيل السلف']
    ];
    sheet.getRange(2, 1, settings.length, settings[0].length).setValues(settings);
  }
}

/**
 * إضافة جميع القوائم المنسدلة
 */
function addAllDropdowns() {
  addAccountsDropdowns();
  addItemsDropdowns();
  addTransactionsDropdowns();
  addCurrenciesDropdowns();
}

/**
 * القوائم المنسدلة لشيت الحسابات
 */
function addAccountsDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.ACCOUNTS);
  const lastRow = 100;

  // عمود النوع (3)
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.accountTypes, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 3, lastRow, 1).setDataValidation(typeRule);

  // عمود العملة (6)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.currencies, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, lastRow, 1).setDataValidation(currencyRule);

  // عمود يؤثر على الرصيد (8)
  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.yesNo, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 8, lastRow, 1).setDataValidation(yesNoRule);

  // عمود نشط (9)
  sheet.getRange(2, 9, lastRow, 1).setDataValidation(yesNoRule);
}

/**
 * القوائم المنسدلة لشيت البنود
 */
function addItemsDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.ITEMS);
  const lastRow = 200;

  // عمود الطبيعة (1)
  const natureRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.movementNatures, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 1, lastRow, 1).setDataValidation(natureRule);

  // عمود نشط (6)
  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.yesNo, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, lastRow, 1).setDataValidation(yesNoRule);
}

/**
 * القوائم المنسدلة لشيت الحركات
 */
function addTransactionsDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
  const lastRow = 1000;

  // عمود الطبيعة (4)
  const natureRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.movementNatures, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 4, lastRow, 1).setDataValidation(natureRule);

  // عمود العملة (8)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.currencies, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 8, lastRow, 1).setDataValidation(currencyRule);

  // عمود عملة التحويل (12)
  sheet.getRange(2, 12, lastRow, 1).setDataValidation(currencyRule);
}

/**
 * القوائم المنسدلة لشيت العملات
 */
function addCurrenciesDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.CURRENCIES);
  const lastRow = 20;

  // عمود العملة الأساسية (5)
  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.yesNo, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, lastRow, 1).setDataValidation(yesNoRule);

  // عمود نشط (6)
  sheet.getRange(2, 6, lastRow, 1).setDataValidation(yesNoRule);
}

// =====================================================
// ============== إدارة الحسابات ==============
// =====================================================

/**
 * الحصول على جميع الحسابات النشطة
 */
function getAllAccounts() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ACCOUNTS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return DEFAULT_ACCOUNTS;

    const accounts = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[8] === 'نعم' || row[8] === true) { // نشط
        accounts.push({
          code: row[0],
          name: row[1],
          type: row[2],
          category: row[3],
          responsible: row[4],
          currency: row[5],
          openingBalance: row[6] || 0,
          affectsBalance: row[7] === 'نعم' || row[7] === true,
          active: true
        });
      }
    }
    return accounts.length > 0 ? accounts : DEFAULT_ACCOUNTS;
  } catch (error) {
    Logger.log('Error in getAllAccounts: ' + error.toString());
    return DEFAULT_ACCOUNTS;
  }
}

/**
 * الحصول على حساب بالكود
 */
function getAccountByCode(code) {
  const accounts = getAllAccounts();
  return accounts.find(a => a.code === code) || null;
}

/**
 * الحصول على حسابات العهدة
 */
function getCustodyAccounts() {
  const accounts = getAllAccounts();
  return accounts.filter(a => a.type === 'عهدة');
}

/**
 * الحصول على أكواد الحسابات للذكاء الاصطناعي
 */
function getAccountCodesForAI() {
  const accounts = getAllAccounts();
  return accounts.map(a => `${a.code} (${a.name})`).join('، ');
}

/**
 * حساب رصيد حساب معين
 */
function calculateAccountBalance(accountCode) {
  try {
    const account = getAccountByCode(accountCode);
    if (!account || !account.affectsBalance) return 0;

    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    let balance = account.openingBalance || 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const fromAccount = row[8];  // من_حساب
      const toAccount = row[9];    // إلى_حساب
      const amount = parseFloat(row[6]) || 0;  // المبلغ

      // إذا كان الحساب هو المصدر (خصم)
      if (fromAccount === accountCode) {
        balance -= amount;
      }

      // إذا كان الحساب هو الوجهة (إضافة)
      if (toAccount === accountCode) {
        balance += amount;
      }
    }

    return balance;
  } catch (error) {
    Logger.log('Error calculating balance: ' + error.toString());
    return 0;
  }
}

/**
 * الحصول على أرصدة جميع الحسابات
 */
function getAllAccountBalances() {
  const accounts = getAllAccounts();
  const balances = {};

  accounts.forEach(account => {
    if (account.affectsBalance) {
      balances[account.code] = {
        name: account.name,
        balance: calculateAccountBalance(account.code),
        currency: account.currency
      };
    }
  });

  return balances;
}

// =====================================================
// ============== إدارة البنود ==============
// =====================================================

/**
 * الحصول على جميع البنود النشطة
 */
function getAllItems() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ITEMS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return DEFAULT_ITEMS;

    const items = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[5] === 'نعم' || row[5] === true) { // نشط
        items.push({
          nature: row[0],
          category: row[1],
          item: row[2],
          code: row[3],
          defaultAccount: row[4],
          active: true
        });
      }
    }
    return items.length > 0 ? items : DEFAULT_ITEMS;
  } catch (error) {
    Logger.log('Error in getAllItems: ' + error.toString());
    return DEFAULT_ITEMS;
  }
}

/**
 * الحصول على البنود حسب الطبيعة
 */
function getItemsByNature(nature) {
  const items = getAllItems();
  return items.filter(i => i.nature === nature);
}

/**
 * الحصول على البنود حسب التصنيف
 */
function getItemsByCategory(category) {
  const items = getAllItems();
  return items.filter(i => i.category === category);
}

/**
 * البحث عن بند بالكود أو الاسم
 */
function findItem(searchText) {
  const items = getAllItems();
  const normalized = normalizeArabic(searchText);

  return items.find(item =>
    normalizeArabic(item.item).includes(normalized) ||
    normalizeArabic(item.code).includes(normalized) ||
    normalizeArabic(item.category).includes(normalized)
  );
}

/**
 * الحصول على البنود للذكاء الاصطناعي
 */
function getItemsForAI() {
  const items = getAllItems();
  const grouped = {};

  items.forEach(item => {
    if (!grouped[item.nature]) {
      grouped[item.nature] = [];
    }
    grouped[item.nature].push(item.item);
  });

  let result = '';
  for (const [nature, itemList] of Object.entries(grouped)) {
    result += `${nature}: ${itemList.join('، ')}\n`;
  }

  return result;
}

// =====================================================
// ============== إدارة العملات ==============
// =====================================================

/**
 * الحصول على جميع العملات
 */
function getAllCurrencies() {
  try {
    const sheet = getOrCreateSheet(SHEETS.CURRENCIES);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return DEFAULT_CURRENCIES;

    const currencies = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[5] === 'نعم' || row[5] === true) { // نشط
        currencies.push({
          code: row[0],
          name: row[1],
          symbol: row[2],
          rate: parseFloat(row[3]) || 1,
          isBase: row[4] === 'نعم' || row[4] === true
        });
      }
    }
    return currencies.length > 0 ? currencies : DEFAULT_CURRENCIES;
  } catch (error) {
    Logger.log('Error in getAllCurrencies: ' + error.toString());
    return DEFAULT_CURRENCIES;
  }
}

/**
 * الحصول على عملة بالكود أو الاسم
 */
function getCurrency(codeOrName) {
  const currencies = getAllCurrencies();
  const normalized = normalizeArabic(codeOrName);

  return currencies.find(c =>
    c.code === codeOrName ||
    normalizeArabic(c.name).includes(normalized) ||
    normalized.includes(normalizeArabic(c.name))
  );
}

/**
 * تحويل مبلغ بين عملتين
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);

  if (!from || !to) return amount;

  // التحويل عبر العملة الأساسية
  const baseAmount = amount * from.rate;
  return baseAmount / to.rate;
}

// =====================================================
// ============== إدارة الحركات ==============
// =====================================================

/**
 * إنشاء ID فريد للحركة
 */
function generateTransactionId() {
  const now = new Date();
  const datePart = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd');
  const timePart = Utilities.formatDate(now, CONFIG.TIMEZONE, 'HHmmss');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TRX-${datePart}-${timePart}-${random}`;
}

/**
 * ⭐ حفظ حركة جديدة (القيد المزدوج)
 */
function saveTransaction(transactionData, user) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const now = new Date();

    const row = [
      generateTransactionId(),
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'HH:mm:ss'),
      transactionData.nature || '',           // الطبيعة
      transactionData.category || '',         // التصنيف
      transactionData.item || '',             // البند
      transactionData.amount || 0,            // المبلغ
      transactionData.currency || 'ريال',     // العملة
      transactionData.fromAccount || '',      // من_حساب
      transactionData.toAccount || '',        // إلى_حساب
      transactionData.convertedAmount || '',  // المبلغ_المحول
      transactionData.convertedCurrency || '',// عملة_التحويل
      transactionData.exchangeRate || '',     // سعر_الصرف
      transactionData.description || '',      // الوصف
      user?.name || 'غير معروف',              // المستخدم
      user?.telegramId || '',                 // Telegram_ID
      transactionData.reference || '',        // مرجع
      transactionData.notes || ''             // ملاحظات
    ];

    sheet.appendRow(row);
    Logger.log('✅ Transaction saved: ' + row[0]);

    return {
      success: true,
      transactionId: row[0],
      message: buildConfirmationMessage(transactionData)
    };
  } catch (error) {
    Logger.log('❌ Error saving transaction: ' + error.toString());
    return {
      success: false,
      message: '❌ فشل حفظ الحركة: ' + error.message
    };
  }
}

/**
 * ⭐ حفظ حركات متعددة (للتحويلات المركبة)
 */
function saveMultipleTransactions(transactions, user) {
  const results = [];
  const reference = generateTransactionId(); // مرجع مشترك للحركات المرتبطة

  for (const trans of transactions) {
    trans.reference = reference;
    const result = saveTransaction(trans, user);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;

  return {
    success: successCount === transactions.length,
    savedCount: successCount,
    totalCount: transactions.length,
    results: results,
    message: `✅ تم حفظ ${successCount} من ${transactions.length} حركة`
  };
}

/**
 * بناء رسالة التأكيد
 */
function buildConfirmationMessage(trans) {
  let msg = '✅ *تم تسجيل الحركة بنجاح*\n';
  msg += '━━━━━━━━━━━━━━━━━━━━━\n';

  const natureEmoji = {
    'إيراد': '💰',
    'مصروف': '💸',
    'تحويل': '🔄',
    'استثمار': '📈'
  };

  msg += `${natureEmoji[trans.nature] || '📝'} ${trans.nature}\n`;
  msg += `💵 المبلغ: ${trans.amount} ${trans.currency}\n`;

  if (trans.fromAccount && trans.toAccount) {
    msg += `📤 من: ${trans.fromAccount}\n`;
    msg += `📥 إلى: ${trans.toAccount}\n`;
  } else if (trans.fromAccount) {
    msg += `📤 من: ${trans.fromAccount}\n`;
  } else if (trans.toAccount) {
    msg += `📥 إلى: ${trans.toAccount}\n`;
  }

  if (trans.convertedAmount) {
    msg += `💱 المحول: ${trans.convertedAmount} ${trans.convertedCurrency}\n`;
  }

  if (trans.exchangeRate) {
    msg += `📊 سعر الصرف: ${trans.exchangeRate}\n`;
  }

  if (trans.category) {
    msg += `📂 التصنيف: ${trans.category}\n`;
  }

  if (trans.description) {
    msg += `📝 ${trans.description}\n`;
  }

  return msg;
}

// =====================================================
// ============== إدارة المستخدمين ==============
// =====================================================

/**
 * الحصول على مستخدم بـ Telegram ID
 */
function getUserByTelegramId(telegramId) {
  try {
    const sheet = getOrCreateSheet(SHEETS.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == telegramId) {
        return {
          id: data[i][0],
          telegramId: data[i][1],
          name: data[i][2],
          username: data[i][3],
          role: data[i][4],
          linkedAccount: data[i][5],
          active: data[i][6] === 'نعم' || data[i][6] === true,
          rowIndex: i + 1
        };
      }
    }
    return null;
  } catch (error) {
    Logger.log('Error getting user: ' + error.toString());
    return null;
  }
}

/**
 * إضافة مستخدم جديد
 */
function addUser(telegramId, name, username, role = 'مستخدم', linkedAccount = '') {
  try {
    const sheet = getOrCreateSheet(SHEETS.USERS);
    const now = new Date();

    const id = sheet.getLastRow();

    const row = [
      id,
      telegramId,
      name,
      username || '',
      role,
      linkedAccount,
      'نعم',
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      ''
    ];

    sheet.appendRow(row);
    Logger.log('✅ User added: ' + name);

    return {
      id: id,
      telegramId: telegramId,
      name: name,
      username: username,
      role: role,
      linkedAccount: linkedAccount,
      active: true
    };
  } catch (error) {
    Logger.log('Error adding user: ' + error.toString());
    return null;
  }
}

/**
 * تحديث آخر نشاط للمستخدم
 */
function updateUserActivity(user) {
  try {
    if (!user || !user.rowIndex) return;

    const sheet = getOrCreateSheet(SHEETS.USERS);
    const now = new Date();

    sheet.getRange(user.rowIndex, 9).setValue(
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
    );
  } catch (error) {
    Logger.log('Error updating activity: ' + error.toString());
  }
}

/**
 * التحقق من صلاحية المستخدم
 */
function checkUserPermission(user, requiredRole) {
  if (!user || !user.active) return false;

  const roleHierarchy = {
    'مدير': 5,
    'مالك': 4,
    'أمين_عهدة': 3,
    'مستخدم': 2,
    'محدود': 1
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

// =====================================================
// ============== دوال مساعدة ==============
// =====================================================

/**
 * تطبيع النص العربي
 */
function normalizeArabic(text) {
  if (!text) return '';
  return text.toString()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * الحصول على حركات اليوم
 */
function getTodayTransactions() {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();
    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');

    const transactions = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === today) {
        transactions.push({
          id: data[i][0],
          date: data[i][1],
          time: data[i][2],
          nature: data[i][3],
          category: data[i][4],
          item: data[i][5],
          amount: data[i][6],
          currency: data[i][7],
          fromAccount: data[i][8],
          toAccount: data[i][9],
          description: data[i][13]
        });
      }
    }
    return transactions;
  } catch (error) {
    Logger.log('Error getting today transactions: ' + error.toString());
    return [];
  }
}

/**
 * الحصول على حركات فترة معينة
 */
function getTransactionsByPeriod(startDate, endDate) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const transactions = [];
    for (let i = 1; i < data.length; i++) {
      const transDate = new Date(data[i][1]);
      if (transDate >= startDate && transDate <= endDate) {
        transactions.push({
          id: data[i][0],
          date: data[i][1],
          time: data[i][2],
          nature: data[i][3],
          category: data[i][4],
          item: data[i][5],
          amount: parseFloat(data[i][6]) || 0,
          currency: data[i][7],
          fromAccount: data[i][8],
          toAccount: data[i][9],
          convertedAmount: data[i][10],
          convertedCurrency: data[i][11],
          exchangeRate: data[i][12],
          description: data[i][13],
          user: data[i][14]
        });
      }
    }
    return transactions;
  } catch (error) {
    Logger.log('Error getting transactions by period: ' + error.toString());
    return [];
  }
}

/**
 * الحصول على حركات حساب معين
 */
function getAccountTransactions(accountCode, limit = 50) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const transactions = [];
    for (let i = data.length - 1; i >= 1 && transactions.length < limit; i--) {
      if (data[i][8] === accountCode || data[i][9] === accountCode) {
        transactions.push({
          id: data[i][0],
          date: data[i][1],
          time: data[i][2],
          nature: data[i][3],
          category: data[i][4],
          item: data[i][5],
          amount: parseFloat(data[i][6]) || 0,
          currency: data[i][7],
          fromAccount: data[i][8],
          toAccount: data[i][9],
          description: data[i][13]
        });
      }
    }
    return transactions;
  } catch (error) {
    Logger.log('Error getting account transactions: ' + error.toString());
    return [];
  }
}

/**
 * حذف آخر حركة (للتراجع)
 */
function deleteLastTransaction(userId) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    // البحث عن آخر حركة للمستخدم
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][15] == userId) { // Telegram_ID
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: '✅ تم حذف آخر حركة',
          deletedTransaction: data[i]
        };
      }
    }

    return {
      success: false,
      message: '❌ لا توجد حركات لحذفها'
    };
  } catch (error) {
    Logger.log('Error deleting transaction: ' + error.toString());
    return {
      success: false,
      message: '❌ فشل حذف الحركة: ' + error.message
    };
  }
}

// =====================================================
// ============== دوال للتوافق مع النظام القديم ==============
// =====================================================

/**
 * للتوافق: الحصول على أكواد التصنيفات للذكاء الاصطناعي
 */
function getCategoryCodesForAI(type) {
  const natureMap = {
    'دخل': 'إيراد',
    'مصروف': 'مصروف',
    'تحويل': 'تحويل',
    'عهدة': 'مصروف' // مصروفات العهدة تحت المصروفات
  };

  const items = getItemsByNature(natureMap[type] || type);
  return items.map(i => i.item).join('، ');
}

/**
 * للتوافق: الحصول على التصنيفات من الشيت
 */
function getCategoriesFromSheet(type) {
  const items = getItemsByNature(type);
  return items.map(i => ({
    كود: i.code,
    اسم: i.item,
    عملة: 'ريال'
  }));
}

/**
 * للتوافق: البحث عن تصنيف مطابق
 */
function findMatchingCategory(keyword, type) {
  const item = findItem(keyword);
  return item ? item.item : null;
}
