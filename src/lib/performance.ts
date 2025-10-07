// Performance optimization service for EdgeTask

// Type declarations for Chrome APIs
declare const chrome: any;

// Performance metrics
export interface PerformanceMetrics {
  renderTime: number;
  dbOperationTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

// Cache configuration
export interface CacheConfig {
  maxSize: number; // Maximum number of items in cache
  ttl: number; // Time to live in milliseconds
}

// Default cache configuration
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 100,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Simple LRU cache implementation
export class LRUCache<T> {
  private maxSize: number;
  private ttl: number;
  private cache: Map<string, { value: T; timestamp: number }>;

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.maxSize = config.maxSize;
    this.ttl = config.ttl;
    this.cache = new Map();
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Move item to the end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove existing item if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add new item
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    
    // Remove oldest items if cache is too large
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private cacheHits: number;
  private cacheMisses: number;

  constructor() {
    this.metrics = {
      renderTime: 0,
      dbOperationTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };
    this.startTime = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  startRender(): void {
    this.startTime = performance.now();
  }

  endRender(): number {
    const renderTime = performance.now() - this.startTime;
    this.metrics.renderTime += renderTime;
    return renderTime;
  }

  startDbOperation(): void {
    this.startTime = performance.now();
  }

  endDbOperation(): number {
    const dbTime = performance.now() - this.startTime;
    this.metrics.dbOperationTime += dbTime;
    return dbTime;
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.cacheHits / total : 0;
  }

  updateMemoryUsage(): void {
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
  }

  getMetrics(): PerformanceMetrics {
    this.updateCacheHitRate();
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      renderTime: 0,
      dbOperationTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Create a performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Create caches for different data types
export const taskCache = new LRUCache<any>({ maxSize: 50, ttl: 5 * 60 * 1000 });
export const settingsCache = new LRUCache<any>({ maxSize: 10, ttl: 10 * 60 * 1000 });
export const analyticsCache = new LRUCache<any>({ maxSize: 20, ttl: 15 * 60 * 1000 });

// Debounce function to limit how often a function can be called
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Throttle function to limit how often a function can be called
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Memoize function to cache results of expensive function calls
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      performanceMonitor.recordCacheHit();
      return cache.get(key) as ReturnType<T>;
    }
    
    performanceMonitor.recordCacheMiss();
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  } as T;
}

// Lazy load components
export function lazyLoad<T>(
  loader: () => Promise<T>,
  fallback?: T
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Try to load from cache first
    const cacheKey = loader.toString();
    const cached = taskCache.get(cacheKey);
    
    if (cached) {
      performanceMonitor.recordCacheHit();
      resolve(cached);
      return;
    }
    
    performanceMonitor.recordCacheMiss();
    
    // If fallback is provided, resolve with it immediately
    if (fallback !== undefined) {
      resolve(fallback);
    }
    
    // Load the component
    loader()
      .then((module) => {
        taskCache.set(cacheKey, module);
        resolve(module);
      })
      .catch((error) => {
        console.error('Error lazy loading module:', error);
        reject(error);
      });
  });
}

// Optimize database operations
export function optimizeDbOperations<T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 10
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    let currentIndex = 0;
    
    const processBatch = async () => {
      const batch = operations.slice(currentIndex, currentIndex + batchSize);
      
      if (batch.length === 0) {
        resolve(results);
        return;
      }
      
      try {
        performanceMonitor.startDbOperation();
        const batchResults = await Promise.all(batch.map(op => op()));
        performanceMonitor.endDbOperation();
        
        results.push(...batchResults);
        currentIndex += batchSize;
        
        // Process next batch after a short delay to avoid blocking the UI
        setTimeout(processBatch, 0);
      } catch (error) {
        reject(error);
      }
    };
    
    processBatch();
  });
}

// Optimize rendering by using requestAnimationFrame
export function scheduleRender(renderFn: () => void): void {
  requestAnimationFrame(() => {
    performanceMonitor.startRender();
    renderFn();
    performanceMonitor.endRender();
  });
}

// Preload critical resources
export function preloadResources(resources: string[]): Promise<void[]> {
  return Promise.all(
    resources.map(resource => {
      return new Promise<void>((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        
        // Determine resource type
        if (resource.endsWith('.js')) {
          link.as = 'script';
        } else if (resource.endsWith('.css')) {
          link.as = 'style';
        } else if (resource.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
          link.as = 'image';
        } else {
          link.as = 'fetch';
        }
        
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to preload ${resource}`));
        
        document.head.appendChild(link);
      });
    })
  );
}

// Optimize images by using WebP format when supported
export function optimizeImageSrc(src: string): string {
  // Check if WebP is supported
  const canvas = document.createElement('canvas');
  const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  if (webpSupported && src.match(/\.(png|jpg|jpeg|gif)$/)) {
    // Replace extension with WebP
    return src.replace(/\.(png|jpg|jpeg|gif)$/, '.webp');
  }
  
  return src;
}

// Reduce re-renders by using stable references
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  return useRef((...args: any[]) => callbackRef.current(...args)).current as T;
}

// Virtual scrolling for large lists
export function createVirtualScrollContainer(
  container: HTMLElement,
  itemHeight: number,
  renderItem: (index: number, item: any) => HTMLElement,
  getItems: () => any[]
): void {
  let scrollTop = 0;
  let containerHeight = 0;
  let visibleStartIndex = 0;
  let visibleEndIndex = 0;
  let items: any[] = [];
  
  const updateVisibleRange = () => {
    visibleStartIndex = Math.floor(scrollTop / itemHeight);
    visibleEndIndex = Math.min(
      visibleStartIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length - 1
    );
  };
  
  const renderItems = () => {
    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Add spacer for items above visible range
    const topSpacer = document.createElement('div');
    topSpacer.style.height = `${visibleStartIndex * itemHeight}px`;
    container.appendChild(topSpacer);
    
    // Render visible items
    for (let i = visibleStartIndex; i <= visibleEndIndex; i++) {
      const itemElement = renderItem(i, items[i]);
      container.appendChild(itemElement);
    }
    
    // Add spacer for items below visible range
    const bottomSpacer = document.createElement('div');
    bottomSpacer.style.height = `${(items.length - visibleEndIndex - 1) * itemHeight}px`;
    container.appendChild(bottomSpacer);
  };
  
  const handleScroll = throttle(() => {
    scrollTop = container.scrollTop;
    updateVisibleRange();
    renderItems();
  }, 16); // Throttle to ~60fps
  
  const handleResize = debounce(() => {
    containerHeight = container.clientHeight;
    updateVisibleRange();
    renderItems();
  }, 100);
  
  // Initial setup
  const updateItems = () => {
    items = getItems();
    updateVisibleRange();
    renderItems();
  };
  
  container.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  
  // Initial render
  containerHeight = container.clientHeight;
  updateItems();
  
  // Return cleanup function
  return () => {
    container.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
  };
}

// Performance monitoring and reporting
export function reportPerformanceMetrics(): void {
  const metrics = performanceMonitor.getMetrics();
  
  console.log('Performance Metrics:', metrics);
  
  // Report to analytics service if available
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'performance_metrics',
      metrics
    });
  }
}

// Initialize performance optimizations
export function initializePerformanceOptimizations(): void {
  // Report metrics every 30 seconds
  setInterval(reportPerformanceMetrics, 30000);
  
  // Preload critical resources
  preloadResources([
    'icon-128.png',
    'icon-48.png'
  ]).catch(error => {
    console.error('Error preloading resources:', error);
  });
  
  // Optimize images on the page
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      img.setAttribute('src', optimizeImageSrc(src));
    }
  });
}