
import SecureApiManager from './secureApiManager';

class ContentScriptManager {
  private static instance: ContentScriptManager;
  private observers: Map<string, MutationObserver> = new Map();
  private secureApi: SecureApiManager;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  private constructor() {
    this.secureApi = SecureApiManager.getInstance();
  }

  static getInstance(): ContentScriptManager {
    if (!ContentScriptManager.instance) {
      ContentScriptManager.instance = new ContentScriptManager();
    }
    return ContentScriptManager.instance;
  }

  // Debounced DOM observer to prevent race conditions
  observeDOM(selector: string, callback: () => void, options = { childList: true, subtree: true }): void {
    // Clean up existing observer for this selector
    this.cleanupObserver(selector);

    let timeoutId: NodeJS.Timeout;
    
    const debouncedCallback: MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Check if target element exists before calling callback
        if (document.querySelector(selector)) {
          callback();
        }
      }, 500); // 500ms debounce
    };

    const observer = new MutationObserver(debouncedCallback);
    observer.observe(document.body, options);
    
    this.observers.set(selector, observer);
    
    // Auto-cleanup after 30 seconds to prevent memory leaks
    setTimeout(() => {
      this.cleanupObserver(selector);
    }, 30000);
  }

  // Wait for element with timeout and retry logic
  async waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    const startTime = Date.now();
    const retryKey = `wait_${selector}`;
    
    return new Promise((resolve) => {
      const checkElement = () => {
        const element = document.querySelector(selector);
        
        if (element) {
          this.retryAttempts.delete(retryKey);
          resolve(element);
          return;
        }
        
        // Check timeout
        if (Date.now() - startTime >= timeout) {
          const attempts = this.retryAttempts.get(retryKey) || 0;
          
          if (attempts < this.maxRetries) {
            this.retryAttempts.set(retryKey, attempts + 1);
            console.log(`Retrying element wait for ${selector}, attempt ${attempts + 1}`);
            setTimeout(checkElement, 1000);
          } else {
            console.warn(`Element ${selector} not found after ${this.maxRetries} retries`);
            this.retryAttempts.delete(retryKey);
            resolve(null);
          }
          return;
        }
        
        // Continue checking
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  }

  // Inject element with collision detection
  injectElement(targetSelector: string, element: HTMLElement, position: 'before' | 'after' | 'inside' = 'after'): boolean {
    try {
      const target = document.querySelector(targetSelector);
      if (!target) {
        console.warn(`Target element ${targetSelector} not found for injection`);
        return false;
      }

      // Check for existing injected elements to prevent duplicates
      const existingId = element.id;
      if (existingId && document.getElementById(existingId)) {
        console.log(`Element ${existingId} already exists, skipping injection`);
        return false;
      }

      switch (position) {
        case 'before':
          target.parentNode?.insertBefore(element, target);
          break;
        case 'after':
          target.parentNode?.insertBefore(element, target.nextSibling);
          break;
        case 'inside':
          target.appendChild(element);
          break;
      }

      return true;
    } catch (error) {
      console.error('Error injecting element:', error);
      return false;
    }
  }

  // Clean up specific observer
  cleanupObserver(selector: string): void {
    const observer = this.observers.get(selector);
    if (observer) {
      observer.disconnect();
      this.observers.delete(selector);
    }
  }

  // Clean up all observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.retryAttempts.clear();
  }
}

export default ContentScriptManager;
