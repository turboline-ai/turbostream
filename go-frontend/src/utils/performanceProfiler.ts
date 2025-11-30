/**
 * Performance monitoring utility for navigation
 * Helps identify slow operations that block navigation
 */

let navigationStartTime = 0;
let currentRoute = '';

export const NavigationProfiler = {
  startNavigation: (route: string) => {
    navigationStartTime = performance.now();
    currentRoute = route;
    //console.log(`🚀 Navigation started to: ${route}`);
  },

  endNavigation: (route: string) => {
    if (navigationStartTime > 0) {
      const duration = performance.now() - navigationStartTime;
     // console.log(`✅ Navigation completed to: ${route} (${duration.toFixed(2)}ms)`);
      
      if (duration > 200) {
        //console.warn(`⚠️ Slow navigation detected: ${duration.toFixed(2)}ms to ${route}`);
      }
      
      navigationStartTime = 0;
    }
  },

  measureAsync: async <T>(operation: Promise<T>, label: string): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation;
      const duration = performance.now() - start;
      console.log(`📊 ${label}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`❌ ${label} failed: ${duration.toFixed(2)}ms`);
      throw error;
    }
  },

  measureSync: <T>(fn: () => T, label: string): T => {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      console.log(`📊 ${label}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`❌ ${label} failed: ${duration.toFixed(2)}ms`);
      throw error;
    }
  }
};