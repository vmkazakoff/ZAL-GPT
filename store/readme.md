# Структура данных store.js:

```javascript
{
  userId: "string",
  userInfo: { name: "string", company: "string", email: "string", phone: "string" },
  currentTaskId: "string_or_null",    // ID текущего задания
  championshipId: "string_or_null",   // ID текущего чемпионата
  championshipData: {
    description: "string",
    title: "string"
  },
  tasks: {                             // Объект с заданиями, где ключ - id задания
    "taskId1": {                       // Уникальный идентификатор задания
      title: "string",                 // Название задания
      description: "string_html",      // Описание задания в формате HTML
      allowedAttempts: "number",       // Количество разрешенных попыток
      taskNumber: "number",            // Порядковый номер задания (для чемпионатов)
      status: "string",                // Статус задания: "completed", "in_progress", "not_started"
      attemptsCount: "number",         // Количество использованных попыток
      bestScore: "number_or_null",     // Лучшая оценка среди всех попыток
      attempts: {                      // Объект с попытками, где ключ - id попытки (номер попытки)
        "1": {                         // ID попытки (порядковый номер: 1, 2, 3...)
          user_prompt: "string",       // Ввод пользователя
          ai_response: "string",       // Ответ ИИ (если доступен)
          status: "string",            // Статус попытки: "sent" (успешно отправлена на сервер) или "unsent" (новая попытка)
          feedback: {
            ai_response: "string",     // Ответ ИИ на запрос
            ai_comment: "string",      // Комментарий ИИ
            ai_grade: "number",        // Общая оценка ИИ (0-100)
            ai_criteria: {             // Отдельные оценки по критериям - число и описание
              role: { score: "number", comment: "string" },
              clarity: { score: "number", comment: "string" },
              completeness: { score: "number", comment: "string" },
              focus: { score: "number", comment: "string" },
              structure: { score: "number", comment: "string" },
              method: { score: "number", comment: "string" },
              format: { score: "number", comment: "string" }
            }
          }
        },
        "2": {...}
      },
      currentAttemptId: "number"       // ID текущей активной попытки (-1 если нет активной)
    },
    "taskId2": {...}
  },
  loadingStates: {task: false, championship: false}, // Если есть что-то, что еще загружается, то висит прелоадер
  modals: { auth: false, qr: false } // Открыты/закрыты модальные окна
}
```


# Backend (Google Apps Script) responses:

getPractice(id, userId) возвращает:
```javascript
{
  task: {
    id: "string",
    title: "string", 
    description: "string_html",
    allowedAttempts: "number",
  },
  completions: [
    {
      user_prompt: "string",
      feedback: {
        ai_response: "string",
        ai_comment: "string", 
        ai_grade: "number",
        ai_criteria: {
          role: { score: "number", comment: "string" },
          clarity: { score: "number", comment: "string" },
          completeness: { score: "number", comment: "string" },
          focus: { score: "number", comment: "string" },
          structure: { score: "number", comment: "string" },
          method: { score: "number", comment: "string" },
          format: { score: "number", comment: "string" }
        }
      }
    }
  ],
  userInfo: {
    name: "string",
    company: "string",
    email: "string", 
    phone: "string"
  }
}
```

submitPrompt возвращает:
```javascript
{
  feedback: {
    ai_response: "string",
    ai_comment: "string",
    ai_grade: "number", 
    ai_criteria: {
      role: { score: "number", comment: "string" },
      clarity: { score: "number", comment: "string" },
      completeness: { score: "number", comment: "string" },
      focus: { score: "number", comment: "string" },
      structure: { score: "number", comment: "string" },
      method: { score: "number", comment: "string" },
      format: { score: "number", comment: "string" }
    }
  }
}
```

getChampionship(championshipId, userId) возвращает:
```javascript
{
  championship: {
    id: "string",
    title: "string",
    description: "string"
  },
  tasks: [
    {
      taskId: "string", // в getPractice() это просто id
      title: "string",
      description: "string",
      // полей ниже нет в getPractice()
      taskNumber: "number",
      status: "string", // "completed" или "not_started"
      attemptsCount: "number",
      bestScore: "number_or_null"
    }
  ]
}
```
