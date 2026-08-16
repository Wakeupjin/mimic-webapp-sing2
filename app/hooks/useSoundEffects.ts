import { useCallback, useRef } from 'react';
import {
  ATTENTION_SOUND_DURATION,
  CORRECT_SOUND_NOTE_DURATION,
  WRONG_SOUND_NOTE_DURATION,
} from '../constants/timings';

export function useSoundEffects() {
  // 주의를 끄는 소리 효과 함수
  const lastAttentionAtRef = useRef(0);

  const playAttentionSound = useCallback(() => {
    const now = Date.now();
    if (now - lastAttentionAtRef.current < 450) {
      return;
    }
    lastAttentionAtRef.current = now;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createAndPlaySound(audioContext);
        }).catch((err) => {
        });
      } else {
        createAndPlaySound(audioContext);
      }

      function createAndPlaySound(ctx: AudioContext) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + ATTENTION_SOUND_DURATION / 1000);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + ATTENTION_SOUND_DURATION / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + ATTENTION_SOUND_DURATION / 1000);
      }
    } catch (error) {
    }
  }, []);

  // 정답 축하 소리 효과 함수
  const playCorrectSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createCorrectSound(audioContext);
        });
      } else {
        createCorrectSound(audioContext);
      }

      function createCorrectSound(ctx: AudioContext) {
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const duration = CORRECT_SOUND_NOTE_DURATION / 1000;

        frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * duration);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.4, ctx.currentTime + index * duration);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * duration + duration);

          oscillator.start(ctx.currentTime + index * duration);
          oscillator.stop(ctx.currentTime + index * duration + duration);
        });
      }
    } catch (error) {
    }
  }, []);

  // 오답 안타까운 소리 효과 함수
  const playAgainSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createAgainSound(audioContext);
        });
      } else {
        createAgainSound(audioContext);
      }

      function createAgainSound(ctx: AudioContext) {
        const frequencies = [783.99, 659.25, 523.25]; // G5, E5, C5
        const duration = WRONG_SOUND_NOTE_DURATION / 1000;

        frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * duration);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.3, ctx.currentTime + index * duration);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * duration + duration);

          oscillator.start(ctx.currentTime + index * duration);
          oscillator.stop(ctx.currentTime + index * duration + duration);
        });
      }
    } catch (error) {
    }
  }, []);

  return {
    playAttentionSound,
    playCorrectSound,
    playAgainSound,
  };
}
