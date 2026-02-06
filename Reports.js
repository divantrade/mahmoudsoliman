/**
 * =====================================================
 * نظام محمود المحاسبي v2.0 - Reports Generator
 * نظام القيد المزدوج - Double Entry Accounting
 * =====================================================
 */

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * تنسيق مبالغ مزدوجة العملة {SAR: x, EGP: y}
 */
function formatDualCurrency(amounts) {
  var parts = [];
  if (amounts.SAR) parts.push(formatNumber(amounts.SAR) + ' ر.س');
  if (amounts.EGP) parts.push(formatNumber(amounts.EGP) + ' ج.م');
  return parts.length > 0 ? parts.join(' + ') : '0';
}

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Symbol
 */
function getCurrencySymbol(currency) {
  const symbols = {
    'SAR': 'ر.س',
    'EGP': 'ج.م',
    'USD': '$',
    'EUR': '€'
  };
  return symbols[currency] || currency;
}

// ============================================
// تقارير أرصدة الحسابات
// ============================================

/**
 * Generate all accounts balances report
 * تقرير أرصدة جميع الحسابات
 * @returns {string} Formatted report
 */
function generateBalancesReport() {
  try {
    const accounts = getAllAccounts();

    let report = `💰 *تقرير أرصدة الحسابات*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Group accounts by type
    const accountsByType = {};
    accounts.forEach(account => {
      if (!accountsByType[account.type]) {
        accountsByType[account.type] = [];
      }
      const balance = calculateAccountBalance(account.code);
      accountsByType[account.type].push({
        ...account,
        balance: balance
      });
    });

    const typeIcons = {
      'رئيسي': '🏦',
      'عهدة': '👤',
      'مستفيد': '🎁',
      'ادخار': '💎',
      'استثمار': '📈',
      'شخصي': '👨'
    };

    // Display each type
    for (const [type, typeAccounts] of Object.entries(accountsByType)) {
      const icon = typeIcons[type] || '📋';
      report += `${icon} *${type}:*\n`;

      typeAccounts.forEach(acc => {
        if (acc.balance.SAR !== 0 || acc.balance.EGP !== 0 || acc.balance.USD !== 0) {
          report += `   ${acc.name}:\n`;
          if (acc.balance.SAR !== 0) report += `      ${formatNumber(acc.balance.SAR)} ر.س\n`;
          if (acc.balance.EGP !== 0) report += `      ${formatNumber(acc.balance.EGP)} ج.م\n`;
          if (acc.balance.USD !== 0) report += `      ${formatNumber(acc.balance.USD)} $\n`;
        }
      });
      report += `\n`;
    }

    // Calculate totals
    let totalSAR = 0;
    let totalEGP = 0;

    accounts.forEach(account => {
      if (account.type === 'رئيسي' || account.type === 'ادخار') {
        const balance = calculateAccountBalance(account.code);
        totalSAR += balance.SAR || 0;
        totalEGP += balance.EGP || 0;
      }
    });

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *إجمالي الرصيد (الرئيسي + الادخار):*\n`;
    report += `   ${formatNumber(totalSAR)} ر.س\n`;
    report += `   ${formatNumber(totalEGP)} ج.م`;

    return report;

  } catch (error) {
    Logger.log('Error generating balances report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate custody accounts report
 * تقرير حسابات العهدة
 * @returns {string} Formatted report
 */
function generateCustodyReport() {
  try {
    const accounts = getAllAccounts();
    const custodyAccounts = accounts.filter(acc => acc.type === 'عهدة');

    let report = `👤 *تقرير حسابات العهدة*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalEGP = 0;
    let totalSAR = 0;

    custodyAccounts.forEach(account => {
      const balance = calculateAccountBalance(account.code);
      const hasBalance = balance.SAR !== 0 || balance.EGP !== 0;

      if (hasBalance) {
        report += `👤 *${account.name}*\n`;
        if (balance.SAR !== 0) {
          report += `   ${formatNumber(balance.SAR)} ر.س\n`;
          totalSAR += balance.SAR;
        }
        if (balance.EGP !== 0) {
          report += `   ${formatNumber(balance.EGP)} ج.م\n`;
          totalEGP += balance.EGP;
        }
        report += `\n`;
      }
    });

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *إجمالي العهد:*\n`;
    if (totalSAR !== 0) report += `   ${formatNumber(totalSAR)} ر.س\n`;
    if (totalEGP !== 0) report += `   ${formatNumber(totalEGP)} ج.م`;

    return report;

  } catch (error) {
    Logger.log('Error generating custody report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate account statement
 * كشف حساب لحساب معين
 * @param {string} accountCode - Account code
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {string} Formatted report
 */
function generateAccountStatement(accountCode, month, year) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    // Get account info
    const accounts = getAllAccounts();
    const account = accounts.find(acc => acc.code === accountCode);
    const accountName = account ? account.name : accountCode;

    const transactions = [];
    let runningBalance = { SAR: 0, EGP: 0, USD: 0 };

    // Transaction columns in new format:
    // 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
    // 8:FromAccount, 9:ToAccount, 10:ConvertedAmount, 11:ConvertedCurrency, etc.

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      const nature = data[i][3];
      const item = data[i][5];
      const amount = parseFloat(data[i][6]) || 0;
      const currency = normalizeCurrency(data[i][7]) || 'SAR';
      const fromAccount = data[i][8];
      const toAccount = data[i][9];
      const convertedAmount = parseFloat(data[i][10]) || 0;
      const convertedCurrency = normalizeCurrency(data[i][11]) || '';
      const description = data[i][13];

      // Check if this transaction affects our account
      let transactionAmount = 0;
      let transactionCurrency = currency;
      let transactionType = '';

      if (fromAccount === accountCode) {
        // Money going out
        transactionAmount = -amount;
        transactionType = 'صادر';
      } else if (toAccount === accountCode) {
        // Money coming in
        if (convertedAmount && convertedCurrency) {
          transactionAmount = convertedAmount;
          transactionCurrency = convertedCurrency;
        } else {
          transactionAmount = amount;
        }
        transactionType = 'وارد';
      }

      if (transactionAmount !== 0) {
        // Update running balance
        runningBalance[transactionCurrency] = (runningBalance[transactionCurrency] || 0) + transactionAmount;

        // Filter by month if specified
        if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
          transactions.push({
            date: rowDate,
            nature: nature,
            item: item,
            amount: transactionAmount,
            currency: transactionCurrency,
            type: transactionType,
            description: description,
            balance: { ...runningBalance }
          });
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let report = `📋 *كشف حساب: ${accountName}*\n`;
    report += `📅 *${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (transactions.length === 0) {
      report += `لا توجد حركات في هذا الشهر\n`;
    } else {
      transactions.forEach(trans => {
        const dateStr = Utilities.formatDate(trans.date, 'Asia/Riyadh', 'dd/MM');
        const amountStr = trans.amount > 0 ? `+${formatNumber(trans.amount)}` : formatNumber(trans.amount);
        const symbol = getCurrencySymbol(trans.currency);

        report += `${dateStr} | ${trans.type}\n`;
        report += `   ${trans.item || trans.nature}\n`;
        report += `   ${amountStr} ${symbol}\n`;
        if (trans.description) report += `   (${trans.description})\n`;
        report += `\n`;
      });
    }

    // Current balance
    const currentBalance = calculateAccountBalance(accountCode);
    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `💰 *الرصيد الحالي:*\n`;
    if (currentBalance.SAR !== 0) report += `   ${formatNumber(currentBalance.SAR)} ر.س\n`;
    if (currentBalance.EGP !== 0) report += `   ${formatNumber(currentBalance.EGP)} ج.م\n`;
    if (currentBalance.USD !== 0) report += `   ${formatNumber(currentBalance.USD)} $\n`;

    return report;

  } catch (error) {
    Logger.log('Error generating account statement: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

// ============================================
// التقارير الشهرية
// ============================================

/**
 * Generate monthly summary report
 * تقرير ملخص الشهر
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {string} Formatted report
 */
function generateMonthlySummary(month, year) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    let totalIncome = { SAR: 0, EGP: 0 };
    let totalExpense = { SAR: 0, EGP: 0 };
    let totalTransfers = { SAR: 0, EGP: 0 };

    const expensesByItem = {};      // {item: {SAR: x, EGP: y}}
    const incomeByItem = {};        // {item: {SAR: x, EGP: y}}
    const transfersByAccount = {};  // {account: {SAR: x, EGP: y}}

    // Transaction columns:
    // 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
    // 8:FromAccount, 9:ToAccount, 10:ConvertedAmount, 11:ConvertedCurrency, 12:ExchangeRate

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
        const nature = data[i][3];
        const item = data[i][5] || data[i][4];
        const amount = parseFloat(data[i][6]) || 0;
        const currency = normalizeCurrency(data[i][7]) || 'SAR';
        const toAccount = data[i][9];
        const convertedAmount = parseFloat(data[i][10]) || 0;
        const convertedCurrency = normalizeCurrency(data[i][11]) || '';

        if (nature === 'إيراد') {
          totalIncome[currency] = (totalIncome[currency] || 0) + amount;
          if (!incomeByItem[item]) incomeByItem[item] = { SAR: 0, EGP: 0 };
          incomeByItem[item][currency] = (incomeByItem[item][currency] || 0) + amount;
        } else if (nature === 'مصروف') {
          totalExpense[currency] = (totalExpense[currency] || 0) + amount;
          if (!expensesByItem[item]) expensesByItem[item] = { SAR: 0, EGP: 0 };
          expensesByItem[item][currency] = (expensesByItem[item][currency] || 0) + amount;
        } else if (nature === 'تحويل') {
          // المبلغ الأصلي (ما خرج من المصدر)
          totalTransfers[currency] = (totalTransfers[currency] || 0) + amount;

          // لكل حساب وجهة: نظهر المبلغ المحول إن وجد (ما وصل فعلاً)
          if (toAccount) {
            if (!transfersByAccount[toAccount]) transfersByAccount[toAccount] = { SAR: 0, EGP: 0 };
            if (convertedAmount && convertedCurrency) {
              // يوجد مبلغ محول - نستخدمه (ما استلمه الحساب فعلاً)
              transfersByAccount[toAccount][convertedCurrency] = (transfersByAccount[toAccount][convertedCurrency] || 0) + convertedAmount;
            } else {
              // لا يوجد تحويل عملة - نستخدم المبلغ الأصلي
              transfersByAccount[toAccount][currency] = (transfersByAccount[toAccount][currency] || 0) + amount;
            }
          }
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let report = `📊 *تقرير شهر ${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Income
    report += `💰 *الإيرادات:*\n`;
    if (totalIncome.SAR) report += `   ${formatNumber(totalIncome.SAR)} ر.س\n`;
    if (totalIncome.EGP) report += `   ${formatNumber(totalIncome.EGP)} ج.م\n`;
    if (!totalIncome.SAR && !totalIncome.EGP) report += `   لا يوجد\n`;
    report += `\n`;

    // Expenses
    report += `💸 *المصروفات:*\n`;
    if (totalExpense.SAR) report += `   ${formatNumber(totalExpense.SAR)} ر.س\n`;
    if (totalExpense.EGP) report += `   ${formatNumber(totalExpense.EGP)} ج.م\n`;
    if (!totalExpense.SAR && !totalExpense.EGP) report += `   لا يوجد\n`;
    report += `\n`;

    // Transfers
    report += `📤 *التحويلات:*\n`;
    if (totalTransfers.SAR) report += `   ${formatNumber(totalTransfers.SAR)} ر.س\n`;
    if (totalTransfers.EGP) report += `   ${formatNumber(totalTransfers.EGP)} ج.م\n`;
    if (!totalTransfers.SAR && !totalTransfers.EGP) report += `   لا يوجد\n`;
    report += `\n`;

    // Income breakdown
    if (Object.keys(incomeByItem).length > 0) {
      report += `📋 *الإيرادات حسب البند:*\n`;
      for (const [item, amounts] of Object.entries(incomeByItem)) {
        report += `   • ${item}: ${formatDualCurrency(amounts)}\n`;
      }
      report += `\n`;
    }

    // Expenses breakdown
    if (Object.keys(expensesByItem).length > 0) {
      report += `📋 *المصروفات حسب البند:*\n`;
      const sortedExpenses = Object.entries(expensesByItem).sort((a, b) => {
        return (b[1].SAR + b[1].EGP) - (a[1].SAR + a[1].EGP);
      });
      sortedExpenses.slice(0, 10).forEach(([item, amounts]) => {
        report += `   • ${item}: ${formatDualCurrency(amounts)}\n`;
      });
      report += `\n`;
    }

    // Transfers breakdown
    if (Object.keys(transfersByAccount).length > 0) {
      report += `👥 *التحويلات حسب الحساب:*\n`;
      const accounts = getAllAccounts();
      for (const [accountCode, amounts] of Object.entries(transfersByAccount)) {
        const account = accounts.find(a => a.code === accountCode);
        const displayName = account ? account.name : accountCode;
        report += `   • ${displayName}: ${formatDualCurrency(amounts)}\n`;
      }
      report += `\n`;
    }

    // Net calculation
    const netSAR = (totalIncome.SAR || 0) - (totalExpense.SAR || 0) - (totalTransfers.SAR || 0);
    const netEGP = (totalIncome.EGP || 0) - (totalExpense.EGP || 0) - (totalTransfers.EGP || 0);

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 *صافي الشهر:*\n`;
    if (netSAR !== 0) report += `   ${formatNumber(netSAR)} ر.س\n`;
    if (netEGP !== 0) report += `   ${formatNumber(netEGP)} ج.م\n`;
    if (netSAR === 0 && netEGP === 0) report += `   0\n`;

    return report;

  } catch (error) {
    Logger.log('Error generating monthly summary: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

// ============================================
// تقارير خاصة بالأشخاص
// ============================================

/**
 * Generate wife report
 * تقرير الزوجة
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {string} Formatted report
 */
function generateWifeReport(month, year) {
  try {
    const currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    // Find wife account
    const accounts = getAllAccounts();
    const wifeAccount = accounts.find(acc =>
      acc.name.includes('my love') ||
      acc.name.includes('زوجة') ||
      acc.code === 'WIFE'
    );

    if (!wifeAccount) {
      return '❌ لم يتم العثور على حساب الزوجة';
    }

    // Get balance
    const balance = calculateAccountBalance(wifeAccount.code);

    // Get transactions for this month
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    let totalReceived = 0;
    let totalSpent = 0;
    let totalSavings = 0;
    const transactions = [];

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
        const toAccount = data[i][9];
        const fromAccount = data[i][8];
        const item = data[i][5];
        const convertedAmount = parseFloat(data[i][10]) || parseFloat(data[i][6]) || 0;
        const description = data[i][13];

        if (toAccount === wifeAccount.code) {
          totalReceived += convertedAmount;
          if (item && item.includes('ادخار')) {
            totalSavings += convertedAmount;
          }
          transactions.push({
            date: rowDate,
            amount: convertedAmount,
            type: 'وارد',
            item: item,
            description: description
          });
        } else if (fromAccount === wifeAccount.code) {
          totalSpent += convertedAmount;
          transactions.push({
            date: rowDate,
            amount: -convertedAmount,
            type: 'صادر',
            item: item,
            description: description
          });
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let report = `💕 *تقرير ${wifeAccount.name} - ${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `📥 *إجمالي المستلم:* ${formatNumber(totalReceived)} ج.م\n`;
    report += `💸 *إجمالي المصروف:* ${formatNumber(totalSpent)} ج.م\n`;
    if (totalSavings > 0) {
      report += `🏦 *منها للادخار:* ${formatNumber(totalSavings)} ج.م\n`;
    }
    report += `\n`;

    // Current balance
    report += `💰 *الرصيد الحالي:*\n`;
    if (balance.EGP !== 0) report += `   ${formatNumber(balance.EGP)} ج.م\n`;
    if (balance.SAR !== 0) report += `   ${formatNumber(balance.SAR)} ر.س\n`;
    report += `\n`;

    // Recent transactions
    if (transactions.length > 0) {
      report += `📋 *آخر الحركات:*\n`;
      transactions.slice(-10).forEach(trans => {
        const dateStr = Utilities.formatDate(trans.date, 'Asia/Riyadh', 'dd/MM');
        const amountStr = trans.amount > 0 ? `+${formatNumber(trans.amount)}` : formatNumber(trans.amount);
        report += `   ${dateStr} - ${amountStr} ج.م`;
        if (trans.item) report += ` (${trans.item})`;
        report += `\n`;
      });
    }

    return report;

  } catch (error) {
    Logger.log('Error generating wife report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate siblings help report
 * تقرير مساعدة الإخوة
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {string} Formatted report
 */
function generateSiblingsReport(month, year) {
  try {
    const currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    const accounts = getAllAccounts();

    // Find sibling accounts (custody type)
    const siblingNames = ['سارة', 'هاجر', 'محمد', 'مصطفى', 'sara', 'hagar', 'mohamed', 'mostafa'];
    const siblingAccounts = accounts.filter(acc =>
      acc.type === 'عهدة' &&
      siblingNames.some(name => acc.name.toLowerCase().includes(name.toLowerCase()))
    );

    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const siblingTotals = {};
    const siblingBalances = {};

    siblingAccounts.forEach(acc => {
      siblingTotals[acc.code] = { received: 0, spent: 0, name: acc.name };
      siblingBalances[acc.code] = calculateAccountBalance(acc.code);
    });

    // Calculate monthly totals
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
        const toAccount = data[i][9];
        const fromAccount = data[i][8];
        const convertedAmount = parseFloat(data[i][10]) || parseFloat(data[i][6]) || 0;

        if (siblingTotals[toAccount]) {
          siblingTotals[toAccount].received += convertedAmount;
        }
        if (siblingTotals[fromAccount]) {
          siblingTotals[fromAccount].spent += convertedAmount;
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const contactIcons = {
      'سارة': '👧',
      'هاجر': '👧',
      'محمد': '👦',
      'مصطفى': '👦'
    };

    let report = `👨‍👩‍👧‍👦 *تقرير الإخوة - ${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let grandTotalReceived = 0;

    for (const [code, totals] of Object.entries(siblingTotals)) {
      const balance = siblingBalances[code];
      let icon = '👤';
      for (const [name, emoji] of Object.entries(contactIcons)) {
        if (totals.name.includes(name)) {
          icon = emoji;
          break;
        }
      }

      report += `${icon} *${totals.name}*\n`;
      report += `   📥 استلم هذا الشهر: ${formatNumber(totals.received)} ج.م\n`;
      if (totals.spent > 0) {
        report += `   📤 صرف: ${formatNumber(totals.spent)} ج.م\n`;
      }
      report += `   💰 الرصيد: ${formatNumber(balance.EGP || 0)} ج.م\n`;
      report += `\n`;

      grandTotalReceived += totals.received;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *إجمالي المرسل هذا الشهر:* ${formatNumber(grandTotalReceived)} ج.م`;

    return report;

  } catch (error) {
    Logger.log('Error generating siblings report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

// ============================================
// تقارير الجمعيات والذهب والسلف
// ============================================

/**
 * Generate associations (Jam3iya) report
 * @returns {string} Formatted report
 */
function generateAssociationsReport() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
    const data = sheet.getDataRange().getValues();

    const transSheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const transData = transSheet.getDataRange().getValues();

    let report = `🔄 *تقرير الجمعيات*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let hasActiveAssociations = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === 'نشط' || data[i][8] === 'active') {
        hasActiveAssociations = true;
        const name = data[i][1];
        const monthlyAmount = data[i][2];
        const totalMonths = data[i][3];
        const startDate = data[i][4];
        const receiveOrder = data[i][5];
        const expectedReceiveDate = data[i][6];

        // Count paid installments from transactions
        let paidCount = 0;
        for (let j = 1; j < transData.length; j++) {
          const item = transData[j][5];
          const description = transData[j][13];
          if ((item && item.includes('جمعية') && item.includes(name)) ||
              (description && description.includes(name))) {
            paidCount++;
          }
        }

        report += `📌 *${name}*\n`;
        report += `   💵 القسط: ${formatNumber(monthlyAmount)} ج.م\n`;
        report += `   📅 المدة: ${totalMonths} شهر\n`;
        report += `   ✅ المدفوع: ${paidCount}/${totalMonths} قسط\n`;
        report += `   🎯 ترتيب القبض: ${receiveOrder}\n`;
        if (expectedReceiveDate) {
          report += `   📆 موعد القبض: ${expectedReceiveDate}\n`;
        }
        report += `\n`;
      }
    }

    if (!hasActiveAssociations) {
      report += `لا توجد جمعيات نشطة حالياً\n`;
    }

    return report;

  } catch (error) {
    Logger.log('Error generating associations report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate gold report
 * @returns {string} Formatted report
 */
function generateGoldReport() {
  try {
    const sheet = getOrCreateSheet(SHEETS.GOLD);
    const data = sheet.getDataRange().getValues();

    let totalWeight = 0;
    let totalValue = 0;
    const purchases = [];

    for (let i = 1; i < data.length; i++) {
      const weight = parseFloat(data[i][2]) || 0;
      const karat = data[i][3];
      const price = parseFloat(data[i][4]) || 0;
      const date = data[i][1];
      const buyer = data[i][6];

      totalWeight += weight;
      totalValue += price;

      purchases.push({
        date: date,
        weight: weight,
        karat: karat,
        price: price,
        buyer: buyer
      });
    }

    let report = `💍 *تقرير الذهب*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `⚖️ *إجمالي الوزن:* ${totalWeight.toFixed(2)} جرام\n`;
    report += `💰 *إجمالي القيمة:* ${formatNumber(totalValue)} ج.م\n\n`;

    if (purchases.length > 0) {
      report += `📋 *المشتريات:*\n`;
      purchases.forEach(p => {
        const dateStr = p.date ? Utilities.formatDate(new Date(p.date), 'Asia/Riyadh', 'dd/MM/yyyy') : '';
        report += `   ${dateStr} - ${p.weight}g عيار ${p.karat} - ${formatNumber(p.price)} ج.م`;
        if (p.buyer) report += ` (${p.buyer})`;
        report += `\n`;
      });
    }

    return report;

  } catch (error) {
    Logger.log('Error generating gold report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate savings report (now uses account-based system)
 * @returns {string} Formatted report
 */
function generateSavingsReport() {
  try {
    const accounts = getAllAccounts();
    const savingsAccounts = accounts.filter(acc => acc.type === 'ادخار');

    let report = `🏦 *تقرير المدخرات*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalSAR = 0;
    let totalEGP = 0;

    savingsAccounts.forEach(account => {
      const balance = calculateAccountBalance(account.code);
      const hasSavings = balance.SAR !== 0 || balance.EGP !== 0;

      if (hasSavings) {
        report += `💎 *${account.name}*\n`;
        if (balance.SAR !== 0) {
          report += `   ${formatNumber(balance.SAR)} ر.س\n`;
          totalSAR += balance.SAR;
        }
        if (balance.EGP !== 0) {
          report += `   ${formatNumber(balance.EGP)} ج.م\n`;
          totalEGP += balance.EGP;
        }
        report += `\n`;
      }
    });

    // Add gold as part of savings if exists
    const goldSheet = getOrCreateSheet(SHEETS.GOLD);
    const goldData = goldSheet.getDataRange().getValues();
    let goldValue = 0;

    for (let i = 1; i < goldData.length; i++) {
      goldValue += parseFloat(goldData[i][4]) || 0;
    }

    if (goldValue > 0) {
      report += `💍 *الذهب:* ${formatNumber(goldValue)} ج.م\n\n`;
      totalEGP += goldValue;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *إجمالي المدخرات:*\n`;
    if (totalSAR !== 0) report += `   ${formatNumber(totalSAR)} ر.س\n`;
    if (totalEGP !== 0) report += `   ${formatNumber(totalEGP)} ج.م`;

    return report;

  } catch (error) {
    Logger.log('Error generating savings report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate loans report
 * @returns {string} Formatted report
 */
function generateLoansReport() {
  try {
    const sheet = getOrCreateSheet(SHEETS.LOANS);
    const data = sheet.getDataRange().getValues();

    let totalOwed = 0;      // ما عليه من سلف
    let totalOwing = 0;     // ما له عند الآخرين
    const activeLoans = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === 'نشط' || data[i][7] === 'active') {
        const type = data[i][2];
        const person = data[i][3];
        const remaining = parseFloat(data[i][6]) || 0;
        const currency = data[i][5];

        if (type === 'أخذ_سلفة' || type === 'loan_taken') {
          totalOwed += remaining;
        } else {
          totalOwing += remaining;
        }

        activeLoans.push({
          type: type,
          person: person,
          remaining: remaining,
          currency: currency
        });
      }
    }

    let report = `💳 *تقرير السلف*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `📥 *عليك:* ${formatNumber(totalOwed)} ر.س\n`;
    report += `📤 *لك:* ${formatNumber(totalOwing)} ر.س\n\n`;

    if (activeLoans.length > 0) {
      report += `📋 *السلف النشطة:*\n`;
      activeLoans.forEach(loan => {
        const direction = loan.type.includes('أخذ') ? '⬇️' : '⬆️';
        report += `   ${direction} ${loan.person}: ${formatNumber(loan.remaining)} ${loan.currency === 'SAR' ? 'ر.س' : 'ج.م'}\n`;
      });
    } else {
      report += `لا توجد سلف نشطة حالياً\n`;
    }

    return report;

  } catch (error) {
    Logger.log('Error generating loans report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

// ============================================
// تقارير الاستثمارات
// ============================================

/**
 * Generate investments report
 * تقرير الاستثمارات
 * @returns {string} Formatted report
 */
function generateInvestmentsReport() {
  try {
    const accounts = getAllAccounts();
    const investmentAccounts = accounts.filter(acc => acc.type === 'استثمار');

    let report = `📈 *تقرير الاستثمارات*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalSAR = 0;
    let totalEGP = 0;

    investmentAccounts.forEach(account => {
      const balance = calculateAccountBalance(account.code);

      report += `📊 *${account.name}*\n`;
      if (balance.SAR !== 0) {
        report += `   ${formatNumber(balance.SAR)} ر.س\n`;
        totalSAR += balance.SAR;
      }
      if (balance.EGP !== 0) {
        report += `   ${formatNumber(balance.EGP)} ج.م\n`;
        totalEGP += balance.EGP;
      }
      report += `\n`;
    });

    if (investmentAccounts.length === 0) {
      report += `لا توجد حسابات استثمارية\n\n`;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *إجمالي الاستثمارات:*\n`;
    if (totalSAR !== 0) report += `   ${formatNumber(totalSAR)} ر.س\n`;
    if (totalEGP !== 0) report += `   ${formatNumber(totalEGP)} ج.م`;

    return report;

  } catch (error) {
    Logger.log('Error generating investments report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

// ============================================
// تقرير شامل
// ============================================

/**
 * Generate comprehensive report
 * التقرير الشامل
 * @returns {string} Formatted report
 */
function generateComprehensiveReport() {
  try {
    const accounts = getAllAccounts();

    let report = `📊 *التقرير المالي الشامل*\n`;
    report += `📅 ${Utilities.formatDate(new Date(), 'Asia/Riyadh', 'dd/MM/yyyy')}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Main accounts
    const mainAccounts = accounts.filter(acc => acc.type === 'رئيسي');
    let mainTotalSAR = 0;
    let mainTotalEGP = 0;

    report += `🏦 *الحسابات الرئيسية:*\n`;
    mainAccounts.forEach(acc => {
      const balance = calculateAccountBalance(acc.code);
      if (balance.SAR !== 0 || balance.EGP !== 0) {
        report += `   ${acc.name}:\n`;
        if (balance.SAR) { report += `      ${formatNumber(balance.SAR)} ر.س\n`; mainTotalSAR += balance.SAR; }
        if (balance.EGP) { report += `      ${formatNumber(balance.EGP)} ج.م\n`; mainTotalEGP += balance.EGP; }
      }
    });
    report += `\n`;

    // Custody accounts
    const custodyAccounts = accounts.filter(acc => acc.type === 'عهدة');
    let custodyTotalEGP = 0;

    report += `👤 *حسابات العهدة:*\n`;
    custodyAccounts.forEach(acc => {
      const balance = calculateAccountBalance(acc.code);
      if (balance.EGP !== 0) {
        report += `   ${acc.name}: ${formatNumber(balance.EGP)} ج.م\n`;
        custodyTotalEGP += balance.EGP;
      }
    });
    report += `\n`;

    // Savings accounts
    const savingsAccounts = accounts.filter(acc => acc.type === 'ادخار');
    let savingsTotalEGP = 0;

    report += `💎 *المدخرات:*\n`;
    savingsAccounts.forEach(acc => {
      const balance = calculateAccountBalance(acc.code);
      if (balance.EGP !== 0) {
        report += `   ${acc.name}: ${formatNumber(balance.EGP)} ج.م\n`;
        savingsTotalEGP += balance.EGP;
      }
    });
    report += `\n`;

    // Summary
    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 *الملخص:*\n`;
    report += `   💰 الرصيد الرئيسي: ${formatNumber(mainTotalSAR)} ر.س / ${formatNumber(mainTotalEGP)} ج.م\n`;
    report += `   👤 إجمالي العهد: ${formatNumber(custodyTotalEGP)} ج.م\n`;
    report += `   💎 إجمالي المدخرات: ${formatNumber(savingsTotalEGP)} ج.م\n`;

    return report;

  } catch (error) {
    Logger.log('Error generating comprehensive report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}
