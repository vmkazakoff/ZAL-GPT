NOT APPROVED

- If first line in plan.md is "NOT APPROVED" only edit plan.md
- NEVER change NOT APPROVED status
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
Добавить в приложение функциональность командной работы в чемпионатах. Пользователи могут создавать команды или присоединяться к существующим. Только участники команд могут отправлять решения и видеть результаты. Гости могут просматривать рейтинг и задания, но не могут отправлять решения.

## Этап 1: Создание сущности команды и интерфейса выбора/создания команды
Бэкенд
- [X] В базе данных (гугл таблица) создана вкладка Teams со структурой id (уникальный идентификатор из случайных букв/цифр как userId)	- team (человеческое название) - user (id пользователя) - championship (id чемпионата)
- [ ] Создать файл teams.js
- [ ] Создать функцию `getAvailableTeams(championship)` - возвращает список всех команд в чемпионате
- [ ] Создать функцию `getUserTeam(user, championship)` - возвращает команду пользователя в указанном чемпионате или ничего, если у пользователя нет команды
- [ ] Создать функцию `createTeam(teamId, user, championship)` - создает новую команду и добавляет пользователя
- [ ] Создать функцию `joinTeam(teamId, user, championship)` - добавляет пользователя в существующую команду (или меняет его команду на новую)
- [ ] Создать функцию `exitTeam(teamId, user, championship)` - удаляет пользователя из команды
Store
- [ ] Добавить в store.js новое состояние для хранения информации о команде пользователя:
  - `availableTeams`: массив доступных команд для текущего чемпионата, структура: `{ id: "string", name: "string" }`
  - `currentTeam`: объект с информацией о текущей команде пользователя в текущем чемпионате, структура: `{ id: "string", name: "string" }` или null если нет команды
- [ ] Обновить store.js для получения информации о команде пользователя с бэкэнда при загрузке чемпионата
- [ ] При загрузке чемпионата вызывается loadChampionshipData, и в этой функции нужно будет вызвать дополнительную функцию для получения команды пользователя в этом чемпионате.
Фронтенд
- [ ] Создать новый компонент team-block.html для выбора/создания команды
- [ ] Добавить компонент team-block.html в index.html как новое модальное окно
- [ ] В верхнем меню должна появиться кнопочка с иконкой "команды", где я смогу присоединиться к команде, сменить свою команду или выйти из нее в режим наблюдателя. Иконка видна только в режиме чемпионата.
- [ ] Реализовать функциональность получения списка команд с бэкэнда через getUserTeam и getAvailableTeams
- [ ] Реализовать функциональность создания новой команды через createTeam
- [ ] Реализовать функциональность присоединения к существующей команде через joinTeam
- [ ] Добавить кнопку обновления списка команд без перезагрузки страницы


=== ПОКА НЕ ДЕЛАЕМ ===

- [ ] Создать функцию `getExerciseRatingByTeams(taskId, championship)` - возвращает рейтинг команд по заданию
- [ ] Создать функцию `getDashboardStatsByTeams(championship)` - возвращает статистику выполнения заданий по командам для дашборда
- [ ] Создать функцию `getChampionshipRatingByTeams(championship)` - возвращает общий рейтинг команд по чемпионату

## Этап 2: Интеграция команд с системой рейтинга по заданию

- [ ] Добавить в store.js новое состояние для хранения рейтинга по заданию:
  - `exerciseRatingByTeams`: массив рейтинга команд по текущему заданию, структура: `{ rank: "number", name: "string", score: "number" }`
- [ ] Заменить mock-данные рейтинга по заданию реальными данными через getExerciseRatingByTeams
- [ ] Обновить championship-block.html для отображения рейтинга команд вместо пользователей
- [ ] Обновить компоненты prompt-block.html и feedback-block.html для отображения только при наличии выбранной команды

## Этап 3: Обновление дашборда для отображения командного рейтинга

- [ ] Добавить в store.js новое состояние для хранения данных дашборда:
  - `dashboardStatsByTeams`: объект статистики выполнения заданий командами, структура: `{ taskId: { completedTeamsCount: "number" } }`
  - `championshipRatingByTeams`: массив общего рейтинга команд по чемпионату, структура: `{ rank: "number", name: "string", completedTasks: "number", totalScore: "number" }`
- [ ] Заменить mock-данные дашборда реальными данными через getDashboardStatsByTeams и getChampionshipRatingByTeams
- [ ] Обновить championship-block.html для отображения статистики выполнения заданий по командам
- [ ] Обновить championship-block.html для отображения общего рейтинга команд по чемпионату
- [ ] Обеспечить, чтобы компоненты отправки ответов и обратной связи не отображались на вкладке дашборда
