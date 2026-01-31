/**
 * =====================================================
 * نظام محمود المحاسبي
 * Mahmoud Accounting System
 * =====================================================
 *
 * نظام محاسبي ذكي مبني على Google Sheets و Telegram Bot
 * مع دعم الذكاء الاصطناعي Gemini لفهم اللغة الطبيعية
 *
 * Version: 1.0.0
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
  return ContentService.createTextOutput('نظام محمود المحاسبي يعمل! 🟢');
}

/**
 * Test the Telegram bot
 */
function testBot() {
  const chatId = 786700586; // Adel's Telegram ID
  sendMessage(chatId, '✅ البوت يعمل بنجاح!\n\nنظام محمود المحاسبي جاهز للاستخدام.');
}

/**
 * Test Gemini AI
 */
function testGemini() {
  const testMessage = 'صرفت 150 ريال غداء مع الزملاء';
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
        // This is a simplified check - you may want to enhance it
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
 * Weekly report function
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

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;

    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (rowDate >= weekAgo && rowDate <= today) {
        const type = data[i][3];
        const amount = parseFloat(data[i][5]) || 0;

        if (type === 'دخل') totalIncome += amount;
        else if (type === 'مصروف') totalExpense += amount;
        else if (type === 'تحويل') totalTransfer += amount;
      }
    }

    let report = `📊 *التقرير الأسبوعي*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `💰 الدخل: ${formatNumber(totalIncome)} ر.س\n`;
    report += `💸 المصروفات: ${formatNumber(totalExpense)} ر.س\n`;
    report += `📤 التحويلات: ${formatNumber(totalTransfer)} ر.س\n\n`;
    report += `📈 الصافي: ${formatNumber(totalIncome - totalExpense - totalTransfer)} ر.س`;

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
 * Quick add transaction (for testing)
 */
function quickAdd(type, amount, description) {
  return addTransaction({
    type: type,
    amount: amount,
    currency: 'SAR',
    description: description,
    user_name: 'System',
    telegram_id: '0'
  });
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
