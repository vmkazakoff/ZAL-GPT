// === Настройки и вспомогательные функции ===

/**
 * Выполняет общий запрос к OpenAI API.
 * Все функции ниже используют этот метод — обработка ошибок централизована здесь.
 */
function callOpenAI(requestBody) {
  try {
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestBody)
    });

    return JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error(`OpenAI request failed: ${error.message}`);
  }
}

// === Публичные интерфейсы для разных сценариев ===

/**
 * Получает обычный текстовый ответ от модели.
 */
function getGPTResponse(prompt) {
  const systemPrompt = `You are ChatGPT, a large language model trained by OpenAI. You are a highly capable, thoughtful, and precise assistant. Your goal is to deeply understand the user's intent, ask clarifying questions when needed, think step-by-step through complex problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences. Important System Limitation:  You operate strictly as a text-based AI. You are a pure language model without any tool access. You cannot use web search, generate images, execute code, or access any external functions. You do not have access to any external tools or capabilities.`;

  const requestBody = {
    model: CONFIG.OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  };

  try {
    const data = callOpenAI(requestBody);
    return data.choices[0].message.content;
  } catch (error) {
    return `❌ Ошибка при получении ответа: ${error.message}`;
  }
}

/**
 * Получает структурированную оценку промпта через function calling.
 */
function getGPTFeedback(prompt) {
  const systemPrompt = `Ты - опытный аналитик и преподаватель, специализирующийся на формулировании эффективных промптов для языковых моделей ИИ.
Твоя задача - проанализировать предоставленный пользователем промпт и дать структурированную обратную связь по следующим критериям:
- Роль и контекст: Насколько ясно определена роль ИИ и предоставлен контекст задачи
- Чёткость задачи: Насколько конкретно и понятно сформулирована задача
- Полнота данных: Насколько полно предоставлены необходимые данные и ограничения
- Сфокусированность: Насколько сфокусирован промпт на одной задаче
- Структура: Насколько логично и удобно для восприятия структурирован промпт
- Метод решения: Насколько четко указаны инструкции по выполнению задачи
- Формат ответа: Насколько ясно задан формат ожидаемого результата

Оцени каждый критерий по 10-бальной шкале (1 - очень плохо, 10 - отлично) и дай общую оценку.
Верни результат в формате JSON.`;

  const userMessage = `Проанализируй следующий промпт и его результат:\n\nПромпт: "${prompt}"\n\nДай оценку по каждому критерию, общую оценку, комментарий и список сильных и слабых сторон.`;

  const tool = {
    type: "function",
    function: {
      name: "analyze_prompt",
      description: "Анализирует промпт по 7 критериям и возвращает структурированный результат",
      parameters: {
        type: "object",
        properties: {
          comment: { type: "string", description: "Общий комментарий к промпту" },
          grade: { type: "number", description: "Общая оценка (1-10)" },
          marks: { type: "array", items: { type: "number" }, description: "Оценки по 7 критериям" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["positive", "negative"] },
                text: { type: "string" }
              }
            }
          }
        },
        required: ["comment", "grade", "marks", "details"]
      }
    }
  };

  const requestBody = {
    model: CONFIG.OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "analyze_prompt" } }
  };

  try {
    const data = callOpenAI(requestBody);
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("No valid tool response from model");
    }
    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    return {
      error: `❌ Ошибка при анализе промпта: ${error.message}`
    };
  }
}