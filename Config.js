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
  TIMEZONE: 'Asia/Riyadh'
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

  // شيتات الأصول (اختيارية)
  ASSETS: 'الأصول',                 // الذهب والأسهم والعقارات
  ASSOCIATIONS: 'الجمعيات',         // الجمعيات
  LOANS: 'السلف',                   // السلف

  // شيتات التقارير (تُنشأ تلقائياً)
  ACCOUNT_STATEMENT: 'كشف_حساب'     // كشف حساب (يُنشأ ديناميكياً)
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
    code: 'OM_CELIA',
    name: 'عهدة ام سيليا',
    type: 'عهدة',
    category: 'عهدة',
    responsible: 'ام سيليا',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'SAVINGS',
    name: 'خزنة الادخار',
    type: 'ادخار',
    category: 'ادخار',
    responsible: 'محمود',
    currency: 'SAR',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  {
    code: 'GOLD',
    name: 'محفظة الذهب',
    type: 'استثمار',
    category: 'أصول',
    responsible: 'محمود',
    currency: 'SAR',
    openingBalance: 0,
    affectsBalance: true,
    active: true
  },
  // المستفيدين (ليس لهم رصيد - للمساعدات المباشرة)
  {
    code: 'BEN_MOSTAFA',
    name: 'مصطفى (مساعدة)',
    type: 'مستفيد',
    category: 'أهل',
    responsible: '-',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: false,
    active: true
  },
  {
    code: 'BEN_HAGAR',
    name: 'هاجر (مساعدة)',
    type: 'مستفيد',
    category: 'أهل',
    responsible: '-',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: false,
    active: true
  },
  {
    code: 'BEN_MOHAMED',
    name: 'محمد (مساعدة)',
    type: 'مستفيد',
    category: 'أهل',
    responsible: '-',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: false,
    active: true
  },
  {
    code: 'BEN_FAMILY',
    name: 'الأهل (عام)',
    type: 'مستفيد',
    category: 'أهل',
    responsible: '-',
    currency: 'EGP',
    openingBalance: 0,
    affectsBalance: false,
    active: true
  }
];

// ============== البنود الافتراضية (شجرة التصنيفات) ==============
const DEFAULT_ITEMS = [
  // ═══════════════ إيرادات ═══════════════
  { nature: 'إيراد', category: 'راتب', item: 'راتب أساسي', code: 'INC-SAL-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'راتب', item: 'بدلات', code: 'INC-SAL-02', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'راتب', item: 'مكافآت', code: 'INC-SAL-03', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'دخل إضافي', item: 'عمولات', code: 'INC-EXT-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'دخل إضافي', item: 'استشارات', code: 'INC-EXT-02', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'جمعية', item: 'قبض جمعية', code: 'INC-ASC-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'سلف', item: 'استرداد سلفة', code: 'INC-LON-01', defaultAccount: 'MAIN', active: true },
  { nature: 'إيراد', category: 'أخرى', item: 'دخل آخر', code: 'INC-OTH-01', defaultAccount: 'MAIN', active: true },

  // ═══════════════ مصروفات ═══════════════
  { nature: 'مصروف', category: 'معيشة', item: 'طعام وشراب', code: 'EXP-LIV-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'إيجار', code: 'EXP-LIV-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'فواتير', code: 'EXP-LIV-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'معيشة', item: 'مواصلات', code: 'EXP-LIV-04', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'ملابس', code: 'EXP-PER-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'صحة ودواء', code: 'EXP-PER-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'ترفيه', code: 'EXP-PER-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'شخصي', item: 'سجاير', code: 'EXP-PER-04', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'جمعية', item: 'قسط جمعية', code: 'EXP-ASC-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'سلف', item: 'إعطاء سلفة', code: 'EXP-LON-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'مساعدة أهل', code: 'EXP-HLP-01', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'مساعدة مصطفى', code: 'EXP-HLP-02', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'مساعدة هاجر', code: 'EXP-HLP-03', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'مساعدات', item: 'مساعدة محمد', code: 'EXP-HLP-04', defaultAccount: 'MAIN', active: true },
  { nature: 'مصروف', category: 'أخرى', item: 'مصروف آخر', code: 'EXP-OTH-01', defaultAccount: 'MAIN', active: true },

  // ═══════════════ مصروفات من العهدة ═══════════════
  { nature: 'مصروف', category: 'عهدة_سارة', item: 'مشتريات من العهدة', code: 'EXP-CUS-01', defaultAccount: 'SARA', active: true },
  { nature: 'مصروف', category: 'عهدة_سارة', item: 'جمعية من العهدة', code: 'EXP-CUS-02', defaultAccount: 'SARA', active: true },
  { nature: 'مصروف', category: 'عهدة_سارة', item: 'مساعدة من العهدة', code: 'EXP-CUS-03', defaultAccount: 'SARA', active: true },
  { nature: 'مصروف', category: 'عهدة_مصطفى', item: 'مصروف من عهدة مصطفى', code: 'EXP-CUM-01', defaultAccount: 'MOSTAFA', active: true },
  { nature: 'مصروف', category: 'عهدة_ام_سيليا', item: 'مصروف من عهدة ام سيليا', code: 'EXP-CUO-01', defaultAccount: 'OM_CELIA', active: true },

  // ═══════════════ تحويلات ═══════════════
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة سارة', code: 'TRF-CUS-01', defaultAccount: 'MAIN→SARA', active: true },
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة مصطفى', code: 'TRF-CUS-02', defaultAccount: 'MAIN→MOSTAFA', active: true },
  { nature: 'تحويل', category: 'عهدة', item: 'تحويل لعهدة ام سيليا', code: 'TRF-CUS-03', defaultAccount: 'MAIN→OM_CELIA', active: true },
  { nature: 'تحويل', category: 'ادخار', item: 'تحويل للادخار', code: 'TRF-SAV-01', defaultAccount: 'MAIN→SAVINGS', active: true },
  { nature: 'تحويل', category: 'داخلي', item: 'تحويل بين خزن', code: 'TRF-INT-01', defaultAccount: '', active: true },
  { nature: 'تحويل', category: 'داخلي', item: 'تحويل من عهدة لعهدة', code: 'TRF-INT-02', defaultAccount: '', active: true },

  // ═══════════════ استثمار ═══════════════
  { nature: 'استثمار', category: 'ذهب', item: 'شراء ذهب', code: 'INV-GLD-01', defaultAccount: 'MAIN→GOLD', active: true },
  { nature: 'استثمار', category: 'ذهب', item: 'بيع ذهب', code: 'INV-GLD-02', defaultAccount: 'GOLD→MAIN', active: true },
  { nature: 'استثمار', category: 'أسهم', item: 'شراء أسهم', code: 'INV-STK-01', defaultAccount: 'MAIN→STOCK', active: true },
  { nature: 'استثمار', category: 'أسهم', item: 'بيع أسهم', code: 'INV-STK-02', defaultAccount: 'STOCK→MAIN', active: true }
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
  'ام_سيليا': {
    name: 'ام سيليا',
    aliases: ['ام سيليا', 'أم سيليا', 'مراتي', 'زوجتي', 'حبيبتي', 'الزوجة', 'سارة مراتي'],
    account: 'OM_CELIA',
    isCustody: true
  },
  'سارة': {
    name: 'سارة سليمان',
    aliases: ['سارة', 'ساره', 'أختي سارة', 'اختي ساره'],
    account: 'SARA',
    isCustody: true
  },
  'مصطفى': {
    name: 'مصطفى سليمان',
    aliases: ['مصطفى', 'مصطفي', 'أخويا مصطفى', 'اخويا مصطفي'],
    account: 'MOSTAFA',
    isCustody: true
  },
  'هاجر': {
    name: 'هاجر سليمان',
    aliases: ['هاجر', 'أختي هاجر', 'اختي هاجر'],
    account: 'BEN_HAGAR',
    isCustody: false
  },
  'محمد': {
    name: 'محمد سليمان',
    aliases: ['محمد', 'أخويا محمد', 'اخويا محمد'],
    account: 'BEN_MOHAMED',
    isCustody: false
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
