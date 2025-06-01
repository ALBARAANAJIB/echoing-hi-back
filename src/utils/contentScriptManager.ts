
// Centralized content script manager to handle observers and prevent race conditions
class ContentScriptManager {
  private static instance: ContentScriptManager;
  private observers: Map<string, MutationObserver> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  private constructor() {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  static getInstance(): ContentScriptManager {
    if (!ContentScriptManager.instance) {
      ContentScriptManager.instance = new ContentScriptManager();
    }
    return ContentScriptManager.instance;
  }

  // Debounced function to prevent multiple rapid calls
  private debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Wait for element with retry mechanism
  async waitForElement(selector: string, timeout: number = 10000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // Inject element with retry logic
  async injectElement(elementId: string, injectionFunction: () => void, targetSelector: string): Promise<boolean> {
    const key = `inject_${elementId}`;
    const currentAttempts = this.retryAttempts.get(key) || 0;

    if (currentAttempts >= this.MAX_RETRIES) {
      console.warn(`Max retries reached for ${elementId}`);
      return false;
    }

    // Check if element already exists
    if (document.getElementById(elementId)) {
      return true;
    }

    // Wait for target element
    const target = await this.waitForElement(targetSelector, 5000);
    if (!target) {
      this.retryAttempts.set(key, currentAttempts + 1);
      setTimeout(() => this.injectElement(elementId, injectionFunction, targetSelector), this.RETRY_DELAY);
      return false;
    }

    try {
      injectionFunction();
      this.retryAttempts.delete(key); // Reset on success
      return true;
    } catch (error) {
      console.error(`Error injecting ${elementId}:`, error);
      this.retryAttempts.set(key, currentAttempts + 1);
      setTimeout(() => this.injectElement(elementId, injectionFunction, targetSelector), this.RETRY_DELAY);
      return false;
    }
  }

  // Setup observer with automatic cleanup
  setupObserver(key: string, targetNode: Node, config: MutationObserverInit, callback: (mutations: MutationRecord[]) => void): void {
    // Clean up existing observer
    this.removeObserver(key);

    const debouncedCallback = this.debounce(callback, 500);
    const observer = new MutationObserver(debouncedCallback);
    observer.observe(targetNode, config);
    this.observers.set(key, observer);
  }

  // Remove specific observer
  removeObserver(key: string): void {
    const observer = this.observers.get(key);
    if (observer) {
      observer.disconnect();
      this.observers.delete(key);
    }
  }

  // Cleanup all observers
  cleanup(): void {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
    this.retryAttempts.clear();
  }
}

export default ContentScriptManager;
