import { ref, watchEffect, onMounted } from "vue";

export const onWidth = () => {
  const isLandscape = ref(false);
  const notSmall = ref(true);
  const screenWidth = ref(window.innerWidth);
  const screenHeight = ref(window.innerHeight);

  const handleResize = () => {
    screenWidth.value = window.innerWidth;
    screenHeight.value = window.innerHeight;
  };

  onMounted(() => {
    window.addEventListener("resize", handleResize);
  });

  const isPWA = ref((window.matchMedia("(display-mode: standalone)").matches && !/Android/.test(navigator.userAgent)) || false);

  watchEffect(() => {
    handleResize();
    notSmall.value = screenHeight.value < 750 || /iPad/.test(navigator.userAgent);
    isLandscape.value = screenWidth.value > screenHeight.value;
  });

  return { screenWidth, screenHeight, isLandscape, isPWA, notSmall };
};
