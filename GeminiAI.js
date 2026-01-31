/**
 * =====================================================
 * نظام محمود المحاسبي - Gemini AI Integration
 * =====================================================
 */

/**
 * ⭐ بناء prompt الذكاء الاصطناعي مع التصنيفات من الشيت
 */
function buildAIPrompt() {
  // قراءة التصنيفات من الشيت ديناميكياً
  var incomeCategories = getCategoryCodesForAI('دخل') || 'راتب شهري، عمولات، مكافآت، دخل آخر';
  var expenseCategories = getCategoryCodesForAI('مصروف') || 'أكل وشرب، مواصلات، ملابس، متنوع';
  var transferCategories = getCategoryCodesForAI('تحويل') || 'مصروفات الزوجة، مساعدة الأهل، متنوع';
  var custodyCategories = getCategoryCodesForAI('عهدة') || 'قسط جمعية، مساعدة محمد، متنوع';

  Logger.log('Dynamic categories loaded:');
  Logger.log('Income: ' + incomeCategories);
  Logger.log('Expense: ' + expenseCategories);
  Logger.log('Transfer: ' + transferCategories);
  Logger.log('Custody: ' + custodyCategories);

  // استبدال التصنيفات في الـ prompt
  var prompt = AI_SYSTEM_PROMPT;

  // استبدال التصنيفات الثابتة بالتصنيفات الديناميكية
  prompt = prompt.replace(
    /دخل: راتب شهري.*$/m,
    'دخل: ' + incomeCategories
  );
  prompt = prompt.replace(
    /مصروف: إيجار السكن.*$/m,
    'مصروف: ' + expenseCategories
  );
  prompt = prompt.replace(
    /تحويل: مصروفات الزوجة.*$/m,
    'تحويل: ' + transferCategories
  );
  prompt = prompt.replace(
    /عهدة: قسط جمعية.*$/m,
    'عهدة: ' + custodyCategories
  );

  return prompt;
}

/**
 * Parse user message using Gemini AI
 * @param {string} userMessage - The message from user
 * @param {string} userName - The user's name
 * @returns {Object} Parsed transaction data
 */
function parseMessageWithGemini(userMessage, userName) {
  Logger.log('=== parseMessageWithGemini START ===');
  Logger.log('Message: ' + userMessage);
  Logger.log('User: ' + userName);

  try {
    var apiKey = CONFIG.GEMINI_API_KEY;

    // التحقق من وجود مفتاح API
    if (!apiKey || apiKey.length < 10) {
      Logger.log('ERROR: Gemini API Key not configured');
      return {
        success: false,
        نجاح: false,
        message: '❌ مفتاح Gemini API غير مُعد. اتصل بالمسؤول.',
        رسالة: '❌ مفتاح Gemini API غير مُعد. اتصل بالمسؤول.'
      };
    }

    var apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;

    // بناء الـ prompt مع التصنيفات الديناميكية
    var systemPrompt = buildAIPrompt();

    var prompt = systemPrompt + '\n\nالرسالة من المستخدم "' + userName + '":\n"' + userMessage + '"\n\nحلل هذه الرسالة واستخرج المعاملات المالية منها. أرجع JSON فقط بدون أي نص إضافي.';

    var payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048
      }
    };

    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    Logger.log('Calling Gemini API...');
    var response = UrlFetchApp.fetch(apiUrl, options);
    var responseCode = response.getResponseCode();
    Logger.log('Gemini Response Code: ' + responseCode);

    if (responseCode !== 200) {
      Logger.log('Gemini API Error: ' + response.getContentText());
      return {
        success: false,
        نجاح: false,
        message: '❌ خطأ من Gemini API. حاول مرة أخرى.',
        رسالة: '❌ خطأ من Gemini API. حاول مرة أخرى.'
      };
    }

    var result = JSON.parse(response.getContentText());

    // التحقق من وجود الـ candidates
    if (!result.candidates || result.candidates.length === 0) {
      Logger.log('No candidates in response');
      return {
        success: false,
        نجاح: false,
        message: '❌ لم أستطع معالجة الرسالة. جرب صياغة مختلفة.',
        رسالة: '❌ لم أستطع معالجة الرسالة. جرب صياغة مختلفة.'
      };
    }

    var aiResponse = result.candidates[0].content.parts[0].text;
    Logger.log('AI Response: ' + aiResponse.substring(0, 500));

    // Extract JSON from response (in case AI adds extra text)
    var jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      Logger.log('No JSON found in response');
      return {
        success: false,
        نجاح: false,
        message: '❌ لم أفهم الرسالة. جرب:\n• صرفت 100 غداء\n• حولت لسارة 5000 عهدة',
        رسالة: '❌ لم أفهم الرسالة. جرب:\n• صرفت 100 غداء\n• حولت لسارة 5000 عهدة'
      };
    }

    var parsedData = JSON.parse(jsonMatch[0]);
    Logger.log('Parsed data: ' + JSON.stringify(parsedData));
    Logger.log('=== parseMessageWithGemini END ===');
    return parsedData;

  } catch (error) {
    Logger.log('EXCEPTION in parseMessageWithGemini: ' + error.toString());
    Logger.log('Stack: ' + (error.stack || 'no stack'));
    return {
      success: false,
      نجاح: false,
      message: '❌ حدث خطأ غير متوقع:\n' + error.message + '\n\nجرب مرة أخرى.',
      رسالة: '❌ حدث خطأ غير متوقع:\n' + error.message + '\n\nجرب مرة أخرى.'
    };
  }
}

/**
 * Generate smart response for user query
 * @param {string} query - User's question
 * @param {Object} context - Context data (balances, recent transactions, etc.)
 * @returns {string} AI generated response
 */
function generateSmartResponse(query, context) {
  try {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;

    const prompt = `أنت مساعد محاسبي ذكي. المستخدم يسأل عن بياناته المالية.

البيانات المتاحة:
${JSON.stringify(context, null, 2)}

سؤال المستخدم: "${query}"

أجب بشكل مختصر ومفيد باللغة العربية.`;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    return result.candidates[0].content.parts[0].text;

  } catch (error) {
    Logger.log('Error in generateSmartResponse: ' + error.toString());
    return 'عذراً، لم أستطع معالجة السؤال.';
  }
}

/**
 * تصنيف المعاملة باستخدام الذكاء الاصطناعي
 * @param {string} description - وصف المعاملة
 * @param {string} type - نوع المعاملة
 * @returns {string} كود التصنيف
 */
function classifyCategory(description, type) {
  try {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;

    // ⭐ قراءة التصنيفات من الشيت ديناميكياً
    let categories;
    if (type === 'دخل') {
      categories = getCategoryCodesForAI('دخل');
    } else if (type === 'مصروف') {
      categories = getCategoryCodesForAI('مصروف');
    } else if (type === 'تحويل') {
      categories = getCategoryCodesForAI('تحويل');
    } else if (type === 'صرف_من_عهدة' || type === 'إيداع_عهدة') {
      categories = getCategoryCodesForAI('عهدة');
    } else {
      categories = getCategoryCodesForAI('مصروف');
    }

    const prompt = `صنف هذه المعاملة:
الوصف: "${description}"
النوع: ${type}

التصنيفات المتاحة: ${categories}

أرجع كود التصنيف فقط بدون أي نص إضافي.`;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 50
      }
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    return result.candidates[0].content.parts[0].text.trim();

  } catch (error) {
    Logger.log('Error in classifyCategory: ' + error.toString());
    return 'متنوع';
  }
}
