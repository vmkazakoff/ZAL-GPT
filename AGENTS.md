# Convention
- Всегда отвечай на русском, но не переводи термины.
- General description and instructions for assembly and launch are in /readme.md
- Before start - check plan.md or create it with first line "NOT APPROVED"
- If first line in plan.md is "NOT APPROVED" only edit plan.md
- The plan should include all steps and implementation approach:
  - Specific files that will be modified
  - Specific functions that will be changed or added
  - All new items mark as "todo: ..."
- Stop after planing and wait for approve
- If first line in plan.md is "APPROVED" - start coding
- Never do anything that is not in the plan
- Add comments what function shoul do, but NEVER add comments what you chagne like "Update var name form ... to ..."
- Add console logs for debug to trace inputs, internal changes, and outputs during debugging.
- After each step, wait for review and approval before proceeding
- Mark done items in docs/todo.md as "done: ..."

- DRY - do not repeat yourself, if possible - reuse old code
- Maintain readable code without excessive comments
- Do not add obvious comments or comments to lines that were modified
- ALWAYS suggest updating the documentation if there are major changes in functionality

### Technologies
- **HTML5**: Structure and semantic markup
- **Tailwind CSS**: Styling and responsive design
- **Alpine.js**: Client-side logic and interactivity

Строго придерживайся принятого стиля кода:
- никаких отдельных стилей и css файлов, если задача не решается через Tailwind - скажи об этом и остановись до принятия решения
- минимум отдельных js файлов, стараемся все держать в компонентах
- не используй html внутри js
- делай паузы между отдельными частями задачи, чтобы я мог проверить результат
- реализован хот-релоад, не нужно запускать свой сервер, просто скажи, что можно проверять результат
