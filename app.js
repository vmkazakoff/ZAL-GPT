// --- Constants ---
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzJEnhim0Ek2UsYZxxSy5cLhHiI91uoRo4SgOLiuMSMoPzhq5aRO5E15OeBg9cwP9qDeg/exec';

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

// --- URL Parameter Handling ---
const urlParams = new URLSearchParams(window.location.search);
const taskId = urlParams.get('practice'); // Changed from 'task' to 'practice' as per description
const userIdFromUrl = urlParams.get('user');

// Use user ID from URL if provided
if (userIdFromUrl) {
    localStorage.setItem('userId', userIdFromUrl);
}

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Display user name or ID
    const displayName = userInfo.name || userId;
    document.getElementById('userIdDisplay').textContent = displayName;

    // Check for task ID
    if (!taskId) {
        document.getElementById('errorSection').classList.remove('hidden');
        return; // Stop further execution if no task ID
    }            

    // Load task data from backend
    loadTaskData(taskId);
});

async function loadTaskData(id) {
    showLoading();
    try {
        const response = await fetch(`${BACKEND_URL}?action=getPractice&practice=${encodeURIComponent(id)}`);
        const data = await response.json();

        if (response.ok && data.success) {
            document.getElementById('taskSection').classList.remove('hidden');
            document.getElementById('taskTitle').textContent = data.task.title;
            document.getElementById('taskDescription').innerHTML = data.task.description;
            document.getElementById('userSection').classList.remove('hidden');
            document.getElementById('taskIdDisplay').textContent = taskId;
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

// --- Prompt Submission Logic ---
async function submitPrompt() {
    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value.trim();
    const submitBtn = document.getElementById('submitBtn');
    const userId = localStorage.getItem('userId');

    if (!prompt) {
        alert('Пожалуйста, введите промпт.');
        return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
    //showLoading();

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'submitPrompt',
                taskId: taskId,
                userId: userId,
                userPrompt: prompt
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            displayFeedback(data.feedback);
            // Show AI response section
            document.getElementById('aiResponseSection').classList.remove('hidden');
            // Scroll to AI response
            document.getElementById('aiResponseSection').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Ошибка при отправке промпта: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Ошибка сети при отправке промпта.');
    } finally {
        // Re-enable button and restore text
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Отправить промпт';
        //hideLoading();
    }
}

async function displayFeedback(data) {
    // Отображаем AI response, комментарий и скрываем заглушку — как раньше
    const responseEl = document.getElementById('aiResponseDisplay');
    if (responseEl) {
        responseEl.classList.add('markdown-content');
        responseEl.innerHTML = marked.parse(data.ai_response || '');
    }

    const commentEl = document.getElementById('aiCommentDisplay');
    if (commentEl) {
        commentEl.innerHTML = `<p class="text-gray-700">${data.ai_comment || '—'}</p>`;
    }

    // Скрываем placeholder, показываем контент
    document.getElementById('feedbackPlaceholder')?.classList.add('hidden');
    document.getElementById('feedbackContent')?.classList.remove('hidden');

    // Конфиг критериев
    const criteriaConfig = {
        role:        { title: 'Роль и контекст',         icon: 'fa-user-circle' },
        clarity:     { title: 'Чёткость задачи',         icon: 'fa-tasks' },
        completeness:{ title: 'Полнота данных',          icon: 'fa-database' },
        focus:       { title: 'Сфокусированность',       icon: 'fa-bullseye' },
        structure:   { title: 'Структура',               icon: 'fa-sitemap' },
        method:      { title: 'Метод решения',           icon: 'fa-cogs' },
        format:      { title: 'Формат ответа',           icon: 'fa-file-alt' }
    };

    const container = document.getElementById('aiFeedbackDisplay');
    const template = document.getElementById('criterionTemplate');
    const finalGradeSection = document.getElementById('finalGradeSection');
    const finalGradeDisplay = document.getElementById('finalGradeDisplay');

    if (!container || !template) return;

    // Очищаем старые критерии
    container.querySelectorAll('.criterion-item').forEach(el => el.remove());

    // Параметры анимации
    const delayBetweenCriteria = 600;  // между критериями
    const delayBetweenStars = 100;     // между звёздами в одном критерии

    const criteriaKeys = Object.keys(criteriaConfig);
    const aiCriteria = data.ai_criteria || {};

    // 1. Последовательно отображаем критерии
    for (const key of criteriaKeys) {
        const config = criteriaConfig[key];
        const score = aiCriteria[key]?.score ?? 0;
        const comment = aiCriteria[key]?.comment ?? 'Нет комментария';

        const item = template.content.firstElementChild.cloneNode(true);

        // Иконка и заголовок
        const iconEl = item.querySelector('.criterion-icon');
        iconEl.classList.add(config.icon);
        item.querySelector('.criterion-title').textContent = config.title;

        // Создаём 5 пустых звёзд
        const starsContainer = item.querySelector('.criterion-stars');
        starsContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('i');
            star.className = 'far fa-star text-gray-300';
            starsContainer.appendChild(star);
        }

        // Комментарий
        item.querySelector('.criterion-comment').textContent = comment;

        // Добавляем карточку (видна сразу, но звёзды пока серые)
        container.appendChild(item);

        // Небольшая пауза перед заполнением звёзд
        await new Promise(r => setTimeout(r, 100));

        // Заполняем звёзды по одной
        const stars = Array.from(starsContainer.children);
        const full = Math.floor(score);
        const hasHalf = (score - full) >= 0.5;

        for (let i = 0; i < full; i++) {
            await new Promise(r => setTimeout(r, delayBetweenStars));
            stars[i].className = 'fas fa-star text-yellow-500';
        }

        if (hasHalf) {
            await new Promise(r => setTimeout(r, delayBetweenStars));
            stars[full].className = 'fas fa-star-half-alt text-yellow-500';
        }

        // Пауза перед следующим критерием
        await new Promise(r => setTimeout(r, delayBetweenCriteria));
    }

    // 2. После всех критериев — показываем итоговую оценку
    if (finalGradeSection && finalGradeDisplay) {
        finalGradeDisplay.textContent = (data.ai_grade || 0).toFixed(1);
        await new Promise(r => setTimeout(r, 400));
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
    document.getElementById('inputUserId').value = localStorage.getItem('userId'); // Show current ID
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
    const displayName = userInfo.name || userId;
    document.getElementById('userIdDisplay').textContent = displayName;

    // Optionally update the user ID if the user entered a different one
    const newUserId = document.getElementById('inputUserId').value.trim();
    if (newUserId && newUserId !== userId) {
        localStorage.setItem('userId', newUserId);
        document.getElementById('userIdDisplay').textContent = userInfo.name || newUserId;
    }

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

// --- Clipboard and Notifications ---
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('opacity-100');
    setTimeout(() => {
        notification.classList.remove('opacity-100');
    }, 2000);
}

function copyQRLink() {
    const userId = localStorage.getItem('userId');
    const link = `${window.location.origin}${window.location.pathname}?practice=${taskId}&user=${userId}`;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Ссылка скопирована!');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
        showNotification('Ошибка копирования');
    });
}

// --- QR Code Generation ---
let qrCodeInstance = null;

function showQRCode() {
    const userId = localStorage.getItem('userId');
    const link = `${window.location.origin}${window.location.pathname}?practice=${taskId}&user=${userId}`;
    document.getElementById('qrLinkDisplay').textContent = link;

    // Clear previous QR code if exists
    if (qrCodeInstance) {
        qrCodeInstance.clear();
        qrCodeInstance.makeCode(link);
    } else {
        qrCodeInstance = new QRCode(document.getElementById("qrcode"), {
            text: link,
            width: 500,
            height: 500,
            colorDark: "#000000",
            colorLight: "#f1f5f9",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    document.getElementById('qrModal').classList.remove('hidden');
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
