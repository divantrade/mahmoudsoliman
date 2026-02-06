/**
 * =====================================================
 * نظام المحاسبة الذكي - الإعدادات
 * Smart Accounting System - Configuration
 * الإصدار 2.0 - نظام القيد المزدوج
 * =====================================================
 */

// ============== API Keys & Tokens ==============
function getGeminiApiKey() {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (key && key.length > 10) return key;
  } catch (e) {}
  return '';
}

const CONFIG = {
  // Telegram Bot Token
  TELEGRAM_BOT_TOKEN: '7746671910:AAGzLPtk6ZbQCcfHGWZpmfd7aeuHz3RyZKo',

  // Gemini AI API Key
  get GEMINI_API_KEY() { return getGeminiApiKey(); },

  // Telegram API URL
  TELEGRAM_API_URL: 'https://api.telegram.org/bot',

  // Gemini API URL
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

  // كلمة السر لحماية النظام
  ADMIN_PASSWORD: 'mahmoud2024',

  // مجلد النسخ الاحتياطي
  BACKUP_FOLDER_ID: '1FS5n_YB1BNM-fXi0Y4tpvVeeqflZ3ffv',

  // إعدادات النظام
  SYSTEM_NAME: 'نظام المحاسبة الذكي',
  VERSION: '2.0',
  DEFAULT_CURRENCY: 'SAR',
  TIMEZONE: 'Asia/Riyadh',

  // سعر الصرف الافتراضي (ريال مقابل جنيه)
  DEFAULT_EXCHANGE_RATE: 13
};

// ============== أسماء الشيتات (النظام الجديد) ==============
const SHEETS = {
  // الشيتات الأساسية
  SETTINGS: 'الإعدادات',           // إعدادات النظام العامة
  CURRENCIES: 'العملات',            // العملات وأسعار الصرف
  ACCOUNTS: 'الحسابات',             // الخزن والعهد والمحافظ
  ITEMS: 'البنود',                  // شجرة البنود (طبيعة/تصنيف/بند)
  USERS: 'المستخدمين',              // مستخدمي النظام
  TRANSACTIONS: 'الحركات',          // جميع الحركات المالية

  // شيتات الأصول
  ASSETS: 'الأصول',                 // الذهب والأسهم
  GOLD: 'الذهب',                    // سجل الذهب
  ASSOCIATIONS: 'الجمعيات',         // الجمعيات
  LOANS: 'السلف'                    // السلف
};

// ============== أنواع الحسابات ==============
const ACCOUNT_TYPES = {
  MAIN: 'رئيسي',           // الحساب الشخصي الرئيسي
  CUSTODY: 'عهدة',         // أمين عهدة (شخص يصرف نيابة عنك)
  BENEFICIARY: 'مستفيد',   // شخص تساعده (ليس له رصيد)
  SAVINGS: 'ادخار',        // خزنة ادخار
  INVESTMENT: 'استثمار',   // محفظة استثمارية (ذهب/أسهم)
  PERSONAL: 'شخصي'         // حساب شخص آخر (زوجة/أخ)
};

// ============== طبيعة الحركات ==============
const MOVEMENT_NATURE = {
  INCOME: 'إيراد',         // دخول مال للنظام
  EXPENSE: 'مصروف',        // خروج مال من النظام
  TRANSFER: 'تحويل',       // انتقال مال داخل النظام
  INVESTMENT: 'استثمار'    // تحويل مال لأصل
};

// ============== العملات الافتراضية ==============
const DEFAULT_CURRENCIES = [
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', rate: 1, isBase: true },
  { code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م', rate: 0.077, isBase: false },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$', rate: 3.75, isBase: false },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ', rate: 1.02, isBase: false }
];

// ============== الحسابات الافتراضية ==============
const DEFAULT_ACCOUNTS = [
  // ═══════════════ الحسابات الرئيسية ═══════════════
  {
    code: 'MAIN',
    name: 'حسابي الشخصي',
    type: 'رئيسي',
    category: 'رئيسي',
    responsible: 'محمود',
    currency: 'SAR',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'CASH_EGP',
    name: 'كاش جنيه',
    type: 'رئيسي',
    category: 'رئيسي',
    responsible: 'محمود',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },

  // ═══════════════ حسابات العهدة ═══════════════
  {
    code: 'WIFE',
    name: 'عهدة الزوجة (my love)',
    type: 'عهدة',
    category: 'عهدة',
    responsible: 'ام سيليا',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'SARA',
    name: 'عهدة سارة',
    type: 'عهدة',
    category: 'عهدة',
    responsible: 'سارة',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'MOSTAFA',
    name: 'عهدة مصطفى',
    type: 'عهدة',
    category: 'عهدة',
    responsible: 'مصطفى',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'HAGAR',
    name: 'عهدة هاجر',
    type: 'عهدة',
    category: 'عهدة',
    responsible: 'هاجر',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'MOHAMED',
    name: 'عهدة محمد',
    type: 'عهدة',
    category: 'عهدة',
    responsible: 'محمد',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },

  // ═══════════════ حسابات المستفيدين (مساعدة بدون رصيد) ═══════════════
  {
    code: 'BEN_FAMILY',
    name: 'مساعدة الأهل',
    type: 'مستفيد',
    category: 'أهل',
    responsible: '-',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: false,
    active: true
  },
  {
    code: 'BEN_OTHER',
    name: 'مساعدات أخرى',
    type: 'مستفيد',
    category: 'متنوع',
    responsible: '-',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: false,
    active: true
  },

  // ═══════════════ حسابات الادخار ═══════════════
  {
    code: 'SAVINGS',
    name: 'خزنة الادخار',
    type: 'ادخار',
    category: 'ادخار',
    responsible: 'محمود',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'WIFE_SAVINGS',
    name: 'ادخار الزوجة',
    type: 'ادخار',
    category: 'ادخار',
    responsible: 'ام سيليا',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },

  // ═══════════════ حسابات الاستثمار ═══════════════
  {
    code: 'GOLD',
    name: 'محفظة الذهب',
    type: 'استثمار',
    category: 'أصول',
    responsible: 'محمود',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  }
];

// ============== البنود الافتراضية (شجرة التصنيفات) ==============
const DEFAULT_ITEMS = [
  // ═══════════════════════════════════════════════════
  // إيرادات
  // ═══════════════════════════════════════════════════
  { nature: 'إيراد', category: 'راتب', item: 'راتب أساسي', code: 'INC-SAL-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'راتب', item: 'بدلات', code: 'INC-SAL-02', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'راتب', item: 'مكافآت', code: 'INC-SAL-03', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'راتب', item: 'أوفرتايم', code: 'INC-SAL-04', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'دخل إضافي', item: 'عمولات', code: 'INC-EXT-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'دخل إضافي', item: 'استشارات', code: 'INC-EXT-02', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'دخل إضافي', item: 'مشروع جانبي', code: 'INC-EXT-03', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'جمعية', item: 'قبض جمعية', code: 'INC-ASC-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'سلف', item: 'استرداد سلفة', code: 'INC-LON-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'استثمار', item: 'أرباح ذهب', code: 'INC-INV-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'أخرى', item: 'هدية', code: 'INC-OTH-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'أخرى', item: 'دخل آخر', code: 'INC-OTH-02', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // مصروفات معيشة
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'معيشة', item: 'طعام وشراب', code: 'EXP-LIV-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'سوبرماركت', code: 'EXP-LIV-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'مطاعم', code: 'EXP-LIV-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'إيجار', code: 'EXP-LIV-04', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'كهرباء', code: 'EXP-LIV-05', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'مياه', code: 'EXP-LIV-06', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'غاز', code: 'EXP-LIV-07', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'إنترنت', code: 'EXP-LIV-08', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'موبايل', code: 'EXP-LIV-09', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // مصروفات مواصلات
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'مواصلات', item: 'بنزين', code: 'EXP-TRN-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مواصلات', item: 'أوبر/كريم', code: 'EXP-TRN-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مواصلات', item: 'مواصلات عامة', code: 'EXP-TRN-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مواصلات', item: 'صيانة سيارة', code: 'EXP-TRN-04', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // مصروفات شخصية
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'شخصي', item: 'ملابس', code: 'EXP-PER-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'صحة ودواء', code: 'EXP-PER-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'ترفيه', code: 'EXP-PER-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'سجاير', code: 'EXP-PER-04', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'حلاقة', code: 'EXP-PER-05', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'هدايا', code: 'EXP-PER-06', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // مصروفات جمعيات وسلف
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'جمعية', item: 'قسط جمعية', code: 'EXP-ASC-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'سلف', item: 'إعطاء سلفة', code: 'EXP-LON-01', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // مصروفات مساعدات (مباشرة - ليس من عهدة)
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'مساعدات', item: 'مساعدة أهل', code: 'EXP-HLP-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'مساعدة زوجة', code: 'EXP-HLP-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'صدقة', code: 'EXP-HLP-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'زكاة', code: 'EXP-HLP-04', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // مصروفات أخرى
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'تعليم', item: 'دورات', code: 'EXP-EDU-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'تعليم', item: 'كتب', code: 'EXP-EDU-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'أخرى', item: 'مصروف آخر', code: 'EXP-OTH-01', defaultAccount: 'MAIN', active: true },

  // ═══════════════════════════════════════════════════
  // صرف من العهدة (مصروفات أمين العهدة)
  // ═══════════════════════════════════════════════════
  { nature: 'مصروف', category: 'صرف_عهدة', item: 'صرف من عهدة الزوجة', code: 'EXP-CUW-01', defaultAccount: 'WIFE', active: true },
  { nature: 'مصروف', category: 'صرف_عهدة', item: 'صرف من عهدة سارة', code: 'EXP-CUS-01', defaultAccount: 'SARA', active: true },
  { nature: 'مصروف', category: 'صرف_عهدة', item: 'صرف من عهدة مصطفى', code: 'EXP-CUM-01', defaultAccount: 'MOSTAFA', active: true },
  { nature: 'مصروف', category: 'صرف_عهدة', item: 'صرف من عهدة هاجر', code: 'EXP-CUH-01', defaultAccount: 'HAGAR', active: true },
  { nature: 'مصروف', category: 'صرف_عهدة', item: 'صرف من عهدة محمد', code: 'EXP-CUO-01', defaultAccount: 'MOHAMED', active: true },

  // ═══════════════════════════════════════════════════
  // تحويلات
  // ═══════════════════════════════════════════════════
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة الزوجة', code: 'TRF-CUW-01', defaultAccount: 'MAIN→WIFE', active: true },
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة سارة', code: 'TRF-CUS-01', defaultAccount: 'MAIN→SARA', active: true },
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة مصطفى', code: 'TRF-CUM-01', defaultAccount: 'MAIN→MOSTAFA', active: true },
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة هاجر', code: 'TRF-CUH-01', defaultAccount: 'MAIN→HAGAR', active: true },
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة محمد', code: 'TRF-CUO-01', defaultAccount: 'MAIN→MOHAMED', active: true },
  { nature: 'تحويل', category: 'ادخار', item: 'تحويل للادخار', code: 'TRF-SAV-01', defaultAccount: 'MAIN→SAVINGS', active: true },
  { nature: 'تحويل', category: 'ادخار', item: 'تحويل لادخار الزوجة', code: 'TRF-SAV-02', defaultAccount: 'WIFE→WIFE_SAVINGS', active: true },
  { nature: 'تحويل', category: 'داخلي', item: 'تحويل بين حسابات', code: 'TRF-INT-01', defaultAccount: '', active: true },
  { nature: 'تحويل', category: 'صرافة', item: 'تحويل صرافة', code: 'TRF-EXC-01', defaultAccount: '', active: true },

  // ═══════════════════════════════════════════════════
  // استثمار
  // ═══════════════════════════════════════════════════
  { nature: 'استثمار', category: 'ذهب', item: 'شراء ذهب', code: 'INV-GLD-01', defaultAccount: 'MAIN→GOLD', active: true },
  { nature: 'استثمار', category: 'ذهب', item: 'بيع ذهب', code: 'INV-GLD-02', defaultAccount: 'GOLD→MAIN', active: true }
];

// ============== صلاحيات المستخدمين ==============
const ROLES = {
  ADMIN: 'مدير',           // صلاحيات كاملة + إدارة المستخدمين
  OWNER: 'مالك',           // صلاحيات كاملة
  CUSTODY: 'أمين_عهدة',    // يصرف من العهدة فقط
  USER: 'مستخدم',          // تسجيل + تقارير محدودة
  LIMITED: 'محدود'         // تسجيل فقط
};

// ============== جهات الاتصال (للتعرف عليها بالذكاء الاصطناعي) ==============
const CONTACTS = {
  'wife': {
    name: 'ام سيليا (my love)',
    aliases: ['ام سيليا', 'أم سيليا', 'مراتي', 'زوجتي', 'حبيبتي', 'الزوجة', 'my love', 'حياتي'],
    account: 'WIFE',
    isCustody: true
  },
  'سارة': {
    name: 'سارة سليمان',
    aliases: ['سارة', 'ساره', 'أختي سارة', 'اختي ساره', 'سارة اختي'],
    account: 'SARA',
    isCustody: true
  },
  'مصطفى': {
    name: 'مصطفى سليمان',
    aliases: ['مصطفى', 'مصطفي', 'أخويا مصطفى', 'اخويا مصطفي', 'مصطفى اخويا'],
    account: 'MOSTAFA',
    isCustody: true
  },
  'هاجر': {
    name: 'هاجر سليمان',
    aliases: ['هاجر', 'هاجر اختي', 'أختي هاجر', 'اختي هاجر'],
    account: 'HAGAR',
    isCustody: true
  },
  'محمد': {
    name: 'محمد سليمان',
    aliases: ['محمد', 'محمد اخويا', 'أخويا محمد', 'اخويا محمد'],
    account: 'MOHAMED',
    isCustody: true
  }
};

// ============== قوائم للـ Dropdown ==============
const DROPDOWN_LISTS = {
  currencies: ['ريال', 'جنيه', 'دولار', 'درهم'],
  accountTypes: ['رئيسي', 'عهدة', 'مستفيد', 'ادخار', 'استثمار', 'شخصي'],
  movementNatures: ['إيراد', 'مصروف', 'تحويل', 'استثمار'],
  yesNo: ['نعم', 'لا']
};

// ============== Helper Functions ==============

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

/**
 * Get account type label
 */
function getAccountTypeLabel(type) {
  return ACCOUNT_TYPES[type] || type;
}

/**
 * Get movement nature label
 */
function getMovementNatureLabel(nature) {
  return MOVEMENT_NATURE[nature] || nature;
}

/**
 * Find contact by alias
 */
function findContactByAlias(text) {
  const normalizedText = text.toLowerCase().trim();

  for (const [code, contact] of Object.entries(CONTACTS)) {
    for (const alias of contact.aliases) {
      if (normalizedText.includes(alias.toLowerCase())) {
        return { code, ...contact };
      }
    }
  }
  return null;
}

/**
 * Check if contact is custody holder
 */
function isCustodyHolder(contactCode) {
  return CONTACTS[contactCode]?.isCustody || false;
}

/**
 * Get contact's default account
 */
function getContactAccount(contactCode) {
  return CONTACTS[contactCode]?.account || null;
}

/**
 * Get setting from Settings sheet
 */
function getSetting(key) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SETTINGS);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }
  } catch (e) {
    Logger.log('Error getting setting: ' + e.toString());
  }
  return null;
}
