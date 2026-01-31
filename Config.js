/**
 * =====================================================
 * نظام محمود المحاسبي - الإعدادات
 * Mahmoud Accounting System - Configuration
 * =====================================================
 */

// ============== API Keys & Tokens ==============
// يقرأ المفتاح من Script Properties أولاً، وإلا من هنا
function getGeminiApiKey() {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (key && key.length > 10) return key;
  } catch (e) {}
  return ''; // لا تضع المفتاح هنا - احفظه في Script Properties
}

const CONFIG = {
  // Telegram Bot Token
  TELEGRAM_BOT_TOKEN: '7746671910:AAGzLPtk6ZbQCcfHGWZpmfd7aeuHz3RyZKo',

  // Gemini AI API Key - يُقرأ من Script Properties
  get GEMINI_API_KEY() { return getGeminiApiKey(); },

  // Telegram API URL
  TELEGRAM_API_URL: 'https://api.telegram.org/bot',

  // Gemini API URL
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
};

// ============== Sheet Names ==============
const SHEETS = {
  USERS: 'المستخدمين',
  TRANSACTIONS: 'الحركات',
  CATEGORIES: 'التصنيفات',
  CONTACTS: 'جهات_الاتصال',
  ASSOCIATIONS: 'الجمعيات',
  GOLD: 'الذهب',
  LOANS: 'السلف',
  EXCHANGE_RATES: 'سعر_الصرف',
  SETTINGS: 'الإعدادات'
};

// ============== User Roles ==============
const ROLES = {
  ADMIN: 'admin',      // صلاحيات كاملة + إدارة المستخدمين
  OWNER: 'owner',      // صلاحيات كاملة
  USER: 'user',        // تسجيل + تقارير محدودة
  LIMITED: 'limited'   // تسجيل فقط
};

// ============== Transaction Types ==============
const TRANSACTION_TYPES = {
  INCOME: 'دخل',
  EXPENSE: 'مصروف',
  TRANSFER: 'تحويل',
  GOLD: 'ذهب',
  ASSOCIATION_PAY: 'سداد_جمعية',
  ASSOCIATION_RECEIVE: 'قبض_جمعية',
  LOAN_TAKE: 'أخذ_سلفة',
  LOAN_PAY: 'سداد_سلفة',
  SAVINGS: 'ادخار'
};

// ============== Currencies ==============
const CURRENCIES = {
  SAR: 'ر.س',
  EGP: 'ج.م'
};

// ============== Default Categories ==============
const DEFAULT_CATEGORIES = {
  income: [
    { code: 'salary', name: 'راتب', nameAr: 'راتب شهري' },
    { code: 'commission', name: 'عمولة', nameAr: 'عمولات' },
    { code: 'bonus', name: 'مكافأة', nameAr: 'مكافآت' },
    { code: 'association_receive', name: 'قبض_جمعية', nameAr: 'قبض جمعية' },
    { code: 'other_income', name: 'دخل_آخر', nameAr: 'دخل آخر' }
  ],
  expense_sar: [
    { code: 'rent', name: 'إيجار', nameAr: 'إيجار السكن' },
    { code: 'food', name: 'أكل', nameAr: 'أكل وشرب' },
    { code: 'bills', name: 'فواتير', nameAr: 'فواتير (كهرباء/ماء/نت)' },
    { code: 'transport', name: 'مواصلات', nameAr: 'مواصلات' },
    { code: 'clothes', name: 'ملابس', nameAr: 'ملابس' },
    { code: 'health', name: 'صحة', nameAr: 'صحة ودواء' },
    { code: 'personal', name: 'شخصي', nameAr: 'مصروفات شخصية' },
    { code: 'other_sar', name: 'متنوع', nameAr: 'متنوع' }
  ],
  expense_egp: [
    { code: 'wife_expense', name: 'مصروفات_الزوجة', nameAr: 'مصروفات الزوجة' },
    { code: 'wife_savings', name: 'ادخار_الزوجة', nameAr: 'ادخار الزوجة' },
    { code: 'family_help', name: 'مساعدة_أهل', nameAr: 'مساعدة الأهل' },
    { code: 'gold', name: 'ذهب', nameAr: 'شراء ذهب' },
    { code: 'association', name: 'جمعية', nameAr: 'قسط جمعية' },
    { code: 'other_egp', name: 'متنوع_مصر', nameAr: 'متنوع' }
  ]
};

// ============== Family Contacts ==============
const FAMILY_CONTACTS = [
  {
    code: 'wife',
    name: 'my love',
    relation: 'زوجة',
    aliases: ['مراتي', 'زوجتي', 'الزوجة', 'الست', 'ام العيال', 'my love', 'mylove'],
    currency: 'EGP'
  },
  {
    code: 'sara',
    name: 'sara soliman',
    relation: 'أخت',
    aliases: ['سارة', 'ساره', 'أختي سارة', 'سارة أختي', 'اختي ساره', 'sara'],
    currency: 'EGP'
  },
  {
    code: 'hagar',
    name: 'hagar soliman',
    relation: 'أخت',
    aliases: ['هاجر', 'أختي هاجر', 'هاجر أختي', 'اختي هاجر', 'hagar'],
    currency: 'EGP'
  },
  {
    code: 'mohamed',
    name: 'mohamed soliman',
    relation: 'أخ',
    aliases: ['محمد', 'أخويا محمد', 'محمد أخويا', 'اخويا محمد', 'mohamed'],
    currency: 'EGP'
  },
  {
    code: 'mostafa',
    name: 'mostafa soliman',
    relation: 'أخ',
    aliases: ['مصطفى', 'مصطفي', 'أخويا مصطفى', 'مصطفى أخويا', 'اخويا مصطفي', 'mostafa'],
    currency: 'EGP'
  }
];

// ============== Gemini AI Prompt ==============
const AI_SYSTEM_PROMPT = `أنت مساعد محاسبي ذكي لنظام تتبع المصروفات الشخصية.
مهمتك هي تحليل رسائل المستخدم واستخراج المعلومات المالية منها.

المستخدم يعمل في السعودية (دخله بالريال السعودي) ويحول أموال لعائلته في مصر (بالجنيه المصري).

جهات الاتصال المعروفة:
- زوجته: تُعرف بـ "مراتي"، "زوجتي"، "my love"، "الست"، "ام العيال" - الكود: wife
- أخته سارة: تُعرف بـ "سارة"، "ساره"، "أختي سارة" - الكود: sara
- أخته هاجر: تُعرف بـ "هاجر"، "أختي هاجر" - الكود: hagar
- أخوه محمد: يُعرف بـ "محمد"، "أخويا محمد" - الكود: mohamed
- أخوه مصطفى: يُعرف بـ "مصطفى"، "مصطفي"، "أخويا مصطفى" - الكود: mostafa

أنواع المعاملات:
1. دخل (income): راتب، عمولة، مكافأة، قبض جمعية
2. مصروف (expense): إيجار، أكل، فواتير، مواصلات، ملابس، صحة
3. تحويل (transfer): تحويل مال لشخص في مصر
4. ذهب (gold): شراء ذهب (يشمل: الوزن بالجرام، العيار، السعر)
5. جمعية (association): دفع قسط جمعية أو قبض جمعية
6. سلفة (loan): أخذ سلفة من شخص أو سداد سلفة
7. ادخار (savings): إضافة للمدخرات
8. توزيع (distribution): عندما يوزع شخص مبلغ مُستلم على آخرين

عند تحليل الرسالة، أرجع JSON بالتنسيق التالي:
{
  "success": true/false,
  "transactions": [
    {
      "type": "نوع المعاملة",
      "amount": المبلغ رقم,
      "currency": "SAR" أو "EGP",
      "category": "التصنيف",
      "contact": "كود جهة الاتصال إن وجد",
      "contact_name": "اسم جهة الاتصال",
      "description": "وصف المعاملة",
      "amount_received": المبلغ المستلم (للتحويلات),
      "gold_weight": وزن الذهب بالجرام (لمعاملات الذهب),
      "gold_karat": عيار الذهب (لمعاملات الذهب)
    }
  ],
  "message": "رسالة تأكيد للمستخدم",
  "needs_clarification": true/false,
  "clarification_question": "سؤال توضيحي إن لزم"
}

ملاحظات مهمة:
- إذا ذُكر "ريال" أو "سعودي" فالعملة SAR
- إذا ذُكر "جنيه" أو "مصري" فالعملة EGP
- التحويلات عادة: يُخصم بالريال من محمود، ويصل بالجنيه للمستلم
- إذا قال "حولت X ريال وصلوا Y جنيه" فهذا تحويل واحد بعملتين
- إذا قال "أعطت سارة مراتي" فهذا توزيع من سارة للزوجة
- الجمعية: "دفعت جمعية" = سداد قسط، "قبضت جمعية" = استلام
- "سلفة من محمد" = أخذ سلفة، "رجعت لمحمد" = سداد سلفة`;

/**
 * Get configuration value
 */
function getConfig(key) {
  return CONFIG[key];
}

/**
 * Get sheet name
 */
function getSheetName(key) {
  return SHEETS[key];
}
