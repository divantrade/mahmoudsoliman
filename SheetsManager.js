/**
 * =====================================================
 * نظام محمود المحاسبي - Sheets Manager
 * =====================================================
 */

/**
 * Get or create the main spreadsheet
 * @returns {Spreadsheet} The spreadsheet object
 */
function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('لم يتم العثور على الـ Spreadsheet. تأكد من ربط السكريبت بـ Google Sheet.');
  }
  return ss;
}

/**
 * Get or create a sheet by name
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet} The sheet object
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
 * Initialize sheet with headers based on type
 * @param {Sheet} sheet - The sheet to initialize
 * @param {string} sheetName - Name of the sheet
 */
function initializeSheet(sheet, sheetName) {
  const headers = getSheetHeaders(sheetName);
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4a86e8')
      .setFontColor('white')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/**
 * Get headers for each sheet type
 * @param {string} sheetName - Name of the sheet
 * @returns {Array} Array of header strings
 */
function getSheetHeaders(sheetName) {
  const headersMap = {
    'المستخدمين': [
      'ID', 'Telegram_ID', 'الاسم', 'اسم_المستخدم', 'الصلاحية', 'نشط',
      'تاريخ_الإضافة', 'آخر_نشاط', 'ملاحظات'
    ],
    'الحركات': [
      'ID', 'التاريخ', 'الوقت', 'النوع', 'التصنيف', 'المبلغ', 'العملة',
      'المبلغ_المستلم', 'عملة_الاستلام', 'سعر_الصرف', 'جهة_الاتصال',
      'الوصف', 'المستخدم', 'Telegram_ID', 'ملاحظات'
    ],
    'التصنيفات': [
      'الكود', 'الاسم', 'النوع', 'العملة', 'نشط'
    ],
    'جهات_الاتصال': [
      'الكود', 'الاسم', 'العلاقة', 'الأسماء_البديلة', 'العملة', 'Telegram_ID', 'نشط'
    ],
    'الجمعيات': [
      'ID', 'الاسم', 'المسؤول', 'قيمة_القسط', 'عدد_الأشهر', 'إجمالي_القبض',
      'تاريخ_البدء', 'ترتيب_القبض', 'تاريخ_القبض_المتوقع', 'الحالة', 'ملاحظات'
    ],
    'الذهب': [
      'ID', 'التاريخ', 'الوزن_جرام', 'العيار', 'السعر', 'العملة',
      'المشتري', 'البائع', 'الوصف', 'ملاحظات'
    ],
    'السلف': [
      'ID', 'التاريخ', 'النوع', 'الشخص', 'المبلغ', 'العملة',
      'المبلغ_المتبقي', 'الحالة', 'ملاحظات'
    ],
    'العهد': [
      'ID', 'التاريخ', 'الوقت', 'النوع', 'أمين_العهدة', 'المبلغ', 'العملة',
      'التصنيف', 'المستفيد', 'الوصف', 'الرصيد_بعد', 'المستخدم', 'Telegram_ID', 'ملاحظات'
    ],
    'سعر_الصرف': [
      'التاريخ', 'من_عملة', 'إلى_عملة', 'السعر', 'ملاحظات'
    ],
    'الإعدادات': [
      'المفتاح', 'القيمة', 'الوصف'
    ],
    // تقارير العهدة - لسارة ومصطفى
    'تقرير_عهدة_سارة': [
      'التاريخ', 'الوقت', 'النوع', 'المبلغ', 'العملة', 'التصنيف',
      'الوصف', 'سعر_الصرف', 'الرصيد_المتبقي'
    ],
    'تقرير_عهدة_مصطفى': [
      'التاريخ', 'الوقت', 'النوع', 'المبلغ', 'العملة', 'التصنيف',
      'الوصف', 'سعر_الصرف', 'الرصيد_المتبقي'
    ]
  };

  return headersMap[sheetName] || [];
}

/**
 * التحقق من كلمة السر
 * @param {string} password - كلمة السر المُدخلة
 * @returns {boolean} صحيح إذا كانت كلمة السر صحيحة
 */
function verifyAdminPassword(password) {
  return password === CONFIG.ADMIN_PASSWORD;
}

/**
 * إنشاء جميع الشيتات (محمي بكلمة سر)
 * @param {string} password - كلمة السر للتحقق
 */
function initializeAllSheets(password) {
  // التحقق من كلمة السر
  if (!password || !verifyAdminPassword(password)) {
    throw new Error('⛔ كلمة السر غير صحيحة! لا يمكن إنشاء الشيتات.');
  }

  const sheetNames = Object.values(SHEETS);

  sheetNames.forEach(sheetName => {
    getOrCreateSheetProtected(sheetName, password);
  });

  // إضافة البيانات الافتراضية
  addDefaultCategories();
  addDefaultContacts();
  addDefaultSettings();

  // إضافة القوائم المنسدلة
  addDropdownValidations();

  return '✅ تم إنشاء جميع الشيتات بنجاح!';
}

/**
 * إنشاء شيت محمي بكلمة سر (للاستخدام الداخلي فقط)
 * @param {string} sheetName - اسم الشيت
 * @param {string} password - كلمة السر
 */
function getOrCreateSheetProtected(sheetName, password) {
  if (!password || !verifyAdminPassword(password)) {
    throw new Error('⛔ كلمة السر غير صحيحة! لا يمكن إنشاء الشيت.');
  }

  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
    Logger.log('✅ تم إنشاء شيت: ' + sheetName);
  }

  return sheet;
}

/**
 * إضافة القوائم المنسدلة (Dropdowns) للشيتات
 */
function addDropdownValidations() {
  // شيت الحركات
  addTransactionsDropdowns();

  // شيت التصنيفات
  addCategoriesDropdowns();

  // شيت جهات الاتصال
  addContactsDropdowns();

  // شيت سعر الصرف
  addExchangeRateDropdowns();

  Logger.log('✅ تم إضافة القوائم المنسدلة');
}

/**
 * إضافة القوائم المنسدلة لشيت الحركات
 */
function addTransactionsDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
  const lastRow = 1000; // عدد الصفوف للـ validation

  // عمود النوع (4) - أنواع المعاملات
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TRANSACTION_TYPE_LIST, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 4, lastRow, 1).setDataValidation(typeRule);

  // عمود التصنيف (5) - من شيت التصنيفات
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sheet.getParent().getSheetByName(SHEETS.CATEGORIES).getRange('A2:A100'), true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 5, lastRow, 1).setDataValidation(categoryRule);

  // عمود العملة (7) - العملات
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CURRENCY_LIST, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, lastRow, 1).setDataValidation(currencyRule);

  // عمود عملة الاستلام (9) - العملات
  sheet.getRange(2, 9, lastRow, 1).setDataValidation(currencyRule);

  // عمود جهة الاتصال (11) - من شيت جهات الاتصال
  const contactRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sheet.getParent().getSheetByName(SHEETS.CONTACTS).getRange('A2:A100'), true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 11, lastRow, 1).setDataValidation(contactRule);
}

/**
 * إضافة القوائم المنسدلة لشيت التصنيفات
 */
function addCategoriesDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.CATEGORIES);
  const lastRow = 100;

  // عمود النوع (3)
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['دخل', 'مصروف', 'تحويل', 'عهدة'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 3, lastRow, 1).setDataValidation(typeRule);

  // عمود العملة (4)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CURRENCY_LIST, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 4, lastRow, 1).setDataValidation(currencyRule);

  // عمود نشط (5)
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['نعم', 'لا'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, lastRow, 1).setDataValidation(activeRule);
}

/**
 * إضافة القوائم المنسدلة لشيت جهات الاتصال
 */
function addContactsDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.CONTACTS);
  const lastRow = 100;

  // عمود العلاقة (3)
  const relationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['زوجة', 'أخ', 'أخت', 'أب', 'أم', 'ابن', 'ابنة', 'صديق', 'آخر'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 3, lastRow, 1).setDataValidation(relationRule);

  // عمود العملة (5)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CURRENCY_LIST, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, lastRow, 1).setDataValidation(currencyRule);

  // عمود نشط (7)
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['نعم', 'لا'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, lastRow, 1).setDataValidation(activeRule);
}

/**
 * إضافة القوائم المنسدلة لشيت سعر الصرف
 */
function addExchangeRateDropdowns() {
  const sheet = getOrCreateSheet(SHEETS.EXCHANGE_RATES);
  const lastRow = 500;

  // عمود من_عملة (2)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CURRENCY_LIST, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2, lastRow, 1).setDataValidation(currencyRule);

  // عمود إلى_عملة (3)
  sheet.getRange(2, 3, lastRow, 1).setDataValidation(currencyRule);
}

/**
 * إضافة التصنيفات الافتراضية
 */
function addDefaultCategories() {
  const sheet = getOrCreateSheet(SHEETS.CATEGORIES);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const rows = [];

    // تصنيفات الدخل
    if (DEFAULT_CATEGORIES.دخل) {
      DEFAULT_CATEGORIES.دخل.forEach(function(cat) {
        rows.push([cat.كود, cat.اسم, 'دخل', 'ريال', 'نعم']);
      });
    }

    // تصنيفات المصروفات
    if (DEFAULT_CATEGORIES.مصروف) {
      DEFAULT_CATEGORIES.مصروف.forEach(function(cat) {
        rows.push([cat.كود, cat.اسم, 'مصروف', 'ريال', 'نعم']);
      });
    }

    // تصنيفات التحويلات
    if (DEFAULT_CATEGORIES.تحويل) {
      DEFAULT_CATEGORIES.تحويل.forEach(function(cat) {
        rows.push([cat.كود, cat.اسم, 'تحويل', 'جنيه', 'نعم']);
      });
    }

    // تصنيفات العهدة
    if (DEFAULT_CATEGORIES.عهدة) {
      DEFAULT_CATEGORIES.عهدة.forEach(function(cat) {
        rows.push([cat.كود, cat.اسم, 'عهدة', 'جنيه', 'نعم']);
      });
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}

/**
 * إضافة جهات الاتصال الافتراضية (العائلة)
 */
function addDefaultContacts() {
  const sheet = getOrCreateSheet(SHEETS.CONTACTS);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const rows = FAMILY_CONTACTS.map(contact => [
      contact.كود,
      contact.اسم,
      contact.علاقة,
      contact.اسماء_بديلة.join('، '),
      contact.عملة,
      '',  // Telegram ID
      'نعم'
    ]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}

/**
 * ⭐ قراءة التصنيفات من شيت التصنيفات ديناميكياً
 * @param {string} type - نوع المعاملة (دخل، مصروف، تحويل، عهدة)
 * @returns {Array} قائمة التصنيفات
 */
function getCategoriesFromSheet(type) {
  try {
    const sheet = getOrCreateSheet(SHEETS.CATEGORIES);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      // الشيت فارغ، ارجع للتصنيفات الافتراضية
      return DEFAULT_CATEGORIES[type] || [];
    }

    const categories = [];
    // Headers: الكود، الاسم، النوع، العملة، نشط
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const catType = row[2]; // عمود النوع
      const isActive = row[4]; // عمود نشط

      if (catType === type && (isActive === 'نعم' || isActive === true || isActive === 'TRUE')) {
        categories.push({
          كود: row[0],
          اسم: row[1],
          عملة: row[3]
        });
      }
    }

    return categories.length > 0 ? categories : (DEFAULT_CATEGORIES[type] || []);
  } catch (error) {
    Logger.log('Error reading categories: ' + error.toString());
    return DEFAULT_CATEGORIES[type] || [];
  }
}

/**
 * الحصول على كل التصنيفات المتاحة من الشيت
 * @returns {Object} كل التصنيفات مجمعة بالنوع
 */
function getAllCategoriesFromSheet() {
  return {
    دخل: getCategoriesFromSheet('دخل'),
    مصروف: getCategoriesFromSheet('مصروف'),
    تحويل: getCategoriesFromSheet('تحويل'),
    عهدة: getCategoriesFromSheet('عهدة')
  };
}

/**
 * الحصول على أكواد التصنيفات كنص للذكاء الاصطناعي
 * @param {string} type - نوع المعاملة
 * @returns {string} أكواد التصنيفات مفصولة بفاصلة
 */
function getCategoryCodesForAI(type) {
  const categories = getCategoriesFromSheet(type);
  return categories.map(c => c.كود).join('، ');
}

/**
 * ⭐ البحث عن التصنيف المطابق من شيت التصنيفات
 * @param {string} keyword - الكلمة المفتاحية للبحث (مثل: زوجة، أهل، مصطفى)
 * @param {string} type - نوع المعاملة (تحويل، عهدة، مصروف)
 * @returns {string} كود التصنيف المطابق أو التصنيف الافتراضي
 */
function findMatchingCategory(keyword, type) {
  try {
    // قراءة جميع التصنيفات من الشيت
    var allCategories = [];
    var types = type ? [type] : ['تحويل', 'عهدة', 'مصروف'];

    for (var t = 0; t < types.length; t++) {
      var cats = getCategoriesFromSheet(types[t]);
      for (var c = 0; c < cats.length; c++) {
        allCategories.push(cats[c]);
      }
    }

    if (allCategories.length === 0) {
      Logger.log('No categories found in sheet');
      return null;
    }

    // تطبيع الكلمة المفتاحية للمقارنة
    var normalizedKeyword = keyword.replace(/[ةه]/g, 'ه')
                                   .replace(/[يى]/g, 'ي')
                                   .replace(/[أإآا]/g, 'ا')
                                   .trim();

    Logger.log('Finding category for keyword: ' + keyword + ' (normalized: ' + normalizedKeyword + ')');
    Logger.log('Available categories: ' + allCategories.map(function(c) { return c.كود; }).join(', '));

    // المرحلة 1: البحث عن تطابق تام
    for (var i = 0; i < allCategories.length; i++) {
      var cat = allCategories[i];
      var normalizedCode = cat.كود.replace(/[ةه]/g, 'ه')
                                  .replace(/[يى]/g, 'ي')
                                  .replace(/[أإآا]/g, 'ا')
                                  .trim();

      if (normalizedCode === normalizedKeyword) {
        Logger.log('Exact match found: ' + cat.كود);
        return cat.كود;
      }
    }

    // المرحلة 2: البحث بالكلمات المفتاحية المحددة
    // زوجة/مراتي -> مصروفات الزوجة
    if (/زوج|مرات/i.test(normalizedKeyword)) {
      for (var j = 0; j < allCategories.length; j++) {
        var code = allCategories[j].كود;
        if (/مصروفات.*زوج|زوج.*مصروفات/i.test(code)) {
          Logger.log('Found wife expenses category: ' + code);
          return code;
        }
      }
    }

    // أهل/عائلة -> مساعدة الأهل
    if (/اهل|أهل|عائل/i.test(normalizedKeyword)) {
      for (var k = 0; k < allCategories.length; k++) {
        var code2 = allCategories[k].كود;
        if (/مساعد.*اهل|مساعد.*أهل/i.test(code2)) {
          Logger.log('Found family help category: ' + code2);
          return code2;
        }
      }
    }

    // عهدة [اسم] -> عهدة [اسم] أو إيداع عهدة
    if (/عهد/i.test(normalizedKeyword)) {
      for (var m = 0; m < allCategories.length; m++) {
        var code3 = allCategories[m].كود;
        var normalizedCode3 = code3.replace(/[ةه]/g, 'ه').replace(/[يى]/g, 'ي').replace(/[أإآا]/g, 'ا');
        // تطابق تام مع التطبيع
        if (normalizedCode3 === normalizedKeyword) {
          Logger.log('Found custody category: ' + code3);
          return code3;
        }
      }
    }

    Logger.log('No matching category found for: ' + keyword);
    return null;

  } catch (error) {
    Logger.log('Error finding category: ' + error.toString());
    return null;
  }
}

/**
 * Add default settings
 */
function addDefaultSettings() {
  const sheet = getOrCreateSheet(SHEETS.SETTINGS);
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length <= 1) {
    const settings = [
      ['default_exchange_rate', '13.5', 'سعر الصرف الافتراضي (ريال إلى جنيه)'],
      ['notification_before_association', '3', 'عدد أيام التنبيه قبل موعد الجمعية'],
      ['weekly_report_day', 'friday', 'يوم إرسال التقرير الأسبوعي'],
      ['monthly_report_day', '1', 'يوم إرسال التقرير الشهري']
    ];

    sheet.getRange(2, 1, settings.length, settings[0].length).setValues(settings);
  }
}

/**
 * Add a new transaction
 * @param {Object} transaction - Transaction data
 * @returns {Object} Result with success status and message
 */
function addTransaction(transaction) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const lastRow = sheet.getLastRow();
    const newId = lastRow; // Simple ID generation

    // ⭐ توحيد اسم جهة الاتصال
    var normalizedContact = normalizeContactName(transaction.contact || '');
    Logger.log('Contact normalized: "' + (transaction.contact || '') + '" -> "' + normalizedContact + '"');

    const now = new Date();
    const row = [
      newId,
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd'),
      Utilities.formatDate(now, 'Asia/Riyadh', 'HH:mm:ss'),
      transaction.type || '',
      transaction.category || '',
      transaction.amount || 0,
      transaction.currency || 'SAR',
      transaction.amount_received || '',
      transaction.currency_received || '',
      transaction.exchange_rate || '',
      normalizedContact, // ⭐ استخدام الاسم الموحد
      transaction.description || '',
      transaction.user_name || '',
      transaction.telegram_id || '',
      transaction.notes || ''
    ];

    sheet.appendRow(row);

    return {
      success: true,
      message: 'تم تسجيل المعاملة بنجاح',
      id: newId
    };

  } catch (error) {
    Logger.log('Error in addTransaction: ' + error.toString());
    return {
      success: false,
      message: 'حدث خطأ أثناء تسجيل المعاملة: ' + error.message
    };
  }
}

/**
 * Add gold purchase
 * @param {Object} goldData - Gold purchase data
 */
function addGoldPurchase(goldData) {
  try {
    const sheet = getOrCreateSheet(SHEETS.GOLD);
    const lastRow = sheet.getLastRow();
    const newId = lastRow;

    const now = new Date();
    const row = [
      newId,
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd'),
      goldData.weight || 0,
      goldData.karat || 21,
      goldData.price || 0,
      goldData.currency || 'EGP',
      goldData.buyer || '',
      goldData.seller || '',
      goldData.description || '',
      goldData.notes || ''
    ];

    sheet.appendRow(row);

    return { success: true, message: 'تم تسجيل شراء الذهب', id: newId };

  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Add or update loan record
 * @param {Object} loanData - Loan data
 */
function addLoanRecord(loanData) {
  try {
    const sheet = getOrCreateSheet(SHEETS.LOANS);
    const lastRow = sheet.getLastRow();
    const newId = lastRow;

    const now = new Date();
    const row = [
      newId,
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd'),
      loanData.type || '',
      loanData.person || '',
      loanData.amount || 0,
      loanData.currency || 'SAR',
      loanData.amount || 0, // remaining amount
      'نشط',
      loanData.notes || ''
    ];

    sheet.appendRow(row);

    return { success: true, message: 'تم تسجيل السلفة', id: newId };

  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Get user by Telegram ID
 * @param {string} telegramId - Telegram user ID
 * @returns {Object|null} User data or null
 */
function getUserByTelegramId(telegramId) {
  try {
    const sheet = getOrCreateSheet(SHEETS.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == telegramId) {
        return {
          id: data[i][0],
          telegram_id: data[i][1],
          name: data[i][2],
          username: data[i][3],
          role: data[i][4],
          active: data[i][5] === 'نعم',
          created_at: data[i][6],
          last_activity: data[i][7]
        };
      }
    }

    return null;

  } catch (error) {
    Logger.log('Error in getUserByTelegramId: ' + error.toString());
    return null;
  }
}

/**
 * Add new user
 * @param {Object} userData - User data
 */
function addUser(userData) {
  try {
    const sheet = getOrCreateSheet(SHEETS.USERS);
    const lastRow = sheet.getLastRow();
    const newId = lastRow;

    const now = new Date();
    const row = [
      newId,
      userData.telegram_id || '',
      userData.name || '',
      userData.username || '',
      userData.role || ROLES.LIMITED,
      'نعم',
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd HH:mm:ss'),
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd HH:mm:ss'),
      userData.notes || ''
    ];

    sheet.appendRow(row);

    return { success: true, message: 'تم إضافة المستخدم', id: newId };

  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Update user last activity
 * @param {string} telegramId - Telegram user ID
 */
function updateUserActivity(telegramId) {
  try {
    const sheet = getOrCreateSheet(SHEETS.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == telegramId) {
        const now = new Date();
        sheet.getRange(i + 1, 8).setValue(
          Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd HH:mm:ss')
        );
        break;
      }
    }

  } catch (error) {
    Logger.log('Error updating user activity: ' + error.toString());
  }
}

/**
 * Get setting value
 * @param {string} key - Setting key
 * @returns {string} Setting value
 */
function getSetting(key) {
  try {
    const sheet = getOrCreateSheet(SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }

    return null;

  } catch (error) {
    Logger.log('Error getting setting: ' + error.toString());
    return null;
  }
}

/**
 * Get contact by alias
 * @param {string} alias - Contact alias
 * @returns {Object|null} Contact data
 */
function getContactByAlias(alias) {
  try {
    const sheet = getOrCreateSheet(SHEETS.CONTACTS);
    const data = sheet.getDataRange().getValues();

    // تطبيع النص للمقارنة
    const normalizedAlias = normalizeArabicText(alias);

    for (let i = 1; i < data.length; i++) {
      if (!data[i][0] && !data[i][1]) continue; // تخطي الصفوف الفارغة

      const code = data[i][0] || '';
      const name = data[i][1] || '';
      const relation = data[i][2] || '';
      const aliasesStr = data[i][3] || '';
      const aliases = aliasesStr.split(/[،,]/).map(a => normalizeArabicText(a.trim()));

      // تطبيع الكود والاسم والعلاقة
      const normalizedCode = normalizeArabicText(code);
      const normalizedName = normalizeArabicText(name);
      const normalizedRelation = normalizeArabicText(relation);

      // البحث في الكود والاسم والعلاقة والأسماء البديلة
      if (normalizedCode === normalizedAlias ||
          normalizedName === normalizedAlias ||
          normalizedName.indexOf(normalizedAlias) !== -1 ||
          normalizedAlias.indexOf(normalizedName) !== -1 ||
          normalizedRelation === normalizedAlias ||
          aliases.indexOf(normalizedAlias) !== -1 ||
          aliases.some(a => a.indexOf(normalizedAlias) !== -1 || normalizedAlias.indexOf(a) !== -1)) {
        return {
          code: code,
          name: name,
          relation: relation,
          aliases: aliases,
          currency: data[i][4],
          telegram_id: data[i][5],
          active: data[i][6] === 'نعم'
        };
      }
    }

    return null;

  } catch (error) {
    Logger.log('Error getting contact: ' + error.toString());
    return null;
  }
}

/**
 * ⭐ توحيد اسم جهة الاتصال
 * يبحث عن الاسم في شيت جهات الاتصال ويرجع الكود الموحد
 * @param {string} inputName - الاسم المدخل (قد يكون بأي شكل)
 * @returns {string} الاسم الموحد (الكود) أو الاسم الأصلي إذا لم يوجد
 */
function normalizeContactName(inputName) {
  if (!inputName) return '';

  try {
    var contact = getContactByAlias(inputName);
    if (contact && contact.code) {
      Logger.log('Normalized "' + inputName + '" to "' + contact.code + '"');
      return contact.code;
    }
    return inputName; // إرجاع الاسم الأصلي إذا لم يوجد في القائمة
  } catch (error) {
    Logger.log('Error normalizing contact name: ' + error.toString());
    return inputName;
  }
}

/**
 * Record exchange rate
 * @param {number} rate - Exchange rate
 * @param {string} from - From currency
 * @param {string} to - To currency
 */
function recordExchangeRate(rate, from, to) {
  try {
    const sheet = getOrCreateSheet(SHEETS.EXCHANGE_RATES);
    const now = new Date();

    sheet.appendRow([
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd'),
      from || 'SAR',
      to || 'EGP',
      rate,
      ''
    ]);

  } catch (error) {
    Logger.log('Error recording exchange rate: ' + error.toString());
  }
}

// =====================================================
// وظائف العهدة (Custody Functions)
// =====================================================

/**
 * إضافة حركة عهدة (إيداع أو صرف)
 * @param {Object} custodyData - بيانات حركة العهدة
 */
function addCustodyTransaction(custodyData) {
  try {
    const sheet = getOrCreateSheet(SHEETS.CUSTODY);
    const lastRow = sheet.getLastRow();
    const newId = lastRow;

    // حساب الرصيد الجديد
    const currentBalance = getCustodyBalance(custodyData.custodian || 'سارة');
    let newBalance = currentBalance;

    if (custodyData.type === 'إيداع_عهدة') {
      newBalance = currentBalance + (custodyData.amount || 0);
    } else if (custodyData.type === 'صرف_من_عهدة') {
      newBalance = currentBalance - (custodyData.amount || 0);
    }

    const now = new Date();
    const row = [
      newId,
      Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd'),
      Utilities.formatDate(now, 'Asia/Riyadh', 'HH:mm:ss'),
      custodyData.type || '',
      custodyData.custodian || 'سارة',
      custodyData.amount || 0,
      custodyData.currency || 'جنيه',
      custodyData.category || '',
      custodyData.beneficiary || '',
      custodyData.description || '',
      newBalance,
      custodyData.user_name || '',
      custodyData.telegram_id || '',
      custodyData.notes || ''
    ];

    sheet.appendRow(row);

    return {
      success: true,
      message: 'تم تسجيل حركة العهدة',
      id: newId,
      balance: newBalance
    };

  } catch (error) {
    Logger.log('Error in addCustodyTransaction: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * الحصول على رصيد العهدة لأمين معين (من شيت العهد القديم)
 * ⚠️ يُفضل استخدام calculateCustodyBalanceFromTransactions بدلاً منها
 * @param {string} custodian - اسم أمين العهدة
 * @returns {number} الرصيد الحالي
 */
function getCustodyBalance(custodian) {
  try {
    const sheet = getOrCreateSheet(SHEETS.CUSTODY);
    const data = sheet.getDataRange().getValues();

    let balance = 0;
    const custodianName = custodian || 'سارة';

    Logger.log('=== getCustodyBalance (from CUSTODY sheet) ===');
    Logger.log('Looking for: ' + custodianName);

    for (let i = 1; i < data.length; i++) {
      const rowCustodian = data[i][4] || '';

      // استخدام دالة المقارنة المحسنة
      if (!isCustodianMatch(rowCustodian, custodianName)) {
        continue;
      }

      const type = data[i][3];
      const amount = parseFloat(data[i][5]) || 0;

      if (type === 'إيداع_عهدة') {
        balance += amount;
        Logger.log('Row ' + i + ': +' + amount);
      } else if (type === 'صرف_من_عهدة') {
        balance -= amount;
        Logger.log('Row ' + i + ': -' + amount);
      }
    }

    Logger.log('Balance from CUSTODY sheet: ' + balance);
    return balance;

  } catch (error) {
    Logger.log('Error getting custody balance: ' + error.toString());
    return 0;
  }
}

/**
 * ⭐ دالة تطبيع النص العربي للمقارنة
 * تزيل المسافات وتوحد الأحرف المتشابهة
 */
function normalizeArabicText(text) {
  if (!text) return '';
  var normalized = text.toString().trim().toLowerCase();
  // توحيد الأحرف العربية المتشابهة
  normalized = normalized.replace(/[ةه]/g, 'ه');
  normalized = normalized.replace(/[يى]/g, 'ي');
  normalized = normalized.replace(/[أإآا]/g, 'ا');
  normalized = normalized.replace(/\s+/g, ''); // إزالة المسافات
  return normalized;
}

/**
 * ⭐ التحقق من تطابق اسم أمين العهدة
 */
function isCustodianMatch(contact, custodian) {
  var contactNorm = normalizeArabicText(contact);
  var custodianNorm = normalizeArabicText(custodian);

  // تحقق من التطابق المباشر أو احتواء الاسم
  return contactNorm === custodianNorm ||
         contactNorm.indexOf(custodianNorm) !== -1 ||
         custodianNorm.indexOf(contactNorm) !== -1;
}

/**
 * ⭐ حساب رصيد العهدة من شيت الحركات الرئيسي
 * @param {string} custodian - اسم أمين العهدة
 * @returns {number} الرصيد الحالي
 */
function calculateCustodyBalanceFromTransactions(custodian) {
  try {
    var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var data = sheet.getDataRange().getValues();

    var balance = 0;
    var matchedCount = 0;
    var custodianName = custodian || 'سارة';

    Logger.log('=== calculateCustodyBalanceFromTransactions ===');
    Logger.log('Looking for custodian: ' + custodianName);
    Logger.log('Total rows in sheet: ' + data.length);

    // Headers: ID, التاريخ, الوقت, النوع, التصنيف, المبلغ, العملة, المبلغ_المستلم, عملة_الاستلام, سعر_الصرف, جهة_الاتصال, الوصف, ...
    for (var i = 1; i < data.length; i++) {
      var type = data[i][3]; // النوع
      var contact = data[i][10] || ''; // جهة_الاتصال
      var category = data[i][4] || ''; // التصنيف
      var description = data[i][11] || ''; // الوصف

      // التحقق من أن الحركة لأمين العهدة المحدد
      // نبحث في جهة الاتصال والتصنيف والوصف
      var isMatch = isCustodianMatch(contact, custodianName) ||
                    isCustodianMatch(category, custodianName) ||
                    (description.indexOf('عهدة ' + custodianName) !== -1) ||
                    (description.indexOf('عهده ' + custodianName) !== -1);

      if (!isMatch) {
        continue;
      }

      // فقط حركات العهدة
      if (type !== 'إيداع_عهدة' && type !== 'صرف_من_عهدة') {
        continue;
      }

      matchedCount++;

      if (type === 'إيداع_عهدة') {
        // المبلغ المستلم (بالجنيه) أو المبلغ الأصلي
        var amountReceived = parseFloat(data[i][7]) || 0;
        var amount = parseFloat(data[i][5]) || 0;
        var addAmount = amountReceived > 0 ? amountReceived : amount;
        balance += addAmount;
        Logger.log('Row ' + i + ': إيداع +' + addAmount + ' (contact: ' + contact + ')');
      } else if (type === 'صرف_من_عهدة') {
        var amount = parseFloat(data[i][5]) || 0;
        balance -= amount;
        Logger.log('Row ' + i + ': صرف -' + amount + ' (contact: ' + contact + ')');
      }
    }

    Logger.log('Matched ' + matchedCount + ' transactions for ' + custodianName);
    Logger.log('Final balance for ' + custodianName + ': ' + balance);
    return balance;

  } catch (error) {
    Logger.log('Error calculating custody balance: ' + error.toString());
    return 0;
  }
}

/**
 * تقرير العهدة (الإيداعات والمصروفات والرصيد)
 * ⭐ يقرأ من شيت الحركات الرئيسي وليس شيت العهد
 * @param {string} custodian - اسم أمين العهدة
 * @returns {Object} تقرير العهدة
 */
function getCustodyReport(custodian) {
  try {
    var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var data = sheet.getDataRange().getValues();

    var custodianName = custodian || 'سارة';

    var totalDeposits = 0;
    var totalExpenses = 0;
    var transactions = [];

    Logger.log('=== getCustodyReport ===');
    Logger.log('Looking for custodian: ' + custodianName);
    Logger.log('Total rows in sheet: ' + data.length);

    // Headers: ID, التاريخ, الوقت, النوع, التصنيف, المبلغ, العملة, المبلغ_المستلم, عملة_الاستلام, سعر_الصرف, جهة_الاتصال, الوصف, ...
    for (var i = 1; i < data.length; i++) {
      var type = data[i][3];
      var contact = data[i][10] || '';
      var category = data[i][4] || '';

      // التحقق من أن الحركة لأمين العهدة المحدد
      // نبحث في جهة الاتصال والتصنيف معاً
      var isMatch = isCustodianMatch(contact, custodianName) ||
                    isCustodianMatch(category, custodianName);

      if (!isMatch) {
        continue;
      }

      // فقط حركات العهدة
      if (type !== 'إيداع_عهدة' && type !== 'صرف_من_عهدة') {
        continue;
      }

      var amount = parseFloat(data[i][5]) || 0;
      var amountReceived = parseFloat(data[i][7]) || 0;

      if (type === 'إيداع_عهدة') {
        // للإيداع: نستخدم المبلغ المستلم (بالجنيه) إن وجد
        var depositAmount = amountReceived > 0 ? amountReceived : amount;
        totalDeposits += depositAmount;
        Logger.log('Row ' + i + ': Found deposit +' + depositAmount + ' (contact: ' + contact + ', category: ' + category + ')');
      } else if (type === 'صرف_من_عهدة') {
        totalExpenses += amount;
        Logger.log('Row ' + i + ': Found expense -' + amount + ' (contact: ' + contact + ', category: ' + category + ')');
      }

      transactions.push({
        date: data[i][1],
        type: type,
        amount: amountReceived > 0 ? amountReceived : amount,
        currency: data[i][6],
        category: data[i][4],
        description: data[i][11],
        exchange_rate: data[i][9]
      });
    }

    Logger.log('Found ' + transactions.length + ' transactions for ' + custodianName);
    Logger.log('Total deposits: ' + totalDeposits + ', Total expenses: ' + totalExpenses);
    Logger.log('Balance: ' + (totalDeposits - totalExpenses));

    return {
      custodian: custodian,
      total_deposits: totalDeposits,
      total_expenses: totalExpenses,
      current_balance: totalDeposits - totalExpenses,
      transactions: transactions
    };

  } catch (error) {
    Logger.log('Error getting custody report: ' + error.toString());
    return null;
  }
}

// =====================================================
// تقارير العهدة المحفوظة (شيتات منفصلة)
// =====================================================

/**
 * ⭐ تحديث شيت تقرير العهدة لأمين معين
 * يقرأ من شيت الحركات ويكتب في شيت التقرير
 * @param {string} custodian - اسم أمين العهدة (سارة أو مصطفى)
 * @returns {Object} نتيجة التحديث
 */
function updateCustodyReportSheet(custodian) {
  try {
    var custodianName = custodian || 'سارة';
    var sheetName = '';

    // تحديد اسم الشيت بناءً على أمين العهدة
    if (isCustodianMatch(custodianName, 'سارة')) {
      sheetName = SHEETS.CUSTODY_REPORT_SARA;
      custodianName = 'سارة';
    } else if (isCustodianMatch(custodianName, 'مصطفى')) {
      sheetName = SHEETS.CUSTODY_REPORT_MOSTAFA;
      custodianName = 'مصطفى';
    } else {
      return { success: false, message: 'أمين العهدة غير معروف: ' + custodian };
    }

    Logger.log('=== updateCustodyReportSheet ===');
    Logger.log('Custodian: ' + custodianName);
    Logger.log('Sheet name: ' + sheetName);

    // قراءة الحركات من شيت الحركات الرئيسي
    var transactionsSheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var data = transactionsSheet.getDataRange().getValues();

    // تجميع حركات العهدة لهذا الأمين
    var custodyTransactions = [];
    var runningBalance = 0;

    // Headers: ID, التاريخ, الوقت, النوع, التصنيف, المبلغ, العملة, المبلغ_المستلم, عملة_الاستلام, سعر_الصرف, جهة_الاتصال, الوصف, ...
    for (var i = 1; i < data.length; i++) {
      var type = data[i][3];
      var contact = data[i][10] || '';
      var category = data[i][4] || '';
      var description = data[i][11] || '';

      // التحقق من أن الحركة لأمين العهدة المحدد
      // نفحص: جهة الاتصال، التصنيف، والوصف
      var isMatch = isCustodianMatch(contact, custodianName) ||
                    isCustodianMatch(category, custodianName) ||
                    (description.indexOf('عهدة ' + custodianName) !== -1) ||
                    (description.indexOf('عهده ' + custodianName) !== -1);

      if (!isMatch) continue;

      // فقط حركات العهدة
      if (type !== 'إيداع_عهدة' && type !== 'صرف_من_عهدة') continue;

      var amount = parseFloat(data[i][5]) || 0;
      var amountReceived = parseFloat(data[i][7]) || 0;
      var effectiveAmount = amountReceived > 0 ? amountReceived : amount;

      // حساب الرصيد المتراكم
      if (type === 'إيداع_عهدة') {
        runningBalance += effectiveAmount;
      } else if (type === 'صرف_من_عهدة') {
        runningBalance -= amount;
        effectiveAmount = amount; // للصرف نستخدم المبلغ المباشر
      }

      // تنسيق النوع للعرض
      var displayType = type === 'إيداع_عهدة' ? 'إيداع' : 'صرف';

      custodyTransactions.push([
        data[i][1],  // التاريخ
        data[i][2],  // الوقت
        displayType, // النوع
        effectiveAmount, // المبلغ
        data[i][6] || 'جنيه', // العملة
        data[i][4] || '', // التصنيف
        data[i][11] || '', // الوصف
        data[i][9] || '', // سعر_الصرف
        runningBalance // الرصيد المتبقي
      ]);
    }

    Logger.log('Found ' + custodyTransactions.length + ' transactions for ' + custodianName);

    // الحصول على شيت التقرير أو إنشاؤه
    var reportSheet = getOrCreateSheet(sheetName);

    // مسح البيانات القديمة (ما عدا الهيدر)
    var lastRow = reportSheet.getLastRow();
    if (lastRow > 1) {
      reportSheet.getRange(2, 1, lastRow - 1, 9).clearContent();
    }

    // كتابة البيانات الجديدة
    if (custodyTransactions.length > 0) {
      reportSheet.getRange(2, 1, custodyTransactions.length, 9).setValues(custodyTransactions);

      // تنسيق الأرقام
      reportSheet.getRange(2, 4, custodyTransactions.length, 1).setNumberFormat('#,##0');
      reportSheet.getRange(2, 9, custodyTransactions.length, 1).setNumberFormat('#,##0');

      // تلوين الإيداعات والمصروفات
      for (var j = 0; j < custodyTransactions.length; j++) {
        var rowNum = j + 2;
        if (custodyTransactions[j][2] === 'إيداع') {
          reportSheet.getRange(rowNum, 3).setFontColor('#0b8043'); // أخضر
          reportSheet.getRange(rowNum, 4).setFontColor('#0b8043');
        } else {
          reportSheet.getRange(rowNum, 3).setFontColor('#c53929'); // أحمر
          reportSheet.getRange(rowNum, 4).setFontColor('#c53929');
        }
      }
    }

    // إضافة صف الملخص في النهاية
    var summaryRow = custodyTransactions.length + 3;
    var totalDeposits = 0;
    var totalExpenses = 0;

    custodyTransactions.forEach(function(t) {
      if (t[2] === 'إيداع') {
        totalDeposits += t[3];
      } else {
        totalExpenses += t[3];
      }
    });

    // كتابة الملخص
    reportSheet.getRange(summaryRow, 1).setValue('═══ ملخص العهدة ═══');
    reportSheet.getRange(summaryRow, 1, 1, 3).merge();
    reportSheet.getRange(summaryRow, 1).setFontWeight('bold').setBackground('#f3f3f3');

    reportSheet.getRange(summaryRow + 1, 1).setValue('إجمالي الإيداعات:');
    reportSheet.getRange(summaryRow + 1, 2).setValue(totalDeposits).setNumberFormat('#,##0').setFontColor('#0b8043');

    reportSheet.getRange(summaryRow + 2, 1).setValue('إجمالي المصروفات:');
    reportSheet.getRange(summaryRow + 2, 2).setValue(totalExpenses).setNumberFormat('#,##0').setFontColor('#c53929');

    reportSheet.getRange(summaryRow + 3, 1).setValue('الرصيد الحالي:');
    reportSheet.getRange(summaryRow + 3, 2).setValue(runningBalance).setNumberFormat('#,##0').setFontWeight('bold');

    reportSheet.getRange(summaryRow + 4, 1).setValue('آخر تحديث:');
    reportSheet.getRange(summaryRow + 4, 2).setValue(new Date()).setNumberFormat('yyyy-MM-dd HH:mm');

    Logger.log('Report updated successfully for ' + custodianName);
    Logger.log('Final balance: ' + runningBalance);

    return {
      success: true,
      message: 'تم تحديث تقرير عهدة ' + custodianName,
      transactions_count: custodyTransactions.length,
      balance: runningBalance,
      total_deposits: totalDeposits,
      total_expenses: totalExpenses
    };

  } catch (error) {
    Logger.log('Error updating custody report sheet: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ⭐ تحديث جميع تقارير العهدة (سارة ومصطفى)
 * @returns {Object} نتيجة التحديث
 */
function updateAllCustodyReports() {
  try {
    Logger.log('=== Updating all custody reports ===');

    var saraResult = updateCustodyReportSheet('سارة');
    var mostafaResult = updateCustodyReportSheet('مصطفى');

    return {
      success: true,
      message: 'تم تحديث جميع تقارير العهدة',
      sara: saraResult,
      mostafa: mostafaResult
    };

  } catch (error) {
    Logger.log('Error updating all custody reports: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ⭐ الحصول على ملخص تقرير العهدة من الشيت
 * @param {string} custodian - اسم أمين العهدة
 * @returns {Object} ملخص التقرير
 */
function getCustodyReportSummary(custodian) {
  try {
    var custodianName = custodian || 'سارة';
    var sheetName = '';

    if (isCustodianMatch(custodianName, 'سارة')) {
      sheetName = SHEETS.CUSTODY_REPORT_SARA;
      custodianName = 'سارة';
    } else if (isCustodianMatch(custodianName, 'مصطفى')) {
      sheetName = SHEETS.CUSTODY_REPORT_MOSTAFA;
      custodianName = 'مصطفى';
    } else {
      return null;
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      // الشيت غير موجود، إنشاؤه وتحديثه
      updateCustodyReportSheet(custodianName);
      sheet = ss.getSheetByName(sheetName);
    }

    // قراءة البيانات وحساب الملخص
    var data = sheet.getDataRange().getValues();
    var transactionsCount = 0;
    var totalDeposits = 0;
    var totalExpenses = 0;
    var lastBalance = 0;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === '═══ ملخص العهدة ═══') break;
      if (!data[i][0]) continue;

      transactionsCount++;
      var type = data[i][2];
      var amount = parseFloat(data[i][3]) || 0;

      if (type === 'إيداع') {
        totalDeposits += amount;
      } else if (type === 'صرف') {
        totalExpenses += amount;
      }

      lastBalance = parseFloat(data[i][8]) || 0;
    }

    return {
      custodian: custodianName,
      transactions_count: transactionsCount,
      total_deposits: totalDeposits,
      total_expenses: totalExpenses,
      current_balance: lastBalance
    };

  } catch (error) {
    Logger.log('Error getting custody report summary: ' + error.toString());
    return null;
  }
}

// =====================================================
// دوال إدارة الجمعيات (Associations)
// =====================================================

/**
 * ⭐ الحصول على جميع الجمعيات
 * @returns {Array} قائمة الجمعيات
 */
function getAllAssociations() {
  try {
    var sheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
    var data = sheet.getDataRange().getValues();

    var associations = [];

    // Headers: ID, الاسم, المسؤول, قيمة_القسط, عدد_الأشهر, إجمالي_القبض, تاريخ_البدء, ترتيب_القبض, تاريخ_القبض_المتوقع, الحالة, ملاحظات
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0] && !data[i][1]) continue; // تخطي الصفوف الفارغة

      associations.push({
        id: data[i][0],
        name: data[i][1] || '',
        responsible: data[i][2] || '',
        installment: parseFloat(data[i][3]) || 0,
        duration: parseInt(data[i][4]) || 0,
        totalCollection: parseFloat(data[i][5]) || 0,
        startDate: data[i][6] || '',
        collectionOrder: parseInt(data[i][7]) || 0,
        expectedCollectionDate: data[i][8] || '',
        status: data[i][9] || 'نشط',
        notes: data[i][10] || ''
      });
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
 * @returns {Object} نتيجة الإضافة
 */
function addNewAssociation(assocData) {
  try {
    var sheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
    var lastRow = sheet.getLastRow();
    var newId = lastRow;

    // حساب تاريخ البداية
    var currentYear = new Date().getFullYear();
    var startDate = currentYear + '-' + String(assocData.startMonth || 1).padStart(2, '0') + '-01';

    // حساب تاريخ القبض المتوقع
    var collectionMonth = (assocData.startMonth || 1) + (assocData.collectionOrder || 1) - 1;
    var collectionYear = currentYear;
    if (collectionMonth > 12) {
      collectionMonth -= 12;
      collectionYear++;
    }
    var expectedCollectionDate = collectionYear + '-' + String(collectionMonth).padStart(2, '0') + '-01';

    // حساب إجمالي القبض
    var totalCollection = (assocData.installment || 0) * (assocData.duration || 0);

    // الأعمدة: ID, الاسم, المسؤول, قيمة_القسط, عدد_الأشهر, إجمالي_القبض,
    //          تاريخ_البدء, ترتيب_القبض, تاريخ_القبض_المتوقع, الحالة, ملاحظات
    var row = [
      newId,
      assocData.name || '',
      assocData.responsible || '',
      assocData.installment || 0,
      assocData.duration || 0,
      totalCollection,
      startDate,
      assocData.collectionOrder || 1,
      expectedCollectionDate,
      'نشط',
      assocData.notes || ''
    ];

    sheet.appendRow(row);

    return {
      success: true,
      message: 'تم إضافة الجمعية بنجاح',
      id: newId
    };
  } catch (error) {
    Logger.log('Error adding association: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ⭐ تسجيل دفعة قسط جمعية
 * @param {number} assocId - معرف الجمعية
 * @param {number} amount - المبلغ
 * @returns {Object} نتيجة التسجيل
 */
function recordAssociationInstallment(assocId, amount) {
  try {
    // تسجيل كمصروف في شيت الحركات
    var result = addTransaction({
      type: 'مصروف',
      category: 'قسط_جمعية',
      amount: amount,
      currency: 'جنيه',
      contact: '',
      description: 'قسط جمعية رقم ' + assocId,
      notes: 'جمعية'
    });

    if (!result.success) {
      return result;
    }

    // حساب عدد الأقساط المدفوعة
    var paidCount = countAssociationInstallments(assocId);

    return {
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      paidCount: paidCount
    };
  } catch (error) {
    Logger.log('Error recording installment: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ⭐ حساب عدد الأقساط المدفوعة لجمعية
 * @param {number} assocId - معرف الجمعية
 * @returns {number} عدد الأقساط المدفوعة
 */
function countAssociationInstallments(assocId) {
  try {
    var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var data = sheet.getDataRange().getValues();
    var count = 0;

    for (var i = 1; i < data.length; i++) {
      var category = data[i][4] || '';
      var description = data[i][11] || '';
      var notes = data[i][14] || '';

      if (category === 'قسط_جمعية' || notes === 'جمعية') {
        if (description.indexOf('جمعية رقم ' + assocId) !== -1 || description.indexOf('جمعية') !== -1) {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    Logger.log('Error counting installments: ' + error.toString());
    return 0;
  }
}

/**
 * ⭐ تسجيل قبض من جمعية
 * @param {number} assocId - معرف الجمعية
 * @param {number} amount - المبلغ
 * @returns {Object} نتيجة التسجيل
 */
function recordAssociationCollection(assocId, amount) {
  try {
    // تسجيل كدخل في شيت الحركات
    var result = addTransaction({
      type: 'دخل',
      category: 'قبض_جمعية',
      amount: amount,
      currency: 'جنيه',
      contact: '',
      description: 'قبض من جمعية رقم ' + assocId,
      notes: 'قبض_جمعية'
    });

    if (!result.success) {
      return result;
    }

    // تحديث حالة الجمعية
    updateAssociationStatus(assocId, 'تم_القبض');

    return {
      success: true,
      message: 'تم تسجيل القبض بنجاح'
    };
  } catch (error) {
    Logger.log('Error recording collection: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ⭐ تحديث حالة الجمعية
 * @param {number} assocId - معرف الجمعية
 * @param {string} status - الحالة الجديدة
 */
function updateAssociationStatus(assocId, status) {
  try {
    var sheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == assocId) {
        sheet.getRange(i + 1, 9).setValue(status);
        break;
      }
    }
  } catch (error) {
    Logger.log('Error updating association status: ' + error.toString());
  }
}

/**
 * ⭐ تقرير الجمعيات
 * @returns {Object} تقرير شامل للجمعيات
 */
function getAssociationsReport() {
  try {
    var associations = getAllAssociations();
    var report = {
      associations: [],
      totalPaid: 0,
      totalExpected: 0
    };

    associations.forEach(function(assoc) {
      var paidInstallments = countAssociationInstallments(assoc.id);
      var totalPaid = paidInstallments * assoc.installment;
      var totalAmount = assoc.duration * assoc.installment;

      report.associations.push({
        id: assoc.id,
        name: assoc.name,
        installment: assoc.installment,
        duration: assoc.duration,
        paidInstallments: paidInstallments,
        totalPaid: totalPaid,
        totalAmount: totalAmount,
        collectionDate: assoc.expectedCollectionDate,
        collected: assoc.status === 'تم_القبض'
      });

      report.totalPaid += totalPaid;
      report.totalExpected += totalAmount;
    });

    return report;
  } catch (error) {
    Logger.log('Error getting associations report: ' + error.toString());
    return { associations: [], totalPaid: 0, totalExpected: 0 };
  }
}

/**
 * ⭐ معالجة رسالة جمعية من البوت
 * مثال: "دخلت في جمعية من اول شهر 2 وتستمر لمدة 10 اشهر هقبض القسط الرابع بمبلغ 1000"
 * @param {string} text - نص الرسالة
 * @returns {Object|null} بيانات الجمعية المستخرجة
 */
function parseAssociationMessage(text) {
  try {
    // تنظيف النص
    var cleanText = text.replace(/[\u200B-\u200D\u200E\u200F\uFEFF\u00A0]/g, '');

    // تحويل الأرقام العربية إلى إنجليزية
    var arabicNums = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
    for (var ar in arabicNums) {
      cleanText = cleanText.replace(new RegExp(ar, 'g'), arabicNums[ar]);
    }

    var result = {
      isAssociation: false,
      name: '',
      responsiblePerson: '',  // الشخص المسؤول عن الجمعية
      startMonth: 0,
      duration: 0,
      collectionOrder: 0,
      installment: 0,
      totalCollection: 0      // إجمالي القبض = المدة × القسط
    };

    // التحقق من أن الرسالة تتعلق بجمعية
    if (cleanText.indexOf('جمعية') === -1 && cleanText.indexOf('جمعيه') === -1) {
      return null;
    }

    result.isAssociation = true;

    // ===== استخراج الشخص المسؤول =====
    // أنماط مثل: "سارة مراتي دخلت جمعية" أو "جمعية مع سارة" أو "جمعية ام محمد مع سارة"
    var responsiblePatterns = [
      /^([^\d]+?)\s+دخل[ت]?\s+جمعي/i,           // سارة مراتي دخلت جمعية
      /جمعي[هة]?\s+(?:[^\s]+\s+)?مع\s+([^\d]+?)(?:\s+من|\s+لمدة|$)/i,  // جمعية مع سارة / جمعية ام محمد مع سارة
      /مع\s+([^\d]+?)\s+(?:من|لمدة|بقيمة)/i     // مع سارة من شهر
    ];

    for (var rp = 0; rp < responsiblePatterns.length; rp++) {
      var respMatch = cleanText.match(responsiblePatterns[rp]);
      if (respMatch && respMatch[1]) {
        result.responsiblePerson = respMatch[1].trim();
        Logger.log('Found responsible person: ' + result.responsiblePerson);
        break;
      }
    }

    // ===== استخراج اسم الجمعية =====
    // أنماط مثل: "جمعية ام احمد" أو "جمعية سارة"
    var namePatterns = [
      /جمعي[هة]?\s+([^\d\s][^\d]*?)(?:\s+مع|\s+من|\s+لمدة|\s+بقيمة|$)/i,  // جمعية ام احمد مع...
      /جمعي[هة]?\s+([أ-ي\s]+?)(?:\s+من|\s+لمدة)/i   // جمعية سارة من شهر
    ];

    var associationName = '';
    for (var np = 0; np < namePatterns.length; np++) {
      var nameMatch = cleanText.match(namePatterns[np]);
      if (nameMatch && nameMatch[1]) {
        var potentialName = nameMatch[1].trim();
        // تجاهل الكلمات المفتاحية
        if (!/^(?:من|لمدة|مع|بقيمة|شهر)$/i.test(potentialName) && potentialName.length > 1) {
          associationName = potentialName;
          Logger.log('Found association name: ' + associationName);
          break;
        }
      }
    }

    // ===== استخراج شهر البداية =====
    var startMonthMatch = cleanText.match(/(?:من|بداية|اول|أول)\s*(?:شهر)?\s*(\d{1,2})/i);
    if (startMonthMatch) {
      result.startMonth = parseInt(startMonthMatch[1]);
    }

    // ===== استخراج المدة =====
    var durationMatch = cleanText.match(/(?:لمدة|مدة|تستمر)\s*(\d{1,2})\s*(?:شهر|اشهر|أشهر)/i);
    if (durationMatch) {
      result.duration = parseInt(durationMatch[1]);
    }

    // ===== استخراج ترتيب القبض =====
    // أنماط موسعة: هنقبض/هقبض/اقبض/نقبض ال/الـ 10 أو الرابع/الخامس...
    var collectionPatterns = [
      /(?:هنقبض|هقبض|هاقبض|اقبض|أقبض|نقبض|القسط|الدور|ترتيب)\s*(?:ال|الـ)?\s*(\d{1,2})/i,
      /(?:هنقبض|هقبض|هاقبض|اقبض|أقبض|نقبض|القسط|الدور|ترتيب)\s*(?:ال|الـ)?\s*(الاول|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)/i
    ];

    var orderMap = {
      'الاول': 1, 'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4,
      'الخامس': 5, 'السادس': 6, 'السابع': 7, 'الثامن': 8, 'التاسع': 9, 'العاشر': 10
    };

    for (var cp = 0; cp < collectionPatterns.length; cp++) {
      var collectionMatch = cleanText.match(collectionPatterns[cp]);
      if (collectionMatch && collectionMatch[1]) {
        var orderText = collectionMatch[1];
        result.collectionOrder = orderMap[orderText] || parseInt(orderText) || 0;
        Logger.log('Found collection order: ' + result.collectionOrder);
        break;
      }
    }

    // ===== استخراج قيمة القسط =====
    var amountPatterns = [
      /(?:بمبلغ|بقيمة|قسط|القسط)\s*(\d+(?:,\d+)?(?:\.\d+)?)/i,
      /(\d{3,})\s*(?:جنيه|ريال)/i
    ];

    for (var ap = 0; ap < amountPatterns.length; ap++) {
      var amountMatch = cleanText.match(amountPatterns[ap]);
      if (amountMatch && amountMatch[1]) {
        result.installment = parseFloat(amountMatch[1].replace(/,/g, ''));
        break;
      }
    }

    // إذا لم يتم العثور على المبلغ، ابحث عن أي رقم كبير
    if (!result.installment) {
      var numbersInText = cleanText.match(/(\d{3,})/g);
      if (numbersInText && numbersInText.length > 0) {
        result.installment = parseFloat(numbersInText[numbersInText.length - 1]);
      }
    }

    // ===== حساب إجمالي القبض =====
    if (result.duration > 0 && result.installment > 0) {
      result.totalCollection = result.duration * result.installment;
    }

    // ===== اسم الجمعية =====
    if (associationName) {
      result.name = 'جمعية ' + associationName;
    } else {
      result.name = 'جمعية شهر ' + result.startMonth + '/' + new Date().getFullYear();
    }

    Logger.log('Parsed association: ' + JSON.stringify(result));
    return result;

  } catch (error) {
    Logger.log('Error parsing association message: ' + error.toString());
    return null;
  }
}

/**
 * ⭐⭐⭐ تحليل التحويل المركب ⭐⭐⭐
 * يحلل رسائل مثل:
 * - "حولت لمصطفي 300 ريال ما يعادل 9000 جنيه منهم 4000 لمراتي و 4000 مصطفي و 1000 تفضل مع مصطفي في العهده"
 * - "حولت لمصطفي 3000 ريال ما يعادل 10000 مصري يعطي لزوجتي 400 وياخد لنفسه 4000 ويخلي الباقي عهده"
 * ويرجع مصفوفة من المعاملات
 */
function parseCompoundTransfer(text) {
  try {
    Logger.log('=== parseCompoundTransfer START ===');
    Logger.log('Input: ' + text);

    // تحويل الأرقام العربية والهندية إلى إنجليزية
    var arabicNums = {
      '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
      '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
    };
    var normalizedText = text;
    for (var ar in arabicNums) {
      normalizedText = normalizedText.replace(new RegExp(ar, 'g'), arabicNums[ar]);
    }

    // تنظيف النص
    var cleanText = normalizedText.replace(/[\u200B-\u200D\u200E\u200F\uFEFF\u00A0]/g, '');
    // استبدال الأسطر الجديدة بمسافات لتسهيل التحليل
    cleanText = cleanText.replace(/[\r\n]+/g, ' ');
    cleanText = cleanText.replace(/[ةه]/g, 'ه').replace(/[يى]/g, 'ي').replace(/[أإآا]/g, 'ا');

    Logger.log('Normalized: ' + cleanText);

    // التحقق من أن الرسالة تحتوي على توزيع
    // قائمة موسعة من الأفعال: يعطي/تعطي/اعطي/هيدي/ادي/دفع/يدفع/تدفع/حول/سلم/وصل/بعت...
    var distributionVerbs = /منهم|منها|يعطي|تعطي|اعطي|هيدي|يدي|ادي|تدي|هتدي|دفع|يدفع|تدفع|هيدفع|هتدفع|ادفع|حول|يحول|تحول|هيحول|هتحول|سلم|يسلم|تسلم|هيسلم|هتسلم|وصل|يوصل|توصل|هيوصل|هتوصل|بعت|يبعت|تبعت|هيبعت|هتبعت|وياخد|ياخد|تاخد|هياخد|هتاخد|ويخلي|يخلي|تخلي|هيخلي|هتخلي|الباقي|جمعيه|قسط/;
    var hasDistribution = distributionVerbs.test(cleanText);
    if (!hasDistribution) {
      Logger.log('No distribution keyword found');
      return null;
    }

    var result = {
      isCompound: true,
      totalAmountSAR: 0,
      totalAmountEGP: 0,
      exchangeRate: 0,
      custodian: 'مصطفى', // الافتراضي
      distributions: [],
      transactions: []
    };

    // استخراج أمين العهدة من بداية الرسالة
    if (/حولت\s*ل?سار[هة]/i.test(cleanText)) {
      result.custodian = 'سارة';
    } else if (/حولت\s*ل?مصطف[يى]/i.test(cleanText)) {
      result.custodian = 'مصطفى';
    }
    Logger.log('Custodian: ' + result.custodian);

    // استخراج المبلغ الإجمالي وسعر الصرف
    // نمط: "300 ريال ما يعادل 9000 جنيه" أو "300 ريال يعادل 9000 مصري"
    var totalMatch = cleanText.match(/(\d+)\s*(?:ريال|سعودي).*?(?:ما\s*)?يعادل\s*(\d+)/i);
    if (totalMatch) {
      result.totalAmountSAR = parseInt(totalMatch[1]);
      result.totalAmountEGP = parseInt(totalMatch[2]);
      if (result.totalAmountSAR > 0) {
        result.exchangeRate = (result.totalAmountEGP / result.totalAmountSAR).toFixed(2);
      }
      Logger.log('Total: ' + result.totalAmountSAR + ' SAR = ' + result.totalAmountEGP + ' EGP, Rate: ' + result.exchangeRate);
    } else {
      Logger.log('Could not extract total amount');
      return null;
    }

    // تحديد نوع الرسالة وطريقة استخراج التوزيع
    var distributionPart = '';

    // نمط 1: "منهم 4000 لمراتي و 4000 مصطفي"
    if (/منهم|منها|منه/.test(cleanText)) {
      distributionPart = cleanText.split(/منهم|منها|منه/)[1] || '';
    }
    // نمط 2: استخراج كل شيء بعد المبلغ بالجنيه
    else {
      // البحث عن النص بعد "يعادل XXXX جنيه مصري" أو "يعادل XXXX جنيه" أو "يعادل XXXX"
      var patterns = [
        /يعادل\s*\d+\s*جنيه\s*مصري\s*(.+)/i,
        /يعادل\s*\d+\s*(?:جنيه|مصري)\s*(.+)/i,
        /يعادل\s*\d+\s+(.+)/i
      ];
      for (var p = 0; p < patterns.length; p++) {
        var match = cleanText.match(patterns[p]);
        if (match && match[1]) {
          distributionPart = match[1];
          Logger.log('Distribution extracted with pattern ' + p + ': ' + distributionPart);
          break;
        }
      }
    }

    // إذا كان جزء التوزيع يبدأ بـ "عهده" أو "عهد" نأخذ ما بعدها
    // نجعل المسافة اختيارية لمرونة أكبر
    if (distributionPart && /^عهده?\s*/i.test(distributionPart)) {
      var beforeRemove = distributionPart;
      distributionPart = distributionPart.replace(/^عهده?\s*/i, '');
      if (distributionPart.length > 2) {
        Logger.log('Removed leading عهده: "' + beforeRemove + '" -> "' + distributionPart + '"');
      } else {
        // إذا أصبح النص قصيراً جداً بعد الإزالة، نبحث في النص الكامل
        distributionPart = beforeRemove;
      }
    }

    // إذا لم نجد جزء التوزيع أو كان قصيراً، نبحث عن "عهده" ونأخذ ما بعدها
    if (!distributionPart || distributionPart.trim().length < 3) {
      var afterOhda = cleanText.match(/عهده?\s+(.+)/i);
      if (afterOhda && afterOhda[1]) {
        distributionPart = afterOhda[1];
        Logger.log('Found distribution after عهده: ' + distributionPart);
      }
    }

    if (!distributionPart || distributionPart.trim().length < 3) {
      Logger.log('No distribution part found');
      return null;
    }
    Logger.log('Final distribution part: ' + distributionPart);

    // نبحث عن كل الأنماط
    var distributions = [];

    // ===== نمط 1: "[فعل] [شخص/جهة] [مبلغ]" =====
    // أفعال موسعة: يعطي/تعطي/اعطي/هيدي/ادي/دفع/يدفع/تدفع/حول/سلم/وصل/بعت...
    var actionVerbs = '(?:يعطي|تعطي|اعطي|هيدي|يدي|ادي|تدي|هتدي|دفع|يدفع|تدفع|هيدفع|هتدفع|ادفع|حول|يحول|تحول|هيحول|هتحول|سلم|يسلم|تسلم|هيسلم|هتسلم|وصل|يوصل|توصل|هيوصل|هتوصل|بعت|يبعت|تبعت|هيبعت|هتبعت)';
    var givePattern = new RegExp(actionVerbs + '\\s+(?:ل)?([^\\d٠-٩]+?)\\s*(\\d+)', 'gi');
    // قائمة العملات لتجاهلها
    var currencyExclude = /^(?:جنيه|ريال|دولار|مصري|سعودي)$/i;
    var giveMatch;
    while ((giveMatch = givePattern.exec(distributionPart)) !== null) {
      var giveRecipient = giveMatch[1].trim().replace(/^ل/, '').replace(/\s+$/, '');
      var giveAmount = parseInt(giveMatch[2]);

      // تنظيف اسم المستلم
      giveRecipient = giveRecipient.replace(/^(?:ال|لل|ل)/, '').trim();

      // ⭐ إزالة كلمات العملة من نهاية اسم المستلم
      giveRecipient = giveRecipient.replace(/\s*(?:جنيه|ريال|دولار|مصري|سعودي)\s*$/i, '').trim();

      // ⭐ تجاهل إذا كان المستلم عملة فقط
      if (currencyExclude.test(giveRecipient) || giveRecipient.length < 2) {
        Logger.log('Skipping currency/short recipient: ' + giveRecipient);
        continue;
      }

      // التحقق من عدم التكرار: نفس المبلغ + نفس المستلم
      var giveExists = false;
      for (var gi = 0; gi < distributions.length; gi++) {
        if (distributions[gi].amount === giveAmount && distributions[gi].recipient === giveRecipient) {
          giveExists = true;
          break;
        }
      }

      if (giveAmount > 0 && giveRecipient.length > 0 && !giveExists) {
        // التحقق إذا كان المستلم هو "جمعية" أو "قسط جمعية"
        var isAssociation = /جمعي|قسط/i.test(giveRecipient);

        distributions.push({
          amount: giveAmount,
          recipient: giveRecipient,
          isCustody: false,
          isAssociation: isAssociation
        });
        Logger.log('Give pattern: ' + giveAmount + ' -> ' + giveRecipient + (isAssociation ? ' (جمعية)' : ''));
      }
    }

    // ===== نمط 2: "وياخذ/ياخذ [مبلغ]" (لنفسه - بدون اسم) =====
    var takePattern = /(?:وياخد|ياخد|وياخذ|ياخذ)\s*(?:لنفسه|نفسه|له|ه)?\s*(\d+)/gi;
    var takeMatch;
    while ((takeMatch = takePattern.exec(distributionPart)) !== null) {
      var takeAmount = parseInt(takeMatch[1]);
      var takeRecipient = result.custodian;

      // التحقق من عدم التكرار: نفس المبلغ + نفس المستلم
      var takeExists = false;
      for (var ti = 0; ti < distributions.length; ti++) {
        if (distributions[ti].amount === takeAmount && distributions[ti].recipient === takeRecipient) {
          takeExists = true;
          break;
        }
      }

      if (takeAmount > 0 && !takeExists) {
        distributions.push({
          amount: takeAmount,
          recipient: takeRecipient,
          isCustody: false,
          forSelf: true
        });
        Logger.log('Take pattern (self): ' + takeAmount + ' -> ' + takeRecipient);
      }
    }

    // ===== نمط 3: "[مبلغ] ل[شخص]" =====
    // تجاهل العملات
    var currencyWords = /^(?:جنيه|ريال|دولار|مصري|سعودي)$/i;
    var amountFirstPattern = /(\d+)\s*(?:ل|الى|إلى)?\s*([^\d٠-٩\s][^\d٠-٩و]*?)(?=\s*(?:و|$))/gi;
    var amountMatch;
    while ((amountMatch = amountFirstPattern.exec(distributionPart)) !== null) {
      var amtVal = parseInt(amountMatch[1]);
      var recVal = amountMatch[2].trim().replace(/^ل/, '');

      // تجاهل الكلمات المفتاحية والقصيرة والعملات
      if (!recVal || recVal.length < 2) continue;
      if (/^(?:و|ال|في|من)$/.test(recVal)) continue;
      // ⭐ تجاهل العملات
      if (currencyWords.test(recVal)) {
        Logger.log('Skipping currency word: ' + recVal);
        continue;
      }

      // التحقق من عدم التكرار: نفس المبلغ + نفس المستلم
      var amtExists = false;
      for (var ai = 0; ai < distributions.length; ai++) {
        if (distributions[ai].amount === amtVal && distributions[ai].recipient === recVal) {
          amtExists = true;
          break;
        }
      }

      if (amtVal > 0 && !amtExists) {
        var isCustodyAmt = /عهده?|باقي|متبقي/.test(recVal);

        distributions.push({
          amount: amtVal,
          recipient: recVal,
          isCustody: isCustodyAmt
        });
        Logger.log('Amount-first pattern: ' + amtVal + ' -> ' + recVal);
      }
    }

    // ===== نمط 4: "الباقي عهده" أو "والباقي عهده" أو "وعهده الباقي" =====
    var hasCustodyRemainder = /(?:و)?(?:ال)?باقي\s*عهد|عهده?\s*(?:ال)?باقي/i.test(distributionPart);

    Logger.log('Has custody remainder: ' + hasCustodyRemainder);
    Logger.log('Distributions so far: ' + distributions.length);

    // إذا كان "الباقي عهده" بدون مبلغ محدد، نحسب الباقي
    if (hasCustodyRemainder) {
      var totalDistributed = 0;
      for (var d = 0; d < distributions.length; d++) {
        if (!distributions[d].isCustody) {
          totalDistributed += distributions[d].amount;
        }
      }
      var remaining = result.totalAmountEGP - totalDistributed;
      Logger.log('Total distributed: ' + totalDistributed + ', Remaining: ' + remaining);

      if (remaining > 0) {
        distributions.push({ amount: remaining, recipient: 'عهده', isCustody: true });
        Logger.log('Custody (auto-calculated): ' + remaining);
      }
    }

    result.distributions = distributions;
    Logger.log('Total distributions found: ' + distributions.length);

    // حساب إجمالي التوزيع
    var totalDistributed = 0;
    for (var f = 0; f < distributions.length; f++) {
      if (!distributions[f].isCustody) {
        totalDistributed += distributions[f].amount;
      }
    }
    Logger.log('Total distributed: ' + totalDistributed + ' / Total EGP: ' + result.totalAmountEGP);

    // إنشاء المعاملات
    // 1. معاملة إيداع العهدة الرئيسية
    // البحث عن تصنيف من شيت التصنيفات نوع "تحويل"
    // مثل: حواله، أو عهدة [اسم] إذا موجود
    var custodyCategory = findMatchingCategory('عهدة ' + result.custodian, 'تحويل');
    if (!custodyCategory) {
      // جرب البحث عن "حواله" كتصنيف افتراضي للإيداع
      custodyCategory = findMatchingCategory('حواله', 'تحويل');
    }
    if (!custodyCategory) {
      // البحث في كل التصنيفات
      var allCats = getCategoriesFromSheet('تحويل');
      if (allCats && allCats.length > 0) {
        // استخدم أول تصنيف متاح أو "متنوع"
        for (var ci = 0; ci < allCats.length; ci++) {
          if (allCats[ci].كود === 'متنوع' || allCats[ci].كود === 'حواله') {
            custodyCategory = allCats[ci].كود;
            break;
          }
        }
        if (!custodyCategory) {
          custodyCategory = allCats[0].كود; // أول تصنيف متاح
        }
      } else {
        custodyCategory = 'حواله'; // الافتراضي
      }
    }
    Logger.log('Custody deposit category: ' + custodyCategory);

    result.transactions.push({
      type: 'إيداع_عهدة',
      amount: result.totalAmountSAR,
      currency: 'ريال',
      amount_received: result.totalAmountEGP,
      currency_received: 'جنيه',
      exchange_rate: result.exchangeRate,
      category: custodyCategory,
      contact: result.custodian,
      description: 'تحويل مركب - إيداع عهدة'
    });

    // 2. معاملات الصرف لكل توزيع (ما عدا العهدة)
    // قراءة تصنيفات التحويل مرة واحدة
    var transferCategories = getCategoriesFromSheet('تحويل');
    var defaultCategory = 'متنوع';
    // البحث عن تصنيف افتراضي في الشيت
    for (var dc = 0; dc < transferCategories.length; dc++) {
      if (transferCategories[dc].كود === 'متنوع') {
        defaultCategory = 'متنوع';
        break;
      }
    }

    for (var i = 0; i < result.distributions.length; i++) {
      var dist = result.distributions[i];

      if (!dist.isCustody) {
        // تحديد الجهة من اسم المستلم
        var contactName = dist.recipient;
        var category = null;
        var recipientDisplay = dist.recipient;

        // محاولة تطبيع اسم الجهة
        // نستخدم التصنيفات من شيت التصنيفات فقط

        // ===== التحقق من الجمعية أولاً =====
        if (dist.isAssociation || /جمعي|قسط\s*جمعي/i.test(dist.recipient)) {
          contactName = 'جمعية';
          // البحث عن تصنيف "قسط جمعية" في الشيت
          category = findMatchingCategory('قسط جمعية', 'تحويل');
          if (!category) {
            category = findMatchingCategory('جمعية', 'تحويل');
          }
          if (!category) {
            // البحث في كل التصنيفات عن أي شيء يحتوي على "جمعية"
            for (var jc = 0; jc < transferCategories.length; jc++) {
              if (/جمعي/i.test(transferCategories[jc].كود)) {
                category = transferCategories[jc].كود;
                break;
              }
            }
          }
          recipientDisplay = 'قسط جمعية';
          Logger.log('Association payment detected: ' + dist.amount);
        }
        // ===== التحقق من الزوجة =====
        else if (/مرات[يه]|زوجت[يه]|الزوج[هة]/i.test(dist.recipient)) {
          contactName = normalizeContactName('الزوجة') || 'Om Celia';
          category = findMatchingCategory('زوجة', 'تحويل');
          recipientDisplay = 'زوجتي';
        }
        // ===== التحقق من مصطفى =====
        else if (/مصطف[يى]/i.test(dist.recipient)) {
          contactName = normalizeContactName('مصطفى') || 'مصطفى';
          category = findMatchingCategory('الأهل', 'تحويل');
          recipientDisplay = 'مصطفى';
        }
        // ===== التحقق من سارة =====
        else if (/سار[هة]/i.test(dist.recipient)) {
          contactName = normalizeContactName('سارة') || 'سارة';
          category = findMatchingCategory('الأهل', 'تحويل');
          recipientDisplay = 'سارة';
        }
        // ===== التحقق من الأهل =====
        else if (/اهل|أهل|عائل[هة]/i.test(dist.recipient)) {
          contactName = normalizeContactName(dist.recipient) || dist.recipient;
          category = findMatchingCategory('الأهل', 'تحويل');
        }
        // ===== محاولة البحث عن الجهة والتصنيف =====
        else {
          var normalizedContact = normalizeContactName(dist.recipient);
          if (normalizedContact) {
            contactName = normalizedContact;
          }
          category = findMatchingCategory(dist.recipient, 'تحويل');
        }

        // إذا لم يجد تصنيف، استخدم الافتراضي من الشيت
        if (!category) {
          category = defaultCategory;
          Logger.log('No category found for ' + dist.recipient + ', using default: ' + category);
        }

        result.transactions.push({
          type: 'صرف_من_عهدة',
          amount: dist.amount,
          currency: 'جنيه',
          category: category,
          contact: contactName,
          description: 'صرف من عهدة ' + result.custodian + ' - ' + recipientDisplay
        });
      }
    }

    Logger.log('Generated ' + result.transactions.length + ' transactions');
    Logger.log('=== parseCompoundTransfer END ===');

    return result;

  } catch (error) {
    Logger.log('Error in parseCompoundTransfer: ' + error.toString());
    return null;
  }
}

// =====================================================
// ============== نظام النسخ الاحتياطي ==============
// =====================================================

/**
 * إنشاء نسخة احتياطية من الـ Spreadsheet
 * يتم حفظها في مجلد Google Drive المحدد
 * @returns {string} رسالة تأكيد أو خطأ
 */
function createBackup() {
  try {
    var ss = getSpreadsheet();
    var backupFolderId = CONFIG.BACKUP_FOLDER_ID;

    // التأكد من وجود معرف المجلد
    if (!backupFolderId) {
      Logger.log('❌ لم يتم تحديد مجلد النسخ الاحتياطي في الإعدادات');
      return 'خطأ: لم يتم تحديد مجلد النسخ الاحتياطي';
    }

    // الحصول على المجلد
    var folder;
    try {
      folder = DriveApp.getFolderById(backupFolderId);
    } catch (e) {
      Logger.log('❌ لا يمكن الوصول لمجلد النسخ الاحتياطي: ' + e.toString());
      return 'خطأ: لا يمكن الوصول لمجلد النسخ الاحتياطي';
    }

    // إنشاء اسم الملف بالتاريخ والوقت
    var now = new Date();
    var dateStr = Utilities.formatDate(now, 'Africa/Cairo', 'yyyy-MM-dd');
    var timeStr = Utilities.formatDate(now, 'Africa/Cairo', 'HH-mm');
    var backupName = 'نسخة احتياطية - ' + ss.getName() + ' - ' + dateStr + ' - ' + timeStr;

    // إنشاء نسخة من الـ Spreadsheet
    var backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folder);

    Logger.log('✅ تم إنشاء نسخة احتياطية: ' + backupName);
    Logger.log('📁 معرف الملف: ' + backupFile.getId());

    // حذف النسخ الاحتياطية القديمة (الاحتفاظ بآخر 30 نسخة فقط)
    cleanupOldBackups(folder, 30);

    return '✅ تم إنشاء النسخة الاحتياطية بنجاح\n📁 ' + backupName;

  } catch (error) {
    Logger.log('❌ خطأ في إنشاء النسخة الاحتياطية: ' + error.toString());
    return 'خطأ: ' + error.toString();
  }
}

/**
 * حذف النسخ الاحتياطية القديمة (الاحتفاظ بعدد معين فقط)
 * @param {Folder} folder - مجلد النسخ الاحتياطية
 * @param {number} keepCount - عدد النسخ المراد الاحتفاظ بها
 */
function cleanupOldBackups(folder, keepCount) {
  try {
    var files = folder.getFiles();
    var backupFiles = [];

    // جمع ملفات النسخ الاحتياطية
    while (files.hasNext()) {
      var file = files.next();
      if (file.getName().indexOf('نسخة احتياطية') !== -1) {
        backupFiles.push({
          file: file,
          date: file.getDateCreated()
        });
      }
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    backupFiles.sort(function(a, b) {
      return b.date - a.date;
    });

    // حذف الملفات الزائدة
    if (backupFiles.length > keepCount) {
      for (var i = keepCount; i < backupFiles.length; i++) {
        Logger.log('🗑️ حذف نسخة قديمة: ' + backupFiles[i].file.getName());
        backupFiles[i].file.setTrashed(true);
      }
      Logger.log('✅ تم حذف ' + (backupFiles.length - keepCount) + ' نسخة قديمة');
    }

  } catch (error) {
    Logger.log('⚠️ خطأ في تنظيف النسخ القديمة: ' + error.toString());
  }
}

/**
 * إعداد الـ Trigger للنسخ الاحتياطي التلقائي
 * يتم تشغيله مرة واحدة لإعداد النسخ الاحتياطي اليومي
 * @param {string} password - كلمة السر للتحقق
 */
function setupDailyBackupTrigger(password) {
  // التحقق من كلمة السر
  if (!password || !verifyAdminPassword(password)) {
    throw new Error('⛔ كلمة السر غير صحيحة! لا يمكن إعداد النسخ الاحتياطي.');
  }

  try {
    // حذف أي Triggers قديمة للنسخ الاحتياطي
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'createBackup') {
        ScriptApp.deleteTrigger(triggers[i]);
        Logger.log('🗑️ تم حذف Trigger قديم للنسخ الاحتياطي');
      }
    }

    // إنشاء Trigger جديد للتشغيل يومياً الساعة 12 بالليل (منتصف الليل)
    ScriptApp.newTrigger('createBackup')
      .timeBased()
      .atHour(0)  // الساعة 12 بالليل (0 = منتصف الليل)
      .everyDays(1)  // كل يوم
      .inTimezone('Africa/Cairo')  // توقيت مصر
      .create();

    Logger.log('✅ تم إعداد النسخ الاحتياطي اليومي الساعة 12 بالليل');
    return '✅ تم إعداد النسخ الاحتياطي اليومي بنجاح\n⏰ الساعة 12:00 بالليل (توقيت القاهرة)';

  } catch (error) {
    Logger.log('❌ خطأ في إعداد النسخ الاحتياطي: ' + error.toString());
    throw new Error('خطأ في إعداد النسخ الاحتياطي: ' + error.toString());
  }
}

/**
 * إلغاء النسخ الاحتياطي التلقائي
 * @param {string} password - كلمة السر للتحقق
 */
function cancelDailyBackupTrigger(password) {
  // التحقق من كلمة السر
  if (!password || !verifyAdminPassword(password)) {
    throw new Error('⛔ كلمة السر غير صحيحة!');
  }

  try {
    var triggers = ScriptApp.getProjectTriggers();
    var deleted = 0;

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'createBackup') {
        ScriptApp.deleteTrigger(triggers[i]);
        deleted++;
      }
    }

    if (deleted > 0) {
      Logger.log('✅ تم إلغاء ' + deleted + ' Trigger للنسخ الاحتياطي');
      return '✅ تم إلغاء النسخ الاحتياطي التلقائي';
    } else {
      return 'ℹ️ لا يوجد نسخ احتياطي تلقائي مُفعّل';
    }

  } catch (error) {
    throw new Error('خطأ في إلغاء النسخ الاحتياطي: ' + error.toString());
  }
}

/**
 * عرض حالة النسخ الاحتياطي
 * @returns {string} معلومات عن حالة النسخ الاحتياطي
 */
function getBackupStatus() {
  try {
    var info = '📊 *حالة النسخ الاحتياطي*\n';
    info += '═══════════════════\n\n';

    // فحص الـ Triggers
    var triggers = ScriptApp.getProjectTriggers();
    var backupTriggerActive = false;

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'createBackup') {
        backupTriggerActive = true;
        break;
      }
    }

    info += '⏰ النسخ التلقائي: ' + (backupTriggerActive ? '✅ مُفعّل' : '❌ غير مُفعّل') + '\n';

    // فحص المجلد
    var backupFolderId = CONFIG.BACKUP_FOLDER_ID;
    if (backupFolderId) {
      try {
        var folder = DriveApp.getFolderById(backupFolderId);
        var files = folder.getFiles();
        var backupCount = 0;
        var lastBackup = null;

        while (files.hasNext()) {
          var file = files.next();
          if (file.getName().indexOf('نسخة احتياطية') !== -1) {
            backupCount++;
            if (!lastBackup || file.getDateCreated() > lastBackup) {
              lastBackup = file.getDateCreated();
            }
          }
        }

        info += '📁 عدد النسخ: ' + backupCount + '\n';

        if (lastBackup) {
          var lastBackupStr = Utilities.formatDate(lastBackup, 'Africa/Cairo', 'yyyy-MM-dd HH:mm');
          info += '🕐 آخر نسخة: ' + lastBackupStr + '\n';
        }

      } catch (e) {
        info += '⚠️ لا يمكن الوصول للمجلد\n';
      }
    } else {
      info += '⚠️ لم يتم تحديد مجلد النسخ\n';
    }

    return info;

  } catch (error) {
    return 'خطأ في جلب حالة النسخ الاحتياطي: ' + error.toString();
  }
}

/**
 * إنشاء نسخة احتياطية يدوية (للتجربة)
 */
function testBackup() {
  var result = createBackup();
  Logger.log(result);
  return result;
}
