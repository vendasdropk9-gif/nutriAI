import React, { useState, useEffect } from 'react';
import { Play, Volume2, Loader2, VolumeX } from 'lucide-react';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface VoicePlayButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export function VoicePlayButton({
  text,
  size = 'md',
  className = '',
  title = 'Ouvir com a voz da Malu',
  onPlayStart,
  onPlayEnd,
}: VoicePlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isPlaying) {
        stopSpeech();
      }
    };
  }, [isPlaying]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
      setIsLoading(false);
      onPlayEnd?.();
      playSfx('tap');
      vibrate(10);
      return;
    }

    if (!text || !text.trim()) return;

    setIsLoading(true);
    playSfx('tap');
    vibrate(15);
    onPlayStart?.();

    try {
      setIsPlaying(true);
      await speak(text, {
        onEnded: () => {
          setIsPlaying(false);
          setIsLoading(false);
          onPlayEnd?.();
        },
        onError: () => {
          setIsPlaying(false);
          setIsLoading(false);
          onPlayEnd?.();
        },
      });
    } catch (err) {
      console.warn('Voice play error:', err);
      setIsPlaying(false);
      onPlayEnd?.();
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isPlaying ? 'Pausar reprodução' : title}
      className={`relative shrink-0 rounded-full flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 cursor-pointer ${
        isPlaying ? 'animate-pulse ring-4 ring-emerald-500/40 bg-emerald-600' : 'hover:scale-105'
      } ${sizeClasses} ${className}`}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes} animate-spin`} />
      ) : isPlaying ? (
        <Volume2 className={`${iconSizes} animate-pulse`} />
      ) : (
        <Play className={`${iconSizes} ml-0.5 fill-current`} />
      )}
    </button>
  );
}
