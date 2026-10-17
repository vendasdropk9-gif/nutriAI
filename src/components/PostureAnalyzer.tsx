import React, { useEffect, useRef, useState } from 'react';
import { Pose, Results, drawConnectors, drawLandmarks } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { speak } from '../lib/speech';
import { PostureSettings } from './PostureSettings';
import { PostureTips } from './PostureTips';
import { Settings } from 'lucide-react';

interface PostureAnalyzerProps {
  exerciseId: string;
  isActive: boolean;
}

export const PostureAnalyzer: React.FC<PostureAnalyzerProps> = ({ exerciseId, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ distance: 150, sensitivity: 5, interval: 5 });

  useEffect(() => {
    if (!isActive) return;
    const intervalId = setInterval(() => {
      speak("Não esqueça de verificar sua postura!");
    }, settings.interval * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isActive, settings.interval]);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d')!;

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: Results) => {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      if (results.poseLandmarks) {
        // Draw Skeleton
        drawConnectors(canvasCtx, results.poseLandmarks, [[11, 13], [13, 15], [11, 23], [23, 25], [25, 27]], {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2, radius: 2});
        
        // Draw Confidence Labels
        results.poseLandmarks.forEach((landmark, index) => {
          const confidence = Math.round(landmark.visibility! * 100);
          let color = '#FF0000'; // Red for low
          if (confidence > 70) color = '#00FF00'; // Green for high
          else if (confidence > 40) color = '#FFFF00'; // Yellow for medium
          
          canvasCtx.fillStyle = color;
          canvasCtx.font = '10px Arial';
          canvasCtx.fillText(`${confidence}%`, landmark.x * canvasElement.width, landmark.y * canvasElement.height + 15);
        });
        
        analyzePosture(results, exerciseId);
      }
    });

    poseRef.current = pose;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current! });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    return () => {
      camera.stop();
      pose.close();
    };
  }, [isActive, exerciseId]);

  const analyzeFatigue = (landmarks: any[]) => {
    // Estimativa simples baseada na variabilidade do movimento das articulações
    const shoulder = landmarks[11];
    const movementStability = Math.abs(shoulder.y - 0.5); // Simplificação
    const fatigue = movementStability > 0.1 ? 0.8 : 0.2; // 0.8 = fadiga alta
    avatarGlobalStore.setFatigueLevel(fatigue);
    return fatigue;
  };

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover rounded-2xl" width="640" height="480" />
      
      <button className="absolute top-2 right-2 p-2 bg-slate-800 rounded-full text-white z-20" onClick={() => setShowSettings(true)}>
        <Settings className="w-5 h-5" />
      </button>

      {showSettings && <PostureSettings onClose={() => setShowSettings(false)} settings={settings} onUpdateSettings={setSettings} />}
      
      {alert && (
        <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-4 rounded-xl font-bold text-center z-10 animate-pulse">
          {alert}
        </div>
      )}
      {alert && <PostureTips exerciseId={exerciseId} joint="back" />}
    </div>
  );
};
