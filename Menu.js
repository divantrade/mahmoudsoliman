/**
 * =====================================================
 * نظام محمود المحاسبي v2.0 - القائمة المخصصة
 * نظام القيد المزدوج - Double Entry
 * =====================================================
 * قائمة تظهر في شريط الأدوات لتشغيل التقارير والأدوات
 */

/**
 * إنشاء القائمة عند فتح الشيت
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('💼 نظام محمود v2.0')
    // قسم التقارير
    .addSubMenu(ui.createMenu('📊 التقارير')
      .addItem('تقرير أرصدة الحسابات', 'menuShowBalancesReport')
      .addItem('تقرير الشهر الحالي', 'menuShowMonthReport')
      .addItem('التقرير الشامل', 'menuShowComprehensiveReport')
      .addSeparator()
      .addItem('تقرير مخصص...', 'menuShowCustomReport'))

    // قسم الحسابات
    .addSubMenu(ui.createMenu('💰 الحسابات')
      .addItem('عرض جميع الحسابات', 'menuShowAllAccounts')
      .addItem('كشف حساب...', 'menuShowAccountStatement')
      .addSeparator()
      .addItem('تقرير حسابات العهدة', 'menuShowCustodyReport')
      .addItem('تقرير المدخرات', 'menuShowSavingsReport')
      .addItem('تقرير الاستثمارات', 'menuShowInvestmentsReport'))

    // قسم العهدة (للتوافق مع القديم)
    .addSubMenu(ui.createMenu('👤 العهدة')
      .addItem('تقرير حسابات العهدة', 'menuShowCustodyReport')
      .addSeparator()
      .addItem('عرض رصيد حساب...', 'menuShowSpecificAccountBalance'))

    // قسم الجمعيات
    .addSubMenu(ui.createMenu('🤝 الجمعيات')
      .addItem('عرض جميع الجمعيات', 'menuShowAllAssociations')
      .addItem('إضافة جمعية جديدة...', 'menuAddNewAssociation')
      .addSeparator()
      .addItem('تسجيل دفعة قسط...', 'menuRecordInstallmentPayment')
      .addItem('تسجيل قبض من جمعية...', 'menuRecordAssociationCollection')
      .addSeparator()
      .addItem('تقرير الجمعيات', 'menuShowAssociationsReport'))

    // قسم الأدوات
    .addSubMenu(ui.createMenu('🔧 أدوات')
      .addItem('إعادة حساب الأرصدة', 'menuRecalculateBalances')
      .addItem('تنظيف البيانات', 'menuCleanData')
      .addSeparator()
      .addItem('عرض معلومات النظام', 'menuShowSystemInfo')
      .addItem('إنشاء جميع الشيتات', 'menuInitializeSheets'))

    // قسم النسخ الاحتياطي
    .addSubMenu(ui.createMenu('💾 النسخ الاحتياطي')
      .addItem('إنشاء نسخة احتياطية الآن', 'menuCreateBackupNow')
      .addItem('حالة النسخ الاحتياطي', 'menuShowBackupStatus')
      .addSeparator()
      .addItem('تفعيل النسخ اليومي التلقائي', 'menuSetupDailyBackup')
      .addItem('إلغاء النسخ اليومي التلقائي', 'menuCancelDailyBackup'))

    // قسم المساعدة
    .addSeparator()
    .addItem('ℹ️ حول النظام', 'menuShowAbout')

    .addToUi();
}

// =====================================================
// دوال التقارير الجديدة
// =====================================================

/**
 * عرض تقرير أرصدة الحسابات
 */
function menuShowBalancesReport() {
  try {
    var report = generateBalancesReport();
    var ui = SpreadsheetApp.getUi();

    // تحويل التنسيق للعرض في alert
    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير أرصدة الحسابات', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض تقرير الشهر
 */
function menuShowMonthReport() {
  try {
    var report = generateMonthlySummary();
    var ui = SpreadsheetApp.getUi();

    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير الشهر', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض التقرير الشامل
 */
function menuShowComprehensiveReport() {
  try {
    var report = generateComprehensiveReport();
    var ui = SpreadsheetApp.getUi();

    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('التقرير الشامل', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض تقرير مخصص (يطلب التاريخ من المستخدم)
 */
function menuShowCustomReport() {
  var ui = SpreadsheetApp.getUi();

  var response = ui.prompt(
    'تقرير مخصص',
    'أدخل رقم الشهر (1-12):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;
  var month = parseInt(response.getResponseText());

  response = ui.prompt(
    'تقرير مخصص',
    'أدخل السنة (مثال: 2025):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;
  var year = parseInt(response.getResponseText());

  try {
    var report = generateMonthlySummary(month, year);
    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير مخصص', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

// =====================================================
// دوال الحسابات
// =====================================================

/**
 * عرض جميع الحسابات
 */
function menuShowAllAccounts() {
  var ui = SpreadsheetApp.getUi();

  try {
    var accounts = getAllAccounts();

    if (!accounts || accounts.length === 0) {
      ui.alert('الحسابات', 'لا توجد حسابات مسجلة.', ui.ButtonSet.OK);
      return;
    }

    var message = '💰 الحسابات المسجلة\n';
    message += '═══════════════════════════\n\n';

    // Group by type
    var accountsByType = {};
    accounts.forEach(function(acc) {
      if (!accountsByType[acc.type]) {
        accountsByType[acc.type] = [];
      }
      accountsByType[acc.type].push(acc);
    });

    for (var type in accountsByType) {
      message += '📋 ' + type + ':\n';
      accountsByType[type].forEach(function(acc) {
        var balance = calculateAccountBalance(acc.code);
        message += '   • ' + acc.name + ' (' + acc.code + ')';
        if (balance.SAR !== 0) message += ' - ' + formatNumber(balance.SAR) + ' ر.س';
        if (balance.EGP !== 0) message += ' - ' + formatNumber(balance.EGP) + ' ج.م';
        message += '\n';
      });
      message += '\n';
    }

    ui.alert('الحسابات', message, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض كشف حساب معين
 */
function menuShowAccountStatement() {
  var ui = SpreadsheetApp.getUi();

  try {
    var accounts = getAllAccounts();

    // عرض قائمة الحسابات
    var accList = accounts.map(function(a, i) {
      return (i + 1) + '. ' + a.name + ' (' + a.code + ')';
    }).join('\n');

    var response = ui.prompt(
      'كشف حساب',
      'اختر رقم الحساب:\n' + accList,
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) return;
    var accIndex = parseInt(response.getResponseText()) - 1;
    if (accIndex < 0 || accIndex >= accounts.length) {
      ui.alert('خطأ', 'رقم غير صحيح', ui.ButtonSet.OK);
      return;
    }

    var selectedAccount = accounts[accIndex];
    var report = generateAccountStatement(selectedAccount.code);
    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('كشف حساب: ' + selectedAccount.name, cleanReport, ui.ButtonSet.OK);

  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض تقرير حسابات العهدة
 */
function menuShowCustodyReport() {
  try {
    var report = generateCustodyReport();
    var ui = SpreadsheetApp.getUi();

    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير حسابات العهدة', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض تقرير المدخرات
 */
function menuShowSavingsReport() {
  try {
    var report = generateSavingsReport();
    var ui = SpreadsheetApp.getUi();

    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير المدخرات', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض تقرير الاستثمارات
 */
function menuShowInvestmentsReport() {
  try {
    var report = generateInvestmentsReport();
    var ui = SpreadsheetApp.getUi();

    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير الاستثمارات', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض رصيد حساب معين
 */
function menuShowSpecificAccountBalance() {
  var ui = SpreadsheetApp.getUi();

  try {
    var accounts = getAllAccounts();

    // عرض قائمة الحسابات
    var accList = accounts.map(function(a, i) {
      return (i + 1) + '. ' + a.name;
    }).join('\n');

    var response = ui.prompt(
      'عرض رصيد حساب',
      'اختر رقم الحساب:\n' + accList,
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) return;
    var accIndex = parseInt(response.getResponseText()) - 1;
    if (accIndex < 0 || accIndex >= accounts.length) {
      ui.alert('خطأ', 'رقم غير صحيح', ui.ButtonSet.OK);
      return;
    }

    var selectedAccount = accounts[accIndex];
    var balance = calculateAccountBalance(selectedAccount.code);

    var message = '💰 رصيد حساب: ' + selectedAccount.name + '\n';
    message += '═══════════════════════════\n\n';
    if (balance.SAR !== 0) message += 'بالريال: ' + formatNumber(balance.SAR) + ' ر.س\n';
    if (balance.EGP !== 0) message += 'بالجنيه: ' + formatNumber(balance.EGP) + ' ج.م\n';
    if (balance.USD !== 0) message += 'بالدولار: ' + formatNumber(balance.USD) + ' $\n';

    if (balance.SAR === 0 && balance.EGP === 0 && balance.USD === 0) {
      message += 'الرصيد: صفر';
    }

    ui.alert('رصيد الحساب', message, ui.ButtonSet.OK);

  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

// =====================================================
// دوال الأدوات
// =====================================================

/**
 * إعادة حساب الأرصدة
 */
function menuRecalculateBalances() {
  var ui = SpreadsheetApp.getUi();

  var response = ui.alert(
    'تأكيد',
    'هل تريد إعادة حساب جميع الأرصدة؟\nهذا قد يستغرق بعض الوقت.',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    var accounts = getAllAccounts();

    var message = '✅ تم إعادة حساب الأرصدة\n\n';

    accounts.forEach(function(acc) {
      var balance = calculateAccountBalance(acc.code);
      if (balance.SAR !== 0 || balance.EGP !== 0) {
        message += '• ' + acc.name + ': ';
        if (balance.SAR !== 0) message += formatNumber(balance.SAR) + ' ر.س ';
        if (balance.EGP !== 0) message += formatNumber(balance.EGP) + ' ج.م';
        message += '\n';
      }
    });

    ui.alert('نجاح', message, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تنظيف البيانات
 */
function menuCleanData() {
  var ui = SpreadsheetApp.getUi();

  var response = ui.alert(
    'تأكيد',
    'هل تريد تنظيف البيانات؟\n\nسيتم:\n- إزالة المسافات الزائدة\n- توحيد الأرقام العربية\n- إزالة الصفوف الفارغة',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    var result = cleanTransactionsData();

    ui.alert('نجاح', '✅ تم تنظيف البيانات\n\nتم معالجة ' + result.rowsProcessed + ' صف', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض معلومات النظام
 */
function menuShowSystemInfo() {
  var ui = SpreadsheetApp.getUi();

  try {
    var accounts = getAllAccounts();
    var items = getAllItems();

    var message = '═══════════════════════════\n';
    message += '    معلومات النظام\n';
    message += '═══════════════════════════\n\n';
    message += '📌 الإصدار: 2.0.0 (القيد المزدوج)\n';
    message += '📅 التاريخ: 2025\n\n';
    message += '📊 الإحصائيات:\n';
    message += '   • عدد الحسابات: ' + accounts.length + '\n';
    message += '   • عدد البنود: ' + items.length + '\n\n';
    message += '🔹 نظام القيد المزدوج\n';
    message += '🔹 تتبع أرصدة الحسابات\n';
    message += '🔹 التحويلات بين الحسابات\n';
    message += '🔹 تحويل العملات\n';
    message += '🔹 بوت تليجرام ذكي\n\n';
    message += '═══════════════════════════';

    ui.alert('معلومات النظام', message, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * إنشاء جميع الشيتات (محمي بكلمة سر)
 */
function menuInitializeSheets() {
  var ui = SpreadsheetApp.getUi();

  // طلب كلمة السر أولاً
  var passwordResponse = ui.prompt(
    '🔐 كلمة السر',
    'أدخل كلمة السر للمتابعة:',
    ui.ButtonSet.OK_CANCEL
  );

  if (passwordResponse.getSelectedButton() !== ui.Button.OK) return;
  var password = passwordResponse.getResponseText();

  if (!password) {
    ui.alert('خطأ', '⛔ يجب إدخال كلمة السر', ui.ButtonSet.OK);
    return;
  }

  var response = ui.alert(
    'تأكيد',
    'هل تريد إنشاء/تهيئة جميع الشيتات؟\n\nسيتم إنشاء الشيتات الناقصة فقط.',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    initializeAllSheets(password);
    ui.alert('نجاح', '✅ تم إنشاء/تهيئة جميع الشيتات', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض معلومات حول النظام
 */
function menuShowAbout() {
  var ui = SpreadsheetApp.getUi();

  var message = '═══════════════════════════\n';
  message += '    نظام محمود المحاسبي\n';
  message += '    الإصدار 2.0\n';
  message += '═══════════════════════════\n\n';
  message += '📌 الإصدار: 2.0.0 (القيد المزدوج)\n';
  message += '📅 التاريخ: 2025\n\n';
  message += '🔹 نظام القيد المزدوج (Double Entry)\n';
  message += '🔹 كل حركة لها من_حساب وإلى_حساب\n';
  message += '🔹 تتبع أرصدة جميع الحسابات\n';
  message += '🔹 دعم عملات متعددة (ريال/جنيه/دولار)\n';
  message += '🔹 بوت تليجرام ذكي مع Gemini AI\n';
  message += '🔹 تقارير شاملة ومفصلة\n\n';
  message += '═══════════════════════════';

  ui.alert('حول النظام', message, ui.ButtonSet.OK);
}

// =====================================================
// دوال مساعدة
// =====================================================

/**
 * تنسيق الأرقام
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('ar-EG');
}

/**
 * تنظيف بيانات الحركات
 */
function cleanTransactionsData() {
  var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
  var data = sheet.getDataRange().getValues();
  var rowsProcessed = 0;

  // الأرقام العربية/الهندية
  var arabicNums = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var changed = false;

    // تخطي الصفوف الفارغة تماماً
    var isEmpty = row.every(function(cell) { return !cell || cell.toString().trim() === ''; });
    if (isEmpty) continue;

    for (var j = 0; j < row.length; j++) {
      var cell = row[j];
      if (typeof cell === 'string') {
        var original = cell;

        // إزالة المسافات الزائدة
        cell = cell.trim().replace(/\s+/g, ' ');

        // تحويل الأرقام العربية
        for (var ar in arabicNums) {
          cell = cell.replace(new RegExp(ar, 'g'), arabicNums[ar]);
        }

        // إزالة الأحرف غير المرئية
        cell = cell.replace(/[\u200B-\u200D\u200E\u200F\uFEFF\u00A0]/g, '');

        if (cell !== original) {
          data[i][j] = cell;
          changed = true;
        }
      }
    }

    if (changed) rowsProcessed++;
  }

  // كتابة البيانات المحدثة
  if (rowsProcessed > 0) {
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  }

  return { rowsProcessed: rowsProcessed };
}

// =====================================================
// دوال الجمعيات
// =====================================================

/**
 * عرض جميع الجمعيات
 */
function menuShowAllAssociations() {
  var ui = SpreadsheetApp.getUi();

  try {
    var associations = getAllAssociations();

    if (!associations || associations.length === 0) {
      ui.alert('الجمعيات', 'لا توجد جمعيات مسجلة حالياً.', ui.ButtonSet.OK);
      return;
    }

    var message = '🤝 الجمعيات المسجلة\n';
    message += '═══════════════════════════\n\n';

    associations.forEach(function(assoc, index) {
      message += (index + 1) + '. ' + assoc.name + '\n';
      message += '   💰 قيمة القسط: ' + formatNumber(assoc.installment) + '\n';
      message += '   📅 البداية: ' + assoc.startDate + '\n';
      message += '   🔢 المدة: ' + assoc.duration + ' شهر\n';
      message += '   🎯 ترتيب القبض: ' + assoc.collectionOrder + '\n';
      message += '   📊 الحالة: ' + assoc.status + '\n\n';
    });

    ui.alert('الجمعيات', message, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * إضافة جمعية جديدة
 */
function menuAddNewAssociation() {
  var ui = SpreadsheetApp.getUi();

  // اسم الجمعية
  var response = ui.prompt('جمعية جديدة', 'أدخل اسم الجمعية:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var name = response.getResponseText().trim();
  if (!name) { ui.alert('خطأ', 'يرجى إدخال اسم الجمعية', ui.ButtonSet.OK); return; }

  // قيمة القسط
  response = ui.prompt('جمعية جديدة', 'أدخل قيمة القسط الشهري:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var installment = parseFloat(response.getResponseText()) || 0;
  if (installment <= 0) { ui.alert('خطأ', 'يرجى إدخال قيمة صحيحة للقسط', ui.ButtonSet.OK); return; }

  // عدد الأشهر
  response = ui.prompt('جمعية جديدة', 'أدخل مدة الجمعية (عدد الأشهر):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var duration = parseInt(response.getResponseText()) || 0;
  if (duration <= 0) { ui.alert('خطأ', 'يرجى إدخال عدد صحيح للأشهر', ui.ButtonSet.OK); return; }

  // تاريخ البداية
  response = ui.prompt('جمعية جديدة', 'أدخل شهر البداية (1-12):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var startMonth = parseInt(response.getResponseText()) || 1;

  // ترتيب القبض
  response = ui.prompt('جمعية جديدة', 'أدخل ترتيب القبض (مثال: 4 يعني الشهر الرابع):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var collectionOrder = parseInt(response.getResponseText()) || 1;

  try {
    var result = addNewAssociation({
      name: name,
      installment: installment,
      duration: duration,
      startMonth: startMonth,
      collectionOrder: collectionOrder
    });

    if (result.success) {
      var currentYear = new Date().getFullYear();
      var collectionMonth = startMonth + collectionOrder - 1;
      var collectionYear = currentYear;
      if (collectionMonth > 12) {
        collectionMonth -= 12;
        collectionYear++;
      }

      var message = '✅ تم إضافة الجمعية بنجاح!\n\n';
      message += '📋 الاسم: ' + name + '\n';
      message += '💰 القسط: ' + formatNumber(installment) + '\n';
      message += '🔢 المدة: ' + duration + ' شهر\n';
      message += '🎯 ترتيب القبض: ' + collectionOrder + '\n';
      message += '📅 تاريخ القبض المتوقع: شهر ' + collectionMonth + '/' + collectionYear + '\n';
      message += '💵 المبلغ المتوقع: ' + formatNumber(installment * duration);

      ui.alert('نجاح', message, ui.ButtonSet.OK);
    } else {
      ui.alert('خطأ', result.message, ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تسجيل دفعة قسط
 */
function menuRecordInstallmentPayment() {
  var ui = SpreadsheetApp.getUi();

  try {
    var associations = getAllAssociations();
    if (!associations || associations.length === 0) {
      ui.alert('تنبيه', 'لا توجد جمعيات مسجلة. قم بإضافة جمعية أولاً.', ui.ButtonSet.OK);
      return;
    }

    var assocList = associations.map(function(a, i) { return (i + 1) + '. ' + a.name; }).join('\n');
    var response = ui.prompt(
      'تسجيل دفعة قسط',
      'اختر رقم الجمعية:\n' + assocList,
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) return;
    var assocIndex = parseInt(response.getResponseText()) - 1;
    if (assocIndex < 0 || assocIndex >= associations.length) {
      ui.alert('خطأ', 'رقم غير صحيح', ui.ButtonSet.OK);
      return;
    }

    var selectedAssoc = associations[assocIndex];

    var confirm = ui.alert(
      'تأكيد',
      'هل تريد تسجيل دفعة قسط بقيمة ' + formatNumber(selectedAssoc.installment) + ' لجمعية "' + selectedAssoc.name + '"؟',
      ui.ButtonSet.YES_NO
    );

    if (confirm !== ui.Button.YES) return;

    var result = recordAssociationInstallment(selectedAssoc.id, selectedAssoc.installment);

    if (result.success) {
      var message = '✅ تم تسجيل الدفعة بنجاح!\n\n';
      message += '📋 الجمعية: ' + selectedAssoc.name + '\n';
      message += '💰 المبلغ: ' + formatNumber(selectedAssoc.installment) + '\n';
      message += '📊 الأقساط المدفوعة: ' + result.paidCount + ' من ' + selectedAssoc.duration;

      ui.alert('نجاح', message, ui.ButtonSet.OK);
    } else {
      ui.alert('خطأ', result.message, ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تسجيل قبض من جمعية
 */
function menuRecordAssociationCollection() {
  var ui = SpreadsheetApp.getUi();

  try {
    var associations = getAllAssociations();
    if (!associations || associations.length === 0) {
      ui.alert('تنبيه', 'لا توجد جمعيات مسجلة.', ui.ButtonSet.OK);
      return;
    }

    var assocList = associations.map(function(a, i) {
      return (i + 1) + '. ' + a.name + ' (المبلغ: ' + formatNumber(a.installment * a.duration) + ')';
    }).join('\n');

    var response = ui.prompt(
      'تسجيل قبض من جمعية',
      'اختر رقم الجمعية:\n' + assocList,
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) return;
    var assocIndex = parseInt(response.getResponseText()) - 1;
    if (assocIndex < 0 || assocIndex >= associations.length) {
      ui.alert('خطأ', 'رقم غير صحيح', ui.ButtonSet.OK);
      return;
    }

    var selectedAssoc = associations[assocIndex];
    var totalAmount = selectedAssoc.installment * selectedAssoc.duration;

    var confirm = ui.alert(
      'تأكيد',
      'هل تريد تسجيل قبض مبلغ ' + formatNumber(totalAmount) + ' من جمعية "' + selectedAssoc.name + '"؟',
      ui.ButtonSet.YES_NO
    );

    if (confirm !== ui.Button.YES) return;

    var result = recordAssociationCollection(selectedAssoc.id, totalAmount);

    if (result.success) {
      var message = '✅ تم تسجيل القبض بنجاح!\n\n';
      message += '📋 الجمعية: ' + selectedAssoc.name + '\n';
      message += '💰 المبلغ المقبوض: ' + formatNumber(totalAmount);

      ui.alert('نجاح', message, ui.ButtonSet.OK);
    } else {
      ui.alert('خطأ', result.message, ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تقرير الجمعيات
 */
function menuShowAssociationsReport() {
  try {
    var report = generateAssociationsReport();
    var ui = SpreadsheetApp.getUi();

    var cleanReport = report.replace(/\*/g, '').replace(/━/g, '═');
    ui.alert('تقرير الجمعيات', cleanReport, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// =====================================================
// دوال النسخ الاحتياطي
// =====================================================

/**
 * إنشاء نسخة احتياطية الآن
 */
function menuCreateBackupNow() {
  var ui = SpreadsheetApp.getUi();

  var response = ui.alert(
    'تأكيد',
    'هل تريد إنشاء نسخة احتياطية الآن؟',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    var result = createBackup();
    ui.alert('نتيجة', result, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض حالة النسخ الاحتياطي
 */
function menuShowBackupStatus() {
  var ui = SpreadsheetApp.getUi();

  try {
    var status = getBackupStatus();
    ui.alert('حالة النسخ الاحتياطي', status, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تفعيل النسخ اليومي التلقائي (محمي بكلمة سر)
 */
function menuSetupDailyBackup() {
  var ui = SpreadsheetApp.getUi();

  var passwordResponse = ui.prompt(
    '🔐 كلمة السر',
    'أدخل كلمة السر لتفعيل النسخ الاحتياطي التلقائي:',
    ui.ButtonSet.OK_CANCEL
  );

  if (passwordResponse.getSelectedButton() !== ui.Button.OK) return;
  var password = passwordResponse.getResponseText();

  if (!password) {
    ui.alert('خطأ', '⛔ يجب إدخال كلمة السر', ui.ButtonSet.OK);
    return;
  }

  try {
    var result = setupDailyBackupTrigger(password);
    ui.alert('نجاح', result, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * إلغاء النسخ اليومي التلقائي (محمي بكلمة سر)
 */
function menuCancelDailyBackup() {
  var ui = SpreadsheetApp.getUi();

  var passwordResponse = ui.prompt(
    '🔐 كلمة السر',
    'أدخل كلمة السر لإلغاء النسخ الاحتياطي التلقائي:',
    ui.ButtonSet.OK_CANCEL
  );

  if (passwordResponse.getSelectedButton() !== ui.Button.OK) return;
  var password = passwordResponse.getResponseText();

  if (!password) {
    ui.alert('خطأ', '⛔ يجب إدخال كلمة السر', ui.ButtonSet.OK);
    return;
  }

  try {
    var result = cancelDailyBackupTrigger(password);
    ui.alert('نتيجة', result, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}
