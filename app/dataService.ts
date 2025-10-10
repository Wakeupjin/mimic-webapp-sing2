// Supabase data service for fetching lesson data
import { supabase } from './supabaseClient';

export async function fetchLessonData(lessonNumber: number) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('lesson_number', lessonNumber)
      .single();

    if (error) {
      console.error('Error fetching lesson data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchLessonData:', error);
    return null;
  }
}
