document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('login-button');
  const loginContainer = document.getElementById('login-container');
  const featuresContainer = document.getElementById('features-container');
  const fetchVideosButton = document.getElementById('fetch-videos');
  const openDashboardButton = document.getElementById('open-dashboard');
  const exportDataButton = document.getElementById('export-data');
  const aiSummaryButton = document.getElementById('ai-summary');
  const signOutButton = document.getElementById('sign-out');
  const userEmail = document.getElementById('user-email');
  const userInitial = document.getElementById('user-initial');

  // Enhanced authentication check
  function checkAuthStatus() {
    chrome.storage.local.get(['userToken', 'userInfo'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage access error:', chrome.runtime.lastError);
        showError('Failed to check authentication status');
        return;
      }
      
      if (result.userToken && result.userInfo) {
        console.log('User appears to be authenticated');
        
        // Validate token with background script
        chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Auth check failed:', chrome.runtime.lastError);
            showLoginUI();
            return;
          }
          
          if (response && response.authenticated) {
            showFeaturesUI(response.userInfo || result.userInfo);
          } else {
            console.log('Authentication validation failed:', response?.error);
            showLoginUI();
          }
        });
      } else {
        console.log('No stored authentication found');
        showLoginUI();
      }
    });
  }

  function showLoginUI() {
    loginContainer.style.display = 'block';
    featuresContainer.style.display = 'none';
  }

  function showFeaturesUI(userInfo) {
    loginContainer.style.display = 'none';
    featuresContainer.style.display = 'block';
    
    if (userInfo) {
      const displayName = userInfo.email || userInfo.name || 'User';
      const initial = displayName.charAt(0).toUpperCase();
      
      if (userEmail) userEmail.textContent = displayName;
      if (userInitial) userInitial.textContent = initial;
    }
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 12px;
    `;
    errorDiv.textContent = message;
    
    const container = loginContainer.style.display !== 'none' ? loginContainer : featuresContainer;
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
      color: #059669;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 12px;
    `;
    successDiv.textContent = message;
    
    featuresContainer.insertBefore(successDiv, featuresContainer.firstChild);
    setTimeout(() => successDiv.remove(), 3000);
  }

  // Check authentication status on load
  checkAuthStatus();

  // Enhanced login handler
  if (loginButton) {
    loginButton.addEventListener('click', () => {
      console.log('Login button clicked');
      loginButton.disabled = true;
      loginButton.textContent = 'Signing in...';
      
      // Clear any existing error messages
      document.querySelectorAll('.error-message').forEach(el => el.remove());
      
      chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
        console.log('Authentication response:', response);
        
        loginButton.disabled = false;
        loginButton.textContent = 'Sign in with YouTube';
        
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          showError(`Connection error: ${chrome.runtime.lastError.message}`);
          return;
        }
        
        if (response && response.success) {
          console.log('Authentication successful');
          showFeaturesUI(response.userInfo);
        } else {
          console.error('Authentication failed:', response?.error);
          showError(response?.error || 'Authentication failed. Please try again.');
        }
      });
    });
  }

  // Fetch liked videos
  fetchVideosButton && fetchVideosButton.addEventListener('click', () => {
    fetchVideosButton.disabled = true;
    const originalText = fetchVideosButton.textContent;
    fetchVideosButton.textContent = 'Fetching...';
    
    chrome.runtime.sendMessage({ action: 'fetchLikedVideos' }, (response) => {
      fetchVideosButton.disabled = false;
      fetchVideosButton.textContent = originalText;
      
      if (response && response.success) {
        showSuccessMessage(fetchVideosButton, `${response.count} videos fetched!`);
      } else {
        showErrorMessage('Failed to fetch videos. Please try again.');
      }
    });
  });

  // Open dashboard
  openDashboardButton && openDashboardButton.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  // Export data
  exportDataButton && exportDataButton.addEventListener('click', () => {
    exportDataButton.disabled = true;
    const originalText = exportDataButton.textContent;
    exportDataButton.textContent = 'Exporting...';
    
    chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
      setTimeout(() => {
        exportDataButton.disabled = false;
        exportDataButton.textContent = originalText;
        
        if (response && response.success) {
          showSuccessMessage(exportDataButton, `${response.count} videos exported!`);
        } else {
          showErrorMessage('Export failed. Please try again.');
          console.error('Export failed:', response?.error || 'Unknown error');
        }
      }, 1000);
    });
  });

  // AI Summary
  aiSummaryButton && aiSummaryButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      
      if (currentTab && currentTab.url && currentTab.url.includes('youtube.com/watch')) {
        showSuccessMessage(aiSummaryButton, "Summarization panel is now available on the video page!");
        window.close();
      } else {
        chrome.tabs.create({ 
          url: chrome.runtime.getURL('dashboard.html?tab=ai') 
        });
      }
    });
  });

  // Enhanced sign out
  if (signOutButton) {
    signOutButton.addEventListener('click', () => {
      console.log('Signing out...');
      
      // Revoke token first
      chrome.storage.local.get('userToken', (result) => {
        if (result.userToken) {
          // Revoke the token
          fetch(`https://oauth2.googleapis.com/revoke?token=${result.userToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }).catch(err => console.log('Token revocation failed:', err));
        }
        
        // Clear storage
        chrome.storage.local.remove(['userToken', 'userInfo', 'likedVideos'], () => {
          console.log('Signed out successfully');
          showLoginUI();
        });
      });
    });
  }
  
  // Helper functions
  function showSuccessMessage(element, message) {
    const successMessage = document.createElement('div');
    successMessage.classList.add('success-message');
    successMessage.textContent = message;
    
    element.parentNode.insertBefore(successMessage, element.nextSibling);
    
    setTimeout(() => {
      successMessage.remove();
    }, 3000);
  }
  
  function showErrorMessage(message) {
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    errorMessage.style.color = '#ff3333';
    errorMessage.style.padding = '8px';
    errorMessage.style.margin = '8px 0';
    errorMessage.style.borderRadius = '4px';
    errorMessage.style.backgroundColor = 'rgba(255,0,0,0.1)';
    errorMessage.textContent = message;
    
    const container = loginContainer.style.display === 'none' ? featuresContainer : loginContainer;
    container.insertBefore(errorMessage, container.firstChild);
    
    setTimeout(() => {
      errorMessage.remove();
    }, 5000);
  }
});
