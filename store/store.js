/*
Общий глобальный стейт всего приложения.

В этом файле хранится только:
- состяние и данные, полученные с бэкенда
- функции для связи с бэкендом

Никогда и ни при каких обстоятельствах в этом файле нельзя делать:
- вспомогательные функции которые нужны внутри компонента
- функции которые помогают компонентам менять данные в сторе - они могут и должны делать это напрямую через $store.app...= ...

Структуру стейта и шаблон ответов с бэкенад в store/readme.md

*/

document.addEventListener("alpine:init", () => {
  window.marked = marked;

  Alpine.store("app", {
    BACKEND_URL:
      "https://script.google.com/macros/s/AKfycbzJEnhim0Ek2UsYZxxSy5cLhHiI91uoRo4SgOLiuMSMoPzhq5aRO5E15OeBg9cwP9qDeg/exec",

    // Данные пользователя
    // Если userId не найден ни в URL (user), ни в localStorage, то сразу генерируется новый идентификатор с помощью самовызывающейся функции.
    userId:
      new URLSearchParams(window.location.search).get("user") ||
      localStorage.getItem("userId") ||
      (() => {
        return Array.from(
          { length: 16 },
          () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)],
        ).join("");
      })(),
    userInfo: {},

    // Режим работы приложения
    mode: "championship", // 'championship' или 'stack'

    // Данные о чемпионате
    championshipId: null,
    championshipData: null,

    // Данные о заданиях и попытках
    currentTaskId: null,
    tasks: {},

    // Состояние загрузки
    loadingStates: {},

    // Состояние модальных окон
    modals: {
      auth: false,
      qr: false,
      team: false,
    },

    // Состояние вкладок
    activeTab: "tasks",

    // Данные о командах
    availableTeams: [], // Массив доступных команд для текущего чемпионата, структура: { id: "string", name: "string" }
    currentTeam: { id: "", name: "" }, // Объект с информацией о текущей команде пользователя в текущем чемпионате, структура: { id: "string", name: "string" } или null если нет команды

    // Данные для рейтингов и дашборда
    exerciseRatingByTeams: [], // Массив рейтинга команд по текущему заданию, структура: { rank: "number", name: "string", score: "number" }
    dashboardStatsByTeams: {}, // Объект статистики выполнения заданий командами, структура: { taskId: { completedTeamsCount: "number" } }
    championshipRatingByTeams: [], // Массив общего рейтинга команд по чемпионату, структура: { rank: "number", name: "string", completedTasks: "number", totalScore: "number" }

    // Индикаторы загрузки
    loadingExerciseRating: false,
    loadingDashboardData: false,

    init() {
      // Initialize from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      this.currentTaskId = urlParams.get("practice"); // Changed from this.taskId
      this.championshipId = urlParams.get("championship");

      // Determine mode based on URL parameters
      // Stack mode is championship without tabs, header, and rating
      if (urlParams.get("stack")) {
        this.mode = "stack";
        // For stack mode, we'll still load championship data but display differently
        this.championshipId = urlParams.get("stack"); // Use stack param as championshipId for loading
      } else if (this.championshipId) {
        this.mode = "championship";
      } else {
        this.mode = "championship";
      }

      // Загружаем данные о юзере и обновляем локалсторадж, даже если там уже был userId
      if (this.userId) {
        localStorage.setItem("userId", this.userId);
        this.loadUserInfo();
      }

      // Load championship data if championshipId exists
      if (this.championshipId) {
        this.loadChampionshipData();
      }

      // Load task data if currentTaskId exists
      if (this.currentTaskId) {
        this.loadTaskData(this.currentTaskId);
      }

      // Initialize mock data for ratings and dashboard (for testing purposes)
      this.initializeMockData();
    },

    async loadUserInfo() {
      const response = await fetch(`${this.BACKEND_URL}?action=getUserInfo&user=${encodeURIComponent(this.userId)}`);
      const data = await response.json();
      if (response.ok && data.success) {
        this.userInfo = data;
      }
    },

    // Initialize mock data for testing (only if no real data is expected)
    initializeMockData() {
      // Only initialize mock data if we're not expecting to load real data later
      // This can be used for testing without backend connection
      if (!this.championshipId) {
        // Mock data for exercise rating by teams
        this.exerciseRatingByTeams = [
          { rank: 1, name: "Компания A", score: 9.8 },
          { rank: 2, name: "Компания B", score: 9.5 },
          { rank: 3, name: "Компания C", score: 9.2 },
          { rank: 4, name: "Компания A", score: 8.9 },
          { rank: 5, name: "Компания D", score: 8.7 },
        ];

        // Mock data for dashboard stats by teams
        this.dashboardStatsByTeams = {
          demo1: { completedTeamsCount: 5 },
          demo2: { completedTeamsCount: 3 },
          demo3: { completedTeamsCount: 7 },
          demo4: { completedTeamsCount: 5 },
          demo5: { completedTeamsCount: 3 },
        };

        // Mock data for championship rating by teams
        this.championshipRatingByTeams = [
          { rank: 1, name: "Компания A", completedTasks: 12, totalScore: 1112.3 },
          { rank: 2, name: "Компания B", completedTasks: 12, totalScore: 109.7 },
          { rank: 3, name: "Компания C", completedTasks: 12, totalScore: 107.2 },
          { rank: 4, name: "Компания A", completedTasks: 11, totalScore: 98.5 },
          { rank: 5, name: "Компания D", completedTasks: 10, totalScore: 89.2 },
          { rank: 6, name: "Компания E", completedTasks: 9, totalScore: 82.1 },
          { rank: 7, name: "Компания F", completedTasks: 8, totalScore: 76.8 },
        ];
      }
    },

    // Load exercise rating by teams for the current task
    async loadExerciseRatingByTeams(taskId) {
      if (!this.championshipId || !taskId) return;

      this.loadingExerciseRating = true;

      console.log("Calling getExerciseRatingByTeams with championship:", this.championshipId, "and task:", taskId);
      const url = `${this.BACKEND_URL}?action=getExerciseRatingByTeams&championship=${encodeURIComponent(this.championshipId)}&practice=${encodeURIComponent(taskId)}`;
      console.log("Request URL:", url);

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.success) {
          console.log("Raw data:", data);
          console.log("Object.keys(data):", Object.keys(data));
          console.log(
            "Keys that pass filter:",
            Object.keys(data).filter((key) => !isNaN(key)),
          );

          // Extract the ratings from the response (since spread operator flattens arrays into indexed properties)
          this.exerciseRatingByTeams = Object.keys(data)
            .filter((key) => !isNaN(key)) // Only numeric keys (from array elements)
            .map((key) => data[key])
            .sort((a, b) => a.rank - b.rank); // Sort by rank

          console.log("Final exerciseRatingByTeams:", this.exerciseRatingByTeams);
        } else {
          console.error("Error loading exercise rating by teams:", data.error);
          // Fallback to empty array
          this.exerciseRatingByTeams = [];
        }
      } catch (error) {
        console.error("Network error loading exercise rating by teams:", error);
        this.exerciseRatingByTeams = [];
      } finally {
        this.loadingExerciseRating = false;
      }
    },

    // Load championship dashboard data (overall ratings and task stats)
    async loadChampionshipDashboardData() {
      if (!this.championshipId) return;

      this.loadingDashboardData = true;

      try {
        const response = await fetch(
          `${this.BACKEND_URL}?action=getChampionshipDashboardData&championship=${encodeURIComponent(this.championshipId)}`,
        );
        const data = await response.json();

        if (response.ok && data.success) {
          this.championshipRatingByTeams = data.championshipRatingByTeams || [];
          this.dashboardStatsByTeams = data.dashboardStatsByTeams || {};
        } else {
          console.error("Error loading championship dashboard data:", data.error);
          // Fallback to empty values
          this.championshipRatingByTeams = [];
          this.dashboardStatsByTeams = {};
        }
      } catch (error) {
        console.error("Network error loading championship dashboard data:", error);
        this.championshipRatingByTeams = [];
        this.dashboardStatsByTeams = {};
      } finally {
        this.loadingDashboardData = false;
      }
    },

    async loadChampionshipData() {
      this.loadingStates["championship"] = true;
      try {
        const response = await fetch(
          `${this.BACKEND_URL}?action=getChampionshipWithTasks&championship=${encodeURIComponent(this.championshipId)}&user=${encodeURIComponent(this.userId)}`,
        );
        const data = await response.json();

        if (response.ok && data.success) {
          this.championshipData = data.championship;
          this.tasks = data.tasks;
          const firstUncompletedTaskId = Object.keys(this.tasks).find(
            (taskId) => this.tasks[taskId].status !== "completed",
          );

          this.currentTaskId = firstUncompletedTaskId || Object.keys(this.tasks)[0];
          this.loadTaskData(this.currentTaskId);

          // Load team information after championship data is loaded (only in championship mode)
          if (this.mode === "championship") {
            await this.loadCurrentTeam();
            await this.loadAvailableTeams();
            // Don't load dashboard data initially - load on demand
          }

          return;
        }
      } catch (error) {
        console.error("Error loading championship:", error);
        return;
      } finally {
        this.loadingStates["championship"] = false;
      }
    },

    // проверить что нет излишней логики
    async loadTaskData(taskId) {
      this.currentTaskId = taskId;
      this.loadingStates["task"] = true;
      try {
        const response = await fetch(
          `${this.BACKEND_URL}?action=getTaskWithAttempts&practice=${encodeURIComponent(taskId)}&user=${encodeURIComponent(this.userId)}`,
        );
        const data = await response.json();

        if (response.ok && data.success) {
          const taskData = data.task;

          const newTask = {
            title: taskData.title,
            description: taskData.description,
            allowedAttempts: taskData.allowedAttempts,
            taskNumber: taskData.taskNumber || undefined,
            status: taskData.status || "not_started",
            attemptsCount: taskData.attemptsCount || 0,
            bestScore: taskData.bestScore,
            attempts: taskData.attempts || {},
            currentAttemptId: taskData.currentAttemptId || -1,
          };

          // If this task already exists in our store, merge the data to preserve championship-specific properties
          if (this.tasks[taskId]) {
            const existingTask = this.tasks[taskId];
            // Preserve championship-specific properties that might not be in practice data
            if (existingTask.hasOwnProperty("taskNumber") && newTask.taskNumber === undefined) {
              newTask.taskNumber = existingTask.taskNumber;
            }
            if (existingTask.hasOwnProperty("status")) {
              newTask.status = existingTask.status;
            }
            if (existingTask.hasOwnProperty("bestScore") && newTask.bestScore === null) {
              newTask.bestScore = existingTask.bestScore;
            }
            if (existingTask.hasOwnProperty("attemptsCount") && newTask.attemptsCount === 0) {
              newTask.attemptsCount = existingTask.attemptsCount;
            }

            // When reloading task data, we want to merge attempts from both sources
            // Preserve existing attempts if newTask has empty attempts
            if (Object.keys(newTask.attempts).length === 0 && Object.keys(existingTask.attempts).length > 0) {
              newTask.attempts = existingTask.attempts;
            } else if (Object.keys(existingTask.attempts).length > 0) {
              // Merge attempts, prioritizing new data but keeping any existing attempts not in the new data
              newTask.attempts = {
                ...existingTask.attempts,
                ...newTask.attempts,
              };
            }

            // Preserve the current attempt ID from existing task if the new one is invalid
            if (
              (newTask.currentAttemptId === -1 ||
                newTask.currentAttemptId === undefined ||
                newTask.currentAttemptId === null) &&
              existingTask.currentAttemptId !== -1
            ) {
              newTask.currentAttemptId = existingTask.currentAttemptId;
            }
          }

          // Add the task to our tasks object using the ID as key
          this.tasks = {
            ...this.tasks,
            [taskId]: newTask,
          };

          // Update currentTaskId if not already set
          if (!this.currentTaskId) {
            this.currentTaskId = taskId;
          }

          // Don't load exercise rating here - load on demand when needed
        } else {
          console.error("Error loading task:", data.error);
        }
      } catch (error) {
        console.error("Network error loading task:", error);
      } finally {
        this.loadingStates["task"] = false;
      }
    },

    async submitPrompt(prompt) {
      try {
        const response = await fetch(this.BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "submitPrompt",
            taskId: this.currentTaskId,
            userId: this.userId,
            userPrompt: prompt,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const currentTask = this.tasks[this.currentTaskId];
          const newAttemptId = currentTask.currentAttemptId;

          // Создаем обновленную версию задачи
          const updatedTask = {
            ...currentTask,
            attempts: {
              ...currentTask.attempts,
              [currentTask.currentAttemptId]: {
                user_prompt: prompt,
                ai_response: data.feedback?.ai_response || "",
                status: "sent",
                feedback: data.feedback,
              },
            },
            attemptsCount: currentTask.attemptsCount + 1,
            status: "completed",
          };

          // Update the best score if this attempt has a better score
          if (currentTask.bestScore === null || data.feedback.ai_grade > currentTask.bestScore) {
            updatedTask.bestScore = data.feedback.ai_grade;
          }

          this.tasks[this.currentTaskId] = updatedTask;

          return data;
        }
      } catch (error) {
        console.error("Network error:", error);
        throw error;
      }
    },

    // Load user's team for the current championship
    async loadCurrentTeam() {
      if (!this.championshipId) return;

      try {
        const response = await fetch(
          `${this.BACKEND_URL}?action=getTeamByUser&user=${encodeURIComponent(this.userId)}&championship=${encodeURIComponent(this.championshipId)}`,
        );
        const data = await response.json();

        if (response.ok && data.success) {
          this.currentTeam = data.team;
        } else {
          console.error("Error loading user's team:", data.error);
          this.currentTeam = null;
        }
      } catch (error) {
        console.error("Network error loading user's team:", error);
        this.currentTeam = null;
      }
    },

    // Load available teams for the current championship
    async loadAvailableTeams() {
      if (!this.championshipId) return;

      try {
        const response = await fetch(
          `${this.BACKEND_URL}?action=getTeamsForChampionship&championship=${encodeURIComponent(this.championshipId)}`,
        );
        const data = await response.json();

        if (response.ok && data.success) {
          this.availableTeams = data.teams;
        } else {
          console.error("Error loading available teams:", data.error);
          this.availableTeams = [];
        }
      } catch (error) {
        console.error("Network error loading available teams:", error);
        this.availableTeams = [];
      }
    },

    // Create a new team
    async createTeam(teamName) {
      if (!this.championshipId) return;

      try {
        const response = await fetch(this.BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "createNewTeam",
            teamName: teamName,
            user: this.userId,
            championship: this.championshipId,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update current team and refresh available teams
          this.currentTeam = data.team;
          await this.loadAvailableTeams();
          return data;
        } else {
          console.error("Error creating team:", data.error);
          throw new Error(data.error || "Failed to create team");
        }
      } catch (error) {
        console.error("Network error creating team:", error);
        throw error;
      }
    },

    // Join an existing team
    async joinTeam(teamId) {
      if (!this.championshipId) return;

      try {
        const response = await fetch(this.BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "joinExistingTeam",
            teamId: teamId,
            user: this.userId,
            championship: this.championshipId,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update current team and refresh available teams
          this.currentTeam = data.team;
          await this.loadAvailableTeams();
          return data;
        } else {
          console.error("Error joining team:", data.error);
          throw new Error(data.error || "Failed to join team");
        }
      } catch (error) {
        console.error("Network error joining team:", error);
        throw error;
      }
    },

    // Leave current team
    async leaveTeam() {
      if (!this.championshipId || !this.currentTeam) return;

      try {
        const response = await fetch(this.BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "leaveTeam",
            teamId: this.currentTeam.id,
            user: this.userId,
            championship: this.championshipId,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Clear current team and refresh available teams
          this.currentTeam = null;
          await this.loadAvailableTeams();
          return data;
        } else {
          console.error("Error leaving team:", data.error);
          throw new Error(data.error || "Failed to leave team");
        }
      } catch (error) {
        console.error("Network error leaving team:", error);
        throw error;
      }
    },

    // Rename current team
    async renameTeam(newName) {
      if (!this.championshipId || !this.currentTeam) return;

      try {
        const response = await fetch(this.BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "renameTeam",
            teamId: this.currentTeam.id,
            newName: newName,
            user: this.userId,
            championship: this.championshipId,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update current team name and refresh available teams
          this.currentTeam.name = newName;
          await this.loadAvailableTeams();
          return data;
        } else {
          console.error("Error renaming team:", data.error);
          throw new Error(data.error || "Failed to rename team");
        }
      } catch (error) {
        console.error("Network error renaming team:", error);
        throw error;
      }
    },
  });
});
