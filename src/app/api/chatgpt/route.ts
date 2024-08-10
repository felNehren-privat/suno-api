import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { sunoApi } from '@/lib/SunoApi';
import { corsHeaders } from "@/lib/utils";
import fs from 'fs';
import path from 'path';

// Ensure the logs directory exists
const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Define the log file path
const logFilePath = path.join(logDirectory, 'suno.log');

// Function to log data with a timestamp
function logResponse(data: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${data}\n`;

  fs.appendFileSync(logFilePath, logEntry, 'utf8');
}

// Define the type for the parameters
interface ChatGPTParams {
  custom: string;
  multiselect: string[];
  htmlContent: string;
  vocals: boolean;
  title: string;
}

export const POST = async (req: NextRequest, res: NextResponse) => {
  // Extract the token
  const request_token = headers().get('auth_token');
  const env_token = process.env.request_token;

  if (request_token != env_token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  try {
    // Parse JSON body
    const params: ChatGPTParams = await req.json();

    // Call chatGPT with the correctly typed params
    const stringGPTResponse = await (await sunoApi).chatGPT(params);
    const chatGPTResponse = JSON.parse(stringGPTResponse);

    let trimmedTitle = params.title;
    trimmedTitle = trimmedTitle.slice(0, 60);

    const audioParams = {
      title: params.title,
      prompt: chatGPTResponse.prompt,
      tags: chatGPTResponse.tags,
      make_instrumental: Boolean(!params.vocals),
      wait_audio: true
    };

    console.log(audioParams);

    const audioInfo = await (await sunoApi).custom_generate(
      audioParams.prompt,
      audioParams.tags,
      audioParams.title,
      audioParams.make_instrumental,
      undefined,
      audioParams.wait_audio
    );

    // Log the responses
    logResponse(`chatGPTResponse: ${JSON.stringify(chatGPTResponse)}`);
    logResponse(`audioInfo: ${JSON.stringify(audioInfo)}`);

    return new NextResponse(JSON.stringify(audioInfo), {
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