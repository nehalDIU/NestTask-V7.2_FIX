import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
// Import CSS (Vite handles this correctly)
import './index.css';
import { LoadingScreen } from './components/LoadingScreen';
import { initPWA } from './utils/pwa';
// Import the STORES constant directly
import { DB_NAME, DB_VERSION, STORES } from './utils/offlineStorage';

// Performance optimizations initialization
const startTime = performance.now();

// Mark the first paint timing
performance.mark('app-init-start');

// Lazy load the main App component
const App = lazy(() => import('./App').then(module => {
  // Track and log module loading time
  const loadTime = performance.now() - startTime;
  console.debug(`App component loaded in ${loadTime.toFixed(2)}ms`);
  return module;
}));

// Initialize PWA functionality in parallel but don't block initial render
const pwaPromise = Promise.resolve().then(() => {
  setTimeout(() => {
    initPWA().catch(err => console.error('PWA initialization error:', err));
  }, 1000);
});

// Simplified prefetch for critical resources
const prefetchCriticalResources = () => {
  if (navigator.onLine) {
    console.debug('Prefetching critical resources...');
    
    // Prefetch main assets
    const iconUrl = '/icons/icon-192x192.png';
    fetch(iconUrl).catch(err => console.debug('Prefetch error:', err));
    
    // Prefetch important routes
    import('./pages/AuthPage').catch(err => console.debug('Route prefetch error:', err));
  }
};

// Initialize optimizations in parallel - critical path first
Promise.resolve()
  .then(() => {
    // Simplified connection optimizations - using type assertion for the navigator.connection API
    const nav = navigator as any;
    if (nav.connection && 'saveData' in nav.connection && nav.connection.saveData) {
      // Skip prefetching for users with data saver enabled
      console.debug('Data saver mode detected, skipping prefetch');
    } else {
      // Start prefetching critical resources
      setTimeout(prefetchCriticalResources, 1000);
    }
    
    // Then handle PWA initialization
    return pwaPromise;
  })
  .catch(console.error);

// Get the root element with null check
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id "root" in the HTML.');
}

// Create the root with improved error handling
const root = createRoot(rootElement);

// Track initial render time
performance.mark('react-mount-start');

// Render the app with minimal suspense delay and initialize loading state in DOM
root.render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
      <App />
      <Analytics />
    </Suspense>
  </StrictMode>
);

// Add reliable cleanup for loading screen
window.addEventListener('load', () => {
  setTimeout(() => {
    const loadingScreen = document.querySelector('.loading');
    if (loadingScreen) {
      loadingScreen.remove();
    }
  }, 800);
});

// Measure and log render completion time
performance.measure('react-mount', 'react-mount-start');
performance.getEntriesByName('react-mount').forEach(entry => {
  console.debug(`Initial render completed in ${entry.duration.toFixed(2)}ms`);
});