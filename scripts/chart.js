// Глобальная переменная для хранения экземпляра графика
let gradeChart = null;

// Функция инициализации графика
function initializeGradeChart() {
  const ctx = document.getElementById("chart").getContext("2d");

  // Опции графика
  const chartOptions = {
    maintainAspectRatio: false,
    legend: {
      display: false
    },
    tooltips: {
      enabled: false
    },
    elements: {
      point: {
        radius: 0
      }
    },
    scales: {
      xAxes: [{
        gridLines: false,
        scaleLabel: false,
        ticks: {
          display: false
        }
      }],
      yAxes: [{
        gridLines: false,
        scaleLabel: false,
        ticks: {
          display: false,
          suggestedMin: 0,
          suggestedMax: 5
        }
      }]
    }
  };

  // Создаем график с пустыми данными
  gradeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: chartOptions
  });
}

// Функция обновления графика с новыми данными
function updateGradeChart(feedbackData) {
  if (!gradeChart || !feedbackData) return;

  // Извлекаем конфигурацию критериев
  const criteriaConfig = {
    role: { title: 'Роль и контекст', icon: 'fa-user-circle' },
    clarity: { title: 'Чёткость задачи', icon: 'fa-tasks' },
    completeness: { title: 'Полнота данных', icon: 'fa-database' },
    focus: { title: 'Сфокусированность', icon: 'fa-bullseye' },
    structure: { title: 'Структура', icon: 'fa-sitemap' },
    method: { title: 'Метод решения', icon: 'fa-cogs' },
    format: { title: 'Формат ответа', icon: 'fa-file-alt' }
  };

  const aiCriteria = feedbackData.ai_criteria || {};

  // Подготавливаем метки и данные для графика
  const labels = Object.keys(criteriaConfig).map(key => criteriaConfig[key].title);
  const data = Object.keys(criteriaConfig).map(key => aiCriteria[key]?.score ?? 0);

  // Обновляем данные графика
  gradeChart.data.labels = labels;
  if (gradeChart.data.datasets.length === 0) {
    gradeChart.data.datasets.push({
      backgroundColor: "rgba(220, 38, 38, .1)",
      //borderColor: "rgb(220, 38, 38)",
      borderColor: "transparent",
      borderWidth: 0,
      data: data
    });
  } else {
    gradeChart.data.datasets[0].data = data;
  }

  // Обновляем график
  gradeChart.update();
}


// Инициализируем график при загрузке
document.addEventListener('DOMContentLoaded', function() {
  initializeGradeChart();
});
