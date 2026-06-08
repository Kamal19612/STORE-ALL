/**
 * Utilitaires d'optimisation des performances
 */

/**
 * Détecte si l'appareil est mobile
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Détecte si l'appareil a des performances limitées
 */
export const isLowPerformanceDevice = () => {
  if (typeof navigator === 'undefined') return false;

  // Détection basée sur navigator.hardwareConcurrency
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB

  return cores <= 2 || memory <= 2;
};

/**
 * Désactive les animations sur les appareils à faible performance
 */
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false;

  // Respect du paramètre système
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return prefersReducedMotion || isLowPerformanceDevice() || isMobileDevice();
};

/**
 * Throttle pour optimiser les événements fréquents
 */
export const throttle = (func, delay = 250) => {
  let timeoutId;
  let lastExecTime = 0;

  return function (...args) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime < delay) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastExecTime = currentTime;
        func.apply(this, args);
      }, delay);
    } else {
      lastExecTime = currentTime;
      func.apply(this, args);
    }
  };
};

/**
 * Debounce pour limiter l'exécution d'une fonction
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Hook personnalisé React pour détecter si on doit réduire les animations
 */
export const useReducedMotion = () => {
  if (typeof window === 'undefined') return true;

  const [reduced, setReduced] = React.useState(shouldReduceMotion());

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduced(shouldReduceMotion());

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reduced;
};
