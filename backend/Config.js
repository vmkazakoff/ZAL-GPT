// --- Конфигурация ---
const CONFIG = {
  SPREADSHEET_ID: '1ilpNE42jL0rUv5i7d2n1-Vt7iyJfzPz1WGANdxtUgyw',
  SHEETS: {
    TASKS: 'Practice',
    COMPLETIONS: 'Completions',
    USERS: 'Users',
    TEST: 'TEST'
  },
  OPENAI_API_KEY: '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',
  OPENAI_MODEL: 'gpt-4o-mini'
};

// --- Глобальные переменные ---
let ss, tasks, completions, users;

// --- Инициализация ---
function init() {
  if (!ss) {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    tasks = ss.getSheetByName(CONFIG.SHEETS.TASKS);
    completions = ss.getSheetByName(CONFIG.SHEETS.COMPLETIONS);
    users = ss.getSheetByName(CONFIG.SHEETS.USERS);
  }
}