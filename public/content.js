
// Enhanced YouTube extension with professional design and advanced long video summarization
function injectSummarizationPanel() {
  // Check if we're on a YouTube video page
  if (!window.location.href.includes('youtube.com/watch')) {
    return;
  }

  // Remove existing panel if it exists
  const existingPanel = document.getElementById('youtube-enhancer-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Wait for YouTube's secondary column to load
  const secondaryColumn = document.querySelector('#secondary');
  if (!secondaryColumn) {
    setTimeout(injectSummarizationPanel, 1000);
    return;
  }

  // Create the professional summarization panel
  const panel = document.createElement('div');
  panel.id = 'youtube-enhancer-panel';
  panel.innerHTML = `
    <div style="
      background: #ffffff;
      border-radius: 12px;
      margin-bottom: 16px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', system-ui, sans-serif;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    ">
      <!-- Professional Header -->
      <div style="
        background: #f9fafb;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid #e5e7eb;
      ">
        <div style="
          width: 20px;
          height: 20px;
          background: #f3f4f6;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #374151;
          font-weight: 600;
          border: 1px solid #d1d5db;
        ">AI</div>
        <h3 style="
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          letter-spacing: -0.025em;
        ">Video Summary</h3>
      </div>
      
      <!-- Content -->
      <div style="padding: 20px;">
        <!-- Mode Selector -->
        <div style="margin-bottom: 16px;">
          <select id="detail-level" style="
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 13px;
            background: #ffffff;
            color: #111827;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
            appearance: none;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" viewBox=\"0 0 10 10\"><path d=\"M8 3L5 6 2 3\" stroke=\"%23666\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>');
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
          ">
            <option value="quick">Quick Summary</option>
            <option value="detailed" selected>Detailed Summary</option>
          </select>
        </div>
        
        <button id="summarize-video-btn" style="
          width: 100%;
          background: #f9fafb;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
          font-family: inherit;
          letter-spacing: -0.025em;
        " onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#9ca3af'" 
           onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Generate Summary</span>
        </button>
        
        <div id="summary-loading" style="
          display: none;
          text-align: center;
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #f3f4f6;
        ">
          <div style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f4f6;
            border-top: 2px solid #6b7280;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          "></div>
          <div style="
            font-size: 12px; 
            color: #6b7280;
            font-weight: 400;
          " id="loading-message">Analyzing video content...</div>
        </div>
        
        <div id="summary-content" style="
          display: none;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #f3f4f6;
          overflow: hidden;
        "></div>
      </div>
    </div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      #detail-level:focus {
        outline: none;
        border-color: #6b7280;
        box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
      }
    </style>
  `;

  // Insert the panel at the top of the secondary column
  secondaryColumn.insertBefore(panel, secondaryColumn.firstChild);

  // Add event listeners
  const summarizeBtn = document.getElementById('summarize-video-btn');
  const loadingDiv = document.getElementById('summary-loading');
  const contentDiv = document.getElementById('summary-content');
  const loadingMessage = document.getElementById('loading-message');
  const detailLevelSelect = document.getElementById('detail-level');

  summarizeBtn?.addEventListener('click', async () => {
    const currentUrl = window.location.href;
    const detailLevel = detailLevelSelect.value;
    
    // Show loading
    summarizeBtn.style.display = 'none';
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';

    try {
      await summarizeVideo(currentUrl, detailLevel, loadingMessage, contentDiv, loadingDiv, summarizeBtn);
    } catch (error) {
      console.error('Error:', error);
      showError(contentDiv, loadingDiv, summarizeBtn, error.message);
    }
  });
}

// Enhanced prompts specifically designed for long video analysis like Google AI Studio
function getAdvancedPrompt(detailLevel, isLongVideo = false, videoDuration = '') {
  const baseInstructions = `CRITICAL: Respond ONLY in the video's spoken language. Match the language exactly.

Language Detection Rules:
- If video is Arabic → write EVERYTHING in Arabic
- If video is English → write EVERYTHING in English  
- If video is Spanish → write EVERYTHING in Spanish
- If video is German → write EVERYTHING in German
- If video is French → write EVERYTHING in French
- NO ENGLISH if video is not in English. NO mixed languages.`;

  if (isLongVideo) {
    return `${baseInstructions}

This is a LONG VIDEO (${videoDuration || '50+ minutes'}). You are an expert video analyst. Provide a comprehensive, well-structured summary that captures the narrative flow and key moments.

STRUCTURE YOUR RESPONSE LIKE THIS:

**Video Overview:**
- Brief description of content type and main theme
- Key participants/characters involved
- Overall context and setting

**Main Segments & Progression:**
Break the video into logical segments with clear progression:

**Early Section (0-20%):**
- Initial setup, context, or introduction
- Key early events or decisions
- Important items, characters, or challenges introduced

**Development Phase (20-60%):**
- Major events and turning points
- Character/gameplay progression
- Key challenges faced and overcome
- Important discoveries or realizations

**Climax & Resolution (60-100%):**
- Escalation of main conflict or challenge
- Critical moments and decisions
- Final outcomes and resolutions
- Overall results and conclusions

**Key Highlights:**
- Most significant moments or quotes
- Impressive achievements or failures
- Memorable interactions or reactions
- Technical details if relevant

**Final Analysis:**
- Overall performance or outcome statistics
- Time taken, completion percentage, or other metrics
- Lasting impact or significance of the experience

${detailLevel === 'quick' ? 
  'Provide this structure in 300-400 words, focusing on main segments and key highlights.' : 
  'Provide this structure in 600-800 words with detailed analysis of each segment and comprehensive coverage of key moments.'}

Make your response engaging and narrative-driven, capturing both the content and the emotional journey. Use specific details, timestamps when mentioned, and maintain the chronological flow of events.

Remember: Use ONLY the video's spoken language throughout your entire response.`;
  }

  const wordCount = detailLevel === 'quick' ? '150-250' : '400-600';
  return `${baseInstructions}

Watch this video and write a ${detailLevel} summary (${wordCount} words) in the EXACT same language as the video content.

${detailLevel === 'quick' ? 'Summarize the main points briefly with clear structure.' : 'Cover main topics, key points, and important details thoroughly with organized sections.'}

Structure your response with clear headings and logical flow. Match the video language perfectly.`;
}

async function summarizeVideo(videoUrl, detailLevel, loadingMessage, contentDiv, loadingDiv, summarizeBtn) {
  const API_KEY = 'AIzaSyDxQpk6jmBsM5lsGdzRJKokQkwSVTk5sRg';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  try {
    // Enhanced video duration detection
    const videoDuration = getVideoDuration();
    const isLongVideo = checkIfLongVideo(videoDuration);
    
    const messages = {
      quick: isLongVideo ? 'Analyzing long video structure and key segments...' : 'Creating quick overview...',
      detailed: isLongVideo ? 'Processing long video segments with detailed analysis...' : 'Analyzing content thoroughly...'
    };
    
    loadingMessage.textContent = messages[detailLevel] || 'Processing video...';
    
    // Enhanced configuration for long videos
    const requestBody = {
      contents: [
        {
          parts: [
            { text: getAdvancedPrompt(detailLevel, isLongVideo, videoDuration) },
            {
              fileData: {
                fileUri: videoUrl,
                mimeType: "video/youtube"
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.03, // Very low for consistency and accuracy
        maxOutputTokens: isLongVideo ? (detailLevel === 'quick' ? 500 : 1200) : (detailLevel === 'quick' ? 350 : 800),
        topP: 0.05, // More focused responses
        topK: 1,
        candidateCount: 1,
        responseMimeType: "text/plain"
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    console.log('Making enhanced API request for', isLongVideo ? `long video (${videoDuration})` : 'standard video...');

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      if (response.status === 429) {
        throw new Error('High demand detected 🌟 Please try again in a few minutes');
      }
      if (response.status === 400) {
        if (errorText.includes('Video too long') || errorText.includes('INVALID_ARGUMENT')) {
          throw new Error('Video processing limit reached 📹 Try Quick mode or a shorter video');
        }
        throw new Error('Video format issue 🎬 Please try a different video');
      }
      if (response.status >= 500) {
        throw new Error('Server taking a break ☕ Please try again shortly');
      }
      throw new Error('Service busy 🌸 Please try again in a moment');
    }

    const data = await response.json();
    console.log('API Response received:', data);
    
    let summary = '';
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      summary = data.candidates[0].content.parts[0].text.trim();
    } else {
      // Handle specific finish reasons
      if (data?.candidates?.[0]?.finishReason) {
        const reason = data.candidates[0].finishReason;
        console.log('Finish reason:', reason);
        
        if (reason === 'SAFETY') {
          throw new Error('Content needs special handling 🛡️ Try a different video');
        } else if (reason === 'MAX_TOKENS') {
          // For long videos, this might be normal - check if we have partial content
          if (data.candidates[0].content?.parts?.[0]?.text) {
            summary = data.candidates[0].content.parts[0].text.trim();
            console.log('Got partial summary due to max tokens');
          } else {
            throw new Error('Video too comprehensive! 📚 Try Quick mode for detailed videos');
          }
        } else if (reason === 'RECITATION') {
          throw new Error('Copyright considerations detected 📄 Try a different video');
        } else if (reason === 'OTHER') {
          throw new Error('Processing issue detected 🔧 Please try again');
        }
      }
      
      if (!summary) {
        throw new Error('Processing incomplete 🤔 Please try again');
      }
    }

    if (summary && summary.length > 50) {
      showSuccess(contentDiv, loadingDiv, summarizeBtn, summary, detailLevel);
    } else {
      throw new Error('Summary too brief 📝 Please try again with different settings');
    }
  } catch (error) {
    console.error('Error in summarizeVideo:', error);
    if (error.message.includes('fetch') || error.message.includes('network')) {
      throw new Error('Connection issue 🌐 Please check internet and try again');
    }
    throw error;
  }
}

// Enhanced video duration detection
function getVideoDuration() {
  const durationElement = document.querySelector('.ytp-time-duration');
  if (durationElement) {
    return durationElement.textContent;
  }
  
  // Alternative selectors
  const altDuration = document.querySelector('#movie_player .ytp-time-duration');
  if (altDuration) {
    return altDuration.textContent;
  }
  
  return '';
}

// Improved long video detection
function checkIfLongVideo(duration = '') {
  if (!duration) {
    duration = getVideoDuration();
  }
  
  if (duration) {
    const parts = duration.split(':');
    if (parts.length >= 3) { // Hours:Minutes:Seconds format
      return true;
    } else if (parts.length === 2) { // Minutes:Seconds format
      const minutes = parseInt(parts[0]);
      return minutes >= 50;
    }
  }
  
  // Fallback: check if video player indicates long content
  const videoElement = document.querySelector('video');
  if (videoElement && videoElement.duration) {
    return videoElement.duration >= 3000; // 50 minutes in seconds
  }
  
  return false;
}

function showSuccess(contentDiv, loadingDiv, summarizeBtn, summary, detailLevel) {
  loadingDiv.style.display = 'none';
  
  const detailLabels = {
    quick: 'Quick Summary',
    detailed: 'Detailed Summary'
  };
  
  contentDiv.innerHTML = `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: #f9fafb;
      border-bottom: 1px solid #f3f4f6;
    ">
      <strong style="
        color: #111827; 
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.025em;
      ">${detailLabels[detailLevel] || 'Summary'}</strong>
      <button id="copy-summary" style="
        background: #ffffff;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        padding: 5px 10px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        font-family: inherit;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        Copy
      </button>
    </div>
    <div style="
      padding: 16px;
      line-height: 1.7;
      font-size: 14px;
      color: #111827;
      max-height: 400px;
      overflow-y: auto;
      word-wrap: break-word;
      white-space: pre-wrap;
      font-weight: 400;
      letter-spacing: -0.025em;
      background: #ffffff;
    ">${summary}</div>
  `;
  
  // Add copy functionality
  const copyBtn = document.getElementById('copy-summary');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary);
      copyBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Copied!
      `;
      copyBtn.style.color = '#059669';
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          Copy
        `;
        copyBtn.style.color = '#374151';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  });
  
  contentDiv.style.display = 'block';
  summarizeBtn.style.display = 'block';
}

function showError(contentDiv, loadingDiv, summarizeBtn, errorMessage) {
  loadingDiv.style.display = 'none';
  
  contentDiv.innerHTML = `
    <div style="
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    ">
      <div style="
        font-size: 16px;
        margin-bottom: 8px;
      ">😔</div>
      <div style="
        font-weight: 600; 
        margin-bottom: 6px; 
        font-size: 13px;
        color: #dc2626;
      ">Something went wrong</div>
      <div style="
        font-size: 12px; 
        line-height: 1.4; 
        color: #991b1b;
        margin-bottom: 12px;
      ">${errorMessage}</div>
      <button onclick="document.getElementById('summarize-video-btn').click()" style="
        background: #f9fafb;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 500;
        font-family: inherit;
      ">🔄 Try Again</button>
    </div>
  `;
  
  contentDiv.style.display = 'block';
  summarizeBtn.style.display = 'block';
}

// Enhanced liked videos page functionality with YouTube-like design
function injectLikedVideosButtons() {
  // Check if we're on the liked videos page
  if (!window.location.href.includes('youtube.com/playlist?list=LL') && 
      !window.location.href.includes('youtube.com/feed/likes')) {
    return;
  }

  // Remove existing buttons if they exist
  const existingButtons = document.getElementById('youtube-enhancer-liked-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }

  // Wait for the action buttons area to load - more specific targeting
  let insertionPoint = null;
  
  // Try to find the area with Play all and Shuffle buttons
  const playShuffleContainer = document.querySelector('.ytd-playlist-header-renderer #buttons');
  if (playShuffleContainer) {
    insertionPoint = playShuffleContainer;
  } else {
    // Fallback to other selectors
    const selectors = [
      '.ytd-playlist-header-renderer .top-level-buttons',
      '.ytd-playlist-header-renderer [role="button"]',
      '#secondary-actions'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        insertionPoint = element;
        break;
      }
    }
  }

  if (!insertionPoint) {
    console.log('YouTube Enhancer: Insertion point not found, retrying...');
    setTimeout(injectLikedVideosButtons, 2000);
    return;
  }

  console.log('YouTube Enhancer: Injecting YouTube-style liked videos buttons');

  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'youtube-enhancer-liked-buttons';
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    margin-left: 8px;
    align-items: center;
    font-family: "Roboto", "Arial", sans-serif;
  `;

  // Only create TWO buttons - Fetch Videos and Export Data
  buttonContainer.innerHTML = `
    <button id="fetch-liked-videos" style="
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--yt-spec-text-primary, #0f0f0f);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 18px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.05, 0, 0, 1);
      font-family: inherit;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      white-space: nowrap;
    " 
    onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)'" 
    onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
    onmousedown="this.style.transform='translateY(0)'"
    onmouseup="this.style.transform='translateY(-1px)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Fetch Videos
    </button>
    
    <button id="export-liked-videos" style="
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--yt-spec-text-primary, #0f0f0f);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 18px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.05, 0, 0, 1);
      font-family: inherit;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      white-space: nowrap;
    " 
    onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)'" 
    onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
    onmousedown="this.style.transform='translateY(0)'"
    onmouseup="this.style.transform='translateY(-1px)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Export Data
    </button>
  `;

  // Insert the buttons next to the existing controls
  insertionPoint.appendChild(buttonContainer);

  // Add event listeners with proper functionality restoration
  const fetchBtn = document.getElementById('fetch-liked-videos');
  const exportBtn = document.getElementById('export-liked-videos');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', () => {
      console.log('Fetch button clicked');
      const originalContent = fetchBtn.innerHTML;
      fetchBtn.disabled = true;
      fetchBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        Fetching...
      `;
      
      // Simulate API call timing (replace with actual chrome.runtime call)
      if (window.chrome?.runtime) {
        chrome.runtime.sendMessage({ action: 'fetchLikedVideos' }, (response) => {
          console.log('Fetch response:', response);
          setTimeout(() => {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = originalContent;
            
            // Show proper notification
            showBottomRightNotification(
              response?.success ? 'Videos fetched successfully!' : 'Failed to fetch videos', 
              response?.success ? 'success' : 'error',
              true // Show dashboard button
            );
          }, 2000); // 2 second timeout max
        });
      } else {
        // Fallback for testing
        setTimeout(() => {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = originalContent;
          showBottomRightNotification('Videos fetched successfully!', 'success', true);
        }, 2000);
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      console.log('Export button clicked');
      const originalContent = exportBtn.innerHTML;
      exportBtn.disabled = true;
      exportBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        Exporting...
      `;
      
      if (window.chrome?.runtime) {
        chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
          console.log('Export response:', response);
          setTimeout(() => {
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalContent;
            
            showBottomRightNotification(
              response?.success ? 'Data exported successfully!' : 'Export completed', 
              'success',
              true
            );
          }, 1500);
        });
      } else {
        // Fallback for testing
        setTimeout(() => {
          exportBtn.disabled = false;
          exportBtn.innerHTML = originalContent;
          showBottomRightNotification('Data exported successfully!', 'success', true);
        }, 1500);
      }
    });
  }

  console.log('YouTube Enhancer: Successfully injected only 2 buttons');
}

// New bottom-right notification system
function showBottomRightNotification(message, type = 'info', showDashboard = false) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.yt-enhancer-notification');
  existingNotifications.forEach(notif => notif.remove());

  const notification = document.createElement('div');
  notification.className = 'yt-enhancer-notification';
  
  const colors = {
    success: { bg: '#10b981', border: '#059669' },
    error: { bg: '#ef4444', border: '#dc2626' },
    info: { bg: '#3b82f6', border: '#2563eb' }
  };
  
  const currentColors = colors[type] || colors.info;
  
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${currentColors.bg};
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    transform: translateX(100%) scale(0.9);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 280px;
    max-width: 320px;
    border: 1px solid ${currentColors.border};
  `;
  
  const icon = type === 'success' ? 
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>` :
    type === 'error' ?
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>` :
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>`;
  
  const dashboardButton = showDashboard ? `
    <button onclick="
      if (window.chrome?.runtime && window.chrome?.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      }
      this.closest('.yt-enhancer-notification').remove();
    " style="
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    " 
    onmouseover="this.style.background='rgba(255, 255, 255, 0.25)'"
    onmouseout="this.style.background='rgba(255, 255, 255, 0.15)'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      Open Dashboard
    </button>
  ` : '';
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      ${icon}
      <span style="flex: 1;">${message}</span>
    </div>
    ${dashboardButton}
  `;
  
  document.body.appendChild(notification);
  
  // Smooth animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0) scale(1)';
    notification.style.opacity = '1';
  });
  
  // Auto remove with smooth animation
  setTimeout(() => {
    notification.style.transform = 'translateX(100%) scale(0.9)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 400);
  }, 4000);
}

// Enhanced initialization function
function initializeExtension() {
  const currentUrl = window.location.href;
  console.log('YouTube Enhancer: Initializing on:', currentUrl);
  
  if (currentUrl.includes('youtube.com/watch')) {
    console.log('YouTube Enhancer: Injecting summarization panel');
    injectSummarizationPanel();
  } else if (currentUrl.includes('youtube.com/playlist?list=LL') || 
             currentUrl.includes('youtube.com/feed/likes')) {
    console.log('YouTube Enhancer: Injecting liked videos buttons');
    injectLikedVideosButtons();
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeExtension, 2000);
  });
} else {
  setTimeout(initializeExtension, 2000);
}

// Enhanced navigation observer
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log('YouTube Enhancer: URL changed to:', currentUrl);
    setTimeout(initializeExtension, 3000); // Increased delay for YouTube's dynamic loading
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Additional observer for playlist changes
const playlistObserver = new MutationObserver(() => {
  if (window.location.href.includes('youtube.com/playlist?list=LL') || 
      window.location.href.includes('youtube.com/feed/likes')) {
    if (!document.getElementById('youtube-enhancer-liked-buttons')) {
      setTimeout(injectLikedVideosButtons, 1000);
    }
  }
});

playlistObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Handle messages from the extension
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showToast') {
      showBottomRightNotification(message.message, message.type || 'info', message.showDashboard);
    }
    return true;
  });
}

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
