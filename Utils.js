// --- Заголовки страницы ---

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// --- Обработка запросов ---

function doGet(e) {
  init();
  const { action, practice: practiceId } = e.parameter;
  return action === 'getPractice' && practiceId ? getPractice(practiceId) : errorResponse("Invalid request");
}

function doPost(e) {
  init();
  let data;
  try {
    data = JSON.parse(e.postData.getDataAsString());
  } catch (err) { return errorResponse("Invalid JSON"); }
  
  const { action } = data;
  if (action === 'submitPrompt') return submitPrompt(data);
  if (action === 'saveUser') return saveUser(data);
  return errorResponse("Invalid action");
}

// --- Отправка ответов ---

function okResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, ...data })).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg, code = 400) {
  const output = ContentService.createTextOutput(JSON.stringify({ success: false, error: msg })).setMimeType(ContentService.MimeType.JSON);
  if (code === 404) output.setReturnCode(404);
  return output;
}