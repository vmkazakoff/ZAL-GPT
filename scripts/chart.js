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
    xAxes: [
      {
        gridLines: false,
        scaleLabel: false,
        ticks: {
          display: false
        }
      }
    ],
    yAxes: [
      {
        gridLines: false,
        scaleLabel: false,
        ticks: {
          display: false,
          suggestedMin: 0,
          suggestedMax: 101
        }
      }
    ]
  }
};

const grades = [80, 50, 80, 100, 90, 60, 50];

var ctx = document.getElementById("chart").getContext("2d");
var chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: grades,
    datasets: [
      {
        backgroundColor: "rgba(220, 38, 38, .1)",
        borderColor: "rgb(220, 38, 38)",
        borderWidth: 2,
        data: grades
      }
    ]
  },
  options: chartOptions
});
