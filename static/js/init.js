/**
 * Enviro Plus Web
 * @description: Web interface for Enviro and Enviro+ sensor board plugged into a Raspberry Pi
 * @author idotj
 * @version 4.2.0
 * @url https://gitlab.com/idotj/enviroplusweb
 * @license GNU AGPLv3
 */
"use strict";

// Language
let savedUserLanguage;
const URLlanguage =
  window.location.pathname.split("/").filter(Boolean).pop() || "";
try {
  savedUserLanguage = localStorage.getItem("enviro-language");
} catch (e) {
  if (e instanceof DOMException) {
    savedUserLanguage = null;
  }
}
(function () {
  if (savedUserLanguage) {
    if (savedUserLanguage !== URLlanguage) {
      window.location.href = `/dashboard/${savedUserLanguage}`;
    }
  }
  document.documentElement.lang = URLlanguage;
})();

// Theme color
(function () {
  let userTheme;
  try {
    userTheme = localStorage.getItem("enviro-color-theme");
  } catch (e) {
    if (e instanceof DOMException) {
      userTheme = null;
    }
  }
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

  const theme = userTheme || systemTheme;
  document.documentElement.setAttribute("data-theme", theme);

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("enviro-color-theme")) {
        const newTheme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    });
})();
