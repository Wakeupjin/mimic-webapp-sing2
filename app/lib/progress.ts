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

  const identity = {
    student_id: user.id,
    lesson_number: lessonNumber,
    mode,
  };
  const resumePayload = {
    current_position: safeCurrentPosition,
    progress_data: safeProgressData,
    updated_at: new Date().toISOString(),
  };

  if (!completed) {
    // 재진입·자동 저장은 위치만 갱신한다. 완료한 모드를 다시 잠그지 않는다.
    const { data, error: updateError } = await supabase
      .from('learning_progress')
      .update(resumePayload)
      .match(identity)
      .select('student_id');

    if (updateError) throw updateError;
    if (data && data.length > 0) return;

    // 첫 진도만 미완료 상태로 만든다. 동시 완료 저장과 충돌하면 아래 update로 재시도한다.
    const { error: insertError } = await supabase
      .from('learning_progress')
      .insert({ ...identity, ...resumePayload, completed: false, completed_at: null });

    if (!insertError) return;
    if (insertError.code !== '23505') throw insertError;

    const { error: retryError } = await supabase
      .from('learning_progress')
      .update(resumePayload)
      .match(identity);

    if (retryError) throw retryError;
    return;
  }

  const { error } = await supabase
    .from('learning_progress')
    .upsert(
      {
        ...identity,
        ...resumePayload,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,lesson_number,mode' }
    );

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
