// --- Constants ---
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzJEnhim0Ek2UsYZxxSy5cLhHiI91uoRo4SgOLiuMSMoPzhq5aRO5E15OeBg9cwP9qDeg/exec';

// --- URL Parameter Handling ---
const urlParams = new URLSearchParams(window.location.search);
const taskId = urlParams.get('practice'); // Changed from 'task' to 'practice' as per description
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

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Check for task ID
    if (!taskId) {
        document.getElementById('errorSection').classList.remove('hidden');
        return; // Stop further execution if no task ID
    }            

    // Load task data from backend
    loadTaskData(taskId, userId);
});

async function loadTaskData(id, userId) {
    showLoading();
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
        hideLoading();
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
    displayFeedback(attempt.feedback);

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
            // New logic: Directly display feedback with animation
            document.getElementById('aiResponseSection').classList.remove('hidden');
            displayFeedback(data.feedback);

            // Silently update the state in the background
            const newAttempt = { user_prompt: prompt, feedback: data.feedback };
            attempts.push(newAttempt);
            currentAttemptIndex = attempts.length - 1;
            
            initAttemptsNavigation(); // Re-initialize to update counters and buttons
            updateSubmitButtonState(); // Update the button state after submission

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

    // ✅ Очищаем контейнер перед добавлением новых элементов
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
function showLoading() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingIndicator').classList.add('hidden');
}