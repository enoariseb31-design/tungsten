// darkmode.js - Enhanced Theme System with Dual Compatibility
(function () {
  "use strict";

  // ============ CONFIGURATION ============
  const CONFIG = {
    // Storage key for user preference
    STORAGE_KEY: "tungsai_theme",

    // Element selectors
    SELECTORS: {
      themeSwitch: "#theme-switch", // Header button
      themeToggle: "#theme-toggle", // Settings toggle
      themeIcon: "#theme-switch i", // Icon inside header button
      themeLabel: ".theme-toggle .option-label", // Settings label
    },

    // Values
    THEMES: {
      LIGHT: "light",
      DARK: "dark",
    },
  };

  // ============ STATE ============
  let currentTheme = null;

  // ============ CORE FUNCTIONS ============

  /**
   * Get system preference (user's OS theme setting)
   */
  function getSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? CONFIG.THEMES.DARK
      : CONFIG.THEMES.LIGHT;
  }

  /**
   * Get saved user preference from localStorage
   */
  function getSavedPreference() {
    try {
      // Try new storage key first
      let saved = localStorage.getItem(CONFIG.STORAGE_KEY);

      // Fallback to old key for migration
      if (!saved) {
        saved = localStorage.getItem("darkmode");
        if (saved === "enabled") {
          return CONFIG.THEMES.DARK;
        } else if (saved === null || saved === "null") {
          return CONFIG.THEMES.LIGHT;
        }
      }

      return saved;
    } catch (error) {
      console.warn("Failed to read theme from localStorage:", error);
      return null;
    }
  }

  /**
   * Apply theme to document (DUAL COMPATIBILITY)
   * 1. Sets data-theme attribute on <html> for CSS variables
   * 2. Adds/removes .darkmode class on <body> for backward compatibility
   */
  function applyTheme(theme) {
    if (!theme || !Object.values(CONFIG.THEMES).includes(theme)) {
      console.warn("Invalid theme:", theme);
      return;
    }

    currentTheme = theme;

    // 1. Set data-theme attribute on <html> (for your CSS variables)
    document.documentElement.setAttribute("data-theme", theme);

    // 2. Manage .darkmode class on <body> (for backward compatibility)
    if (theme === CONFIG.THEMES.DARK) {
      document.body.classList.add("darkmode");
    } else {
      document.body.classList.remove("darkmode");
    }

    // Save preference
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, theme);

      // Also save in old format for compatibility
      localStorage.setItem(
        "darkmode",
        theme === CONFIG.THEMES.DARK ? "enabled" : null,
      );
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }

    // Update UI controls
    updateThemeControls(theme);

    // Dispatch event for other components
    window.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: theme },
      }),
    );

    console.log("Theme applied:", theme);
  }

  /**
   * Toggle between light/dark themes
   */
  function toggleTheme() {
    const newTheme =
      currentTheme === CONFIG.THEMES.DARK
        ? CONFIG.THEMES.LIGHT
        : CONFIG.THEMES.DARK;

    applyTheme(newTheme);
  }

  /**
   * Update all theme controls in the UI
   */
  function updateThemeControls(theme) {
    const isDark = theme === CONFIG.THEMES.DARK;

    // 1. Update header button (#theme-switch)
    const themeSwitch = document.querySelector(CONFIG.SELECTORS.themeSwitch);
    if (themeSwitch) {
      // Update icon visibility
      const icons = themeSwitch.querySelectorAll("i");
      if (icons.length >= 2) {
        icons[0].style.display = isDark ? "none" : "inline-block"; // Sun
        icons[1].style.display = isDark ? "inline-block" : "none"; // Moon
      }

      // Update aria-label for accessibility
      themeSwitch.setAttribute(
        "aria-label",
        `Switch to ${isDark ? "light" : "dark"} theme`,
      );
    }

    // 2. Update settings toggle (#theme-toggle-switch)
    const themeToggle = document.querySelector(CONFIG.SELECTORS.themeToggle);
    if (themeToggle) {
      // For div toggle switches
      themeToggle.classList.toggle("active", isDark);

      // For accessibility
      themeToggle.setAttribute("aria-checked", isDark.toString());

      // Update toggle slider position if it exists
      const slider = themeToggle.querySelector(".toggle-slider");
      if (slider) {
        if (themeToggle.classList.contains("active")) {
          slider.style.transform = "translateX(24px)";
        } else {
          slider.style.transform = "translateX(0)";
        }
      }
    }

    // 3. Update settings label text and icon
    const themeLabel = document.querySelector(CONFIG.SELECTORS.themeLabel);
    if (themeLabel) {
      const icon = themeLabel.querySelector("i");
      if (icon) {
        icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
      }

      // Update text if it's in a span
      const textSpan = themeLabel.querySelector("span");
      if (textSpan) {
        textSpan.textContent = isDark ? "Light Mode" : "Dark Mode";
      } else if (!icon) {
        // If no icon, update the label text directly
        themeLabel.textContent = isDark ? "Light Mode" : "Dark Mode";
      }
    }
  }

  /**
   * Initialize theme on page load
   */
  function initializeTheme() {
    // Determine which theme to apply
    let themeToApply;

    // 1. Check for saved user preference
    const savedPreference = getSavedPreference();
    if (savedPreference) {
      themeToApply = savedPreference;
    }
    // 2. Check system preference
    else {
      themeToApply = getSystemPreference();
    }

    // Apply the theme
    applyTheme(themeToApply);
  }

  /**
   * Setup event listeners for theme controls
   */
  function setupEventListeners() {
    // Header theme switch
    const themeSwitch = document.querySelector(CONFIG.SELECTORS.themeSwitch);
    if (themeSwitch) {
      themeSwitch.addEventListener("click", (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    // Settings modal theme toggle
    const themeToggle = document.querySelector(CONFIG.SELECTORS.themeToggle);
    if (themeToggle) {
      themeToggle.addEventListener("click", (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only follow system preference if user hasn't made a choice
        const savedPreference = getSavedPreference();
        if (!savedPreference) {
          applyTheme(e.matches ? CONFIG.THEMES.DARK : CONFIG.THEMES.LIGHT);
        }
      });
  }

  /**
   * Public API (optional - for other scripts to use)
   */
  window.ThemeManager = {
    getCurrentTheme: () => currentTheme,
    setTheme: applyTheme,
    toggleTheme: toggleTheme,
    isDarkMode: () => currentTheme === CONFIG.THEMES.DARK,
  };

  // ============ INITIALIZATION ============

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    // DOM already loaded
    setTimeout(initialize, 0);
  }

  function initialize() {
    try {
      console.log("Initializing Theme System...");
      initializeTheme();
      setupEventListeners();
      console.log("Theme System initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Theme System:", error);
    }
  }
})();
