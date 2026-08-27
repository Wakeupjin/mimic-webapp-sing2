import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { AiCoachFocus, AiCoachResult } from '@/app/types/aiCoach';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';
const DEFAULT_COACH_MODEL = 'gpt-5.4-mini';

type OpenAIResponsePayload = {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(left: string[], right: string[]): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function calculateAccuracy(targetText: string, heardText: string): number {
  const target = normalizeWords(targetText);
  const heard = normalizeWords(heardText);
  const longest = Math.max(target.length, heard.length, 1);
  return Math.round(Math.max(0, 1 - editDistance(target, heard) / longest) * 100);
}

function calculatePace(recordedDuration: number, targetDuration: number): number {
  if (recordedDuration <= 0 || targetDuration <= 0) return 70;
  const ratio = recordedDuration / targetDuration;
  const distance = Math.abs(Math.log(ratio));
  return Math.round(Math.max(0, Math.min(100, 100 - distance * 85)));
}

function fallbackFeedback(
  accuracyScore: number,
  paceScore: number
): { feedback: string; focus: AiCoachFocus } {
  if (accuracyScore < 80) {
    return {
      feedback: '영화 속 소리를 다시 듣고, 빠진 소리 없이 한 번 더 따라 말해보세요.',
      focus: 'word_accuracy',
    };
  }
  if (paceScore < 70) {
    return {
      feedback: '단어는 정확해요. 이번에는 장면의 속도에 맞춰 한 호흡으로 말해보세요.',
      focus: 'pace',
    };
  }
  return {
    feedback: '문장과 속도가 잘 맞았어요. 장면의 느낌을 살려 한 번 더 말해도 좋아요.',
    focus: 'complete',
  };
}

function extractOutputText(payload: OpenAIResponsePayload): string | null {
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return null;
}

async function authenticate(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

async function createCoachingFeedback({
  apiKey,
  targetText,
  heardText,
  accuracyScore,
  paceScore,
}: {
  apiKey: string;
  targetText: string;
  heardText: string;
  accuracyScore: number;
  paceScore: number;
}): Promise<{ feedback: string; focus: AiCoachFocus } | null> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_COACH_MODEL || DEFAULT_COACH_MODEL,
      store: false,
      instructions:
        'You are Mimic, a concise sound-first English speaking coach for Korean learners. Use only the supplied transcript and timing scores. Never claim to hear pronunciation, stress, emotion, or intonation. Never reveal, quote, spell, or correct toward the target sentence in the feedback; tell the learner to listen and imitate the sound again instead. Give exactly one actionable correction in Korean, under 90 characters. Be encouraging but specific.',
      input: [
        `Target sentence: ${targetText}`,
        `Speech transcript: ${heardText || '(no speech recognized)'}`,
        `Word accuracy score: ${accuracyScore}/100`,
        `Pace similarity score: ${paceScore}/100`,
      ].join('\n'),
      text: {
        format: {
          type: 'json_schema',
          name: 'mimic_feedback',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              feedback: { type: 'string' },
              focus: {
                type: 'string',
                enum: ['word_accuracy', 'pace', 'complete'],
              },
            },
            required: ['feedback', 'focus'],
          },
        },
      },
      max_output_tokens: 140,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractOutputText(payload);
  if (!outputText) return null;

  try {
    const parsed = JSON.parse(outputText) as { feedback?: unknown; focus?: unknown };
    if (
      typeof parsed.feedback !== 'string' ||
      !['word_accuracy', 'pace', 'complete'].includes(String(parsed.focus))
    ) {
      return null;
    }
    return {
      feedback: parsed.feedback,
      focus: parsed.focus as AiCoachFocus,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!(await authenticate(request))) {
    return jsonError('로그인이 만료되었습니다. 다시 로그인해주세요.', 401);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError('AI Coach 서버 설정이 아직 완료되지 않았습니다.', 503);
  }

  const formData = await request.formData();
  const audio = formData.get('audio');
  const targetText = String(formData.get('targetText') || '').trim();
  const recordedDuration = Number(formData.get('recordedDuration') || 0);
  const targetDuration = Number(formData.get('targetDuration') || 0);

  if (!(audio instanceof File) || audio.size === 0) {
    return jsonError('녹음된 음성을 찾을 수 없습니다.', 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError('녹음이 너무 깁니다. 12초 안으로 다시 말해주세요.', 413);
  }
  if (!targetText || targetText.length > 300) {
    return jsonError('연습 문장이 올바르지 않습니다.', 400);
  }

  const transcriptionBody = new FormData();
  transcriptionBody.append('file', audio, audio.name || 'mimic-recording.webm');
  transcriptionBody.append(
    'model',
    process.env.OPENAI_TRANSCRIPTION_MODEL || DEFAULT_TRANSCRIPTION_MODEL
  );
  transcriptionBody.append('language', 'en');
  transcriptionBody.append('response_format', 'json');

  const transcriptionResponse = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: transcriptionBody,
    }
  );

  if (!transcriptionResponse.ok) {
    console.error('[ai-coach] transcription failed', transcriptionResponse.status);
    return jsonError('음성을 분석하지 못했습니다. 잠시 후 다시 시도해주세요.', 502);
  }

  const transcription = (await transcriptionResponse.json()) as { text?: string };
  const heardText = String(transcription.text || '').trim();
  const accuracyScore = calculateAccuracy(targetText, heardText);
  const paceScore = calculatePace(recordedDuration, targetDuration);
  const overallScore = Math.round(accuracyScore * 0.8 + paceScore * 0.2);
  const generatedFeedback = await createCoachingFeedback({
    apiKey,
    targetText,
    heardText,
    accuracyScore,
    paceScore,
  }).catch(() => null);
  const coach = generatedFeedback || fallbackFeedback(accuracyScore, paceScore);

  const result: AiCoachResult = {
    heardText,
    accuracyScore,
    paceScore,
    overallScore,
    feedback: coach.feedback,
    focus: coach.focus,
    shouldRetry: overallScore < 75,
  };

  return NextResponse.json(result);
}
