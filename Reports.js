/**
 * =====================================================
 * نظام محمود المحاسبي v2.0 - Reports Generator
 * نظام القيد المزدوج - Double Entry Accounting
 * =====================================================
 */

// ============================================
// دوال مساعدة
// ============================================

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function getCurrencySymbol(currency) {
  var symbols = { 'SAR': 'ر.س', 'EGP': 'ج.م', 'USD': '$', 'AED': 'د.إ', 'EUR': '€' };
  return symbols[currency] || currency;
}

/**
 * تنسيق مبالغ متعددة العملات
 * يقبل كائن {SAR: x, EGP: y, USD: z} ويعرض العملات غير الصفرية فقط
 */
function formatMultiCurrency(amounts) {
  var parts = [];
  var order = ['SAR', 'EGP', 'USD', 'AED'];
  for (var c = 0; c < order.length; c++) {
    var cur = order[c];
    if (amounts[cur] && Math.abs(amounts[cur]) > 0.01) {
      parts.push(formatNumber(amounts[cur]) + ' ' + getCurrencySymbol(cur));
    }
  }
  // أي عملات أخرى غير متوقعة
  for (var key in amounts) {
    if (order.indexOf(key) === -1 && amounts[key] && Math.abs(amounts[key]) > 0.01) {
      parts.push(formatNumber(amounts[key]) + ' ' + getCurrencySymbol(key));
    }
  }
  return parts.length > 0 ? parts.join(' + ') : '0';
}

// للتوافق مع الكود القديم
function formatDualCurrency(amounts) {
  return formatMultiCurrency(amounts);
}

/**
 * إنشاء كائن أرصدة فارغ
 */
function emptyBalance() {
  return { SAR: 0, EGP: 0, USD: 0 };
}

/**
 * جمع أرصدة
 */
function addBalances(a, b) {
  var result = {};
  for (var key in a) { result[key] = (result[key] || 0) + (a[key] || 0); }
  for (var key in b) { result[key] = (result[key] || 0) + (b[key] || 0); }
  return result;
}

/**
 * قراءة كل حركات الشهر مرة واحدة وتصنيفها
 */
function getMonthlyTransactionData(month, year) {
  var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
  var data = sheet.getDataRange().getValues();

  var currentDate = new Date();
  month = month || currentDate.getMonth() + 1;
  year = year || currentDate.getFullYear();

  var result = {
    month: month,
    year: year,
    income: emptyBalance(),
    incomeByItem: {},
    expenseByAccount: {},   // {accountCode: {total: {}, items: {itemName: {}}}}
    transfersByDest: {},     // {accountCode: {primary: {}, converted: {}}}
    allTransactions: []
  };

  // 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
  // 8:FromAccount, 9:ToAccount, 10:ConvertedAmount, 11:ConvertedCurrency, 12:ExchangeRate, 13:Description

  for (var i = 1; i < data.length; i++) {
    var rowDate = new Date(data[i][1]);
    if (isNaN(rowDate.getTime())) continue;
    if (rowDate.getMonth() + 1 !== month || rowDate.getFullYear() !== year) continue;

    var nature = data[i][3];
    var category = data[i][4] || '';
    var item = data[i][5] || category;
    var amount = parseFloat(data[i][6]) || 0;
    var currency = normalizeCurrency(data[i][7]) || 'SAR';
    var fromAccount = data[i][8] || '';
    var toAccount = data[i][9] || '';
    var convertedAmount = parseFloat(data[i][10]) || 0;
    var convertedCurrency = normalizeCurrency(data[i][11]) || '';
    var exchangeRate = parseFloat(data[i][12]) || 0;
    var description = data[i][13] || '';

    var trans = {
      date: rowDate, nature: nature, category: category, item: item,
      amount: amount, currency: currency,
      fromAccount: fromAccount, toAccount: toAccount,
      convertedAmount: convertedAmount, convertedCurrency: convertedCurrency,
      exchangeRate: exchangeRate, description: description
    };
    result.allTransactions.push(trans);

    if (nature === 'إيراد') {
      result.income[currency] = (result.income[currency] || 0) + amount;
      if (!result.incomeByItem[item]) result.incomeByItem[item] = emptyBalance();
      result.incomeByItem[item][currency] = (result.incomeByItem[item][currency] || 0) + amount;

    } else if (nature === 'مصروف') {
      var expAccount = fromAccount || 'MAIN';
      if (!result.expenseByAccount[expAccount]) {
        result.expenseByAccount[expAccount] = { total: emptyBalance(), items: {} };
      }
      result.expenseByAccount[expAccount].total[currency] = (result.expenseByAccount[expAccount].total[currency] || 0) + amount;
      if (!result.expenseByAccount[expAccount].items[item]) {
        result.expenseByAccount[expAccount].items[item] = emptyBalance();
      }
      result.expenseByAccount[expAccount].items[item][currency] = (result.expenseByAccount[expAccount].items[item][currency] || 0) + amount;

    } else if (nature === 'تحويل') {
      if (toAccount) {
        if (!result.transfersByDest[toAccount]) {
          result.transfersByDest[toAccount] = { primary: emptyBalance(), converted: emptyBalance() };
        }
        result.transfersByDest[toAccount].primary[currency] = (result.transfersByDest[toAccount].primary[currency] || 0) + amount;
        if (convertedAmount && convertedCurrency) {
          result.transfersByDest[toAccount].converted[convertedCurrency] = (result.transfersByDest[toAccount].converted[convertedCurrency] || 0) + convertedAmount;
        }
      }
    }
  }

  return result;
}

// ============================================
// 1. التقرير الشامل الموحد
// ============================================

function generateUnifiedReport(month, year) {
  try {
    var data = getMonthlyTransactionData(month, year);
    var accounts = getAllAccounts();

    var monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    var r = '📊 *تقرير شهر ' + monthNames[data.month - 1] + ' ' + data.year + '*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    // ═══ الدخل ═══
    r += '💰 *الدخل:*\n';
    var hasIncome = false;
    for (var itemName in data.incomeByItem) {
      r += '   • ' + itemName + ': ' + formatMultiCurrency(data.incomeByItem[itemName]) + '\n';
      hasIncome = true;
    }
    if (!hasIncome) r += '   لا يوجد\n';
    r += '   ─────\n';
    r += '   إجمالي: ' + formatMultiCurrency(data.income) + '\n\n';

    // ═══ التحويلات ═══
    r += '📤 *التحويلات من الخزنة:*\n';
    var totalTransferPrimary = emptyBalance();
    var hasTransfers = false;
    var custodyAccounts = accounts.filter(function(a) { return a.type === 'عهدة'; });

    for (var ti = 0; ti < custodyAccounts.length; ti++) {
      var acc = custodyAccounts[ti];
      var trData = data.transfersByDest[acc.code];
      if (!trData) continue;

      var hasPrimary = false;
      for (var c in trData.primary) { if (trData.primary[c] > 0) hasPrimary = true; }
      if (!hasPrimary) continue;

      hasTransfers = true;
      var line = '   • ' + acc.responsible + ': ' + formatMultiCurrency(trData.primary);

      // إذا يوجد مبلغ محول
      var hasConverted = false;
      for (var c2 in trData.converted) { if (trData.converted[c2] > 0) hasConverted = true; }
      if (hasConverted) {
        line += ' (= ' + formatMultiCurrency(trData.converted) + ')';
      }
      r += line + '\n';
      totalTransferPrimary = addBalances(totalTransferPrimary, trData.primary);
    }
    if (!hasTransfers) r += '   لا يوجد\n';
    else {
      r += '   ─────\n';
      r += '   إجمالي: ' + formatMultiCurrency(totalTransferPrimary) + '\n';
    }
    r += '\n';

    // ═══ المصروفات حسب الحساب ═══
    r += '💸 *المصروفات:*\n\n';

    // ترتيب الحسابات: الرئيسي أولاً ثم العهد
    var accountOrder = ['MAIN'];
    for (var ci = 0; ci < custodyAccounts.length; ci++) {
      accountOrder.push(custodyAccounts[ci].code);
    }

    var totalExpenseAll = emptyBalance();

    for (var ai = 0; ai < accountOrder.length; ai++) {
      var accCode = accountOrder[ai];
      var expData = data.expenseByAccount[accCode];
      if (!expData) continue;

      var accInfo = accounts.find(function(a) { return a.code === accCode; });
      var accEmoji = accCode === 'MAIN' ? '👤' : '💼';
      var accName = accCode === 'MAIN' ? 'الخزنة الرئيسية' : (accInfo ? accInfo.responsible : accCode);

      r += accEmoji + ' *' + accName + ' صرف:* ' + formatMultiCurrency(expData.total) + '\n';

      // تفاصيل البنود
      var sortedItems = Object.entries(expData.items).sort(function(a, b) {
        var totalA = (a[1].SAR || 0) + (a[1].EGP || 0) + (a[1].USD || 0);
        var totalB = (b[1].SAR || 0) + (b[1].EGP || 0) + (b[1].USD || 0);
        return totalB - totalA;
      });
      for (var si = 0; si < sortedItems.length; si++) {
        r += '   • ' + sortedItems[si][0] + ': ' + formatMultiCurrency(sortedItems[si][1]) + '\n';
      }
      r += '\n';
      totalExpenseAll = addBalances(totalExpenseAll, expData.total);
    }

    // ═══ الجمعيات ═══
    try {
      var assocSheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
      var assocData = assocSheet.getDataRange().getValues();
      var assocTotal = emptyBalance();
      var hasAssoc = false;

      r += '🔄 *الجمعيات:*\n';
      for (var ai2 = 1; ai2 < assocData.length; ai2++) {
        if (assocData[ai2][8] === 'نشط' || assocData[ai2][8] === 'active') {
          var assocName = assocData[ai2][1];
          var assocAmount = parseFloat(assocData[ai2][2]) || 0;
          var assocCur = normalizeCurrency(assocData[ai2][9]) || 'EGP';
          r += '   • ' + assocName + ': ' + formatNumber(assocAmount) + ' ' + getCurrencySymbol(assocCur) + '/شهر\n';
          assocTotal[assocCur] = (assocTotal[assocCur] || 0) + assocAmount;
          hasAssoc = true;
        }
      }
      if (!hasAssoc) r += '   لا يوجد\n';
      r += '\n';
    } catch (e) {
      r += '🔄 *الجمعيات:* لا يوجد\n\n';
    }

    // ═══ الذهب ═══
    try {
      var goldSheet = getOrCreateSheet(SHEETS.GOLD);
      var goldData = goldSheet.getDataRange().getValues();
      var totalGrams = 0;
      var goldValue = emptyBalance();

      for (var gi = 1; gi < goldData.length; gi++) {
        totalGrams += parseFloat(goldData[gi][2]) || 0;
        var gPrice = parseFloat(goldData[gi][4]) || 0;
        var gCur = normalizeCurrency(goldData[gi][5]) || 'EGP';
        goldValue[gCur] = (goldValue[gCur] || 0) + gPrice;
      }

      r += '💍 *الذهب:* ';
      if (totalGrams > 0) {
        r += totalGrams.toFixed(2) + ' جرام (' + formatMultiCurrency(goldValue) + ')\n\n';
      } else {
        r += 'لا يوجد\n\n';
      }
    } catch (e) {
      r += '💍 *الذهب:* لا يوجد\n\n';
    }

    // ═══ الملخص العام ═══
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    r += '📊 *الملخص:*\n\n';

    // رصيد الخزنة
    var mainBalance = calculateAccountBalance('MAIN');
    r += '💵 *الخزنة الرئيسية:*\n';
    r += '   ' + formatMultiCurrency(mainBalance) + '\n\n';

    // أرصدة العهد
    r += '💼 *أرصدة العهد:*\n';
    var totalCustody = emptyBalance();
    for (var cai = 0; cai < custodyAccounts.length; cai++) {
      var cAcc = custodyAccounts[cai];
      var cBal = calculateAccountBalance(cAcc.code);
      var hasBal = false;
      for (var bc in cBal) { if (cBal[bc] && Math.abs(cBal[bc]) > 0.01) hasBal = true; }
      if (hasBal) {
        r += '   • ' + cAcc.responsible + ': ' + formatMultiCurrency(cBal) + '\n';
        totalCustody = addBalances(totalCustody, cBal);
      }
    }
    r += '   ─────\n';
    r += '   إجمالي: ' + formatMultiCurrency(totalCustody) + '\n';

    return r;

  } catch (error) {
    Logger.log('Error in generateUnifiedReport: ' + error.toString());
    return '❌ حدث خطأ أثناء إنشاء التقرير: ' + error.message;
  }
}

// للتوافق - الدالة القديمة تستدعي الجديدة
function generateMonthlySummary(month, year) {
  return generateUnifiedReport(month, year);
}

// ============================================
// 2. كشف حساب تفصيلي
// ============================================

function generateAccountStatement(accountCode, month, year) {
  try {
    var sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var data = sheet.getDataRange().getValues();
    var accounts = getAllAccounts();

    var currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    var account = accounts.find(function(a) { return a.code === accountCode; });
    var accountName = account ? account.name : accountCode;
    var accountResp = account ? account.responsible : accountCode;

    var transactions = [];
    var monthIncome = emptyBalance();
    var monthExpense = emptyBalance();
    var monthTransferIn = emptyBalance();
    var monthTransferOut = emptyBalance();

    // 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
    // 8:FromAccount, 9:ToAccount, 10:ConvertedAmount, 11:ConvertedCurrency, 12:ExchangeRate, 13:Description

    for (var i = 1; i < data.length; i++) {
      var rowDate = new Date(data[i][1]);
      if (isNaN(rowDate.getTime())) continue;
      if (rowDate.getMonth() + 1 !== month || rowDate.getFullYear() !== year) continue;

      var nature = data[i][3];
      var item = data[i][5] || data[i][4] || '';
      var amount = parseFloat(data[i][6]) || 0;
      var currency = normalizeCurrency(data[i][7]) || 'SAR';
      var fromAccount = data[i][8] || '';
      var toAccount = data[i][9] || '';
      var convertedAmount = parseFloat(data[i][10]) || 0;
      var convertedCurrency = normalizeCurrency(data[i][11]) || '';
      var exchangeRate = parseFloat(data[i][12]) || 0;
      var description = data[i][13] || '';

      var transAmount = 0;
      var transCurrency = currency;
      var transType = '';
      var transDetail = '';

      if (fromAccount === accountCode) {
        transAmount = -amount;
        transCurrency = currency;
        transType = '📤';

        if (nature === 'تحويل' && toAccount) {
          var destAcc = accounts.find(function(a) { return a.code === toAccount; });
          transDetail = '→ ' + (destAcc ? destAcc.responsible : toAccount);
          monthTransferOut[currency] = (monthTransferOut[currency] || 0) + amount;
        } else {
          monthExpense[currency] = (monthExpense[currency] || 0) + amount;
        }

      } else if (toAccount === accountCode) {
        // إذا في مبلغ محول - نعرض ما وصل فعلاً
        if (convertedAmount && convertedCurrency) {
          transAmount = convertedAmount;
          transCurrency = convertedCurrency;
        } else {
          transAmount = amount;
          transCurrency = currency;
        }
        transType = '📥';

        if (nature === 'تحويل' && fromAccount) {
          var srcAcc = accounts.find(function(a) { return a.code === fromAccount; });
          transDetail = '← ' + (srcAcc ? srcAcc.responsible : fromAccount);

          // عرض تفاصيل التحويل
          if (convertedAmount && convertedCurrency && currency !== convertedCurrency) {
            transDetail += ' (' + formatNumber(amount) + ' ' + getCurrencySymbol(currency);
            if (exchangeRate) transDetail += ' بسعر ' + exchangeRate;
            transDetail += ')';
          }

          monthTransferIn[transCurrency] = (monthTransferIn[transCurrency] || 0) + Math.abs(transAmount);
        } else {
          monthIncome[transCurrency] = (monthIncome[transCurrency] || 0) + Math.abs(transAmount);
        }

      } else {
        continue; // حركة لا تخص هذا الحساب
      }

      transactions.push({
        date: rowDate,
        type: transType,
        item: item,
        amount: transAmount,
        currency: transCurrency,
        detail: transDetail,
        description: description
      });
    }

    var monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    // ═══ بناء التقرير ═══
    var r = '📋 *كشف حساب: ' + accountName + '*\n';
    r += '📅 ' + monthNames[month - 1] + ' ' + year + '\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    // الرصيد الحالي
    var currentBalance = calculateAccountBalance(accountCode);
    r += '💰 *الرصيد الحالي:*\n';
    r += '   ' + formatMultiCurrency(currentBalance) + '\n\n';

    // ملخص الشهر
    r += '📊 *ملخص الشهر:*\n';
    var hasMonthIncome = false;
    for (var k in monthIncome) { if (monthIncome[k] > 0) hasMonthIncome = true; }
    if (hasMonthIncome) r += '   📥 إيراد: ' + formatMultiCurrency(monthIncome) + '\n';

    var hasMonthTrIn = false;
    for (var k2 in monthTransferIn) { if (monthTransferIn[k2] > 0) hasMonthTrIn = true; }
    if (hasMonthTrIn) r += '   📥 وارد (تحويل): ' + formatMultiCurrency(monthTransferIn) + '\n';

    var hasMonthExp = false;
    for (var k3 in monthExpense) { if (monthExpense[k3] > 0) hasMonthExp = true; }
    if (hasMonthExp) r += '   💸 مصروف: ' + formatMultiCurrency(monthExpense) + '\n';

    var hasMonthTrOut = false;
    for (var k4 in monthTransferOut) { if (monthTransferOut[k4] > 0) hasMonthTrOut = true; }
    if (hasMonthTrOut) r += '   📤 صادر (تحويل): ' + formatMultiCurrency(monthTransferOut) + '\n';

    r += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    // الحركات
    r += '📝 *الحركات:*\n\n';

    if (transactions.length === 0) {
      r += '   لا توجد حركات هذا الشهر\n';
    } else {
      for (var ti = 0; ti < transactions.length; ti++) {
        var tr = transactions[ti];
        var dateStr = Utilities.formatDate(tr.date, 'Asia/Riyadh', 'dd/MM');
        var amountStr = (tr.amount > 0 ? '+' : '') + formatNumber(tr.amount) + ' ' + getCurrencySymbol(tr.currency);

        r += dateStr + '  ' + tr.type + '  ' + amountStr + '\n';
        if (tr.item) r += '       ' + tr.item;
        if (tr.detail) r += ' ' + tr.detail;
        r += '\n';
        if (tr.description && tr.description !== tr.item) r += '       ' + tr.description + '\n';
        r += '\n';
      }
    }

    return r;

  } catch (error) {
    Logger.log('Error in generateAccountStatement: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

// ============================================
// 3. تقرير الجمعيات
// ============================================

function generateAssociationsReport() {
  try {
    var sheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
    var data = sheet.getDataRange().getValues();
    var transSheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    var transData = transSheet.getDataRange().getValues();

    var r = '🔄 *تقرير الجمعيات*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    var hasActive = false;
    var totalMonthly = emptyBalance();

    for (var i = 1; i < data.length; i++) {
      if (data[i][8] !== 'نشط' && data[i][8] !== 'active') continue;
      hasActive = true;

      var name = data[i][1];
      var monthlyAmount = parseFloat(data[i][2]) || 0;
      var totalMonths = parseInt(data[i][3]) || 12;
      var startDate = data[i][4];
      var receiveOrder = data[i][5];
      var expectedReceiveDate = data[i][6];
      var assocCurrency = normalizeCurrency(data[i][9]) || 'EGP';

      // عد الأقساط المدفوعة من الحركات
      var paidCount = 0;
      for (var j = 1; j < transData.length; j++) {
        var tItem = transData[j][5] || '';
        var tDesc = transData[j][13] || '';
        var tCat = transData[j][4] || '';
        if ((tItem.indexOf('جمعية') !== -1 || tCat === 'جمعية') &&
            (tItem.indexOf(name) !== -1 || tDesc.indexOf(name) !== -1)) {
          paidCount++;
        }
      }

      var remainingCount = totalMonths - paidCount;
      var paidTotal = paidCount * monthlyAmount;
      var totalAmount = totalMonths * monthlyAmount;
      var remainingAmount = remainingCount * monthlyAmount;

      r += '📌 *' + name + '*\n';
      r += '   💵 القسط: ' + formatNumber(monthlyAmount) + ' ' + getCurrencySymbol(assocCurrency) + '/شهر\n';
      r += '   📅 المدة: ' + totalMonths + ' شهر\n';
      r += '   ✅ مدفوع: ' + paidCount + '/' + totalMonths + ' قسط';
      r += ' (' + formatNumber(paidTotal) + ' ' + getCurrencySymbol(assocCurrency) + ')\n';
      r += '   ⏳ متبقي: ' + remainingCount + ' قسط';
      r += ' (' + formatNumber(remainingAmount) + ' ' + getCurrencySymbol(assocCurrency) + ')\n';
      r += '   🎯 ترتيب القبض: ' + receiveOrder + '\n';
      if (expectedReceiveDate) {
        r += '   📆 موعد القبض المتوقع: ' + expectedReceiveDate + '\n';
      }
      r += '   💰 إجمالي الجمعية: ' + formatNumber(totalAmount) + ' ' + getCurrencySymbol(assocCurrency) + '\n';
      r += '\n';

      totalMonthly[assocCurrency] = (totalMonthly[assocCurrency] || 0) + monthlyAmount;
    }

    if (!hasActive) {
      r += 'لا توجد جمعيات نشطة حالياً\n';
    } else {
      r += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
      r += '💵 *إجمالي الأقساط الشهرية:* ' + formatMultiCurrency(totalMonthly) + '\n';
    }

    return r;

  } catch (error) {
    Logger.log('Error in generateAssociationsReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

// ============================================
// 4. تقرير الذهب
// ============================================

function generateGoldReport() {
  try {
    var sheet = getOrCreateSheet(SHEETS.GOLD);
    var data = sheet.getDataRange().getValues();

    var totalWeight = 0;
    var totalValue = emptyBalance();
    var purchases = [];

    for (var i = 1; i < data.length; i++) {
      var weight = parseFloat(data[i][2]) || 0;
      var karat = data[i][3] || '';
      var price = parseFloat(data[i][4]) || 0;
      var priceCurrency = normalizeCurrency(data[i][5]) || 'EGP';
      var date = data[i][1];
      var buyer = data[i][6] || '';
      var itemType = data[i][7] || '';

      totalWeight += weight;
      totalValue[priceCurrency] = (totalValue[priceCurrency] || 0) + price;

      purchases.push({
        date: date, weight: weight, karat: karat,
        price: price, currency: priceCurrency,
        buyer: buyer, type: itemType
      });
    }

    var r = '💍 *تقرير الذهب*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    r += '⚖️ *إجمالي الوزن:* ' + totalWeight.toFixed(2) + ' جرام\n';
    r += '💰 *إجمالي القيمة:* ' + formatMultiCurrency(totalValue) + '\n\n';

    if (purchases.length > 0) {
      r += '📋 *المقتنيات:*\n';
      for (var pi = 0; pi < purchases.length; pi++) {
        var p = purchases[pi];
        var dateStr = '';
        try {
          dateStr = p.date ? Utilities.formatDate(new Date(p.date), 'Asia/Riyadh', 'dd/MM/yyyy') : '';
        } catch (e) { dateStr = ''; }

        r += '   ' + (dateStr ? dateStr + ' - ' : '');
        if (p.type) r += p.type + ' ';
        r += p.weight + 'g';
        if (p.karat) r += ' عيار ' + p.karat;
        r += ' - ' + formatNumber(p.price) + ' ' + getCurrencySymbol(p.currency);
        if (p.buyer) r += ' (' + p.buyer + ')';
        r += '\n';
      }
    } else {
      r += 'لا توجد مقتنيات ذهبية مسجلة\n';
    }

    return r;

  } catch (error) {
    Logger.log('Error in generateGoldReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

// ============================================
// 5. تقرير المدخرات
// ============================================

function generateSavingsReport() {
  try {
    var accounts = getAllAccounts();
    var savingsAccounts = accounts.filter(function(acc) { return acc.type === 'ادخار'; });

    var r = '🏦 *تقرير المدخرات*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    var totalAll = emptyBalance();

    for (var i = 0; i < savingsAccounts.length; i++) {
      var acc = savingsAccounts[i];
      var balance = calculateAccountBalance(acc.code);
      var hasBalance = false;
      for (var c in balance) { if (balance[c] && Math.abs(balance[c]) > 0.01) hasBalance = true; }

      if (hasBalance) {
        r += '💎 *' + acc.name + '*\n';
        r += '   ' + formatMultiCurrency(balance) + '\n\n';
        totalAll = addBalances(totalAll, balance);
      }
    }

    // الذهب كجزء من المدخرات
    try {
      var goldSheet = getOrCreateSheet(SHEETS.GOLD);
      var goldData = goldSheet.getDataRange().getValues();
      var goldTotal = emptyBalance();
      var goldWeight = 0;

      for (var gi = 1; gi < goldData.length; gi++) {
        goldWeight += parseFloat(goldData[gi][2]) || 0;
        var gPrice = parseFloat(goldData[gi][4]) || 0;
        var gCur = normalizeCurrency(goldData[gi][5]) || 'EGP';
        goldTotal[gCur] = (goldTotal[gCur] || 0) + gPrice;
      }

      if (goldWeight > 0) {
        r += '💍 *الذهب:* ' + goldWeight.toFixed(2) + ' جرام (' + formatMultiCurrency(goldTotal) + ')\n\n';
        totalAll = addBalances(totalAll, goldTotal);
      }
    } catch (e) {}

    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    r += '📊 *إجمالي المدخرات:* ' + formatMultiCurrency(totalAll) + '\n';

    return r;

  } catch (error) {
    Logger.log('Error in generateSavingsReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

// ============================================
// 6. تقرير السلف
// ============================================

function generateLoansReport() {
  try {
    var sheet = getOrCreateSheet(SHEETS.LOANS);
    var data = sheet.getDataRange().getValues();

    var totalOwed = emptyBalance();
    var totalOwing = emptyBalance();
    var activeLoans = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][7] !== 'نشط' && data[i][7] !== 'active') continue;

      var type = data[i][2];
      var person = data[i][3];
      var remaining = parseFloat(data[i][6]) || 0;
      var currency = normalizeCurrency(data[i][5]) || 'SAR';

      if (type === 'أخذ_سلفة' || type === 'loan_taken') {
        totalOwed[currency] = (totalOwed[currency] || 0) + remaining;
      } else {
        totalOwing[currency] = (totalOwing[currency] || 0) + remaining;
      }

      activeLoans.push({
        type: type, person: person,
        remaining: remaining, currency: currency
      });
    }

    var r = '💳 *تقرير السلف*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    r += '📤 *لك عند الناس:* ' + formatMultiCurrency(totalOwing) + '\n';
    r += '📥 *عليك:* ' + formatMultiCurrency(totalOwed) + '\n\n';

    if (activeLoans.length > 0) {
      r += '📋 *السلف النشطة:*\n';
      for (var li = 0; li < activeLoans.length; li++) {
        var loan = activeLoans[li];
        var direction = loan.type.indexOf('أخذ') !== -1 ? '⬇️' : '⬆️';
        r += '   ' + direction + ' ' + loan.person + ': ' +
             formatNumber(loan.remaining) + ' ' + getCurrencySymbol(loan.currency) + '\n';
      }
    } else {
      r += 'لا توجد سلف نشطة حالياً\n';
    }

    return r;

  } catch (error) {
    Logger.log('Error in generateLoansReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

// ============================================
// 7. تصدير PDF عبر Google Sheets
// ============================================

function exportReportAsPDF(reportText, reportTitle) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // إنشاء شيت مؤقت
    var tempSheet = ss.insertSheet('_PDF_TEMP_' + new Date().getTime());

    // تنظيف النص من Markdown
    var cleanText = reportText
      .replace(/\*/g, '')
      .replace(/━/g, '─');

    // تقسيم النص إلى أسطر
    var lines = cleanText.split('\n');

    // كتابة كل سطر في خلية
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/^\s+/, '');
      tempSheet.getRange(i + 1, 1).setValue(line);
    }

    // تنسيق
    tempSheet.setColumnWidth(1, 500);
    tempSheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');

    // تحويل إلى PDF
    SpreadsheetApp.flush();

    var ssId = ss.getId();
    var sheetId = tempSheet.getSheetId();

    var pdfUrl = 'https://docs.google.com/spreadsheets/d/' + ssId +
      '/export?format=pdf' +
      '&gid=' + sheetId +
      '&size=A4' +
      '&portrait=true' +
      '&fitw=true' +
      '&gridlines=false' +
      '&printtitle=false' +
      '&sheetnames=false' +
      '&pagenum=false' +
      '&fzr=false';

    var token = ScriptApp.getOAuthToken();
    var response = UrlFetchApp.fetch(pdfUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });

    // حذف الشيت المؤقت
    ss.deleteSheet(tempSheet);

    if (response.getResponseCode() === 200) {
      return {
        success: true,
        blob: response.getBlob().setName(reportTitle + '.pdf')
      };
    } else {
      Logger.log('PDF export failed: ' + response.getResponseCode());
      return { success: false, error: 'فشل تصدير PDF' };
    }

  } catch (error) {
    Logger.log('Error in exportReportAsPDF: ' + error.toString());
    // حذف الشيت المؤقت في حالة الخطأ
    try {
      var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
      for (var s = 0; s < sheets.length; s++) {
        if (sheets[s].getName().indexOf('_PDF_TEMP_') === 0) {
          SpreadsheetApp.getActiveSpreadsheet().deleteSheet(sheets[s]);
        }
      }
    } catch (e) {}
    return { success: false, error: error.message };
  }
}

// ============================================
// دوال مساعدة للتوافق مع الكود القديم
// ============================================

function generateWifeReport(month, year) {
  return generateAccountStatement('WIFE', month, year);
}

function generateSiblingsReport(month, year) {
  try {
    var accounts = getAllAccounts();
    var siblings = accounts.filter(function(a) {
      return a.type === 'عهدة' && a.code !== 'WIFE';
    });

    var monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    var r = '👨‍👩‍👧‍👦 *تقرير الإخوة - ' + monthNames[month - 1] + ' ' + year + '*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    for (var i = 0; i < siblings.length; i++) {
      var acc = siblings[i];
      var balance = calculateAccountBalance(acc.code);
      r += '👤 *' + acc.responsible + ':*\n';
      r += '   💰 الرصيد: ' + formatMultiCurrency(balance) + '\n\n';
    }

    return r;

  } catch (error) {
    Logger.log('Error in generateSiblingsReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

function generateBalancesReport() {
  try {
    var accounts = getAllAccounts();
    var r = '💰 *تقرير أرصدة الحسابات*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    var types = ['رئيسي', 'عهدة', 'ادخار', 'استثمار'];
    var typeNames = { 'رئيسي': '🏦 الحسابات الرئيسية', 'عهدة': '💼 حسابات العهدة', 'ادخار': '💎 المدخرات', 'استثمار': '📈 الاستثمارات' };

    for (var ti = 0; ti < types.length; ti++) {
      var type = types[ti];
      var typeAccounts = accounts.filter(function(a) { return a.type === type && a.affectsBalance; });
      if (typeAccounts.length === 0) continue;

      r += '*' + typeNames[type] + ':*\n';
      for (var ai = 0; ai < typeAccounts.length; ai++) {
        var acc = typeAccounts[ai];
        var balance = calculateAccountBalance(acc.code);
        var hasBal = false;
        for (var c in balance) { if (balance[c] && Math.abs(balance[c]) > 0.01) hasBal = true; }
        if (hasBal) {
          r += '   • ' + acc.name + ': ' + formatMultiCurrency(balance) + '\n';
        }
      }
      r += '\n';
    }

    return r;
  } catch (error) {
    Logger.log('Error in generateBalancesReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

function generateCustodyReport() {
  try {
    var accounts = getAllAccounts();
    var custodyAccounts = accounts.filter(function(a) { return a.type === 'عهدة'; });

    var r = '💼 *تقرير العهد*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    var total = emptyBalance();

    for (var i = 0; i < custodyAccounts.length; i++) {
      var acc = custodyAccounts[i];
      var balance = calculateAccountBalance(acc.code);
      r += '👤 *' + acc.responsible + ':*\n';
      r += '   ' + formatMultiCurrency(balance) + '\n\n';
      total = addBalances(total, balance);
    }

    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    r += '💰 *إجمالي العهد:* ' + formatMultiCurrency(total) + '\n';

    return r;
  } catch (error) {
    Logger.log('Error in generateCustodyReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}

function generateComprehensiveReport() {
  return generateUnifiedReport();
}

function generateInvestmentsReport() {
  try {
    var accounts = getAllAccounts();
    var investAccounts = accounts.filter(function(acc) { return acc.type === 'استثمار'; });

    var r = '📈 *تقرير الاستثمارات*\n';
    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    var total = emptyBalance();

    for (var i = 0; i < investAccounts.length; i++) {
      var acc = investAccounts[i];
      var balance = calculateAccountBalance(acc.code);
      r += '📊 *' + acc.name + ':*\n';
      r += '   ' + formatMultiCurrency(balance) + '\n\n';
      total = addBalances(total, balance);
    }

    if (investAccounts.length === 0) {
      r += 'لا توجد حسابات استثمارية\n\n';
    }

    r += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    r += '📊 *إجمالي الاستثمارات:* ' + formatMultiCurrency(total) + '\n';

    return r;
  } catch (error) {
    Logger.log('Error in generateInvestmentsReport: ' + error.toString());
    return '❌ حدث خطأ: ' + error.message;
  }
}
