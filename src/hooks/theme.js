import { ref, watchEffect } from "vue";

export const useTheme = () => {
  const theme = ref("dark");
  const isDarkModeEnabled = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);
  const updateDarkModeStatus = () => {
    isDarkModeEnabled.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (!isDarkModeEnabled.value) {
      theme.value = "light";
    } else {
      theme.value = "dark";
    }
  };

  updateDarkModeStatus();

  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  darkModeMediaQuery.addEventListener("change", updateDarkModeStatus);

  watchEffect(() => {
    if (!isDarkModeEnabled.value) {
      theme.value = "light";
    } else {
      theme.value = "dark";
    }
  });

  return { theme, isDarkModeEnabled };
};
