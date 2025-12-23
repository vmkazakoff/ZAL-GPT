// --- Constants ---
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzJEnhim0Ek2UsYZxxSy5cLhHiI91uoRo4SgOLiuMSMoPzhq5aRO5E15OeBg9cwP9qDeg/exec';

// --- URL Parameter Handling ---
const urlParams = new URLSearchParams(window.location.search);
let taskId = urlParams.get('practice'); // Changed from 'task' to 'practice' as per description, now let instead of const
const championshipId = urlParams.get('championship');
const userIdFromUrl = urlParams.get('user');

// Use user ID from URL if provided
if (userIdFromUrl) {
    localStorage.setItem('userId', userIdFromUrl);
}

// --- User Session Management ---
function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 3 === 0 && i < 8) result += '-';
    }
    return result;
}

// Initialize user ID if not exists
if (!localStorage.getItem('userId')) {
    localStorage.setItem('userId', generateUserId());
}

// Initialize user info if not exists
if (!localStorage.getItem('userInfo')) {
    localStorage.setItem('userInfo', JSON.stringify({
        name: '',
        company: '',
        email: '',
        phone: ''
    }));
}

// --- Global State ---
let attempts = [];
let currentAttemptIndex = -1;
let currentActiveTaskId = taskId; // Track the currently active task

// --- Update Active Task Highlighting ---
function updateActiveTaskHighlight(taskId) {
    currentActiveTaskId = taskId;

    // Remove active state from all tasks
    const allTaskElements = document.querySelectorAll('.championship-task-item');
    allTaskElements.forEach(element => {
        element.classList.remove('bg-slate-100');
        element.classList.add('opacity-60');
    });

    // Add active state to the specified task
    if (taskId) {
        const activeTaskElement = document.querySelector(`.championship-task-item[data-task-id="${taskId}"]`);
        if (activeTaskElement) {
            activeTaskElement.classList.add('bg-slate-100');
            activeTaskElement.classList.remove('opacity-60');
        }
    }
}

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Championship mode detection
    if (championshipId) {
        loadChampionshipTasks(championshipId, userId, true);
    }

    // Check for task ID
    if (taskId) {
        // Load task data from backend
        loadTaskData(taskId, userId);
    } else if (!championshipId) {
        // Only show error if neither championship nor task is specified
        document.getElementById('errorSection').classList.remove('hidden');
        return; // Stop further execution if no task ID and no championship
    }
});

async function loadTaskData(id, userId) {
    showLoading('task');
    try {
        const response = await fetch(`${BACKEND_URL}?action=getPractice&practice=${encodeURIComponent(id)}&user=${encodeURIComponent(userId)}`);
        const data = await response.json();

        if (response.ok && data.success) {

            if (data.userInfo) {
                localStorage.setItem('userInfo', JSON.stringify(data.userInfo));

            }
            document.getElementById('taskSection').classList.remove('hidden');
            document.getElementById('taskTitle').textContent = data.task.title;
            document.getElementById('taskDescription').innerHTML = data.task.description;

            attempts = data.completions || [];

            // Вычисляем разницу для каждой попытки
            for (let i = 0; i < attempts.length; i++) {
                if (i === 0) {
                    // Для первой попытки разница не вычисляется
                    attempts[i].gradeDiff = null;
                } else {
                    // Для других попыток вычисляем разницу с предыдущей
                    const currentGrade = attempts[i].feedback.ai_grade || 0;
                    const previousGrade = attempts[i - 1].feedback.ai_grade || 0;
                    attempts[i].gradeDiff = currentGrade - previousGrade;
                }
            }

            window.totalAllowedAttempts = data.task.allowedAttempts; // Store globally for easy access

            initAttemptsNavigation(); // Initialize navigation visibility and button handlers

            if (attempts.length > 0) {
                currentAttemptIndex = attempts.length - 1;

                displayAttempt(currentAttemptIndex);
            } else {
                currentAttemptIndex = -1; // No previous attempts
                document.getElementById('promptInput').value = '';
                document.getElementById('aiResponseSection').classList.add('hidden'); // Hide AI response
                document.getElementById('feedbackPlaceholder').classList.remove('hidden'); // Show feedback placeholder
                document.getElementById('feedbackContent').classList.add('hidden'); // Hide feedback content
                document.getElementById('currentAttemptDisplay').textContent = 1;
                document.getElementById('totalAttemptsDisplay').textContent = window.totalAllowedAttempts;
                document.getElementById('prevAttemptBtn').setAttribute("disabled","disabled");
                document.getElementById('nextAttemptBtn').setAttribute("disabled","disabled");
                updateSubmitButtonState(); // Update submit button for a fresh start
            }

        } else {
            document.getElementById('errorSection').classList.remove('hidden');
            document.getElementById('errorDetails').textContent = data.error || 'Неизвестная ошибка при загрузке задания.';
        }
    } catch (error) {
        console.error('Error loading task:', error);
        document.getElementById('errorSection').classList.remove('hidden');
        document.getElementById('errorDetails').textContent = 'Ошибка сети при загрузке задания.';
    } finally {
        // Update active task highlighting after loading task
        if (championshipId) {
            updateActiveTaskHighlight(currentActiveTaskId);
        }
        hideLoading('task');
    }
}

function initAttemptsNavigation() {
    const attemptsNav = document.getElementById('attemptsNav');
    const prevBtn = document.getElementById('prevAttemptBtn');
    const nextBtn = document.getElementById('nextAttemptBtn');
    const totalAttemptsDisplay = document.getElementById('totalAttemptsDisplay');

    totalAttemptsDisplay.textContent = window.totalAllowedAttempts;

    prevBtn.disabled = currentAttemptIndex === 0;
    nextBtn.disabled = (currentAttemptIndex === attempts.length - 1 && attempts.length >= window.totalAllowedAttempts);

    prevBtn.onclick = () => {
        if (currentAttemptIndex > 0) {
            currentAttemptIndex--;
            displayAttempt(currentAttemptIndex);
        }
    };

    nextBtn.onclick = () => {
        if (currentAttemptIndex < attempts.length - 1) {
            currentAttemptIndex++;
            displayAttempt(currentAttemptIndex);
        } else if (currentAttemptIndex === attempts.length - 1 && attempts.length < window.totalAllowedAttempts) {
            // User is on the last attempt and clicks 'next' to start a new one
            currentAttemptIndex++; // Move to a conceptual 'new attempt' state
            displayNewAttemptState(currentAttemptIndex);
        }
    };
}

function displayAttempt(index) {
    const attempt = attempts[index];
    const promptInput = document.getElementById('promptInput');
    const currentAttemptDisplay = document.getElementById('currentAttemptDisplay');
    const prevBtn = document.getElementById('prevAttemptBtn');
    const nextBtn = document.getElementById('nextAttemptBtn');

    promptInput.value = attempt.user_prompt;

    // Передаем gradeDiff как часть данных для отображения
    // Создаем копию данных с добавленным значением разницы
    const feedbackData = {
        ...attempt.feedback,
        gradeDiff: attempt.gradeDiff
    };

    displayFeedback(feedbackData);

    currentAttemptDisplay.textContent = index + 1;
    document.getElementById('totalAttemptsDisplay').textContent = window.totalAllowedAttempts;

    prevBtn.disabled = index === 0;
    nextBtn.disabled = (index === attempts.length - 1 && attempts.length >= window.totalAllowedAttempts);

    document.getElementById('aiResponseSection').classList.remove('hidden');
    updateSubmitButtonState(); // Call the new function to manage button state
}

function displayNewAttemptState(index) {
    const promptInput = document.getElementById('promptInput');
    const currentAttemptDisplay = document.getElementById('currentAttemptDisplay');
    const prevBtn = document.getElementById('prevAttemptBtn');
    const nextBtn = document.getElementById('nextAttemptBtn');

    promptInput.value = '';
    document.getElementById('aiResponseSection').classList.add('hidden'); // Hide AI response
    document.getElementById('feedbackPlaceholder').classList.remove('hidden'); // Show feedback placeholder
    document.getElementById('feedbackContent').classList.add('hidden'); // Hide feedback content

    // Очищаем элемент разницы при переходе к новой попытке
    const finalGradeSection = document.getElementById('finalGradeSection');
    if (finalGradeSection) {
        const gradeDiffElement = finalGradeSection.querySelector('.text-xs.text-green-500.leading-tight');
        if (gradeDiffElement) {
            gradeDiffElement.innerHTML = '0.0';
        }
    }

    prevBtn.disabled = index === 0;
    nextBtn.disabled = 1;

    currentAttemptDisplay.textContent = attempts.length + 1;
    updateSubmitButtonState();
}

function updateSubmitButtonState() {
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const promptInput = document.getElementById('promptInput');
    
    // Determine if the user is viewing a past attempt or is in a state to submit a new one.
    // The latter is true if they are on the last attempt and click "next" or if there are no attempts.
    const isViewingPastAttempt = currentAttemptIndex < attempts.length;
    const hasAttemptsLeft = attempts.length < window.totalAllowedAttempts;

    if (isViewingPastAttempt && currentAttemptIndex !== -1) {
        // Always disable if viewing a historical attempt.
        submitBtn.disabled = true;
        promptInput.disabled = true;
    } else {
        // This is a new attempt. Enable/disable based on whether attempts are left.
        if (hasAttemptsLeft) {
            submitBtn.disabled = false;
            promptInput.disabled = false;
        } else {
            submitBtn.disabled = true;
            promptInput.disabled = true;
        }
    }

    // Update button text and style based on the final state
    if (submitBtn.disabled) {
        submitBtnText.innerHTML = 'Попытка';
    } else {
        submitBtnText.innerHTML = 'Ответить';
    }
}

// --- Prompt Submission Logic ---
async function submitPrompt() {
    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value.trim();
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const userId = localStorage.getItem('userId');

    if (!prompt) {
        alert('Пожалуйста, введите промпт.');
        return;
    }

    submitBtn.disabled = true;
    submitBtnText.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mx-auto"></div>';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'submitPrompt',
                taskId: taskId,
                userId: userId,
                userPrompt: prompt
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Silently update the state in the background
            const newAttempt = { user_prompt: prompt, feedback: data.feedback };
            attempts.push(newAttempt);

            // Вычисляем разницу для новой попытки
            const newAttemptIndex = attempts.length - 1;
            if (newAttemptIndex === 0) {
                // Для первой попытки разница не вычисляется
                attempts[newAttemptIndex].gradeDiff = null;
            } else {
                // Для других попыток вычисляем разницу с предыдущей
                const currentGrade = attempts[newAttemptIndex].feedback.ai_grade || 0;
                const previousGrade = attempts[newAttemptIndex - 1].feedback.ai_grade || 0;
                attempts[newAttemptIndex].gradeDiff = currentGrade - previousGrade;
            }

            currentAttemptIndex = attempts.length - 1;

            // New logic: Directly display feedback with animation
            document.getElementById('aiResponseSection').classList.remove('hidden');

            // Передаем gradeDiff как часть данных для отображения
            // Создаем копию данных с добавленным значением разницы
            const feedbackData = {
                ...data.feedback,
                gradeDiff: attempts[currentAttemptIndex].gradeDiff
            };

            displayFeedback(feedbackData);

            initAttemptsNavigation(); // Re-initialize to update counters and buttons
            updateSubmitButtonState(); // Update the button state after submission

            // Update championship task display immediately if in championship mode
            if (championshipId && window.championshipData) {
                // Calculate the best score from all attempts to ensure we have the highest
                const bestScore = attempts.reduce((best, attempt) => {
                    const score = attempt.feedback.ai_grade || 0;
                    return score > best ? score : best;
                }, 0);

                // Update the championship data in place
                const taskToUpdate = window.championshipData.tasks.find(t => t.taskId === taskId);
                if (taskToUpdate) {
                    taskToUpdate.status = "completed";
                    taskToUpdate.attemptsCount = attempts.length;
                    taskToUpdate.bestScore = bestScore;
                }

                // Update the specific task element in the UI
                updateSpecificChampionshipTaskElement(taskId, bestScore, attempts.length);
            }

        } else {
            alert('Ошибка при отправке промпта: ' + (data.error || 'Неизвестная ошибка'));
            updateSubmitButtonState(); // Re-enable button on error
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Ошибка сети при отправке промпта.');
        updateSubmitButtonState(); // Re-enable button on error
    }
}

// --- Update championship task status after submission ---
async function updateChampionshipTaskStatus() {
    if (championshipId) {
        const userId = localStorage.getItem('userId');
        await loadChampionshipTasks(championshipId, userId, false);
    }
}

// --- Update specific championship task element after submission ---
function updateSpecificChampionshipTaskElement(taskId, bestScore, attemptsCount) {
    // Find the championship task element in the UI
    const taskElement = document.querySelector(`.championship-task-item[data-task-id="${taskId}"]`);

    if (taskElement) {
        // Update the task status to completed
        // Change the icon to star
        const taskIcon = taskElement.querySelector('.task-icon');
        if (taskIcon) {
            // Replace circle with star icon
            taskIcon.className = taskIcon.className.replace('fa-circle', 'fa-star');
            // Update color to yellow
            taskIcon.classList.add('text-yellow-500');
            taskIcon.classList.remove('text-red-600');
            taskIcon.classList.add('-translate-y-[2px]');
        }

        // Update the score displayed in the center
        const taskNumberSpan = taskElement.querySelector('.task-number');
        if (taskNumberSpan) {
            if (!bestScore || bestScore == null) {taskNumberSpan.textContent = '0.0' }
            else { taskNumberSpan.textContent = bestScore.toFixed(1) }
        }

        // Update the background and text colors to indicate completion
        const taskCircle = taskElement.querySelector('.task-circle');
        if (taskCircle) {
            taskCircle.classList.remove('bg-red-100', 'text-red-800');
            taskCircle.classList.add('bg-yellow-400', 'text-yellow-300');
        }
    }
}

function displayFeedback(data) {
    const responseEl = document.getElementById('aiResponseDisplay');
    if (responseEl) {
        responseEl.classList.add('markdown-content');
        responseEl.innerHTML = marked.parse(data.ai_response || '');
    }

    const commentEl = document.getElementById('aiCommentDisplay');
    if (commentEl) {
        commentEl.innerHTML = `<p class="text-gray-700">${data.ai_comment || '—'}</p>`;
    }

    // Показываем секцию обратной связи
    document.getElementById('feedbackPlaceholder')?.classList.add('hidden');
    document.getElementById('feedbackContent')?.classList.remove('hidden');

    // Конфиг критериев
    const criteriaConfig = {
        role: { title: 'Роль и контекст', icon: 'fa-user-circle' },
        clarity: { title: 'Чёткость задачи', icon: 'fa-tasks' },
        completeness: { title: 'Полнота данных', icon: 'fa-database' },
        focus: { title: 'Сфокусированность', icon: 'fa-bullseye' },
        structure: { title: 'Структура', icon: 'fa-sitemap' },
        method: { title: 'Метод решения', icon: 'fa-cogs' },
        format: { title: 'Формат ответа', icon: 'fa-file-alt' }
    };

    const container = document.getElementById('aiFeedbackDisplay');
    const template = document.getElementById('criterionTemplate');
    const finalGradeSection = document.getElementById('finalGradeSection');
    const finalGradeDisplay = document.getElementById('finalGradeDisplay');

    if (!container || !template) return;

    container.innerHTML = '';

    const aiCriteria = data.ai_criteria || {};
    const criteriaKeys = Object.keys(criteriaConfig);

    criteriaKeys.forEach(key => {
        const config = criteriaConfig[key];
        const score = aiCriteria[key]?.score ?? 0;
        const comment = aiCriteria[key]?.comment ?? 'Нет комментария';
        const item = template.content.firstElementChild.cloneNode(true);

        item.querySelector('.criterion-icon').classList.add(config.icon);
        item.querySelector('.criterion-title').textContent = config.title;
        item.querySelector('.criterion-comment').textContent = comment;

        const starsContainer = item.querySelector('.criterion-stars');
        const full = Math.floor(score);
        const hasHalf = (score - full) >= 0.5;

        for (let i = 0; i < 5; i++) {
            const star = document.createElement('i');
            if (i < full) {
                star.className = 'fas fa-star text-yellow-500';
            } else if (i === full && hasHalf) {
                star.className = 'fas fa-star-half-alt text-yellow-500';
            } else {
                star.className = 'far fa-star text-gray-300';
            }
            starsContainer.appendChild(star);
        }

        container.appendChild(item);
    });

    // Обновляем итоговую оценку
    if (finalGradeSection && finalGradeDisplay) {
        finalGradeDisplay.textContent = (data.ai_grade || 0).toFixed(1);
        finalGradeSection.classList.remove('hidden');

        // Вычисляем и отображаем разницу с предыдущей попыткой
        const gradeDiffElement = finalGradeSection.querySelector('#gradeDiffDisplay');
        if (gradeDiffElement) {
            // Сбрасываем классы и очищаем элемент
            gradeDiffElement.innerHTML = '';

            if (data.gradeDiff !== undefined && data.gradeDiff !== null) {
                const diff = data.gradeDiff;

                // Устанавливаем цвет и текст в зависимости от направления изменения
                if (diff > 0) {
                    gradeDiffElement.classList.add('text-green-500');
                    gradeDiffElement.classList.remove('text-red-500');
                } else if (diff < 0) {
                    gradeDiffElement.classList.add('text-red-500');
                    gradeDiffElement.classList.remove('text-green-500');
                }

                gradeDiffElement.textContent = `${diff > 0 ? ' +' : ' '}${diff.toFixed(1)} `;
            } else {
                // Если разницы нет (например, для первой попытки), оставляем элемент пустым
                gradeDiffElement.innerHTML = ''; // Очищаем элемент
            }
        }

        // Обновляем график с новыми данными
        if (typeof updateGradeChart === 'function') {
            updateGradeChart(data);
        }
    }
}

// --- User Info Management ---
function showAuthModal() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    document.getElementById('inputName').value = userInfo.name;
    document.getElementById('inputOrg').value = userInfo.company;
    document.getElementById('inputEmail').value = userInfo.email;
    document.getElementById('inputPhone').value = userInfo.phone;
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

async function saveUserInfo() {
    const nameInput = document.getElementById('inputName');
    const submitBtn = document.getElementById('saveUserBtn');
    
    const userInfo = {
        name: nameInput.value.trim(),
        company: document.getElementById('inputOrg').value.trim(),
        email: document.getElementById('inputEmail').value.trim(),
        phone: document.getElementById('inputPhone').value.trim()
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));

    // Update display immediately with new name or existing ID
    const userId = localStorage.getItem('userId');

    // Disable button and show loading
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';

    // Send user info to backend
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'saveUser',
                userId: localStorage.getItem('userId'),
                userInfo: userInfo
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Error saving user info:', data.error);
            // Alert user only if there's a specific error message
            if (data.error) {
                alert('Ошибка при сохранении профиля: ' + data.error);
            }
        }
        // Even if backend fails, we still close the modal as local storage is updated
    } catch (error) {
        console.error('Network error saving user info:', error);
        // Alert user about network issue
        alert('Ошибка сети при сохранении профиля.');
        // Still close the modal as local storage is updated
    } finally {
        // Re-enable button and restore text
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        closeAuthModal();
    }
}

function copyQRLink() {
    const userId = localStorage.getItem('userId');
    const copyButton = document.getElementById('copyButton');
    const link = `${window.location.origin}${window.location.pathname}?practice=${taskId}&user=${userId}`;
    navigator.clipboard.writeText(link).then(() => {
        copyButton.innerHTML='Скопировано!';
        copyButton.classList.add('bg-emerald-500');
        copyButton.classList.remove('bg-red-700', 'hover:bg-red-800');
        setTimeout(() => {
            copyButton.innerHTML='<i class="fas fa-copy mr-2"></i> Копировать ссылку';
            copyButton.classList.remove('bg-emerald-500');
            copyButton.classList.add('bg-red-700', 'hover:bg-red-800');
        }, 2000);
    });
}

// --- QR Code Generation ---
let qrCodeInstance = null;

function showQRCode() {
    document.getElementById('qrModal').classList.remove('hidden');
    // Initialize with the general view by default
    switchQRMode('general');
}

function switchQRMode(mode) {
    const tabGeneral = document.getElementById('tabGeneral');
    const tabPersonal = document.getElementById('tabPersonal');
    const qrDescription = document.getElementById('qrDescription');
    const linkSection = document.getElementById('linkSection');
    const copyButton = document.getElementById('copyButton');
    
    let link = '';

    if (mode === 'personal') {
        // Style for Personal Tab
        tabPersonal.classList.add('border-red-600', 'text-red-600');
        tabPersonal.classList.remove('border-transparent', 'hover:text-gray-600');
        tabGeneral.classList.add('border-transparent', 'hover:text-gray-600');
        tabGeneral.classList.remove('border-red-600', 'text-red-600');
        
        // Content for Personal QR
        const userId = localStorage.getItem('userId');
        link = `${window.location.origin}${window.location.pathname}?practice=${taskId}&user=${userId}`;
        qrDescription.textContent = 'Персональный QR-код для продолжения на другом устройстве';
        linkSection.classList.remove('hidden');
        copyButton.classList.remove('hidden');
        
    } else { // 'general'
        // Style for General Tab
        tabGeneral.classList.add('border-red-600', 'text-red-600');
        tabGeneral.classList.remove('border-transparent', 'hover:text-gray-600');
        tabPersonal.classList.add('border-transparent', 'hover:text-gray-600');
        tabPersonal.classList.remove('border-red-600', 'text-red-600');

        // Content for General QR
        link = `${window.location.origin}${window.location.pathname}?practice=${taskId}`;
        qrDescription.textContent = 'Отсканируйте QR-код, чтобы открыть задание на другом устройстве';
        linkSection.classList.add('hidden');
        copyButton.classList.add('hidden');
    }

    document.getElementById('qrLinkDisplay').textContent = link;

    // Generate QR Code
    if (qrCodeInstance) {
        qrCodeInstance.clear();
        qrCodeInstance.makeCode(link);
    } else {
        qrCodeInstance = new QRCode(document.getElementById("qrcode"), {
            text: link,
            width: 512,
            height: 512,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

function closeQRModal() {
    document.getElementById('qrModal').classList.add('hidden');
}

// --- Loading Indicator ---
// Track loading states by source
const loadingStates = {};

function showLoading(source = 'default') {
    // Add this loading source to the tracking object
    loadingStates[source] = true;
    // Show the loading indicator if any source is loading
    document.getElementById('loadingIndicator').classList.remove('hidden');
}

function hideLoading(source = 'default') {
    // Remove this loading source from the tracking object
    delete loadingStates[source];
    // Hide the loading indicator only if no sources are loading
    const sources = Object.keys(loadingStates);
    if (sources.length === 0) {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

// --- Championship Tasks Loading ---
async function loadChampionshipTasks(championshipId, userId, loading = true) {
    if (loading) { showLoading('championship') };
    try {
        const response = await fetch(`${BACKEND_URL}?action=getChampionship&championship=${encodeURIComponent(championshipId)}&user=${encodeURIComponent(userId)}`);
        const data = await response.json();

        if (response.ok && data.success) {
            window.championshipData = data;
            renderChampionshipTasks(data);
        } else {
            console.error('Error loading championship:', data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Network error loading championship:', error);
    } finally {
        if (loading) { hideLoading('championship') };
    }
}

// --- Render Championship Tasks ---
function renderChampionshipTasks(championshipData) {
    // Показываем баннер чемпионата
    const championshipBanner = document.getElementById('championshipBanner');
    if (championshipBanner) {
        championshipBanner.classList.remove('hidden');
    }

    // Обновляем баннер чемпионата
    const championshipTitle = document.getElementById('championshipTitle');
    const championshipDescription = document.getElementById('championshipDescription');

    if (championshipTitle) {
        championshipTitle.textContent = championshipData.championship?.title || championshipData.championship?.id || 'Неизвестный чемпионат';
    }

    if (championshipDescription) {
        championshipDescription.textContent = championshipData.championship?.description || '';
    }

    // Находим элемент для отображения заданий чемпионата
    const container = document.getElementById('championshipTasksContainer');
    const list = document.getElementById('championshipTasksList');

    if (container && list) {
        container.classList.remove('hidden');

        list.innerHTML = '';

        const taskTemplate = document.getElementById('championshipTaskTemplate');
        const separatorTemplate = document.getElementById('championshipTaskSeparatorTemplate');

        if (taskTemplate && championshipData.tasks && championshipData.tasks.length > 0) {
            championshipData.tasks.forEach((task, index) => {
                const taskElement = taskTemplate.content.cloneNode(true);

                // Заполняем номер задания или балл, если выполнено
                const taskNumberSpan = taskElement.querySelector('.task-number');
                if (taskNumberSpan) {
                    if (task.status === 'completed') {
                        if (task.bestScore !== null) {
                            taskNumberSpan.textContent = task.bestScore.toFixed(1);
                        } else {
                            taskNumberSpan.textContent = '0.0';
                        }
                    } else {
                        taskNumberSpan.textContent = task.taskNumber;
                    }
                }

                const taskIdElement = taskElement.querySelector('.task-id');
                if (taskIdElement) {
                    taskIdElement.textContent = task.title || task.taskId;
                }

                // Добавляем обработчик клика для перехода к заданию
                const wrapperElement = taskElement.querySelector('.championship-task-item');
                if (wrapperElement) {
                    // Обновляем стиль в зависимости от статуса выполнения
                    const taskCircleElement = wrapperElement.querySelector('.task-icon');
                    if (taskCircleElement) {
                        if (task.status === 'completed') {
                            taskCircleElement.classList.remove('text-red-600', 'fa-circle');
                            taskCircleElement.classList.add('text-yellow-500', 'fa-star', '-translate-y-[2px]');
                        }
                    }

                    // Обновляем содержимое кружка в зависимости от статуса выполнения
                    const taskNumberSpan = taskElement.querySelector('.task-number');
                    if (taskNumberSpan) {
                        if (task.status === 'completed') {
                            if (task.bestScore) {
                                taskNumberSpan.textContent = task.bestScore.toFixed(1);
                            } else {
                                taskNumberSpan.textContent = '0.0';
                            }
                        } else {
                            taskNumberSpan.textContent = "№"+task.taskNumber;
                        }
                    }

                    wrapperElement.addEventListener('click', () => {
                        // Обновляем глобальный taskId и URL с параметрами чемпионата и задания
                        taskId = task.taskId; // Обновляем глобальный taskId
                        const currentUrl = new URL(window.location);
                        currentUrl.searchParams.set('championship', championshipId);
                        currentUrl.searchParams.set('practice', task.taskId);
                        window.history.replaceState({}, '', currentUrl.toString());

                        // Обновляем подсветку активного задания до загрузки задачи
                        updateActiveTaskHighlight(task.taskId);

                        loadTaskData(task.taskId, localStorage.getItem('userId'));
                    });
                }

                // Обновляем стиль названия задания - убираем truncate и разрешаем перенос
                if (taskIdElement) {
                    taskIdElement.classList.remove('truncate');
                    taskIdElement.classList.add('text-center', 'break-words');
                    taskIdElement.style.maxWidth = '100px'; // Увеличиваем max-width для более длинных названий
                }

                // Устанавливаем data-атрибут для идентификации задачи
                if (wrapperElement) {
                    wrapperElement.setAttribute('data-task-id', task.taskId);
                }

                // Добавляем заполненный шаблон в контейнер
                list.appendChild(taskElement);

                // Добавляем разделитель после каждого элемента, кроме последнего
                if (index < championshipData.tasks.length - 1 && separatorTemplate) {
                    const separatorElement = separatorTemplate.content.cloneNode(true);
                    list.appendChild(separatorElement);
                }
            });


            // Если в URL нет practice=id, но есть championship, обновляем URL и загружаем первое задание
            if (!taskId && championshipId && championshipData.tasks.length > 0) {
                const firstTaskId = championshipData.tasks[0].taskId;
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('championship', championshipId);
                currentUrl.searchParams.set('practice', firstTaskId);
                window.history.replaceState({}, '', currentUrl.toString());

                // Обновляем глобальный taskId перед загрузкой задачи
                taskId = firstTaskId;

                loadTaskData(firstTaskId, localStorage.getItem('userId'));
            }
        } else {
            list.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">Нет доступных заданий</div>';
        }
        if (championshipId && taskId) { updateActiveTaskHighlight(taskId) };
    }
}