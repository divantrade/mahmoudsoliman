/**
 * =====================================================
 * نظام محمود المحاسبي - Gemini AI Integration
 * =====================================================
 */

/**
 * Parse user message using Gemini AI
 * @param {string} userMessage - The message from user
 * @param {string} userName - The user's name
 * @returns {Object} Parsed transaction data
 */
function parseMessageWithGemini(userMessage, userName) {
  try {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const apiUrl = CONFIG.GEMINI_API_URL + '?key=' + apiKey;

    const prompt = `${AI_SYSTEM_PROMPT}

الرسالة من المستخدم "${userName}":
"${userMessage}"

حلل هذه الرسالة واستخرج المعاملات المالية منها. أرجع JSON فقط بدون أي نص إضافي.`;

    const payload = {
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

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      Logger.log('Gemini API Error: ' + response.getContentText());
      return {
        success: false,
        message: 'عذراً، حدث خطأ في معالجة الرسالة. حاول مرة أخرى.'
      };
    }

    const result = JSON.parse(response.getContentText());
    const aiResponse = result.candidates[0].content.parts[0].text;

    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        message: 'لم أستطع فهم الرسالة. حاول كتابتها بشكل مختلف.'
      };
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return parsedData;

  } catch (error) {
    Logger.log('Error in parseMessageWithGemini: ' + error.toString());
    return {
      success: false,
      message: 'حدث خطأ: ' + error.message
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

    let categories;
    if (type === 'دخل') {
      categories = DEFAULT_CATEGORIES.دخل.map(c => c.كود).join('، ');
    } else if (type === 'مصروف') {
      categories = DEFAULT_CATEGORIES.مصروف.map(c => c.كود).join('، ');
    } else if (type === 'تحويل') {
      categories = DEFAULT_CATEGORIES.تحويل.map(c => c.كود).join('، ');
    } else if (type === 'صرف_من_عهدة' || type === 'إيداع_عهدة') {
      categories = DEFAULT_CATEGORIES.عهدة.map(c => c.كود).join('، ');
    } else {
      categories = DEFAULT_CATEGORIES.مصروف.map(c => c.كود).join('، ');
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
