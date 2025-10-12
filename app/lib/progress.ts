import { supabase } from '../supabaseClient';

export async function saveProgress(
  lessonNumber: number,
  mode: 'watching' | 'mimicking' | 'guessing' | 'word',
  completed: boolean = false,
  currentPosition?: number,
  progressData?: any
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // current_position이 숫자인지 확인하고 변환
  let safeCurrentPosition = 0;
  if (typeof currentPosition === 'number') {
    safeCurrentPosition = currentPosition;
  } else if (typeof currentPosition === 'string') {
    const parsed = parseFloat(currentPosition);
    safeCurrentPosition = isNaN(parsed) ? 0 : parsed;
  }

  // progress_data가 문자열인지 확인하고 변환
  let safeProgressData = null;
  if (progressData) {
    if (typeof progressData === 'string') {
      safeProgressData = progressData;
    } else {
      safeProgressData = JSON.stringify(progressData);
    }
  }

  const { error } = await supabase
    .from('learning_progress')
    .upsert({
      student_id: user.id,
      lesson_number: lessonNumber,
      mode,
      completed,
      current_position: safeCurrentPosition,
      progress_data: safeProgressData,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'student_id,lesson_number,mode'
    });

  if (error) throw error;
}

export async function saveResult(
  lessonNumber: number,
  mode: string,
  score: number,
  correctCount: number,
  totalCount: number,
  timeSpent: number
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('learning_results')
    .insert({
      student_id: user.id,
      lesson_number: lessonNumber,
      mode,
      score,
      correct_count: correctCount,
      total_count: totalCount,
      time_spent: timeSpent,
    });

  if (error) throw error;
}

export async function getProgress(lessonNumber?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('learning_progress')
    .select('*')
    .eq('student_id', user.id);

  if (lessonNumber) {
    query = query.eq('lesson_number', lessonNumber);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getProgressByMode(
  lessonNumber: number,
  mode: 'watching' | 'mimicking' | 'guessing' | 'word'
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('learning_progress')
    .select('*')
    .eq('student_id', user.id)
    .eq('lesson_number', lessonNumber)
    .eq('mode', mode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveLog(
  lessonNumber: number,
  mode: 'watching' | 'mimicking' | 'guessing' | 'word',
  action: string,
  details?: any
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('learning_logs')
    .insert({
      student_id: user.id,
      lesson_number: lessonNumber,
      mode,
      action,
      details: details || null,
    });

  if (error) throw error;
}
