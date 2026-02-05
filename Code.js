/**
 * =====================================================
 * نظام محمود المحاسبي v2.0
 * Mahmoud Accounting System - Double Entry
 * =====================================================
 *
 * نظام محاسبي ذكي مبني على Google Sheets و Telegram Bot
 * مع دعم الذكاء الاصطناعي Gemini لفهم اللغة الطبيعية
 * نظام القيد المزدوج - كل حركة لها من_حساب وإلى_حساب
 *
 * Version: 2.0.0
 * Author: Adel Soliman
 * =====================================================
 */

/**
 * Initialize the system
 * Run this function first after deploying
 */
function initialize() {
  // Create all required sheets
  initializeAllSheets();

  // Add default admin user (Adel)
  const adminUser = getUserByTelegramId(786700586);
  if (!adminUser) {
    addUser({
      telegram_id: '786700586',
      name: 'Adel',
      username: 'adelsolmn',
      role: ROLES.ADMIN
    });
  }

  Logger.log('System initialized successfully!');
  return 'تم تهيئة النظام بنجاح! ✅';
}

/**
 * Web app entry point for GET requests
 */
function doGet(e) {
  return ContentService.createTextOutput('نظام محمود المحاسبي v2.0 يعمل! 🟢\nDouble Entry Accounting System');
}

/**
 * Test the Telegram bot
 */
function testBot() {
  const chatId = 786700586; // Adel's Telegram ID
  sendMessage(chatId, '✅ البوت يعمل بنجاح!\n\nنظام محمود المحاسبي v2.0 جاهز للاستخدام.\n(نظام القيد المزدوج)');
}

/**
 * Test Gemini AI
 */
function testGemini() {
  const testMessage = 'حولت لسارة 5000 جنيه عهدة';
  const result = parseMessageWithGemini(testMessage, 'Test User');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Daily scheduled function - check associations
 */
function dailyCheck() {
  // Check upcoming association payments
  checkUpcomingAssociations();
}

/**
 * Check upcoming association payments and send reminders
 */
function checkUpcomingAssociations() {
  try {
    const sheet = getOrCreateSheet(SHEETS.ASSOCIATIONS);
    const data = sheet.getDataRange().getValues();
    const reminderDays = parseInt(getSetting('notification_before_association')) || 3;

    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + reminderDays);

    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === 'نشط' || data[i][8] === 'active') {
        // Check if payment is due soon
        const startDate = new Date(data[i][4]);
        const dayOfMonth = startDate.getDate();

        if (today.getDate() === dayOfMonth - reminderDays) {
          const name = data[i][1];
          const amount = data[i][2];

          // Send reminder to admin
          const adminId = 786700586;
          const message = `⏰ *تذكير بموعد الجمعية*\n\nالجمعية: ${name}\nالمبلغ: ${amount} ج.م\nالموعد: خلال ${reminderDays} أيام`;
          sendMessage(adminId, message);
        }
      }
    }

  } catch (error) {
    Logger.log('Error in checkUpcomingAssociations: ' + error.toString());
  }
}

/**
 * Weekly report function - Updated for double entry system
 */
function sendWeeklyReport() {
  try {
    const adminId = 786700586;

    // Get this week's summary
    const sheet = getOrCreateSheet(SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let totalIncome = { SAR: 0, EGP: 0 };
    let totalExpense = { SAR: 0, EGP: 0 };
    let totalTransfer = { SAR: 0, EGP: 0 };

    // New format columns: 0:ID, 1:Date, 2:Time, 3:Nature, 4:Category, 5:Item, 6:Amount, 7:Currency
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate >= weekAgo && rowDate <= today) {
        const nature = data[i][3];
        const amount = parseFloat(data[i][6]) || 0;
        const currency = data[i][7] || 'SAR';

        if (nature === 'إيراد') {
          totalIncome[currency] = (totalIncome[currency] || 0) + amount;
        } else if (nature === 'مصروف') {
          totalExpense[currency] = (totalExpense[currency] || 0) + amount;
        } else if (nature === 'تحويل') {
          totalTransfer[currency] = (totalTransfer[currency] || 0) + amount;
        }
      }
    }

    let report = `📊 *التقرير الأسبوعي*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `💰 *الإيرادات:*\n`;
    if (totalIncome.SAR) report += `   ${formatNumber(totalIncome.SAR)} ر.س\n`;
    if (totalIncome.EGP) report += `   ${formatNumber(totalIncome.EGP)} ج.م\n`;

    report += `\n💸 *المصروفات:*\n`;
    if (totalExpense.SAR) report += `   ${formatNumber(totalExpense.SAR)} ر.س\n`;
    if (totalExpense.EGP) report += `   ${formatNumber(totalExpense.EGP)} ج.م\n`;

    report += `\n📤 *التحويلات:*\n`;
    if (totalTransfer.SAR) report += `   ${formatNumber(totalTransfer.SAR)} ر.س\n`;
    if (totalTransfer.EGP) report += `   ${formatNumber(totalTransfer.EGP)} ج.م\n`;

    // Net calculation
    const netSAR = (totalIncome.SAR || 0) - (totalExpense.SAR || 0) - (totalTransfer.SAR || 0);
    const netEGP = (totalIncome.EGP || 0) - (totalExpense.EGP || 0) - (totalTransfer.EGP || 0);

    report += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 *الصافي:*\n`;
    report += `   ${formatNumber(netSAR)} ر.س\n`;
    report += `   ${formatNumber(netEGP)} ج.م`;

    sendMessage(adminId, report);

  } catch (error) {
    Logger.log('Error in sendWeeklyReport: ' + error.toString());
  }
}

/**
 * Monthly report function
 */
function sendMonthlyReport() {
  try {
    const adminId = 786700586;
    const report = generateMonthlySummary();
    sendMessage(adminId, report);
  } catch (error) {
    Logger.log('Error in sendMonthlyReport: ' + error.toString());
  }
}

/**
 * Send balances report
 */
function sendBalancesReport() {
  try {
    const adminId = 786700586;
    const report = generateBalancesReport();
    sendMessage(adminId, report);
  } catch (error) {
    Logger.log('Error in sendBalancesReport: ' + error.toString());
  }
}

/**
 * Send custody report
 */
function sendCustodyReportToAdmin() {
  try {
    const adminId = 786700586;
    const report = generateCustodyReport();
    sendMessage(adminId, report);
  } catch (error) {
    Logger.log('Error in sendCustodyReportToAdmin: ' + error.toString());
  }
}

/**
 * Create time-based triggers
 * Run this once to set up scheduled tasks
 */
function createTriggers() {
  // Delete existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Daily check at 9 AM
  ScriptApp.newTrigger('dailyCheck')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  // Weekly report on Friday at 8 PM
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(20)
    .create();

  // Monthly report on 1st at 10 AM
  ScriptApp.newTrigger('sendMonthlyReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(10)
    .create();

  Logger.log('Triggers created successfully!');
  return 'تم إنشاء المهام المجدولة بنجاح!';
}

/**
 * Quick add transaction (for testing) - Updated for double entry
 */
function quickAdd(nature, amount, fromAccount, toAccount, description) {
  return saveTransaction({
    nature: nature,
    category: 'عام',
    item: description || 'حركة سريعة',
    amount: amount,
    currency: 'SAR',
    fromAccount: fromAccount || 'MAIN',
    toAccount: toAccount || '',
    description: description || ''
  }, {
    name: 'System',
    telegramId: '0'
  });
}

/**
 * Test transaction with double entry
 */
function testDoubleEntry() {
  // Test: Transfer 5000 SAR from MAIN to SARA custody (converts to EGP)
  const result = saveTransaction({
    nature: 'تحويل',
    category: 'عهدة',
    item: 'تحويل عهدة',
    amount: 300,
    currency: 'SAR',
    fromAccount: 'MAIN',
    toAccount: 'SARA',
    convertedAmount: 9000,
    convertedCurrency: 'EGP',
    exchangeRate: 30,
    description: 'تحويل عهدة لسارة'
  }, {
    name: 'Test User',
    telegramId: '123456'
  });

  Logger.log('Test result: ' + JSON.stringify(result));
  return result;
}

/**
 * Get account balance (helper function)
 */
function getBalance(accountCode) {
  const balance = calculateAccountBalance(accountCode);
  Logger.log(`Balance for ${accountCode}: SAR=${balance.SAR}, EGP=${balance.EGP}`);
  return balance;
}

/**
 * Export monthly data to PDF (future feature)
 */
function exportToPdf(month, year) {
  // TODO: Implement PDF export
  return 'هذه الميزة قيد التطوير';
}

/**
 * Backup data to Google Drive (future feature)
 */
function backupData() {
  // TODO: Implement backup
  return 'هذه الميزة قيد التطوير';
}

/**
 * =====================================================
 * IMPORTANT: Use these functions instead of Webhook
 * =====================================================
 */

/**
 * Step 1: Run this first to set up polling
 */
function setupBot() {
  // Initialize sheets
  initializeAllSheets();

  // Create polling trigger
  createPollingTrigger();

  // Send test message
  testSendMessage();

  return '✅ تم إعداد البوت بنجاح!';
}

/**
 * Step 2: Test if bot can send messages
 */
function testBotConnection() {
  return testSendMessage();
}

/**
 * Step 3: Manual check for messages (for testing)
 */
function checkMessages() {
  return manualCheck();
}

/**
 * Display system info
 */
function showSystemInfo() {
  const accounts = getAllAccounts();
  const items = getAllItems();

  Logger.log('=== System Info ===');
  Logger.log('Version: 2.0.0 (Double Entry)');
  Logger.log('Accounts: ' + accounts.length);
  Logger.log('Items: ' + items.length);

  accounts.forEach(acc => {
    const balance = calculateAccountBalance(acc.code);
    Logger.log(`${acc.name} (${acc.code}): SAR=${balance.SAR}, EGP=${balance.EGP}`);
  });

  return {
    version: '2.0.0',
    accounts: accounts.length,
    items: items.length
  };
}
