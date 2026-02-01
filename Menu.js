/**
 * =====================================================
 * نظام محمود المحاسبي - القائمة المخصصة
 * =====================================================
 * قائمة تظهر في شريط الأدوات لتشغيل التقارير والأدوات
 */

/**
 * إنشاء القائمة عند فتح الشيت
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('نظام محمود')
    // قسم التقارير
    .addSubMenu(ui.createMenu('📊 التقارير')
      .addItem('تقرير اليوم', 'menuShowTodayReport')
      .addItem('تقرير الأسبوع', 'menuShowWeekReport')
      .addItem('تقرير الشهر', 'menuShowMonthReport')
      .addSeparator()
      .addItem('تقرير مخصص...', 'menuShowCustomReport'))

    // قسم العهدة
    .addSubMenu(ui.createMenu('💰 العهدة')
      .addItem('تحديث تقرير عهدة سارة', 'menuUpdateSaraCustody')
      .addItem('تحديث تقرير عهدة مصطفى', 'menuUpdateMostafaCustody')
      .addSeparator()
      .addItem('تحديث جميع تقارير العهدة', 'menuUpdateAllCustody')
      .addSeparator()
      .addItem('عرض رصيد سارة', 'menuShowSaraBalance')
      .addItem('عرض رصيد مصطفى', 'menuShowMostafaBalance'))

    // قسم الأدوات
    .addSubMenu(ui.createMenu('🔧 أدوات')
      .addItem('إعادة حساب الأرصدة', 'menuRecalculateBalances')
      .addItem('تنظيف البيانات', 'menuCleanData')
      .addSeparator()
      .addItem('إنشاء جميع الشيتات', 'menuInitializeSheets'))

    // قسم المساعدة
    .addSeparator()
    .addItem('ℹ️ حول النظام', 'menuShowAbout')

    .addToUi();
}

// =====================================================
// دوال التقارير
// =====================================================

/**
 * عرض تقرير اليوم
 */
function menuShowTodayReport() {
  try {
    var report = getDailyReport();
    var ui = SpreadsheetApp.getUi();

    var message = '📊 تقرير اليوم\n';
    message += '═══════════════════\n\n';
    message += '💵 إجمالي الدخل: ' + formatNumber(report.totalIncome) + '\n';
    message += '💸 إجمالي المصروفات: ' + formatNumber(report.totalExpenses) + '\n';
    message += '📈 صافي اليوم: ' + formatNumber(report.netAmount) + '\n';
    message += '📝 عدد الحركات: ' + report.transactionCount;

    ui.alert('تقرير اليوم', message, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض تقرير الأسبوع
 */
function menuShowWeekReport() {
  try {
    var report = getWeeklyReport();
    var ui = SpreadsheetApp.getUi();

    var message = '📊 تقرير الأسبوع\n';
    message += '═══════════════════\n\n';
    message += '💵 إجمالي الدخل: ' + formatNumber(report.totalIncome) + '\n';
    message += '💸 إجمالي المصروفات: ' + formatNumber(report.totalExpenses) + '\n';
    message += '📈 صافي الأسبوع: ' + formatNumber(report.netAmount) + '\n';
    message += '📝 عدد الحركات: ' + report.transactionCount;

    ui.alert('تقرير الأسبوع', message, ui.ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطأ', 'حدث خطأ: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * عرض تقرير الشهر
 */
function menuShowMonthReport() {
  try {
    var report = getMonthlyReport();
    var ui = SpreadsheetApp.getUi();

    var message = '📊 تقرير الشهر\n';
    message += '═══════════════════\n\n';
    message += '💵 إجمالي الدخل: ' + formatNumber(report.totalIncome) + '\n';
    message += '💸 إجمالي المصروفات: ' + formatNumber(report.totalExpenses) + '\n';
    message += '📈 صافي الشهر: ' + formatNumber(report.netAmount) + '\n';
    message += '📝 عدد الحركات: ' + report.transactionCount;

    ui.alert('تقرير الشهر', message, ui.ButtonSet.OK);
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
    'أدخل تاريخ البداية (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;
  var startDate = response.getResponseText();

  response = ui.prompt(
    'تقرير مخصص',
    'أدخل تاريخ النهاية (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;
  var endDate = response.getResponseText();

  try {
    var report = getCustomReport(startDate, endDate);

    var message = '📊 تقرير مخصص\n';
    message += 'من ' + startDate + ' إلى ' + endDate + '\n';
    message += '═══════════════════\n\n';
    message += '💵 إجمالي الدخل: ' + formatNumber(report.totalIncome) + '\n';
    message += '💸 إجمالي المصروفات: ' + formatNumber(report.totalExpenses) + '\n';
    message += '📈 الصافي: ' + formatNumber(report.netAmount) + '\n';
    message += '📝 عدد الحركات: ' + report.transactionCount;

    ui.alert('تقرير مخصص', message, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

// =====================================================
// دوال العهدة
// =====================================================

/**
 * تحديث تقرير عهدة سارة
 */
function menuUpdateSaraCustody() {
  var ui = SpreadsheetApp.getUi();

  try {
    ui.alert('جاري التحديث...', 'يتم تحديث تقرير عهدة سارة، انتظر قليلاً...', ui.ButtonSet.OK);

    var result = updateCustodyReportSheet('سارة');

    if (result.success) {
      var message = '✅ تم تحديث تقرير عهدة سارة\n\n';
      message += '📝 عدد الحركات: ' + result.transactions_count + '\n';
      message += '💰 إجمالي الإيداعات: ' + formatNumber(result.total_deposits) + '\n';
      message += '💸 إجمالي المصروفات: ' + formatNumber(result.total_expenses) + '\n';
      message += '📊 الرصيد الحالي: ' + formatNumber(result.balance);

      ui.alert('نجاح', message, ui.ButtonSet.OK);
    } else {
      ui.alert('خطأ', result.message, ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تحديث تقرير عهدة مصطفى
 */
function menuUpdateMostafaCustody() {
  var ui = SpreadsheetApp.getUi();

  try {
    var result = updateCustodyReportSheet('مصطفى');

    if (result.success) {
      var message = '✅ تم تحديث تقرير عهدة مصطفى\n\n';
      message += '📝 عدد الحركات: ' + result.transactions_count + '\n';
      message += '💰 إجمالي الإيداعات: ' + formatNumber(result.total_deposits) + '\n';
      message += '💸 إجمالي المصروفات: ' + formatNumber(result.total_expenses) + '\n';
      message += '📊 الرصيد الحالي: ' + formatNumber(result.balance);

      ui.alert('نجاح', message, ui.ButtonSet.OK);
    } else {
      ui.alert('خطأ', result.message, ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * تحديث جميع تقارير العهدة
 */
function menuUpdateAllCustody() {
  var ui = SpreadsheetApp.getUi();

  try {
    var result = updateAllCustodyReports();

    if (result.success) {
      var message = '✅ تم تحديث جميع تقارير العهدة\n\n';

      message += '👩 سارة:\n';
      message += '   الرصيد: ' + formatNumber(result.sara.balance) + '\n';
      message += '   الحركات: ' + result.sara.transactions_count + '\n\n';

      message += '👨 مصطفى:\n';
      message += '   الرصيد: ' + formatNumber(result.mostafa.balance) + '\n';
      message += '   الحركات: ' + result.mostafa.transactions_count;

      ui.alert('نجاح', message, ui.ButtonSet.OK);
    } else {
      ui.alert('خطأ', result.message, ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض رصيد سارة
 */
function menuShowSaraBalance() {
  var ui = SpreadsheetApp.getUi();

  try {
    var balance = calculateCustodyBalanceFromTransactions('سارة');
    ui.alert('رصيد عهدة سارة', '💰 الرصيد الحالي: ' + formatNumber(balance) + ' جنيه', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('خطأ', 'حدث خطأ: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * عرض رصيد مصطفى
 */
function menuShowMostafaBalance() {
  var ui = SpreadsheetApp.getUi();

  try {
    var balance = calculateCustodyBalanceFromTransactions('مصطفى');
    ui.alert('رصيد عهدة مصطفى', '💰 الرصيد الحالي: ' + formatNumber(balance) + ' جنيه', ui.ButtonSet.OK);
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
    // إعادة حساب أرصدة العهدة
    var saraBalance = calculateCustodyBalanceFromTransactions('سارة');
    var mostafaBalance = calculateCustodyBalanceFromTransactions('مصطفى');

    var message = '✅ تم إعادة حساب الأرصدة\n\n';
    message += '👩 رصيد سارة: ' + formatNumber(saraBalance) + ' جنيه\n';
    message += '👨 رصيد مصطفى: ' + formatNumber(mostafaBalance) + ' جنيه';

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
 * إنشاء جميع الشيتات
 */
function menuInitializeSheets() {
  var ui = SpreadsheetApp.getUi();

  var response = ui.alert(
    'تأكيد',
    'هل تريد إنشاء/تهيئة جميع الشيتات؟\n\nسيتم إنشاء الشيتات الناقصة فقط.',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    initializeAllSheets();
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
  message += '═══════════════════════════\n\n';
  message += '📌 الإصدار: 2.0\n';
  message += '📅 التاريخ: 2025\n\n';
  message += '🔹 تتبع المصروفات والدخل\n';
  message += '🔹 إدارة العهدة (سارة ومصطفى)\n';
  message += '🔹 تقارير يومية وأسبوعية وشهرية\n';
  message += '🔹 بوت تليجرام للتسجيل السريع\n\n';
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
// دوال التقارير (إذا لم تكن موجودة)
// =====================================================

/**
 * الحصول على تقرير اليوم
 */
function getDailyReport() {
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'Asia/Riyadh', 'yyyy-MM-dd');
  return getReportForDateRange(todayStr, todayStr);
}

/**
 * الحصول على تقرير الأسبوع
 */
function getWeeklyReport() {
  var today = new Date();
  var weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  var todayStr = Utilities.formatDate(today, 'Asia/Riyadh', 'yyyy-MM-dd');
  var weekAgoStr = Utilities.formatDate(weekAgo, 'Asia/Riyadh', 'yyyy-MM-dd');
  return getReportForDateRange(weekAgoStr, todayStr);
}

/**
 * الحصول على تقرير الشهر
 */
function getMonthlyReport() {
  var today = new Date();
  var monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
  var todayStr = Utilities.formatDate(today, 'Asia/Riyadh', 'yyyy-MM-dd');
  var monthAgoStr = Utilities.formatDate(monthAgo, 'Asia/Riyadh', 'yyyy-MM-dd');
  return getReportForDateRange(monthAgoStr, todayStr);
}

/**
 * الحصول على تقرير مخصص
 */
function getCustomReport(startDate, endDate) {
  return getReportForDateRange(startDate, endDate);
}

/**
 * الحصول على تقرير لفترة معينة
 */
function getReportForDateRange(startDate, endDate) {
  var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
  var data = sheet.getDataRange().getValues();

  var totalIncome = 0;
  var totalExpenses = 0;
  var transactionCount = 0;

  var start = new Date(startDate);
  var end = new Date(endDate);
  end.setHours(23, 59, 59);

  // Headers: ID, التاريخ, الوقت, النوع, التصنيف, المبلغ, ...
  for (var i = 1; i < data.length; i++) {
    var dateCell = data[i][1];
    if (!dateCell) continue;

    var rowDate = new Date(dateCell);
    if (rowDate < start || rowDate > end) continue;

    var type = data[i][3];
    var amount = parseFloat(data[i][5]) || 0;

    transactionCount++;

    if (type === 'دخل' || type === 'إيداع_عهدة') {
      totalIncome += amount;
    } else if (type === 'مصروف' || type === 'صرف_من_عهدة') {
      totalExpenses += amount;
    }
  }

  return {
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: transactionCount
  };
}
