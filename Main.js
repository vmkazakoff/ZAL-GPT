// --- Получение задания ---

function getPractice(id) {
  const headers = getHeaders(tasks);
  const [idIdx, titleIdx, taskIdx] = ['id', 'title', 'task'].map(h => headers.indexOf(h));
  if (idIdx === -1) return errorResponse("Config error: 'id' header missing");

  const data = tasks.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === id) {
      return okResponse({
        task: {
          id,
          title: data[i][titleIdx] || "Без названия",
          description: data[i][taskIdx] || "Нет описания"
        }
      });
    }
  }
  return errorResponse("Not found", 404);
}

// --- Сохранение пользователя ---

function saveUser({ userId, userInfo }) {
  if (!userId || !userInfo) return errorResponse("Missing userId or userInfo");
  
  const headers = getHeaders(users);
  const idIdx = headers.indexOf('id');
  if (idIdx === -1) return errorResponse("Config error: 'id' header missing");

  const data = users.getDataRange().getValues();
  const row = data.findIndex(r => r[idIdx] === userId);
  
  const now = new Date();
  const rowData = [userId, userInfo.name || "", userInfo.company || "", userInfo.email || "", userInfo.phone || ""];
  
  if (row > 0) users.getRange(row + 1, 1, 1, rowData.length).setValues([rowData]);
  else users.appendRow(rowData);

  return okResponse({ message: "Информация сохранена" });
}

// --- Получение промпта ---

function submitPrompt({ taskId, userId, userPrompt }) {
  if (!taskId || !userId || !userPrompt) return errorResponse("Missing required fields");
  
  const headers = getHeaders(completions);
  const colMap = { ts: 'timestamp', uid: 'user_id', tid: 'task_id', prompt: 'user_prompt', response: 'ai_response', comment: 'ai_comment', strengths: 'ai_strengths', weaknesses: 'ai_weakness', grade: 'ai_grade' };
  const indices = Object.fromEntries(Object.entries(colMap).map(([key, header]) => [key, headers.indexOf(header)]));
  if (indices.ts === -1 || indices.uid === -1 || indices.tid === -1 || indices.prompt === -1) return errorResponse("Config error: Missing required headers");

  const aiFeedback = getOpenAIFeedback(userPrompt);

  const now = new Date();
  const row = new Array(headers.length).fill("");
  Object.entries(indices).forEach(([key, idx]) => {
    if (idx !== -1) row[idx] = {
      ts: now, uid: userId, tid: taskId, prompt: userPrompt, response: aiFeedback.response, comment: aiFeedback.comment, grade: aiFeedback.grade
    }[key] || row[idx];
  });
  completions.appendRow(row);

  return okResponse({
    feedback: {
      ai_response: aiFeedback.response,
      ai_comment: aiFeedback.comment,
      ai_grade: aiFeedback.grade,
      ai_marks: aiFeedback.marks,
      ai_feedback: aiFeedback.details,
    }
  });
}

// --- Оценка промпта ---
function getOpenAIFeedback(prompt) {

  const response = getGPTResponse(prompt);
  const feedback = getGPTFeedback(prompt);
  
  const comment = feedback.comment || "Не смогли получить оценку"
  const grade = feedback.grade || 0;
  const marks = feedback.marks || [1, 1, 1, 1, 1, 1, 1];
  const details = feedback.details || [];

  return { response, comment, grade, marks, details };
}

