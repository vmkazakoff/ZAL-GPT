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
БД
- [X] В базе данных (гугл таблица) создана вкладка Teams со структурой 
  - id (уникальный идентификатор из случайных букв/цифр как userId)	
  - team (человеческое название)
  - user (id пользователя)
  - championship (id чемпионата)
Бэкенд - файл teams.js
- [X] Добавили функцию `getAvailableTeams(championship)` - возвращает список всех команд в чемпионате
- [X] Добавили функцию `getUserTeam(user, championship)` - возвращает команду пользователя в указанном чемпионате или ничего, если у пользователя нет команды
- [X] Добавили функцию `createTeam(teamId, user, championship)` - создает новую команду и добавляет пользователя
- [X] Добавили функцию `joinTeam(teamId, user, championship)` - добавляет пользователя в существующую команду (или меняет его команду на новую)
- [X] Добавили функцию `exitTeam(teamId, user, championship)` - удаляет пользователя из команды
Store
- [X] Добавили в store.js новое состояние для хранения информации о команде пользователя:
  - `availableTeams`: массив доступных команд для текущего чемпионата, структура: `{ id: "string", name: "string" }`
  - `currentTeam`: объект с информацией о текущей команде пользователя в текущем чемпионате, структура: `{ id: "string", name: "string" }` или null если нет команды


## Этап 2: Получение данных для дашборда и рейтинга

### 
- [ ] Добавить новые состояния в Alpine store:
  - `exerciseRatingByTeams`: массив рейтинга команд по текущему заданию, структура: `{ rank: "number", name: "string", score: "number" }`
  - `dashboardStatsByTeams`: объект статистики выполнения заданий командами, структура: `{ taskId: { completedTeamsCount: "number" } }`
  - `championshipRatingByTeams`: массив общего рейтинга команд по чемпионату, структура: `{ rank: "number", name: "string", completedTasks: "number", totalScore: "number" }`
- [ ] создать на базе этих данных мок (наполнить данными сразу) в сторе, который заменит текущую структуру из файла championship-block.html
- [ ] Заменить `getMockExerciseRating()`  `getMockChampionshipRating()`  `getTaskAttemptsCount()` на использование `$store.app....`
- [ ] ПАУЗА ДЛЯ ПРОВЕРКИ, фронт визуально не должен поменяться


### Бэкенд

backend/dashboard.js (новый файл)
- [ ] Создать функции
  - `getExerciseRatingByTeams(championshipId, taskId) { 
      rank: "number", 
      name: "string", 
      score: "number" 
    }`
  - `getChampionshipDashboardData(championshipId) { 
      championshipRatingByTeams: {
        rank: "number", 
        name: "string", 
        completedTasks: "number", 
        totalScore: "number" 
      },
      dashboardStatsByTeams: {
        taskId: { 
          completedTeamsCount: "number" 
      }
    }`

backend/utils.js
- [ ] Добавить вызов `getExerciseRatingByTeams` в doGet() с параметром action="getExerciseRatingByTeams"
- [ ] Добавить вызов `getChampionshipDashboardData` в doGet() с параметром action="getChampionshipDashboardData"
- [ ] ПАУЗА ДЛЯ ПРОВЕРКИ, подготовить fetch для проверки из браузера



- [ ] Добавить методы для загрузки данных в стор:
  - `loadExerciseRatingByTeams(taskId)` - загружает рейтинг команд по заданию
  - `loadChampionshipDashboardData()` - загружает общий рейтинг команд чемпионата и статистику выполнения заданий
