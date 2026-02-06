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
 * 🧹 حذف جميع الشيتات القديمة
 * تستخدم قبل إعادة إنشاء النظام من الصفر
 */
function deleteAllSheets() {
  Logger.log('🧹 حذف جميع الشيتات...');
  const ss = getSpreadsheet();
  const sheets = ss.getSheets();

  // Google Sheets يتطلب وجود شيت واحد على الأقل
  // نتحقق إذا كان الشيت المؤقت موجود، وإلا ننشئه
  let tempSheet = ss.getSheetByName('_temp_setup_');
  if (!tempSheet) {
    tempSheet = ss.insertSheet('_temp_setup_');
  }

  // حذف جميع الشيتات الأخرى
  sheets.forEach(sheet => {
    if (sheet.getName() !== '_temp_setup_') {
      try {
        ss.deleteSheet(sheet);
        Logger.log('   🗑️ تم حذف: ' + sheet.getName());
      } catch (e) {
        // تجاهل الأخطاء (قد يكون الشيت محمياً)
        Logger.log('   ⚠️ تعذر حذف: ' + sheet.getName());
      }
    }
  });

  // الآن سنحذف الشيت المؤقت بعد إنشاء الشيتات الجديدة
  return tempSheet;
}

/**
 * ⭐ إنشاء النظام من الصفر (بدون كلمة سر)
 * شغّل هذه الدالة مرة واحدة لإنشاء كل الشيتات والبيانات
 * ⚠️ هذه الدالة تحذف كل الشيتات القديمة أولاً!
 */
function setupSystemFromScratch() {
  Logger.log('🚀 بدء إنشاء النظام من الصفر...');

  try {
    // 0. حذف جميع الشيتات القديمة
    Logger.log('🧹 تنظيف الشيتات القديمة...');
    const tempSheet = deleteAllSheets();

    // 1. إنشاء جميع الشيتات
    Logger.log('📋 إنشاء الشيتات...');
    const sheetNames = Object.values(SHEETS);
    sheetNames.forEach(sheetName => {
      getOrCreateSheet(sheetName);
      Logger.log('   ✓ ' + sheetName);
    });

    // حذف الشيت المؤقت
    try {
      const ss = getSpreadsheet();
      ss.deleteSheet(tempSheet);
      Logger.log('   🗑️ تم حذف الشيت المؤقت');
    } catch (e) {
      // تجاهل إذا فشل الحذف
    }

    // 2. إضافة البيانات الافتراضية
    Logger.log('💰 إضافة العملات...');
    addDefaultCurrencies();

    Logger.log('🏦 إضافة الحسابات...');
    addDefaultAccounts();

    Logger.log('📂 إضافة البنود...');
    addDefaultItems();

    Logger.log('⚙️ إضافة الإعدادات...');
    addDefaultSettings();

    // 3. إضافة القوائم المنسدلة
    Logger.log('📝 إضافة القوائم المنسدلة...');
    addAllDropdowns();

    // 4. إضافة المستخدم الافتراضي (المدير)
    Logger.log('👤 إضافة المستخدم الافتراضي...');
    addDefaultAdmin();

    // 5. تنسيق الشيتات
    Logger.log('🎨 تنسيق الشيتات...');
    formatAllSheets();

    Logger.log('✅ تم إنشاء النظام بنجاح!');
    return '✅ تم إنشاء النظام من الصفر بنجاح!\n\nالشيتات المنشأة:\n- ' + sheetNames.join('\n- ');

  } catch (error) {
    Logger.log('❌ خطأ: ' + error.toString());
    throw error;
  }
}

/**
 * إنشاء جميع الشيتات (مع كلمة سر)
 */
function initializeAllSheets(password) {
  if (password && !verifyAdminPassword(password)) {
    throw new Error('⛔ كلمة السر غير صحيحة!');
  }

  return setupSystemFromScratch();
}

/**
 * إضافة المستخدم الافتراضي (المدير)
 */
function addDefaultAdmin() {
  const sheet = getOrCreateSheet(SHEETS.USERS);
  const existingData = sheet.getDataRange().getValues();

  // تحقق من وجود المدير
  let adminExists = false;
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][1] == '786700586') {
      adminExists = true;
      break;
    }
  }

  if (!adminExists) {
    const now = new Date();
    const row = [
      1,
      '786700586',
      'Adel',
      'adelsolmn',
      'مدير',
      'MAIN',
      'نعم',
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      'المدير الافتراضي'
    ];
    sheet.appendRow(row);
  }
}

/**
 * تنسيق جميع الشيتات
 */
function formatAllSheets() {
  const ss = getSpreadsheet();

  Object.values(SHEETS).forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      // تجميد الصف الأول
      sheet.setFrozenRows(1);

      // تنسيق الهيدر
      const lastCol = sheet.getLastColumn();
      if (lastCol > 0) {
        sheet.getRange(1, 1, 1, lastCol)
          .setBackground('#1a73e8')
          .setFontColor('white')
          .setFontWeight('bold')
          .setHorizontalAlignment('center');

        // محاذاة البيانات للعربية
        const lastRow = Math.max(sheet.getLastRow(), 2);
        sheet.getRange(2, 1, lastRow - 1, lastCol)
          .setHorizontalAlignment('right');
      }
    }
  });
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

  // ⭐ عمود التصنيف (5) - من شيت البنود
  const categories = getUniqueCategoriesFromItems();
  if (categories.length > 0) {
    const categoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(categories, true)
      .setAllowInvalid(true)  // السماح بقيم أخرى
      .build();
    sheet.getRange(2, 5, lastRow, 1).setDataValidation(categoryRule);
  }

  // ⭐ عمود البند (6) - من شيت البنود
  const items = getUniqueItemsFromItems();
  if (items.length > 0) {
    const itemRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(items, true)
      .setAllowInvalid(true)  // السماح بقيم أخرى
      .build();
    sheet.getRange(2, 6, lastRow, 1).setDataValidation(itemRule);
  }

  // عمود العملة (8)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DROPDOWN_LISTS.currencies, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 8, lastRow, 1).setDataValidation(currencyRule);

  // ⭐ عمود من_حساب (9) - من شيت الحسابات
  const accountCodes = getAccountCodesForDropdown();
  if (accountCodes.length > 0) {
    const accountRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(accountCodes, true)
      .setAllowInvalid(true)  // السماح بالفراغ
      .build();
    sheet.getRange(2, 9, lastRow, 1).setDataValidation(accountRule);

    // ⭐ عمود إلى_حساب (10)
    sheet.getRange(2, 10, lastRow, 1).setDataValidation(accountRule);
  }

  // عمود عملة التحويل (12)
  sheet.getRange(2, 12, lastRow, 1).setDataValidation(currencyRule);
}

/**
 * الحصول على التصنيفات الفريدة من شيت البنود
 */
function getUniqueCategoriesFromItems() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ITEMS);
    const data = sheet.getDataRange().getValues();
    const categories = new Set();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) {  // عمود التصنيف
        categories.add(data[i][1]);
      }
    }

    return Array.from(categories);
  } catch (e) {
    Logger.log('Error getting categories: ' + e.toString());
    return [];
  }
}

/**
 * الحصول على البنود الفريدة من شيت البنود
 */
function getUniqueItemsFromItems() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ITEMS);
    const data = sheet.getDataRange().getValues();
    const items = new Set();

    for (let i = 1; i < data.length; i++) {
      if (data[i][2]) {  // عمود البند
        items.add(data[i][2]);
      }
    }

    return Array.from(items);
  } catch (e) {
    Logger.log('Error getting items: ' + e.toString());
    return [];
  }
}

/**
 * الحصول على أكواد الحسابات للقوائم المنسدلة
 */
function getAccountCodesForDropdown() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ACCOUNTS);
    const data = sheet.getDataRange().getValues();
    const codes = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][8] === 'نعم') {  // الكود + نشط
        codes.push(data[i][0]);  // الكود فقط
      }
    }

    return codes;
  } catch (e) {
    Logger.log('Error getting account codes: ' + e.toString());
    return [];
  }
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
 * حساب رصيد حساب معين (بكل العملات)
 * @param {string} accountCode - كود الحساب
 * @returns {object} - {SAR: 0, EGP: 0, USD: 0}
 */
function calculateAccountBalance(accountCode) {
  try {
    const account = getAccountByCode(accountCode);
    if (!account) return { SAR: 0, EGP: 0, USD: 0 };

    // إذا كان الحساب لا يؤثر على الرصيد (مثل المستفيدين)
    if (!account.affectsBalance) return { SAR: 0, EGP: 0, USD: 0 };

    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    // الأرصدة بكل عملة
    let balances = {
      SAR: 0,
      EGP: 0,
      USD: 0
    };

    // الرصيد الافتتاحي
    if (account.openingBalance) {
      const currency = account.currency || 'SAR';
      balances[currency] = (balances[currency] || 0) + account.openingBalance;
    }

    // Transaction columns:
    // 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
    // 8:FromAccount, 9:ToAccount, 10:ConvertedAmount, 11:ConvertedCurrency, 12:ExchangeRate

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const fromAccount = row[8];  // من_حساب
      const toAccount = row[9];    // إلى_حساب
      const amount = parseFloat(row[6]) || 0;  // المبلغ
      const currency = normalizeCurrency(row[7]) || 'SAR';  // العملة
      const convertedAmount = parseFloat(row[10]) || 0;  // المبلغ المحول
      const convertedCurrency = normalizeCurrency(row[11]);  // عملة التحويل

      // إذا كان الحساب هو المصدر (خصم)
      if (fromAccount === accountCode) {
        balances[currency] = (balances[currency] || 0) - amount;
      }

      // إذا كان الحساب هو الوجهة (إضافة)
      if (toAccount === accountCode) {
        // إذا كان هناك مبلغ محول، استخدمه
        if (convertedAmount && convertedCurrency) {
          balances[convertedCurrency] = (balances[convertedCurrency] || 0) + convertedAmount;
        } else {
          balances[currency] = (balances[currency] || 0) + amount;
        }
      }
    }

    return balances;
  } catch (error) {
    Logger.log('Error calculating balance: ' + error.toString());
    return { SAR: 0, EGP: 0, USD: 0 };
  }
}

/**
 * تطبيع اسم العملة
 */
function normalizeCurrency(currency) {
  if (!currency) return 'SAR';

  const currencyMap = {
    'ريال': 'SAR',
    'ر.س': 'SAR',
    'SAR': 'SAR',
    'جنيه': 'EGP',
    'ج.م': 'EGP',
    'EGP': 'EGP',
    'دولار': 'USD',
    '$': 'USD',
    'USD': 'USD',
    'درهم': 'AED',
    'AED': 'AED'
  };

  return currencyMap[currency] || currency;
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
 * ⭐ مطابقة البند مع قاعدة البيانات
 * يبحث عن أقرب بند صالح بناءً على الطبيعة والتصنيف والبند والحسابات
 * يُرجع {category, item} من قاعدة البيانات أو القيم الأصلية إذا لم يجد تطابق
 */
function resolveTransactionItem(nature, category, item, fromAccount, toAccount) {
  try {
    var items = getAllItems();
    if (!items || items.length === 0) return { category: category, item: item };

    var normalizedCategory = normalizeArabic(category || '');
    var normalizedItem = normalizeArabic(item || '');

    // ⭐ 1. تطابق مباشر: نفس الطبيعة + نفس التصنيف + نفس البند
    var exactMatch = items.find(function(i) {
      return i.nature === nature &&
             normalizeArabic(i.category) === normalizedCategory &&
             normalizeArabic(i.item) === normalizedItem;
    });
    if (exactMatch) return { category: exactMatch.category, item: exactMatch.item };

    // ⭐ 2. تطابق ذكي بالحسابات (للتحويلات) - أولوية عالية لأنها الأكثر دقة
    if (nature === 'تحويل' && fromAccount && toAccount) {
      var accountMatch = items.find(function(i) {
        return i.nature === 'تحويل' &&
               i.defaultAccount &&
               i.defaultAccount.indexOf(fromAccount) !== -1 &&
               i.defaultAccount.indexOf(toAccount) !== -1;
      });
      if (accountMatch) return { category: accountMatch.category, item: accountMatch.item };

      // تطابق بحساب الوجهة فقط
      var toAccountMatch = items.find(function(i) {
        return i.nature === 'تحويل' &&
               i.defaultAccount &&
               i.defaultAccount.indexOf(toAccount) !== -1;
      });
      if (toAccountMatch) return { category: toAccountMatch.category, item: toAccountMatch.item };
    }

    // ⭐ 3. تطابق بحساب المصدر للمصروفات من العهدة - أولوية عالية
    if (nature === 'مصروف' && fromAccount && fromAccount !== 'MAIN') {
      var custodyExpenseMatch = items.find(function(i) {
        return i.nature === 'مصروف' &&
               i.category === 'صرف_عهدة' &&
               i.defaultAccount === fromAccount;
      });
      if (custodyExpenseMatch) return { category: custodyExpenseMatch.category, item: custodyExpenseMatch.item };
    }

    // ⭐ 4. تطابق بالطبيعة والبند فقط
    if (normalizedItem) {
      var itemMatch = items.find(function(i) {
        return i.nature === nature && normalizeArabic(i.item) === normalizedItem;
      });
      if (itemMatch) return { category: itemMatch.category, item: itemMatch.item };
    }

    // ⭐ 5. تطابق جزئي بالبند (يحتوي) - فقط إذا كان البند غير فارغ
    if (normalizedItem && normalizedItem.length > 1) {
      var partialItemMatch = items.find(function(i) {
        return i.nature === nature && (
          normalizeArabic(i.item).indexOf(normalizedItem) !== -1 ||
          normalizedItem.indexOf(normalizeArabic(i.item)) !== -1
        );
      });
      if (partialItemMatch) return { category: partialItemMatch.category, item: partialItemMatch.item };
    }

    // ⭐ 6. تطابق بالطبيعة والتصنيف فقط (أول بند في نفس التصنيف)
    if (normalizedCategory) {
      var categoryMatch = items.find(function(i) {
        return i.nature === nature && normalizeArabic(i.category) === normalizedCategory;
      });
      if (categoryMatch) return { category: categoryMatch.category, item: categoryMatch.item };
    }

    Logger.log('⚠️ resolveTransactionItem: no match found for nature=' + nature +
               ', category=' + category + ', item=' + item);
    return { category: category || '', item: item || '' };

  } catch (error) {
    Logger.log('Error in resolveTransactionItem: ' + error.toString());
    return { category: category || '', item: item || '' };
  }
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
 * ⭐ دالة التوافق: إضافة معاملة (للتوافق مع الكود القديم)
 * تحول البيانات من التنسيق القديم للجديد ثم تحفظها
 */
function addTransaction(transData) {
  try {
    Logger.log('=== addTransaction (compatibility) ===');
    Logger.log('Input: ' + JSON.stringify(transData));

    // تحويل البيانات من التنسيق القديم للجديد
    const newFormat = {
      // الطبيعة من النوع القديم
      nature: mapOldTypeToNature(transData.type) || transData.nature || transData.طبيعة || '',
      category: transData.category || transData.تصنيف || '',
      item: transData.item || transData.بند || '',
      amount: parseFloat(transData.amount || transData.مبلغ) || 0,
      currency: transData.currency || transData.عملة || 'ريال',

      // ⭐ تحديد من/إلى حساب
      fromAccount: transData.fromAccount || transData.from_account || transData.من_حساب || '',
      toAccount: transData.toAccount || transData.to_account || transData.إلى_حساب || '',

      // التحويل
      convertedAmount: parseFloat(transData.amount_received || transData.convertedAmount || transData.مبلغ_محول) || null,
      convertedCurrency: transData.currency_received || transData.convertedCurrency || transData.عملة_محول || '',
      exchangeRate: parseFloat(transData.exchange_rate || transData.exchangeRate || transData.سعر_صرف) || null,

      description: transData.description || transData.وصف || '',
      notes: transData.notes || transData.ملاحظات || ''
    };

    // ⭐⭐⭐ استخراج الحسابات من الوصف إذا كانت فارغة ⭐⭐⭐
    if (newFormat.nature === 'تحويل' && (!newFormat.fromAccount || !newFormat.toAccount)) {
      var extracted = extractAccountsFromDescription(newFormat.description);
      if (extracted.fromAccount && !newFormat.fromAccount) {
        newFormat.fromAccount = extracted.fromAccount;
        Logger.log('Extracted fromAccount from description: ' + extracted.fromAccount);
      }
      if (extracted.toAccount && !newFormat.toAccount) {
        newFormat.toAccount = extracted.toAccount;
        Logger.log('Extracted toAccount from description: ' + extracted.toAccount);
      }
    }

    // ⭐ تحديد الحسابات تلقائياً حسب نوع الحركة (فقط إذا لا تزال فارغة)
    if (!newFormat.fromAccount && !newFormat.toAccount) {
      switch (newFormat.nature) {
        case 'إيراد':
          newFormat.toAccount = 'MAIN';
          break;
        case 'مصروف':
          newFormat.fromAccount = 'MAIN';
          break;
        case 'تحويل':
          newFormat.fromAccount = 'MAIN';
          // تحديد الوجهة من جهة الاتصال
          if (transData.contact) {
            var contact = CONTACTS[transData.contact];
            if (contact && contact.account) {
              newFormat.toAccount = contact.account;
            } else {
              newFormat.toAccount = transData.contact;
            }
          }
          break;
      }
    }

    // ⭐⭐⭐ مطابقة التصنيف والبند مع قاعدة البيانات ⭐⭐⭐
    var resolved = resolveTransactionItem(
      newFormat.nature,
      newFormat.category,
      newFormat.item,
      newFormat.fromAccount,
      newFormat.toAccount
    );
    if (resolved.category !== newFormat.category || resolved.item !== newFormat.item) {
      Logger.log('Item resolved: category "' + newFormat.category + '" → "' + resolved.category +
                 '", item "' + newFormat.item + '" → "' + resolved.item + '"');
      newFormat.category = resolved.category;
      newFormat.item = resolved.item;
    }

    // معلومات المستخدم
    const user = {
      name: transData.user_name || 'غير معروف',
      telegramId: transData.telegram_id || ''
    };

    Logger.log('Converted format: ' + JSON.stringify(newFormat));

    // حفظ بالتنسيق الجديد
    const result = saveTransaction(newFormat, user);

    // إرجاع بالتنسيق القديم للتوافق
    return {
      success: result.success,
      id: result.transactionId,
      message: result.message
    };

  } catch (error) {
    Logger.log('Error in addTransaction: ' + error.toString());
    return {
      success: false,
      id: null,
      message: '❌ خطأ: ' + error.message
    };
  }
}

/**
 * ⭐ استخراج الحسابات من وصف الحركة
 * يحلل نصوص مثل "تحويل من عهدة مصطفى لعهدة الزوجة"
 */
function extractAccountsFromDescription(description) {
  var result = { fromAccount: '', toAccount: '' };

  if (!description) return result;

  // قاموس الأسماء والحسابات
  var nameToAccount = {
    'مصطفى': 'MOSTAFA',
    'مصطفي': 'MOSTAFA',
    'سارة': 'SARA',
    'ساره': 'SARA',
    'الزوجة': 'WIFE',
    'الزوجه': 'WIFE',
    'مراتي': 'WIFE',
    'زوجتي': 'WIFE',
    'ام سيليا': 'WIFE',
    'أم سيليا': 'WIFE',
    'هاجر': 'HAGAR',
    'محمد': 'MOHAMED',
    'حسابي': 'MAIN',
    'الرئيسي': 'MAIN',
    'الخزنة': 'MAIN'
  };

  // البحث عن "من X" - استخراج المصدر
  var fromPatterns = [
    /من عهدة ([^\s]+)/,
    /من حساب ([^\s]+)/,
    /من ([^\s]+) ل/,
    /من ([^\s]+)$/
  ];

  for (var i = 0; i < fromPatterns.length; i++) {
    var match = description.match(fromPatterns[i]);
    if (match) {
      var name = match[1].replace(/ة$/, 'ه'); // تطبيع التاء المربوطة
      for (var key in nameToAccount) {
        if (name.indexOf(key) !== -1 || key.indexOf(name) !== -1) {
          result.fromAccount = nameToAccount[key];
          break;
        }
      }
      if (result.fromAccount) break;
    }
  }

  // البحث عن "لـ Y" - استخراج الوجهة
  var toPatterns = [
    /لعهدة ([^\s]+)/,
    /لحساب ([^\s]+)/,
    /ل([^\s]+)$/,
    /إلى ([^\s]+)/
  ];

  for (var j = 0; j < toPatterns.length; j++) {
    var match2 = description.match(toPatterns[j]);
    if (match2) {
      var name2 = match2[1].replace(/ة$/, 'ه');
      for (var key2 in nameToAccount) {
        if (name2.indexOf(key2) !== -1 || key2.indexOf(name2) !== -1) {
          result.toAccount = nameToAccount[key2];
          break;
        }
      }
      if (result.toAccount) break;
    }
  }

  Logger.log('Extracted from description "' + description + '": from=' + result.fromAccount + ', to=' + result.toAccount);

  return result;
}

/**
 * تحويل النوع القديم للطبيعة الجديدة
 */
function mapOldTypeToNature(oldType) {
  const map = {
    'دخل': 'إيراد',
    'income': 'إيراد',
    'مصروف': 'مصروف',
    'expense': 'مصروف',
    'تحويل': 'تحويل',
    'transfer': 'تحويل',
    'إيداع_عهدة': 'تحويل',
    'صرف_من_عهدة': 'مصروف',
    'ذهب': 'استثمار',
    'gold': 'استثمار',
    'جمعية': 'مصروف',
    'سلفة': 'تحويل'
  };
  return map[oldType] || oldType;
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

// =====================================================
// ============== دوال الجمعيات ==============
// =====================================================

/**
 * ⭐ تحليل رسالة الجمعية واستخراج البيانات
 * مثال: "دخلت جمعيه بدأت شهر 2 لمدة 18 شهر هدفع شهريا 1500 هقبض رقم 18 اسم الجمعيه عمتو سوما المسئول عن الجمعية مراتي"
 *
 * @param {string} text - النص الطبيعي للرسالة
 * @returns {Object} - البيانات المستخرجة
 */
function parseAssociationMessage(text) {
  Logger.log('⭐ Parsing association message: ' + text);

  var result = {
    name: null,           // اسم الجمعية
    responsible: null,    // المسؤول
    account: null,        // حساب المسؤول
    installment: null,    // قيمة القسط
    currency: 'EGP',      // العملة الافتراضية
    duration: null,       // عدد الأشهر
    collectionOrder: null, // ترتيب القبض
    startMonth: null,     // شهر البداية (1-12)
    startYear: null       // سنة البداية
  };

  // ⭐ تحويل الأرقام العربية للأرقام الغربية
  var arabicToWestern = function(str) {
    var arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    for (var i = 0; i < 10; i++) {
      str = str.replace(new RegExp(arabicNumerals[i], 'g'), i.toString());
    }
    return str;
  };

  var normalizedText = arabicToWestern(text); // تحويل الأرقام العربية
  normalizedText = normalizedText.replace(/[\u064B-\u065F]/g, '').trim(); // إزالة التشكيل
  normalizedText = normalizedText.replace(/\s+/g, ' '); // تنظيف المسافات

  Logger.log('Normalized text: ' + normalizedText);

  // ═══════════════ استخراج اسم الجمعية ═══════════════
  // أنماط: "اسم الجمعية X" أو "جمعية X" أو "جمعيه X"
  var namePatterns = [
    /اسم\s*الجمعي[ةه]\s+([^\s,،]+(?:\s+[^\s,،]+)?)/i,
    /جمعي[ةه]\s+(?:اسمها|اسم)\s+([^\s,،]+(?:\s+[^\s,،]+)?)/i,
    /جمعي[ةه]\s+([^\s,،0-9]+(?:\s+[^\s,،0-9]+)?)\s+(?:من|بمبلغ|لمدة|هقبض|هنقبض|القسط)/i
  ];

  for (var i = 0; i < namePatterns.length; i++) {
    var nameMatch = normalizedText.match(namePatterns[i]);
    if (nameMatch && nameMatch[1]) {
      result.name = nameMatch[1].trim();
      break;
    }
  }

  // إذا لم نجد الاسم، نبحث عن نمط "جمعية X" في أي مكان
  if (!result.name) {
    var simpleNameMatch = normalizedText.match(/جمعي[ةه]\s+([^\s,،0-9]+(?:\s+[^\s,،0-9]+)?)/i);
    if (simpleNameMatch && simpleNameMatch[1] && !['من', 'شهر', 'لمدة', 'مع', 'بمبلغ', 'القسط'].includes(simpleNameMatch[1].trim())) {
      result.name = simpleNameMatch[1].trim();
    }
  }

  // ═══════════════ استخراج المسؤول ═══════════════
  // أنماط: "المسؤول X" أو "المسئول X" أو "مع X" أو "X دخلت جمعية"
  var responsiblePatterns = [
    /(?:المسؤول|المسئول)\s*(?:عن\s*الجمعي[ةه])?\s*([^\s,،]+)/i,
    /(?:مسؤول|مسئول)\s*الجمعي[ةه]\s*([^\s,،]+)/i,
    /جمعي[ةه]\s*(?:مع|عند)\s+([^\s,،]+)/i,
    /^([^\s,،]+)\s+(?:دخلت?|اشتركت?)\s+(?:في\s*)?جمعي[ةه]/i
  ];

  for (var i = 0; i < responsiblePatterns.length; i++) {
    var respMatch = normalizedText.match(responsiblePatterns[i]);
    if (respMatch && respMatch[1]) {
      result.responsible = respMatch[1].trim();
      break;
    }
  }

  // تحديد حساب المسؤول من CONTACTS
  if (result.responsible) {
    var contact = findContactByAlias(result.responsible);
    if (contact) {
      result.account = contact.account;
      result.responsible = contact.name;
    }
  }

  // ═══════════════ استخراج قيمة القسط ═══════════════
  // أنماط: "القسط X" أو "بمبلغ X" أو "شهريا X" أو "هدفع X"
  var installmentPatterns = [
    /(?:القسط|قسط)\s*(\d+(?:[.,]\d+)?)/i,
    /(?:بمبلغ|مبلغ)\s*(\d+(?:[.,]\d+)?)/i,
    /(?:هدفع|هندفع|ندفع|ادفع)\s*(?:شهريا?)?\s*(\d+(?:[.,]\d+)?)/i,
    /(?:شهريا?)\s*(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:جنيه?|ريال|ر\.?س)/i
  ];

  for (var i = 0; i < installmentPatterns.length; i++) {
    var instMatch = normalizedText.match(installmentPatterns[i]);
    if (instMatch && instMatch[1]) {
      result.installment = parseFloat(instMatch[1].replace(',', '.'));
      break;
    }
  }

  // إذا لم نجد القسط، نبحث عن أي رقم كبير
  if (!result.installment) {
    var numbersInText = normalizedText.match(/\b(\d{3,})\b/g);
    if (numbersInText && numbersInText.length > 0) {
      // نأخذ أول رقم كبير كقيمة القسط
      result.installment = parseFloat(numbersInText[0]);
    }
  }

  // ═══════════════ استخراج مدة الجمعية ═══════════════
  // أنماط: "لمدة X شهر" أو "X شهور" أو "X أشهر"
  var durationPatterns = [
    /(?:لمدة?|مدة?)\s*(\d+)\s*(?:شهر|شهور|أشهر|اشهر)/i,
    /(\d+)\s*(?:شهر|شهور|أشهر|اشهر)/i
  ];

  for (var i = 0; i < durationPatterns.length; i++) {
    var durMatch = normalizedText.match(durationPatterns[i]);
    if (durMatch && durMatch[1]) {
      result.duration = parseInt(durMatch[1]);
      break;
    }
  }

  // ═══════════════ استخراج ترتيب القبض ═══════════════
  // أنماط: "هقبض رقم X" أو "هقبض الـX" أو "ترتيب القبض X" أو "هقبض X"
  var orderPatterns = [
    /(?:هقبض|هنقبض|نقبض|اقبض)\s*(?:رقم|ال)?\s*(\d+)/i,
    /(?:ترتيب\s*)?(?:القبض|قبض)\s*(?:رقم|ال)?\s*(\d+)/i,
    /(?:الرقم|رقم)\s*(\d+)\s*(?:في\s*القبض|للقبض)?/i,
    /(?:هقبض|هنقبض)\s*(?:ال)?(\w+)/i  // للأرقام الحرفية مثل "الرابع"
  ];

  for (var i = 0; i < orderPatterns.length; i++) {
    var orderMatch = normalizedText.match(orderPatterns[i]);
    if (orderMatch && orderMatch[1]) {
      var orderValue = orderMatch[1];
      // تحويل الأرقام الحرفية للأرقام
      var wordToNumber = {
        'اول': 1, 'الاول': 1, 'أول': 1, 'الأول': 1,
        'ثاني': 2, 'الثاني': 2, 'تاني': 2, 'التاني': 2,
        'ثالث': 3, 'الثالث': 3, 'تالت': 3, 'التالت': 3,
        'رابع': 4, 'الرابع': 4,
        'خامس': 5, 'الخامس': 5,
        'سادس': 6, 'السادس': 6,
        'سابع': 7, 'السابع': 7,
        'ثامن': 8, 'الثامن': 8,
        'تاسع': 9, 'التاسع': 9,
        'عاشر': 10, 'العاشر': 10,
        'حادي': 11, 'الحادي': 11,
        'ثاني عشر': 12, 'الثاني عشر': 12
      };

      if (!isNaN(orderValue)) {
        result.collectionOrder = parseInt(orderValue);
      } else if (wordToNumber[orderValue.toLowerCase()]) {
        result.collectionOrder = wordToNumber[orderValue.toLowerCase()];
      }

      if (result.collectionOrder) break;
    }
  }

  // ═══════════════ استخراج شهر البداية ═══════════════
  // أنماط: "من شهر X" أو "بدأت شهر X" أو "شهر X"
  var startPatterns = [
    /(?:من|بدأت?|بداية?|تبدأ?)\s*(?:شهر|اول)?\s*(\d{1,2})/i,
    /شهر\s*(\d{1,2})/i
  ];

  for (var i = 0; i < startPatterns.length; i++) {
    var startMatch = normalizedText.match(startPatterns[i]);
    if (startMatch && startMatch[1]) {
      var month = parseInt(startMatch[1]);
      if (month >= 1 && month <= 12) {
        result.startMonth = month;
        break;
      }
    }
  }

  // تحديد سنة البداية (الحالية أو القادمة بناء على الشهر)
  var now = new Date();
  var currentMonth = now.getMonth() + 1;
  var currentYear = now.getFullYear();

  if (result.startMonth) {
    // إذا كان شهر البداية أقل من الشهر الحالي، نفترض السنة القادمة
    result.startYear = (result.startMonth < currentMonth) ? currentYear + 1 : currentYear;
  } else {
    result.startMonth = currentMonth;
    result.startYear = currentYear;
  }

  // ═══════════════ استخراج العملة ═══════════════
  if (/ريال|ر\.?س|سعودي/i.test(normalizedText)) {
    result.currency = 'SAR';
  } else if (/دولار|\$/i.test(normalizedText)) {
    result.currency = 'USD';
  } else {
    result.currency = 'EGP'; // جنيه مصري افتراضي
  }

  Logger.log('Parsed association result: ' + JSON.stringify(result));

  return result;
}

/**
 * ⭐ الحصول على جميع الجمعيات
 * @param {boolean} activeOnly - إذا كان true يجلب الجمعيات النشطة فقط
 * @returns {Array} - قائمة الجمعيات
 */
function getAllAssociations(activeOnly) {
  try {
    var sheet = getSpreadsheet().getSheetByName(SHEETS.ASSOCIATIONS);
    if (!sheet) {
      Logger.log('Associations sheet not found');
      return [];
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // فقط الهيدر

    var associations = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // تخطي الصفوف الفارغة

      var assoc = {
        id: row[0],
        name: row[1],
        responsible: row[2],
        account: row[3],
        installment: parseFloat(row[4]) || 0,
        currency: row[5] || 'EGP',
        duration: parseInt(row[6]) || 0,
        collectionOrder: parseInt(row[7]) || 0,
        startDate: row[8],
        expectedCollectionDate: row[9],
        totalPaid: parseFloat(row[10]) || 0,
        totalCollected: parseFloat(row[11]) || 0,
        status: row[12] || 'نشطة',
        notes: row[13] || ''
      };

      // فلترة حسب الحالة إذا طلب
      if (activeOnly && assoc.status !== 'نشطة') continue;

      associations.push(assoc);
    }

    return associations;

  } catch (error) {
    Logger.log('Error getting associations: ' + error.toString());
    return [];
  }
}

/**
 * ⭐ إضافة جمعية جديدة
 * @param {Object} assocData - بيانات الجمعية
 * @returns {Object} - نتيجة العملية
 */
function addAssociation(assocData) {
  try {
    var sheet = getSpreadsheet().getSheetByName(SHEETS.ASSOCIATIONS);
    if (!sheet) {
      return { success: false, message: 'شيت الجمعيات غير موجود' };
    }

    // إنشاء ID فريد
    var id = 'ASC-' + Date.now();

    // حساب تاريخ البداية
    var startDate = new Date(assocData.startYear || new Date().getFullYear(),
                            (assocData.startMonth || new Date().getMonth() + 1) - 1, 1);

    // حساب تاريخ القبض المتوقع
    var collectionDate = new Date(startDate);
    collectionDate.setMonth(collectionDate.getMonth() + (assocData.collectionOrder || 1) - 1);

    // تنسيق التواريخ
    var startDateStr = Utilities.formatDate(startDate, 'Asia/Riyadh', 'yyyy-MM-dd');
    var collectionDateStr = Utilities.formatDate(collectionDate, 'Asia/Riyadh', 'yyyy-MM-dd');

    // إعداد الصف الجديد
    var newRow = [
      id,
      assocData.name || 'جمعية جديدة',
      assocData.responsible || '-',
      assocData.account || 'MAIN',
      assocData.installment || 0,
      assocData.currency || 'EGP',
      assocData.duration || 12,
      assocData.collectionOrder || 1,
      startDateStr,
      collectionDateStr,
      0, // إجمالي المدفوع
      0, // إجمالي المقبوض
      'نشطة',
      assocData.notes || ''
    ];

    sheet.appendRow(newRow);

    Logger.log('Association added successfully: ' + id);

    return {
      success: true,
      message: 'تم إضافة الجمعية بنجاح',
      id: id,
      data: {
        id: id,
        name: assocData.name,
        responsible: assocData.responsible,
        account: assocData.account,
        installment: assocData.installment,
        currency: assocData.currency,
        duration: assocData.duration,
        collectionOrder: assocData.collectionOrder,
        startDate: startDateStr,
        expectedCollectionDate: collectionDateStr,
        totalAmount: assocData.installment * assocData.duration
      }
    };

  } catch (error) {
    Logger.log('Error adding association: ' + error.toString());
    return {
      success: false,
      message: 'خطأ في إضافة الجمعية: ' + error.message
    };
  }
}

/**
 * ⭐ تحديث إجمالي المدفوع للجمعية
 * @param {string} assocId - معرف الجمعية
 * @param {number} amount - المبلغ المدفوع
 */
function updateAssociationPaid(assocId, amount) {
  try {
    var sheet = getSpreadsheet().getSheetByName(SHEETS.ASSOCIATIONS);
    if (!sheet) return false;

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === assocId) {
        var currentPaid = parseFloat(data[i][10]) || 0;
        sheet.getRange(i + 1, 11).setValue(currentPaid + amount);
        return true;
      }
    }
    return false;
  } catch (error) {
    Logger.log('Error updating association paid: ' + error.toString());
    return false;
  }
}

/**
 * ⭐ تسجيل قبض الجمعية
 * @param {string} assocId - معرف الجمعية
 * @param {number} amount - المبلغ المقبوض
 */
function recordAssociationCollection(assocId, amount) {
  try {
    var sheet = getSpreadsheet().getSheetByName(SHEETS.ASSOCIATIONS);
    if (!sheet) return { success: false, message: 'شيت الجمعيات غير موجود' };

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === assocId) {
        var currentCollected = parseFloat(data[i][11]) || 0;
        sheet.getRange(i + 1, 12).setValue(currentCollected + amount);

        // تحديث الحالة إذا تم القبض
        if (currentCollected + amount > 0) {
          sheet.getRange(i + 1, 13).setValue('تم القبض');
        }

        return {
          success: true,
          message: 'تم تسجيل القبض بنجاح',
          assocName: data[i][1]
        };
      }
    }
    return { success: false, message: 'الجمعية غير موجودة' };
  } catch (error) {
    Logger.log('Error recording collection: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * ⭐ البحث عن جمعية بالاسم
 * @param {string} name - اسم الجمعية (أو جزء منه)
 * @returns {Object|null}
 */
function findAssociationByName(name) {
  var associations = getAllAssociations(false);

  for (var i = 0; i < associations.length; i++) {
    if (associations[i].name.includes(name) || name.includes(associations[i].name)) {
      return associations[i];
    }
  }
  return null;
}
