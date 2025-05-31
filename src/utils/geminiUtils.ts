
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// Constants
const DEFAULT_API_KEY = "AIzaSyCkxngJEfNG2IRp7bsUFjrWUQc4ZsOTOkY";
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
  if (!url) return null;
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^&\s]+)/,
    /youtube\.com\/shorts\/([^&\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If it looks like it might already be a video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  return null;
}

/**
 * Create a properly formatted HTML summary from Gemini's response
 */
function formatSummaryAsHtml(text: string): string {
  // If the text already contains HTML, return it as is
  if (text.includes('<ul>') || text.includes('<ol>') || text.includes('<p>')) {
    return text;
  }
  
  // Convert bullet points to HTML list
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
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
 * Fetch video metadata from YouTube oEmbed
 */
async function fetchVideoMetadata(videoId: string): Promise<any> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      return { videoId };
    }
    
    const data = await response.json();
    return {
      videoId,
      title: data.title,
      channelTitle: data.author_name,
      thumbnail: data.thumbnail_url
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return { videoId };
  }
}

/**
 * Main function to generate a summary of a YouTube video
 */
export async function generateVideoSummary(options: VideoSummaryOptions): Promise<string> {
  try {
    const apiKey = DEFAULT_API_KEY;
    
    // Extract video ID if URL was provided
    const videoId = options.videoId || 
      (options.videoUrl ? extractVideoId(options.videoUrl) : null);
    
    if (!videoId && !options.transcript) {
      throw new Error("No video ID, URL, or transcript provided");
    }
    
    // Get video metadata if not provided
    let title = options.videoTitle;
    let channelTitle = options.channelTitle;
    
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
    const transcriptText = options.transcript || "";
    
    // Simple prompt for summarization
    promptText = `Create a concise summary of this YouTube video${title ? ' titled "' + title + '"' : ''}${channelTitle ? ' by ' + channelTitle : ''}.\n\n`;
    
    if (transcriptText) {
      promptText += `Here is the transcript:\n\n${transcriptText}\n\n`;
      promptText += `Provide 3-5 key bullet points covering the main takeaways. Format your response in HTML using <ul> and <li> tags for the bullet points and keep it easy to scan.`;
    } else {
      promptText += `Based on the title and creator information, provide your best guess at what this video might cover. Format your response in HTML with bullet points using <ul> and <li> tags, and note at the beginning that this is a prediction since no transcript was available.`;
    }
    
    // Generate content using the Gemini model
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();
    
    // Format the response as HTML
    return formatSummaryAsHtml(text);
  } catch (error) {
    console.error("Error generating video summary:", error);
    return `<p>Sorry, we couldn't generate a summary for this video. Please try again later.</p>`;
  }
}

/**
 * Simplified function to check if the model is available
 * and the API key is valid
 */
export async function checkGeminiAccess(): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(DEFAULT_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Simple test prompt to check if we can access the model
    const result = await model.generateContent("Hello");
    return !!result;
  } catch (error) {
    console.error("Error checking Gemini access:", error);
    return false;
  }
}
