
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

// YouTube API endpoints
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const LIKED_VIDEOS_ENDPOINT = `${API_BASE}/videos`;
const PLAYLIST_ITEMS_ENDPOINT = `${API_BASE}/playlistItems`;
const CHANNELS_ENDPOINT = `${API_BASE}/channels`;

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

// Fetch liked videos from YouTube API with proper liked dates and sorting
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
    
    // First get the user's "liked videos" playlist ID
    const channelResponse = await fetch(`${CHANNELS_ENDPOINT}?part=contentDetails&mine=true`, {
      headers: { Authorization: `Bearer ${storage.userToken}` }
    });
    
    if (!channelResponse.ok) throw new Error('Failed to fetch channel data');
    
    const channelData = await channelResponse.json();
    const likedPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.likes;
    
    // Fetch the videos from the liked playlist - ORDERED BY DATE (most recent first by default from API)
    const playlistResponse = await fetch(`${PLAYLIST_ITEMS_ENDPOINT}?part=snippet,contentDetails&maxResults=50&playlistId=${likedPlaylistId}`, {
      headers: { Authorization: `Bearer ${storage.userToken}` }
    });
    
    if (!playlistResponse.ok) throw new Error('Failed to fetch playlist items');
    
    const playlistData = await playlistResponse.json();
    console.log('Playlist items fetched:', playlistData);
    
    // Get video details for the playlist items
    const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');
    
    const videosResponse = await fetch(`${LIKED_VIDEOS_ENDPOINT}?part=snippet,statistics&id=${videoIds}`, {
      headers: { Authorization: `Bearer ${storage.userToken}` }
    });
    
    if (!videosResponse.ok) throw new Error('Failed to fetch video details');
    
    const videosData = await videosResponse.json();
    
    // Map playlist items to our video objects with correct liked dates
    const videos = playlistData.items.map(item => {
      const videoId = item.contentDetails.videoId;
      const videoDetails = videosData.items.find(v => v.id === videoId);
      
      if (!videoDetails) return null;
      
      return {
        id: videoId,
        title: videoDetails.snippet.title,
        channelTitle: videoDetails.snippet.channelTitle,
        channelId: videoDetails.snippet.channelId,
        publishedAt: videoDetails.snippet.publishedAt,
        // CRITICAL: Use the date from the playlist item for when it was liked
        // This is the actual date when the user liked the video
        likedAt: item.snippet.publishedAt,
        thumbnail: videoDetails.snippet.thumbnails.medium?.url || '',
        viewCount: videoDetails.statistics?.viewCount || '0',
        likeCount: videoDetails.statistics?.likeCount || '0',
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    }).filter(Boolean); // Remove any nulls
    
    // Store the videos locally sorted by latest liked first (this is already the API order)
    const sortedVideos = videos.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));
    
    await chrome.storage.local.set({ 
      likedVideos: sortedVideos,
      nextPageToken: playlistData.nextPageToken || null,
      totalResults: playlistData.pageInfo?.totalResults || sortedVideos.length
    });
    
    console.log('Videos stored in local storage with correct liked dates');
    
    return {
      success: true,
      videos: sortedVideos,
      count: sortedVideos.length,
      nextPageToken: playlistData.nextPageToken,
      totalResults: playlistData.pageInfo?.totalResults || sortedVideos.length
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
    console.log('📺 Fetching more liked videos with page token:', pageToken);
    
    const storage = await chrome.storage.local.get(['userToken', 'tokenExpiry']);
    
    if (!storage.userToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    if (storage.tokenExpiry && Date.now() > storage.tokenExpiry) {
      throw new Error('Token expired. Please sign in again.');
    }
    
    // Get the user's "liked videos" playlist ID
    const channelResponse = await fetch(`${CHANNELS_ENDPOINT}?part=contentDetails&mine=true`, {
      headers: { Authorization: `Bearer ${storage.userToken}` }
    });
    
    if (!channelResponse.ok) throw new Error('Failed to fetch channel data');
    
    const channelData = await channelResponse.json();
    const likedPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.likes;
    
    // Fetch the next page of videos using the pageToken
    const playlistResponse = await fetch(
      `${PLAYLIST_ITEMS_ENDPOINT}?part=snippet,contentDetails&maxResults=50&playlistId=${likedPlaylistId}&pageToken=${pageToken}`, 
      {
        headers: { Authorization: `Bearer ${storage.userToken}` }
      }
    );
    
    if (!playlistResponse.ok) throw new Error('Failed to fetch playlist items');
    
    const playlistData = await playlistResponse.json();
    
    // Get video details for the playlist items
    const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');
    
    const videosResponse = await fetch(`${LIKED_VIDEOS_ENDPOINT}?part=snippet,statistics&id=${videoIds}`, {
      headers: { Authorization: `Bearer ${storage.userToken}` }
    });
    
    if (!videosResponse.ok) throw new Error('Failed to fetch video details');
    
    const videosData = await videosResponse.json();
    
    // Map playlist items to our video objects with correct liked dates
    const newVideos = playlistData.items.map(item => {
      const videoId = item.contentDetails.videoId;
      const videoDetails = videosData.items.find(v => v.id === videoId);
      
      if (!videoDetails) return null;
      
      return {
        id: videoId,
        title: videoDetails.snippet.title,
        channelTitle: videoDetails.snippet.channelTitle,
        channelId: videoDetails.snippet.channelId,
        publishedAt: videoDetails.snippet.publishedAt,
        likedAt: item.snippet.publishedAt,
        thumbnail: videoDetails.snippet.thumbnails.medium?.url || '',
        viewCount: videoDetails.statistics?.viewCount || '0',
        likeCount: videoDetails.statistics?.likeCount || '0',
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    }).filter(Boolean);
    
    console.log(`Fetched ${newVideos.length} additional videos`);
    
    return {
      success: true,
      videos: newVideos,
      count: newVideos.length,
      nextPageToken: playlistData.nextPageToken,
      totalResults: playlistData.pageInfo?.totalResults || 0
    };
    
  } catch (error) {
    console.error('❌ Error fetching more videos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Delete video from YouTube liked list using the API
async function deleteVideoFromYouTube(videoId) {
  try {
    console.log('🗑️ Deleting video from YouTube:', videoId);
    
    const storage = await chrome.storage.local.get(['userToken', 'tokenExpiry']);
    
    if (!storage.userToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    if (storage.tokenExpiry && Date.now() > storage.tokenExpiry) {
      throw new Error('Token expired. Please sign in again.');
    }
    
    // Use YouTube API to remove the like rating (set to 'none')
    const response = await fetch(`${API_BASE}/videos/rate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${storage.userToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `id=${videoId}&rating=none`
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API delete error:', response.status, errorText);
      throw new Error(`Failed to delete video from YouTube: ${response.status}`);
    }
    
    console.log('✅ Video successfully removed from YouTube liked list');
    
    return {
      success: true,
      message: 'Video removed from YouTube liked list'
    };
    
  } catch (error) {
    console.error('❌ Error deleting video from YouTube:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Enhanced export function that fetches ALL liked videos through pagination
async function exportLikedVideos() {
  try {
    console.log('📤 Starting comprehensive export of ALL liked videos...');
    
    const storage = await chrome.storage.local.get(['userToken', 'tokenExpiry']);
    
    if (!storage.userToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    if (storage.tokenExpiry && Date.now() > storage.tokenExpiry) {
      throw new Error('Token expired. Please sign in again.');
    }
    
    // Get the user's "liked videos" playlist ID
    const channelResponse = await fetch(`${CHANNELS_ENDPOINT}?part=contentDetails&mine=true`, {
      headers: { Authorization: `Bearer ${storage.userToken}` }
    });
    
    if (!channelResponse.ok) throw new Error('Failed to fetch channel data');
    
    const channelData = await channelResponse.json();
    const likedPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.likes;
    
    let allVideos = [];
    let nextPageToken = null;
    let pageCount = 1;
    
    console.log('🔄 Starting pagination through ALL liked videos...');
    
    // Fetch ALL pages of videos through pagination
    do {
      console.log(`📄 Fetching page ${pageCount} of liked videos...`);
      
      // Construct the endpoint URL with pageToken if we have one
      let endpoint = `${PLAYLIST_ITEMS_ENDPOINT}?part=snippet,contentDetails&maxResults=50&playlistId=${likedPlaylistId}`;
      if (nextPageToken) {
        endpoint += `&pageToken=${nextPageToken}`;
      }
      
      const playlistResponse = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${storage.userToken}` }
      });
      
      if (!playlistResponse.ok) throw new Error('Failed to fetch playlist items');
      
      const playlistData = await playlistResponse.json();
      
      // Get video details for the playlist items
      const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');
      
      const videosResponse = await fetch(`${LIKED_VIDEOS_ENDPOINT}?part=snippet,statistics,contentDetails&id=${videoIds}`, {
        headers: { Authorization: `Bearer ${storage.userToken}` }
      });
      
      if (!videosResponse.ok) throw new Error('Failed to fetch video details');
      
      const videosData = await videosResponse.json();
      
      // Map playlist items to our video objects with comprehensive data
      const pageVideos = playlistData.items.map(item => {
        const videoId = item.contentDetails.videoId;
        const videoDetails = videosData.items.find(v => v.id === videoId);
        
        if (!videoDetails) return null;
        
        return {
          id: videoId,
          title: videoDetails.snippet.title,
          description: videoDetails.snippet.description,
          channelTitle: videoDetails.snippet.channelTitle,
          channelId: videoDetails.snippet.channelId,
          publishedAt: videoDetails.snippet.publishedAt,
          likedAt: item.snippet.publishedAt, // Actual date when liked
          thumbnail: videoDetails.snippet.thumbnails.medium?.url || '',
          viewCount: videoDetails.statistics?.viewCount || '0',
          likeCount: videoDetails.statistics?.likeCount || '0',
          duration: videoDetails.contentDetails?.duration || '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          channelUrl: `https://www.youtube.com/channel/${videoDetails.snippet.channelId}`
        };
      }).filter(Boolean);
      
      allVideos = [...allVideos, ...pageVideos];
      console.log(`✅ Page ${pageCount}: Added ${pageVideos.length} videos (Total: ${allVideos.length})`);
      
      // Check if there are more pages
      nextPageToken = playlistData.nextPageToken;
      pageCount++;
      
    } while (nextPageToken);
    
    console.log(`🎉 Export complete! Fetched ${allVideos.length} total liked videos`);
    
    if (allVideos.length === 0) {
      return {
        success: false,
        error: 'No liked videos found. Please fetch your videos first.'
      };
    }
    
    // Sort videos by liked date (latest first) for consistency
    const sortedVideos = allVideos.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));
    
    // Prepare comprehensive export data
    const exportData = {
      exportDate: new Date().toISOString(),
      totalVideos: sortedVideos.length,
      note: 'Complete export of all YouTube liked videos with accurate liked dates',
      videos: sortedVideos
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create data URL for the JSON file
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    
    // Use chrome.downloads to save the file
    await chrome.downloads.download({
      url: dataUrl,
      filename: `youtube-liked-videos-complete-${new Date().toISOString().split('T')[0]}.json`,
      saveAs: true
    });
    
    console.log('✅ Complete export file created successfully');
    
    return {
      success: true,
      count: sortedVideos.length,
      message: `Complete export successful! All ${sortedVideos.length} liked videos exported.`
    };
    
  } catch (error) {
    console.error('❌ Export error:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
      
    case 'deleteVideo':
      deleteVideoFromYouTube(message.videoId).then(sendResponse);
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
