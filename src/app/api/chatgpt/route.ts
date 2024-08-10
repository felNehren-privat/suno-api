import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { sunoApi } from '@/lib/SunoApi';
import { corsHeaders } from "@/lib/utils";
import fs from 'fs';
import path from 'path';

const logDirectory = path.join(process.cwd(), 'logs');
const logFilePath = path.join(logDirectory, 'suno.log');
const isDebugMode = process.env.DEBUG_MODE === 'true';

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

function logResponse(data: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${data}\n`;
  fs.appendFileSync(logFilePath, logEntry, 'utf8');
}

interface ChatGPTParams {
  custom: string;
  multiselect: string[];
  htmlContent: string;
  vocals: boolean;
  title: string;
}

export const POST = async (req: NextRequest, res: NextResponse) => {
  const requestToken = headers().get('auth-token');
  const envToken = process.env.REQUEST_TOKEN;

  if (requestToken !== envToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const params: ChatGPTParams = await req.json();
    const suno = await sunoApi;

    const chatGPTResponse = JSON.parse(await suno.chatGPT(params));
    const audioParams = {
      title: params.title.slice(0, 60),
      prompt: chatGPTResponse.prompt,
      tags: chatGPTResponse.tags,
      make_instrumental: !params.vocals,
      wait_audio: true
    };

    const audioInfo = await suno.custom_generate(
      audioParams.prompt,
      audioParams.tags,
      audioParams.title,
      audioParams.make_instrumental,
      undefined,
      audioParams.wait_audio
    );

    if (isDebugMode) {
      console.debug('chatGPTResponse:', chatGPTResponse);
      console.debug('audioParams:', audioParams);
      console.debug('audioInfo:', audioInfo);
    }

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