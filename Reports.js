/**
 * =====================================================
 * نظام محمود المحاسبي - Reports Generator
 * =====================================================
 */

/**
 * Generate monthly summary report
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

    let totalIncome = 0;
    let totalExpenseSAR = 0;
    let totalExpenseEGP = 0;
    let totalTransfers = 0;

    const expensesByCategory = {};
    const transfersByContact = {};

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
        const type = data[i][3];
        const category = data[i][4];
        const amount = parseFloat(data[i][5]) || 0;
        const currency = data[i][6];
        const contact = data[i][10];

        if (type === 'دخل') {
          totalIncome += amount;
        } else if (type === 'مصروف') {
          if (currency === 'SAR') {
            totalExpenseSAR += amount;
          } else {
            totalExpenseEGP += amount;
          }
          expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
        } else if (type === 'تحويل') {
          totalTransfers += amount;
          if (contact) {
            transfersByContact[contact] = (transfersByContact[contact] || 0) + amount;
          }
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let report = `📊 *تقرير شهر ${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `💰 *الدخل:* ${formatNumber(totalIncome)} ر.س\n\n`;

    report += `💸 *المصروفات:*\n`;
    report += `   • بالريال: ${formatNumber(totalExpenseSAR)} ر.س\n`;
    report += `   • بالجنيه: ${formatNumber(totalExpenseEGP)} ج.م\n\n`;

    report += `📤 *التحويلات:* ${formatNumber(totalTransfers)} ر.س\n\n`;

    if (Object.keys(expensesByCategory).length > 0) {
      report += `📋 *المصروفات حسب التصنيف:*\n`;
      for (const [cat, amount] of Object.entries(expensesByCategory)) {
        report += `   • ${cat}: ${formatNumber(amount)}\n`;
      }
      report += `\n`;
    }

    if (Object.keys(transfersByContact).length > 0) {
      report += `👥 *التحويلات حسب الشخص:*\n`;
      for (const [contact, amount] of Object.entries(transfersByContact)) {
        const contactData = getContactByAlias(contact);
        const displayName = contactData ? contactData.name : contact;
        report += `   • ${displayName}: ${formatNumber(amount)} ر.س\n`;
      }
      report += `\n`;
    }

    const netSAR = totalIncome - totalExpenseSAR - totalTransfers;
    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 *صافي الشهر:* ${formatNumber(netSAR)} ر.س`;

    return report;

  } catch (error) {
    Logger.log('Error generating monthly summary: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate wife expenses report
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {string} Formatted report
 */
function generateWifeReport(month, year) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    let totalSent = 0;
    let totalExpenses = 0;
    let totalSavings = 0;
    const expenses = [];

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
        const contact = data[i][10];
        const amountReceived = parseFloat(data[i][7]) || 0;
        const category = data[i][4];
        const description = data[i][11];

        if (contact === 'wife' || contact === 'my love') {
          if (category === 'ادخار_الزوجة' || category === 'wife_savings') {
            totalSavings += amountReceived;
          } else {
            totalExpenses += amountReceived;
          }
          totalSent += amountReceived;
          expenses.push({
            date: data[i][1],
            amount: amountReceived,
            category: category,
            description: description
          });
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let report = `💕 *تقرير my love - ${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `📥 *إجمالي المستلم:* ${formatNumber(totalSent)} ج.م\n`;
    report += `💸 *للمصروفات:* ${formatNumber(totalExpenses)} ج.م\n`;
    report += `🏦 *للادخار:* ${formatNumber(totalSavings)} ج.م\n\n`;

    if (expenses.length > 0) {
      report += `📋 *التفاصيل:*\n`;
      expenses.slice(-10).forEach(exp => {
        const dateStr = Utilities.formatDate(new Date(exp.date), 'Asia/Riyadh', 'dd/MM');
        report += `   ${dateStr} - ${formatNumber(exp.amount)} ج.م`;
        if (exp.description) report += ` (${exp.description})`;
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
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {string} Formatted report
 */
function generateSiblingsReport(month, year) {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const currentDate = new Date();
    month = month || currentDate.getMonth() + 1;
    year = year || currentDate.getFullYear();

    const siblings = ['sara', 'hagar', 'mohamed', 'mostafa'];
    const siblingTotals = {};
    const siblingDetails = {};

    siblings.forEach(s => {
      siblingTotals[s] = 0;
      siblingDetails[s] = [];
    });

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate.getMonth() + 1 === month && rowDate.getFullYear() === year) {
        const contact = data[i][10];
        const amountReceived = parseFloat(data[i][7]) || 0;
        const description = data[i][11];

        if (siblings.includes(contact)) {
          siblingTotals[contact] += amountReceived;
          siblingDetails[contact].push({
            date: data[i][1],
            amount: amountReceived,
            description: description
          });
        }
      }
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const contactNames = {
      'sara': 'سارة 👧',
      'hagar': 'هاجر 👧',
      'mohamed': 'محمد 👦',
      'mostafa': 'مصطفى 👦'
    };

    let report = `👨‍👩‍👧‍👦 *تقرير مساعدة الإخوة - ${monthNames[month-1]} ${year}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let grandTotal = 0;

    siblings.forEach(sibling => {
      if (siblingTotals[sibling] > 0) {
        report += `${contactNames[sibling]}: ${formatNumber(siblingTotals[sibling])} ج.م\n`;
        grandTotal += siblingTotals[sibling];
      }
    });

    report += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *الإجمالي:* ${formatNumber(grandTotal)} ج.م`;

    return report;

  } catch (error) {
    Logger.log('Error generating siblings report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

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

    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === 'نشط' || data[i][8] === 'active') {
        const name = data[i][1];
        const monthlyAmount = data[i][2];
        const totalMonths = data[i][3];
        const startDate = data[i][4];
        const receiveOrder = data[i][5];
        const expectedReceiveDate = data[i][6];

        // Count paid installments
        let paidCount = 0;
        for (let j = 1; j < transData.length; j++) {
          if (transData[j][3] === 'سداد_جمعية' &&
              transData[j][11] && transData[j][11].includes(name)) {
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
        report += `   ${dateStr} - ${p.weight}g عيار ${p.karat} - ${formatNumber(p.price)} ج.م\n`;
      });
    }

    return report;

  } catch (error) {
    Logger.log('Error generating gold report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Generate savings report
 * @returns {string} Formatted report
 */
function generateSavingsReport() {
  try {
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    let totalSavings = 0;
    let wifeSavings = 0;
    const savingsHistory = [];

    for (let i = 1; i < data.length; i++) {
      const type = data[i][3];
      const category = data[i][4];
      const amountReceived = parseFloat(data[i][7]) || 0;
      const contact = data[i][10];
      const date = data[i][1];

      if (category === 'ادخار' || category === 'savings' || type === 'ادخار') {
        totalSavings += amountReceived;
        savingsHistory.push({ date: date, amount: amountReceived, type: 'ادخار عام' });
      }

      if (category === 'ادخار_الزوجة' || category === 'wife_savings') {
        wifeSavings += amountReceived;
        savingsHistory.push({ date: date, amount: amountReceived, type: 'ادخار الزوجة' });
      }

      if (type === 'قبض_جمعية') {
        totalSavings += amountReceived;
        savingsHistory.push({ date: date, amount: amountReceived, type: 'قبض جمعية' });
      }
    }

    let report = `🏦 *تقرير المدخرات*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `💰 *إجمالي المدخرات:* ${formatNumber(totalSavings)} ج.م\n`;
    report += `💕 *ادخار my love:* ${formatNumber(wifeSavings)} ج.م\n\n`;

    report += `━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 *الإجمالي الكلي:* ${formatNumber(totalSavings + wifeSavings)} ج.م`;

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
    }

    return report;

  } catch (error) {
    Logger.log('Error generating loans report: ' + error.toString());
    return 'حدث خطأ أثناء إنشاء التقرير';
  }
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
