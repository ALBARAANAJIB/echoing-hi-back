
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import SecureApiManager from "./secureApiManager";

// Constants
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

// Types for the video summary functionality
export interface VideoSummaryOptions {
  videoId?: string;
  videoUrl?: string;
  videoTitle?: string;
  channelTitle?: string;
  transcript?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractVideoId(url: string): string | null {
  const secureApi = SecureApiManager.getInstance();
  const sanitizedUrl = secureApi.sanitizeInput(url);
  
  if (!sanitizedUrl || !secureApi.validateYouTubeUrl(sanitizedUrl)) {
    return null;
  }
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^&\s]+)/,
    /youtube\.com\/shorts\/([^&\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = sanitizedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If it looks like it might already be a video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(sanitizedUrl)) {
    return sanitizedUrl;
  }
  
  return null;
}

/**
 * Create a properly formatted HTML summary from Gemini's response
 */
function formatSummaryAsHtml(text: string): string {
  const secureApi = SecureApiManager.getInstance();
  const sanitizedText = secureApi.sanitizeInput(text);
  
  // If the text already contains HTML, return it as is
  if (sanitizedText.includes('<ul>') || sanitizedText.includes('<ol>') || sanitizedText.includes('<p>')) {
    return sanitizedText;
  }
  
  // Convert bullet points to HTML list
  const lines = sanitizedText.split('\n').filter(line => line.trim().length > 0);
  
  let formattedHtml = '';
  let inList = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a bullet point (starts with -, *, •, or number.)
    if (trimmedLine.match(/^(\-|\*|•|\d+\.)\s+/)) {
      if (!inList) {
        formattedHtml += '<ul>\n';
        inList = true;
      }
      formattedHtml += `  <li>${trimmedLine.replace(/^(\-|\*|•|\d+\.)\s+/, '')}</li>\n`;
    } else {
      if (inList) {
        formattedHtml += '</ul>\n';
        inList = false;
      }
      formattedHtml += `<p>${trimmedLine}</p>\n`;
    }
  }
  
  if (inList) {
    formattedHtml += '</ul>\n';
  }
  
  return formattedHtml;
}

/**
 * Fetch video metadata from YouTube oEmbed with security checks
 */
async function fetchVideoMetadata(videoId: string): Promise<any> {
  const secureApi = SecureApiManager.getInstance();
  const sanitizedVideoId = secureApi.sanitizeInput(videoId);
  
  if (!/^[A-Za-z0-9_-]{11}$/.test(sanitizedVideoId)) {
    throw new Error('Invalid video ID format');
  }
  
  // Check cache first
  const cacheKey = `metadata_${sanitizedVideoId}`;
  const cachedData = secureApi.getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${sanitizedVideoId}&format=json`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { videoId: sanitizedVideoId };
    }
    
    const data = await response.json();
    const result = {
      videoId: sanitizedVideoId,
      title: secureApi.sanitizeInput(data.title || ''),
      channelTitle: secureApi.sanitizeInput(data.author_name || ''),
      thumbnail: data.thumbnail_url
    };
    
    // Cache the result
    secureApi.setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return { videoId: sanitizedVideoId };
  }
}

/**
 * Get API key securely from background script
 */
async function getSecureApiKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
        if (response && response.apiKey) {
          resolve(response.apiKey);
        } else {
          reject(new Error('Failed to get API key'));
        }
      });
    } else {
      // Fallback for development
      resolve("AIzaSyCkxngJEfNG2IRp7bsUFjrWUQc4ZsOTOkY");
    }
  });
}

/**
 * Main function to generate a summary of a YouTube video with security measures
 */
export async function generateVideoSummary(options: VideoSummaryOptions): Promise<string> {
  const secureApi = SecureApiManager.getInstance();
  
  try {
    // Rate limiting check
    if (!secureApi.checkRateLimit('video_summary', 5, 60000)) {
      throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
    }
    
    // Extract video ID if URL was provided
    const videoId = options.videoId || 
      (options.videoUrl ? extractVideoId(options.videoUrl) : null);
    
    if (!videoId && !options.transcript) {
      throw new Error("No valid video ID, URL, or transcript provided");
    }
    
    // Check cache first
    const cacheKey = `summary_${videoId}_${options.transcript ? 'transcript' : 'metadata'}`;
    const cachedSummary = secureApi.getCachedData(cacheKey);
    if (cachedSummary) {
      return cachedSummary;
    }
    
    const apiKey = await getSecureApiKey();
    
    // Get video metadata if not provided
    let title = secureApi.sanitizeInput(options.videoTitle || '');
    let channelTitle = secureApi.sanitizeInput(options.channelTitle || '');
    
    if (videoId && (!title || !channelTitle)) {
      try {
        const metadata = await fetchVideoMetadata(videoId);
        if (metadata) {
          title = title || metadata.title;
          channelTitle = channelTitle || metadata.channelTitle;
        }
      } catch (error) {
        console.warn("Failed to fetch video metadata:", error);
      }
    }
    
    // Create the Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    // Prepare the prompt based on available information
    let promptText = "";
    const transcriptText = secureApi.sanitizeInput(options.transcript || '');
    
    // Simple prompt for summarization
    promptText = `Create a concise summary of this YouTube video${title ? ' titled "' + title + '"' : ''}${channelTitle ? ' by ' + channelTitle : ''}.\n\n`;
    
    if (transcriptText) {
      promptText += `Here is the transcript:\n\n${transcriptText}\n\n`;
      promptText += `Provide 3-5 key bullet points covering the main takeaways. Format your response in HTML using <ul> and <li> tags for the bullet points and keep it easy to scan.`;
    } else {
      promptText += `Based on the title and creator information, provide your best guess at what this video might cover. Format your response in HTML with bullet points using <ul> and <li> tags, and note at the beginning that this is a prediction since no transcript was available.`;
    }
    
    // Generate content using the Gemini model with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const result = await model.generateContent(promptText);
    clearTimeout(timeoutId);
    
    const response = await result.response;
    const text = response.text();
    
    // Format the response as HTML
    const formattedSummary = formatSummaryAsHtml(text);
    
    // Cache the result
    secureApi.setCachedData(cacheKey, formattedSummary);
    
    return formattedSummary;
  } catch (error) {
    console.error("Error generating video summary:", error);
    return `<p>Sorry, we couldn't generate a summary for this video. Please try again later.</p>`;
  }
}

/**
 * Simplified function to check if the model is available
 */
export async function checkGeminiAccess(): Promise<boolean> {
  try {
    const apiKey = await getSecureApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Simple test prompt to check if we can access the model
    const result = await model.generateContent("Hello");
    return !!result;
  } catch (error) {
    console.error("Error checking Gemini access:", error);
    return false;
  }
}
