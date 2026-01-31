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
      'ID', 'الاسم', 'قيمة_القسط', 'عدد_الأشهر', 'تاريخ_البدء', 'ترتيب_القبض',
      'تاريخ_القبض_المتوقع', 'المسؤول', 'الحالة', 'ملاحظات'
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
    ]
  };

  return headersMap[sheetName] || [];
}

/**
 * إنشاء جميع الشيتات
 */
function initializeAllSheets() {
  const sheetNames = Object.values(SHEETS);

  sheetNames.forEach(sheetName => {
    getOrCreateSheet(sheetName);
  });

  // إضافة البيانات الافتراضية
  addDefaultCategories();
  addDefaultContacts();
  addDefaultSettings();

  // إضافة القوائم المنسدلة
  addDropdownValidations();

  return 'تم إنشاء جميع الشيتات بنجاح!';
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
      transaction.contact || '',
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

    const normalizedAlias = alias.toLowerCase().trim();

    for (let i = 1; i < data.length; i++) {
      const aliases = data[i][3].split('،').map(a => a.trim().toLowerCase());
      const code = data[i][0].toLowerCase();
      const name = data[i][1].toLowerCase();

      if (code === normalizedAlias ||
        name.includes(normalizedAlias) ||
        aliases.includes(normalizedAlias)) {
        return {
          code: data[i][0],
          name: data[i][1],
          relation: data[i][2],
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
 * الحصول على رصيد العهدة لأمين معين
 * @param {string} custodian - اسم أمين العهدة
 * @returns {number} الرصيد الحالي
 */
function getCustodyBalance(custodian) {
  try {
    const sheet = getOrCreateSheet(SHEETS.CUSTODY);
    const data = sheet.getDataRange().getValues();

    let balance = 0;
    const custodianLower = (custodian || 'سارة').toLowerCase();

    for (let i = 1; i < data.length; i++) {
      if (data[i][4] && data[i][4].toString().toLowerCase() === custodianLower) {
        const type = data[i][3];
        const amount = parseFloat(data[i][5]) || 0;

        if (type === 'إيداع_عهدة') {
          balance += amount;
        } else if (type === 'صرف_من_عهدة') {
          balance -= amount;
        }
      }
    }

    return balance;

  } catch (error) {
    Logger.log('Error getting custody balance: ' + error.toString());
    return 0;
  }
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
    var custodianLower = (custodian || 'سارة').toLowerCase();

    // Headers: ID, التاريخ, الوقت, النوع, التصنيف, المبلغ, العملة, المبلغ_المستلم, عملة_الاستلام, سعر_الصرف, جهة_الاتصال, ...
    for (var i = 1; i < data.length; i++) {
      var type = data[i][3]; // النوع
      var contact = (data[i][10] || '').toString().toLowerCase(); // جهة_الاتصال

      // التحقق من أن الحركة لأمين العهدة المحدد
      if (contact.indexOf(custodianLower) === -1) {
        continue;
      }

      if (type === 'إيداع_عهدة') {
        // المبلغ المستلم (بالجنيه) أو المبلغ الأصلي
        var amountReceived = parseFloat(data[i][7]) || 0;
        var amount = parseFloat(data[i][5]) || 0;
        balance += amountReceived > 0 ? amountReceived : amount;
      } else if (type === 'صرف_من_عهدة') {
        var amount = parseFloat(data[i][5]) || 0;
        balance -= amount;
      }
    }

    Logger.log('Custody balance for ' + custodian + ': ' + balance);
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

    var custodianLower = (custodian || 'سارة').toLowerCase();

    var totalDeposits = 0;
    var totalExpenses = 0;
    var transactions = [];

    // Headers: ID, التاريخ, الوقت, النوع, التصنيف, المبلغ, العملة, المبلغ_المستلم, عملة_الاستلام, سعر_الصرف, جهة_الاتصال, الوصف, ...
    for (var i = 1; i < data.length; i++) {
      var type = data[i][3];
      var contact = (data[i][10] || '').toString().toLowerCase();

      // التحقق من أن الحركة لأمين العهدة المحدد
      if (contact.indexOf(custodianLower) === -1) {
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
      } else if (type === 'صرف_من_عهدة') {
        totalExpenses += amount;
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
