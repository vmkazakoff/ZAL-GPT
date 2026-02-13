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
    },

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
    },

    async loadUserInfo() {
      try {
        const response = await fetch(`${this.BACKEND_URL}?action=getUserInfo&user=${encodeURIComponent(this.userId)}`);
        const data = await response.json();
        if (response.ok && data.success) {
          this.userInfo = data;
        }
      } catch (error) {
        console.error("Network error loading user info:", error);
        this.userInfo = { name: "", company: "", email: "", phone: "" };
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
          const firstUncompletedTaskId = Object.keys(this.tasks).find(
            (taskId) => this.tasks[taskId].status !== "completed",
          );

          this.currentTaskId = firstUncompletedTaskId || Object.keys(this.tasks)[0];
          this.loadTaskData(this.currentTaskId);
          return;
        }
      } catch (error) {
        console.error("Error loading championship:", error);
        return;
      } finally {
        this.loadingStates["championship"] = false;
      }
    },

    // заменить id на taskId
    async loadTaskData(id) {
      this.currentTaskId = id;
      this.loadingStates["task"] = true;
      try {
        // Use the new endpoint that returns data in the unified structure
        const response = await fetch(
          `${this.BACKEND_URL}?action=getTaskWithAttempts&practice=${encodeURIComponent(id)}&user=${encodeURIComponent(this.userId)}`,
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
          if (this.tasks[id]) {
            const existingTask = this.tasks[id];
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
            [id]: newTask,
          };

          // Update currentTaskId if not already set
          if (!this.currentTaskId) {
            this.currentTaskId = id;
          }
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
  });
});
