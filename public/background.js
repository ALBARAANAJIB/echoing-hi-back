// YouTube Enhancer Background Script with Modern Chrome Authentication
console.log('🚀 YouTube Enhancer background script loaded');

// OAuth 2.0 constants
const CLIENT_ID = '304162096302-4mpo9949jogs1ptnpmc0s4ipkq53dbsm.apps.googleusercontent.com';
const REDIRECT_URL = chrome.identity.getRedirectURL();
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

// Set up extension installation/startup
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('📦 Extension installed successfully');
    console.log('🔗 OAuth Redirect URL:', REDIRECT_URL);
  }
});

// Modern Chrome Authentication using getAuthToken
async function authenticateWithYouTube() {
  try {
    console.log('🔐 Starting YouTube authentication with Chrome Identity API...');
    console.log('🆔 Client ID:', CLIENT_ID);
    console.log('🔗 Redirect URL:', REDIRECT_URL);
    console.log('📝 Scopes:', SCOPES);
    
    // Clear any existing tokens first
    await chrome.storage.local.remove(['userToken', 'userInfo']);
    
    // Use Chrome's built-in authentication with explicit scopes
    const token = await chrome.identity.getAuthToken({
      interactive: true,
      scopes: SCOPES
    });
    
    if (!token) {
      throw new Error('Authentication was cancelled or failed');
    }
    
    // Ensure token is a string
    const accessToken = typeof token === 'string' ? token : token.token || '';
    
    if (!accessToken) {
      throw new Error('No valid access token received');
    }
    
    console.log('🎟️ Access token received:', accessToken.substring(0, 20) + '...');
    
    // Get user info from Google API
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user information');
    }
    
    const userInfo = await userInfoResponse.json();
    console.log('👤 User info received:', userInfo);
    
    // Store authentication data
    await chrome.storage.local.set({
      userToken: accessToken,
      userInfo: userInfo,
      tokenExpiry: Date.now() + (3600 * 1000) // 1 hour from now
    });
    
    console.log('💾 Authentication data stored successfully');
    
    return {
      success: true,
      userInfo: userInfo,
      message: 'Authentication successful!'
    };
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    // Clear any partial authentication data
    await chrome.storage.local.remove(['userToken', 'userInfo', 'tokenExpiry']);
    
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
}

// Fetch liked videos from YouTube API
async function fetchLikedVideos() {
  try {
    console.log('📺 Fetching liked videos...');
    
    const storage = await chrome.storage.local.get(['userToken', 'tokenExpiry']);
    
    if (!storage.userToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    if (storage.tokenExpiry && Date.now() > storage.tokenExpiry) {
      throw new Error('Token expired. Please sign in again.');
    }
    
    // Fetch liked videos using YouTube Data API v3
    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&myRating=like&maxResults=50', {
      headers: {
        'Authorization': `Bearer ${storage.userToken}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Liked videos fetched:', data.items?.length || 0);
    
    // Process videos with proper structure for dashboard
    const processedVideos = (data.items || []).map(video => ({
      id: video.id,
      title: video.snippet?.title || 'Unknown Title',
      channelTitle: video.snippet?.channelTitle || 'Unknown Channel',
      publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
      likedAt: new Date().toISOString(), // We don't have actual liked date from API
      url: `https://www.youtube.com/watch?v=${video.id}`,
      viewCount: video.statistics?.viewCount || '0',
      likeCount: video.statistics?.likeCount || '0',
      thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || ''
    }));
    
    // Store the videos with pagination info
    await chrome.storage.local.set({
      likedVideos: processedVideos,
      lastFetch: Date.now(),
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || processedVideos.length
    });
    
    return {
      success: true,
      videos: processedVideos,
      count: processedVideos.length,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults || processedVideos.length
    };
    
  } catch (error) {
    console.error('❌ Error fetching liked videos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fetch more liked videos using pageToken
async function fetchMoreLikedVideos(pageToken) {
  try {
    console.log('📺 Fetching more liked videos with pageToken:', pageToken);
    
    const storage = await chrome.storage.local.get(['userToken', 'tokenExpiry']);
    
    if (!storage.userToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    if (storage.tokenExpiry && Date.now() > storage.tokenExpiry) {
      throw new Error('Token expired. Please sign in again.');
    }
    
    // Fetch more liked videos using YouTube Data API v3 with pageToken
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&myRating=like&maxResults=50&pageToken=${pageToken}`, {
      headers: {
        'Authorization': `Bearer ${storage.userToken}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ More liked videos fetched:', data.items?.length || 0);
    
    // Process videos with proper structure for dashboard
    const processedVideos = (data.items || []).map(video => ({
      id: video.id,
      title: video.snippet?.title || 'Unknown Title',
      channelTitle: video.snippet?.channelTitle || 'Unknown Channel',
      publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
      likedAt: new Date().toISOString(), // We don't have actual liked date from API
      url: `https://www.youtube.com/watch?v=${video.id}`,
      viewCount: video.statistics?.viewCount || '0',
      likeCount: video.statistics?.likeCount || '0',
      thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || ''
    }));
    
    return {
      success: true,
      videos: processedVideos,
      count: processedVideos.length,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults || 0
    };
    
  } catch (error) {
    console.error('❌ Error fetching more liked videos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export liked videos data - Fixed for service worker
async function exportLikedVideos() {
  try {
    console.log('📤 Exporting liked videos...');
    
    const storage = await chrome.storage.local.get(['likedVideos']);
    const videos = storage.likedVideos || [];
    
    if (videos.length === 0) {
      return {
        success: false,
        error: 'No liked videos found. Please fetch your videos first.'
      };
    }
    
    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      totalVideos: videos.length,
      videos: videos.map(video => ({
        title: video.title,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        videoId: video.id,
        url: video.url,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        thumbnail: video.thumbnail
      }))
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create data URL for the JSON file
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    
    // Use chrome.downloads to save the file
    await chrome.downloads.download({
      url: dataUrl,
      filename: `youtube-liked-videos-${new Date().toISOString().split('T')[0]}.json`,
      saveAs: true
    });
    
    console.log('✅ Export completed');
    
    return {
      success: true,
      count: videos.length,
      message: 'Export completed successfully!'
    };
    
  } catch (error) {
    console.error('❌ Export error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle video removal from liked list - ACTUALLY DELETE FROM YOUTUBE
if (request.action === 'deleteVideo') {
  (async () => {
    try {
      const result = await chrome.storage.local.get(['userToken', 'likedVideos']);
      if (!result.userToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      console.log(`🗑️ Deleting video ${request.videoId} from YouTube liked list...`);

      // Call YouTube API to remove video from liked list by setting rating to 'none'
      const response = await fetch(`${API_BASE}/videos/rate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${result.userToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `id=${request.videoId}&rating=none`
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API delete error:', response.status, errorText);
        throw new Error(`Failed to delete video from YouTube: ${response.status}`);
      }
      
      console.log('✅ Successfully removed video from YouTube liked list');
      
      // Update local storage to remove the video
      if (result.likedVideos) {
        const updatedVideos = result.likedVideos.filter(video => video.id !== request.videoId);
        await chrome.storage.local.set({ 
          likedVideos: updatedVideos,
          totalResults: Math.max(0, (result.totalResults || result.likedVideos.length) - 1)
        });
        console.log('✅ Updated local storage');
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep the message channel open for the async response
}

// Handle bulk video deletion from YouTube
if (request.action === 'deleteMultipleVideos') {
  (async () => {
    try {
      const result = await chrome.storage.local.get(['userToken', 'likedVideos']);
      if (!result.userToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      const videoIds = request.videoIds || [];
      console.log(`🗑️ Bulk deleting ${videoIds.length} videos from YouTube...`);

      let successCount = 0;
      let failedVideos = [];

      // Delete each video from YouTube
      for (const videoId of videoIds) {
        try {
          const response = await fetch(`${API_BASE}/videos/rate`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${result.userToken}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `id=${videoId}&rating=none`
          });
          
          if (response.ok) {
            successCount++;
            console.log(`✅ Deleted video ${videoId} from YouTube`);
          } else {
            failedVideos.push(videoId);
            console.error(`❌ Failed to delete video ${videoId}:`, response.status);
          }
        } catch (error) {
          failedVideos.push(videoId);
          console.error(`❌ Error deleting video ${videoId}:`, error);
        }
      }
      
      // Update local storage to remove successfully deleted videos
      if (result.likedVideos && successCount > 0) {
        const updatedVideos = result.likedVideos.filter(video => !videoIds.includes(video.id) || failedVideos.includes(video.id));
        await chrome.storage.local.set({ 
          likedVideos: updatedVideos,
          totalResults: Math.max(0, (result.totalResults || result.likedVideos.length) - successCount)
        });
      }
      
      sendResponse({ 
        success: true, 
        successCount, 
        failedCount: failedVideos.length,
        failedVideos 
      });
    } catch (error) {
      console.error('❌ Error in bulk delete:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true;
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  switch (message.action) {
    case 'authenticate':
      authenticateWithYouTube().then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'fetchLikedVideos':
      fetchLikedVideos().then(sendResponse);
      return true;
      
    case 'fetchMoreVideos':
      fetchMoreLikedVideos(message.pageToken).then(sendResponse);
      return true;
      
    case 'exportData':
      exportLikedVideos().then(sendResponse);
      return true;
      
    default:
      console.log('❓ Unknown action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension startup');
});

console.log('✅ Background script fully initialized');
