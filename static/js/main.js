/**
 * Enviro Plus Web
 * @description: Web interface for Enviro and Enviro+ sensor board plugged into a Raspberry Pi
 * @author idotj
 * @version 4.1.0
 * @url https://gitlab.com/idotj/enviroplusweb
 * @license GNU AGPLv3
 */
"use strict";

// Active tab/window check
let activeWindow = true;
const browserUpdates =
  document.body.dataset.browserUpdates.toLowerCase() === "true";
if (browserUpdates && typeof document.hidden !== "undefined") {
  document.addEventListener("visibilitychange", function () {
    activeWindow = !document.hidden;
  });
  // Initial check
  activeWindow = !document.hidden;
}

// Logo
const logoBtn = document.getElementById("logoReloadPage");
logoBtn.addEventListener("click", function () {
  location.reload();
});

// Language
const languageDropdown = document.getElementById("languageSelector");
languageDropdown.value = URLlanguage;
languageDropdown.addEventListener("change", function () {
  const language = this.value;
  localStorage.setItem("enviro-language", language);
  window.location.href = `/dashboard/${language}`;
});

// Color theme
const colorThemeBtn = document.getElementById("btnColorTheme");
colorThemeBtn.addEventListener("click", function () {
  const theme = document.documentElement.getAttribute("data-theme");
  const newTheme = theme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("enviro-color-theme", newTheme);
});

// Main menu
const menuMainBtn = document.getElementById("menuHamburger");
const menuMainContainer = document.getElementById("headerMenuSettings");
menuMainBtn.addEventListener("click", function () {
  this.classList.toggle("btn-active");
  this.setAttribute("aria-expanded", this.classList.contains("btn-active"));
  menuMainContainer.classList.toggle("menu-settings-open");

  document.addEventListener("click", function clickOutsideMenu(event) {
    let clickMenuContainer = menuMainContainer.contains(event.target);
    let clickMenuBtn = menuMainBtn.contains(event.target);
    if (
      !clickMenuContainer &&
      !clickMenuBtn &&
      menuMainContainer.classList.contains("menu-settings-open")
    ) {
      menuMainBtn.classList.toggle("btn-active");
      menuMainBtn.setAttribute(
        "aria-expanded",
        menuMainBtn.classList.contains("btn-active")
      );
      menuMainContainer.classList.toggle("menu-settings-open");
      document.removeEventListener("click", clickOutsideMenu);
    }
  });
});

// Sensor readings and graphs
const cssStyles = getComputedStyle(document.body);
const timeRangeSelector = document.getElementById("graphSelector");
const fanGPIO = document.body.dataset.fanGpio.toLowerCase() === "true";
const isSystemMetric = document.body.dataset.systemUnits === "metric";
const unitTemp = isSystemMetric ? "°C" : "°F";
const convertCtoF = (c) => (c * 9) / 5 + 32;
const baseTempMin = 0;
const baseTempMax = 60;
const unitPres = isSystemMetric ? "hPa" : "inHg";
const convertHPAtoINHG = (p) => p * 0.02953;
const basePresMin = 850;
const basePresMax = 1050;
const openweather = document.body.dataset.openweather.toLowerCase() === "true";
const unitWind = isSystemMetric ? "km/h" : "mph";
const gasSensor = document.body.dataset.gasSensor.toLowerCase() === "true";
const particulateSensor =
  document.body.dataset.particulateSensor.toLowerCase() === "true";
const itemsNgp = {
  temp: {
    id: "temp",
    unit: unitTemp,
    color: cssStyles.getPropertyValue("--color-temp"),
    min: isSystemMetric ? baseTempMin : convertCtoF(baseTempMin),
    max: isSystemMetric ? baseTempMax : convertCtoF(baseTempMax),
  },
  humi: {
    id: "humi",
    unit: "%",
    color: cssStyles.getPropertyValue("--color-humi"),
    min: 0,
    max: 100,
  },
  pres: {
    id: "pres",
    unit: unitPres,
    color: cssStyles.getPropertyValue("--color-pres"),
    min: isSystemMetric ? basePresMin : convertHPAtoINHG(basePresMin),
    max: isSystemMetric ? basePresMax : convertHPAtoINHG(basePresMax),
  },
  lux: {
    id: "lux",
    unit: "lux",
    color: cssStyles.getPropertyValue("--color-lux"),
    min: 0,
    max: 25000,
  },
  high: {
    id: "high",
    unit: "u",
    color: cssStyles.getPropertyValue("--color-noise-high"),
    min: 0,
    max: 600,
  },
  mid: {
    id: "mid",
    unit: "u",
    color: cssStyles.getPropertyValue("--color-noise-mid"),
    min: 0,
    max: 600,
  },
  low: {
    id: "low",
    unit: "u",
    color: cssStyles.getPropertyValue("--color-noise-low"),
    min: 0,
    max: 600,
  },
  amp: {
    id: "amp",
    unit: "u",
    color: cssStyles.getPropertyValue("--color-noise-amp"),
    min: 0,
    max: 600,
  },
};
const itemsWind = {
  windDir: {
    id: "windDir",
    unit: "°",
    color: cssStyles.getPropertyValue("--color-wind"),
    min: 0,
    max: 360,
  },
  windSp: {
    id: "windSp",
    unit: unitWind,
    color: cssStyles.getPropertyValue("--color-wind"),
    min: 0,
    max: 500,
  },
};
const itemsGas = {
  nh3: {
    id: "nh3",
    unit: "kΩ",
    color: cssStyles.getPropertyValue("--color-nh3"),
    min: 0,
    max: 1200,
  },
  oxi: {
    id: "red",
    unit: "kΩ",
    color: cssStyles.getPropertyValue("--color-reduc"),
    min: 0,
    max: 1200,
  },
  red: {
    id: "oxi",
    unit: "kΩ",
    color: cssStyles.getPropertyValue("--color-oxi"),
    min: 0,
    max: 1200,
  },
};
const itemsPm = {
  pm1: {
    id: "pm1",
    unit: "μg/m3",
    color: cssStyles.getPropertyValue("--color-pm-1"),
    min: 0,
    max: 800,
  },
  pm25: {
    id: "pm25",
    unit: "μg/m3",
    color: cssStyles.getPropertyValue("--color-pm-25"),
    min: 0,
    max: 800,
  },
  pm10: {
    id: "pm10",
    unit: "μg/m3",
    color: cssStyles.getPropertyValue("--color-pm-10"),
    min: 0,
    max: 800,
  },
};
let items;
if (particulateSensor) {
  items = { ...itemsNgp, ...itemsGas, ...itemsPm };
} else if (gasSensor) {
  items = { ...itemsNgp, ...itemsGas };
} else {
  items = itemsNgp;
}
if (openweather) {
  items = { ...items, ...itemsWind };
}
let firstRun = true;
let transformedData;
const frequencies = {
  day: { reload: 60 },
  week: { reload: 600 },
  month: { reload: 1800 },
  year: { reload: 43200 },
};
let frequency;
let lastFrequency = "";
let lastGraph = 0;
const loopInterval = 2000;
const ctxTemp = document.getElementById("graphChartTemp");
const ctxHumi = document.getElementById("graphChartHumi");
const ctxPres = document.getElementById("graphChartPres");
const windArrow = openweather
  ? document.getElementById("windDirectionArrow")
  : null;
const ctxWind = openweather ? document.getElementById("graphChartWind") : null;
const ctxLux = document.getElementById("graphChartLux");
const ctxNoise = document.getElementById("graphChartNoise");
const ctxGas = gasSensor ? document.getElementById("graphChartGas") : null;
const ctxPm = particulateSensor
  ? document.getElementById("graphChartPm")
  : null;
let graphChartTemp;
let graphChartHumi;
let graphChartPres;
let graphChartLux;
let graphChartWind;
let graphChartNoise;
let graphChartGas;
let graphChartPm;

const getReadings = async () => {
  try {
    const url = fanGPIO
      ? `readings?fan=${document.getElementById("fan").value}`
      : "readings";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // console.log("getReadings(): ", data);
    updateHeaderReadings(data);
  } catch (error) {
    console.error("Error fetching 'readings' data:", error);
  }
};

const updateWindDir = (degrees) => {
  windArrow.style.visibility = degrees !== null ? "visible" : "hidden";
  if (degrees !== null) {
    windArrow.style.transform = `rotate(${degrees}deg)`;
  }
};

const updateHeaderReadings = (dataReadings) => {
  Object.keys(dataReadings).forEach((key) => {
    const element = document.getElementById(key);
    const value = dataReadings[key];
    if (element) {
      element.innerHTML = value !== null ? value : "-";
    }
  });
  if (openweather) updateWindDir(dataReadings.windDir);
};
document.getElementById("tempUnits").innerText = unitTemp;
document.getElementById("presUnits").innerText = unitPres;
if (openweather) {
  document.getElementById("windUnits").innerText = unitWind;
}

const getGraph = async () => {
  frequency = timeRangeSelector.value;
  const t = Date.now() / 1000;

  if (
    frequency !== lastFrequency ||
    t - lastGraph >= frequencies[frequency].reload
  ) {
    lastFrequency = frequency;
    lastGraph = t;

    try {
      const response = await fetch(`graph?time=${frequency}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // console.log("getGraph(): ", data);
      transformedData = data.map((element) => {
        const result = {
          time: new Date(element.time).toISOString(),
          temp: element.temp,
          humi: element.humi,
          pres: element.pres,
          lux: element.lux,
          ...(openweather && {
            windDir: element.windDir,
            windSp: element.windSp,
          }),
          high: element.high,
          mid: element.mid,
          low: element.low,
          amp: element.amp,
          ...(gasSensor && {
            nh3: element.nh3,
            red: element.red,
            oxi: element.oxi,
          }),
          ...(particulateSensor && {
            pm1: element.pm1,
            pm25: element.pm25,
            pm10: element.pm10,
          }),
        };
        return result;
      });

      if (!firstRun) {
        destroyAllCharts();
      } else {
        firstRun = false;
      }

      drawGraph(transformedData);
    } catch (error) {
      console.error("Error fetching 'graph' data:", error);
    }
  }
};

const destroyAllCharts = () => {
  graphChartTemp.destroy();
  graphChartHumi.destroy();
  graphChartPres.destroy();
  graphChartLux.destroy();
  graphChartNoise.destroy();
  if (openweather) graphChartWind.destroy();
  if (gasSensor) graphChartGas.destroy();
  if (particulateSensor) graphChartPm.destroy();
};

const degreesToDirection = (degrees) => {
  const compassDirections = [
    "North",
    "North East",
    "East",
    "South East",
    "South",
    "South West",
    "West",
    "North West",
  ];
  const index = Math.round(degrees / 45) % 8;
  return compassDirections[index];
};

const drawGraph = (data) => {
  const graphFrequencyMap = {
    day: "hour",
    week: "day",
    month: "day",
    year: "month",
  };
  const graphFrequency = graphFrequencyMap[frequency] || frequency;

  // Push data for chartJS
  graphChartTemp = new Chart(ctxTemp, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.temp.id,
          data: data,
          parsing: {
            yAxisKey: items.temp.id,
          },
          borderColor: items.temp.color,
          borderWidth: 2,
          pointBackgroundColor: items.temp.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          grace: "90%",
          ticks: {
            callback: function (value) {
              return value + items.temp.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphFrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            size: 18,
          },
          bodyFont: {
            size: 20,
          },
          callbacks: {
            label: function (context) {
              let label = " " + context.parsed.y + items.temp.unit;
              return label;
            },
          },
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxTemp.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartHumi = new Chart(ctxHumi, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.humi.id,
          data: data,
          parsing: {
            yAxisKey: items.humi.id,
          },
          borderColor: items.humi.color,
          borderWidth: 2,
          pointBackgroundColor: items.humi.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          grace: "90%",
          ticks: {
            callback: function (value) {
              return value + items.humi.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphFrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            size: 18,
          },
          bodyFont: {
            size: 20,
          },
          callbacks: {
            label: function (context) {
              let label = " " + context.parsed.y + items.humi.unit;
              return label;
            },
          },
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxHumi.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartPres = new Chart(ctxPres, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.pres.id,
          data: data,
          parsing: {
            yAxisKey: items.pres.id,
          },
          fill: items.pres.color,
          borderColor: items.pres.color,
          borderWidth: 2,
          pointBackgroundColor: items.pres.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          min: items.pres.min,
          max: items.pres.max,
          ticks: {
            stepSize: 20,
            callback: function (value) {
              return value + " " + items.pres.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphFrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            size: 18,
          },
          bodyFont: {
            size: 20,
          },
          callbacks: {
            label: function (context) {
              let label = " " + context.parsed.y + " " + items.pres.unit;
              return label;
            },
          },
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxPres.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartLux = new Chart(ctxLux, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.lux.id,
          data: data,
          parsing: {
            yAxisKey: items.lux.id,
          },
          borderColor: items.lux.color,
          borderWidth: 2,
          pointBackgroundColor: items.lux.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grace: "40%",
          ticks: {
            stepSize: 100,
            callback: function (value) {
              return value + " " + items.lux.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphFrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            size: 18,
          },
          bodyFont: {
            size: 20,
          },
          callbacks: {
            label: function (context) {
              let label = " " + context.parsed.y + " " + items.lux.unit;
              return label;
            },
          },
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxLux.classList.remove("loading-spinner");
        },
      },
    },
  });

  if (openweather) {
    graphChartWind = new Chart(ctxWind, {
      type: "line",
      data: {
        datasets: [
          {
            label: items.windSp.id,
            data: data,
            parsing: {
              yAxisKey: items.windSp.id,
            },
            borderColor: items.windSp.color,
            borderWidth: 2,
            pointBackgroundColor: items.windSp.color,
            pointRadius: 1,
          },
        ],
      },
      options: {
        cubicInterpolationMode: "monotone",
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grace: "90%",
            ticks: {
              callback: function (value) {
                return value + " " + items.windSp.unit;
              },
            },
          },
          x: {
            type: "time",
            time: {
              unit: graphFrequency,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleFont: {
              size: 18,
            },
            bodyFont: {
              size: 20,
            },
            callbacks: {
              label: function (context) {
                let label =
                  " " +
                  context.parsed.y +
                  " " +
                  items.windSp.unit +
                  " " +
                  degreesToDirection(context.raw.windDir);
                return label;
              },
            },
          },
        },
        parsing: {
          xAxisKey: "time",
        },
        animation: {
          onComplete: function () {
            ctxWind.classList.remove("loading-spinner");
          },
        },
      },
    });
  }

  graphChartNoise = new Chart(ctxNoise, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.high.id,
          data: data,
          parsing: {
            yAxisKey: items.high.id,
          },
          yAxisID: "y",
          borderColor: items.high.color,
          borderWidth: 2,
          pointBackgroundColor: items.high.color,
          pointRadius: 1,
        },
        {
          label: items.mid.id,
          data: data,
          parsing: {
            yAxisKey: items.mid.id,
          },
          yAxisID: "y1",
          borderColor: items.mid.color,
          borderWidth: 2,
          pointBackgroundColor: items.mid.color,
          pointRadius: 1,
        },
        {
          label: items.low.id,
          data: data,
          parsing: {
            yAxisKey: items.low.id,
          },
          yAxisID: "y2",
          borderColor: items.low.color,
          borderWidth: 2,
          pointBackgroundColor: items.low.color,
          pointRadius: 1,
        },
        {
          label: items.amp.id,
          data: data,
          parsing: {
            yAxisKey: items.amp.id,
          },
          yAxisID: "y3",
          borderColor: items.amp.color,
          borderWidth: 2,
          pointBackgroundColor: items.amp.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          min: items.high.min,
          max: items.high.max,
          ticks: {
            callback: function (value) {
              return value + " " + items.high.unit;
            },
          },
        },
        y1: {
          min: items.high.min,
          max: items.high.max,
          display: false,
        },
        y2: {
          min: items.high.min,
          max: items.high.max,
          display: false,
        },
        y3: {
          min: items.high.min,
          max: items.high.max,
          display: false,
        },
        x: {
          type: "time",
          time: {
            unit: graphFrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            size: 18,
          },
          bodyFont: {
            size: 20,
          },
          callbacks: {
            label: function (context) {
              let label = " " + context.parsed.y + " " + items.high.unit;
              return label;
            },
          },
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxNoise.classList.remove("loading-spinner");
        },
      },
    },
  });

  if (gasSensor) {
    graphChartGas = new Chart(ctxGas, {
      type: "line",
      data: {
        datasets: [
          {
            label: items.nh3.id,
            data: data,
            parsing: {
              yAxisKey: items.nh3.id,
            },
            yAxisID: "y",
            borderColor: items.nh3.color,
            borderWidth: 2,
            pointBackgroundColor: items.nh3.color,
            pointRadius: 1,
          },
          {
            label: items.red.id,
            data: data,
            parsing: {
              yAxisKey: items.red.id,
            },
            yAxisID: "y1",
            borderColor: items.red.color,
            borderWidth: 2,
            pointBackgroundColor: items.red.color,
            pointRadius: 1,
          },
          {
            label: items.oxi.id,
            data: data,
            parsing: {
              yAxisKey: items.oxi.id,
            },
            yAxisID: "y2",
            borderColor: items.oxi.color,
            borderWidth: 2,
            pointBackgroundColor: items.oxi.color,
            pointRadius: 1,
          },
        ],
      },
      options: {
        cubicInterpolationMode: "monotone",
        maintainAspectRatio: false,
        scales: {
          y: {
            min: items.nh3.min,
            max: items.nh3.max,
            ticks: {
              callback: function (value) {
                return value + " " + items.nh3.unit;
              },
            },
          },
          y1: {
            min: items.red.min,
            max: items.red.max,
            display: false,
          },
          y2: {
            min: items.oxi.min,
            max: items.oxi.max,
            display: false,
          },
          x: {
            type: "time",
            time: {
              unit: graphFrequency,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleFont: {
              size: 18,
            },
            bodyFont: {
              size: 20,
            },
            callbacks: {
              label: function (context) {
                let label = " " + context.parsed.y + " " + items.nh3.unit;
                return label;
              },
            },
          },
        },
        parsing: {
          xAxisKey: "time",
        },
        animation: {
          onComplete: function () {
            ctxGas.classList.remove("loading-spinner");
          },
        },
      },
    });
  }

  if (particulateSensor) {
    graphChartPm = new Chart(ctxPm, {
      type: "line",
      data: {
        datasets: [
          {
            label: items.pm1.id,
            data: data,
            parsing: {
              yAxisKey: items.pm1.id,
            },
            yAxisID: "y",
            borderColor: items.pm1.color,
            borderWidth: 2,
            pointBackgroundColor: items.pm1.color,
            pointRadius: 1,
          },
          {
            label: items.pm25.id,
            data: data,
            parsing: {
              yAxisKey: items.pm25.id,
            },
            yAxisID: "y",
            borderColor: items.pm25.color,
            borderWidth: 2,
            pointBackgroundColor: items.pm25.color,
            pointRadius: 1,
          },
          {
            label: items.pm10.id,
            data: data,
            parsing: {
              yAxisKey: items.pm10.id,
            },
            yAxisID: "y",
            borderColor: items.pm10.color,
            borderWidth: 2,
            pointBackgroundColor: items.pm10.color,
            pointRadius: 1,
          },
        ],
      },
      options: {
        cubicInterpolationMode: "monotone",
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grace: "60%",
            ticks: {
              stepSize: 5,
              callback: function (value) {
                return value + " " + items.pm1.unit;
              },
            },
          },
          x: {
            type: "time",
            time: {
              unit: graphFrequency,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleFont: {
              size: 18,
            },
            bodyFont: {
              size: 20,
            },
            callbacks: {
              label: function (context) {
                let label = " " + context.parsed.y + " " + items.pm1.unit;
                return label;
              },
            },
          },
        },
        parsing: {
          xAxisKey: "time",
        },
        animation: {
          onComplete: function () {
            ctxPm.classList.remove("loading-spinner");
          },
        },
      },
    });
  }
};

const showLoadingSpinner = () => {
  const graphBodies = document.querySelectorAll(".graph-body");
  graphBodies.forEach((graphBody) => {
    const canvas = graphBody.querySelector("canvas");
    if (canvas) {
      canvas.classList.add("loading-spinner");
    }
  });
};

timeRangeSelector.addEventListener("change", () => {
  showLoadingSpinner();
  getGraph();
});

window.addEventListener("resize", function () {
  destroyAllCharts();
  drawGraph(transformedData);
});

async function init() {
  try {
    if (activeWindow) await Promise.all([getReadings(), getGraph()]);
  } catch (error) {
    console.error(
      'Error initializing "getReadings" and "getGraph" async function: ',
      error
    );
  } finally {
    setTimeout(init, loopInterval);
  }
}

// Popup functionality
const showPopup = (type, title, message) => {
  const overlay = document.getElementById("popupOverlay");
  const modal = document.getElementById("popupModal");
  const titleEl = document.getElementById("popupTitle");
  const messageEl = document.getElementById("popupMessage");
  const successIcon = document.getElementById("successIcon");
  const successCheckmark = document.getElementById("successCheckmark");
  const errorIcon = document.getElementById("errorIcon");
  const errorX = document.getElementById("errorX");

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;

  // Reset modal classes
  modal.className = "popup-modal";
  
  // Show/hide icons based on type
  if (type === "success") {
    modal.classList.add("popup-success");
    successIcon.style.display = "block";
    successCheckmark.style.display = "block";
    errorIcon.style.display = "none";
    errorX.style.display = "none";
  } else {
    modal.classList.add("popup-error");
    successIcon.style.display = "none";
    successCheckmark.style.display = "none";
    errorIcon.style.display = "block";
    errorX.style.display = "block";
  }

  // Show popup
  overlay.classList.add("show");
};

const hidePopup = () => {
  const overlay = document.getElementById("popupOverlay");
  overlay.classList.remove("show");
};

// System control functions
const performSystemAction = async (action, actionName) => {
  try {
    showPopup("success", actionName, `${actionName} in progress...`);
    
    const response = await fetch(`/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data.status === "success") {
      showPopup("success", actionName, data.message);
      // Auto-hide popup after 5 seconds for successful actions
      setTimeout(hidePopup, 5000);
    } else {
      showPopup("error", actionName, data.message || `${actionName} failed`);
      // Auto-hide popup after 10 seconds for errors
      setTimeout(hidePopup, 10000);
    }
  } catch (error) {
    showPopup("error", actionName, `Network error: ${error.message}`);
    setTimeout(hidePopup, 10000);
  }
};

// System control button event listeners
const rebootBtn = document.getElementById("btnReboot");
const shutdownBtn = document.getElementById("btnShutdown");

if (rebootBtn) {
  rebootBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reboot the system?")) {
      performSystemAction("reboot", "Reboot");
    }
  });
}

if (shutdownBtn) {
  shutdownBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to shutdown the system?")) {
      performSystemAction("shutdown", "Shutdown");
    }
  });
}

// Close popup when clicking outside of it
document.getElementById("popupOverlay").addEventListener("click", (e) => {
  if (e.target.id === "popupOverlay") {
    hidePopup();
  }
});

init();
