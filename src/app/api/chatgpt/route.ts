import { NextResponse, NextRequest } from "next/server";
import { checkAuthToken, unauthorizedResponse } from '@/lib/tokenHelpers';
import { sunoApi } from '@/lib/SunoApi';
import { corsHeaders } from "@/lib/utils";
import fs from 'fs';
import path from 'path';

const logDirectory = path.join(process.cwd(), 'logs');
const logFilePath = path.join(logDirectory, 'suno.log');
const isDebugMode = process.env.DEBUG_MODE === 'true';

// Ensure log directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Function to log responses
function logResponse(data: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${data}\n`;
  fs.appendFileSync(logFilePath, logEntry, 'utf8');
}

// Interface for ChatGPT parameters
interface ChatGPTParams {
  custom: string;
  multiselect: string[];
  htmlContent: string;
  vocals: boolean;
  title: string;
}

// Function to generate audio info based on parameters
async function generateAudioInfo(params: ChatGPTParams, chatGPTResponse: any) {
  const suno = await sunoApi;
  const audioParams = {
    title: params.title.slice(0, 60),
    prompt: chatGPTResponse.prompt,
    tags: chatGPTResponse.tags,
    make_instrumental: !params.vocals,
    wait_audio: true
  };

  return await suno.custom_generate(
    audioParams.prompt,
    audioParams.tags,
    audioParams.title,
    audioParams.make_instrumental,
    undefined,
    audioParams.wait_audio
  );
}

// Main POST handler
export const POST = async (req: NextRequest) => {
  // Check authentication
  if (!checkAuthToken(req)) {
    return unauthorizedResponse();
  }

  try {
    // Parse request parameters
    const params: ChatGPTParams = await req.json();
    const suno = await sunoApi;
    
    // Fetch chatGPT response
    const chatGPTResponse = JSON.parse(await suno.chatGPT(params));
    
    // Log debug information if in debug mode
    if (isDebugMode) {
      console.debug('chatGPTResponse:', chatGPTResponse);
    }

    // Log response
    logResponse(`chatGPTResponse: ${JSON.stringify(chatGPTResponse)}`);

    // Generate audio info based on chatGPT response
    const audioInfo = await generateAudioInfo(params, chatGPTResponse);
    
    // Log audio information
    logResponse(`audioInfo: ${JSON.stringify(audioInfo)}`);

    // Fetch additional audio information if IDs are provided in the query
    const audioData = await fetchAudioData(req.url);
    
    return new NextResponse(JSON.stringify(audioData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error handling request:', error);
    logResponse(`Error: ${error}`);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
};

// Function to fetch audio data based on query parameters
async function fetchAudioData(url: string) {
  try {
    const requestUrl = new URL(url);
    const songIds = requestUrl.searchParams.get('ids');
    const suno = await sunoApi;
    
    return songIds && songIds.length > 0
      ? await suno.get(songIds.split(','))
      : await suno.get();

  } catch (error) {
    console.error('Error fetching audio:', error);
    return { error: 'Internal server error' };
  }
}