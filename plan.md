NOT APPROVED

- If first line in plan.md is "NOT APPROVED" only edit plan.md
- NEVER change NOT APPROVED status

APPROVED
- The plan should include all steps and implementation approach:
  - Specific files that will be modified
  - Specific functions that will be changed or added
  - All new items mark as "- [ ] ..."
- Stop after planing and wait for approve
- If first line in plan.md is "APPROVED" - start coding
- Never do anything that is not in the plan
- After each step, wait for review and approval before proceeding
- Mark done items in docs/todo.md as "- [X] ..."

# Задача:
Оптимизировать то, как выгружаются сейчас данные в Дашборде из Гугла. Они грузятся очень долго.
Сбрасывать рейтинг по упражнению, когда переключаемся между ними.
отступ в режиме чемпионата сверху оч большой
проблема с попытками, а не заданиями в рейтинге команд

---

# Задача: Анимированный текст ожидания ответа ИИ

## Цель
Добавить анимированный текст ожидания во время загрузки ответа ИИ для скрашивания ожидания пользователя.

## Реализация

### 1. `store/store.js`
- [x] Добавить `isSubmitting: false` в объект состояния Alpine.store("app") (рядом с `modals` или `loadingStates`)
- [x] В функции `submitPrompt` установить `this.isSubmitting = true` перед запросом
- [x] В функции `submitPrompt` добавить `this.isSubmitting = false` в блок `finally`

### 2. `components/prompt-block.html`
- [x] Убрать локальный `isSubmitting: false` из `x-data` (заменить на `x-data="{}"`)
- [x] В `@click` кнопки отправки убрать ручное управление `isSubmitting` (стор теперь сам управляет)
- [x] Заменить все обращения `isSubmitting` на `$store.app.isSubmitting`:
  - В `:disabled` кнопки submit
  - В `x-show` спиннера загрузки

### 3. `components/feedback-block.html`
- [x] Добавить новый блок для состояния загрузки ИИ (перед существующим placeholder):
  - `x-data` с массивом фраз, счетчиками и интервалами (ровно в том месте, где используется)
  - Логика: случайная стартовая фраза, смена каждые 5 секунд, анимация точек (0→1→2→3→0 каждые 300мс)
  - `x-show="$store.app.isSubmitting"`
  - Визуал: иконка робота с pulse-анимацией, текст фразы + точки, bounce-анимация трёх точек внизу
- [x] Обновить существующий placeholder:
  - Добавить условие `x-show="!$store.app.isSubmitting && !$store.app.tasks[...]?.feedback"`

## Технические детали
- Фразы: 8 штук (пользователь впишет свои потом)
- Анимация точек: 300мс на смену, цикл 0→1→2→3→0
- Очистка интервалов: Alpine.js автоматически через destroy()
- CSS: `[x-cloak]` не требуется (используем `x-show`)

---
