import { supabase } from '../supabaseClient';

export async function saveProgress(
  lessonNumber: number,
  mode: 'watching' | 'mimicking' | 'guessing' | 'word',
  completed: boolean = true
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('learning_progress')
    .upsert({
      student_id: user.id,
      lesson_number: lessonNumber,
      mode,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
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
