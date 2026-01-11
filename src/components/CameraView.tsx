import { useEffect, useRef } from 'react';
import './CameraView.css';

interface CameraViewProps {
  videoElement: HTMLVideoElement | null;
  landmarks: any[] | null;
}

export function CameraView({ videoElement, landmarks }: CameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!videoElement || !ctx) return;

      // Set canvas size to match video (only if changed)
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;
      
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame (mirrored) with grayscale filter (much faster than manual pixel manipulation)
      ctx.save();
      ctx.filter = 'grayscale(100%)';
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw landmarks if available
      if (landmarks && landmarks.length > 0) {
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = '#00ff00';
        ctx.lineWidth = 1;

        // Draw face mesh connections (simplified - key points)
        const keyPoints = [
          33, 7, 163, 144, 145, 153, 154, 155, 133,  // Left eye
          263, 249, 390, 373, 374, 380, 381, 382, 362, // Right eye
          10, 151, 9,  // Forehead
          4, 5, 6, 195, 197, 2,  // Nose
          234, 454,  // Face edges
        ];

        // Mirror landmarks coordinates for drawing
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        // Draw connections for eyes
        const leftEyePoints = [33, 7, 163, 144, 145, 153, 154, 155, 133];
        const rightEyePoints = [263, 249, 390, 373, 374, 380, 381, 382, 362];

        // Draw left eye (will appear on right after mirroring)
        ctx.beginPath();
        for (let i = 0; i < leftEyePoints.length; i++) {
          const idx = leftEyePoints[i];
          if (idx < landmarks.length) {
            const point = landmarks[idx];
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw right eye (will appear on left after mirroring)
        ctx.beginPath();
        for (let i = 0; i < rightEyePoints.length; i++) {
          const idx = rightEyePoints[i];
          if (idx < landmarks.length) {
            const point = landmarks[idx];
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw face outline
        const faceOutline = [
          10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
          397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
          172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ];

        ctx.beginPath();
        for (let i = 0; i < faceOutline.length; i++) {
          const idx = faceOutline[i];
          if (idx < landmarks.length) {
            const point = landmarks[idx];
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw key points as small circles
        ctx.fillStyle = '#00ff00';
        const importantPoints = [33, 263, 4, 10, 234, 454]; // Eyes, nose, forehead, face edges
        importantPoints.forEach((idx) => {
          if (idx < landmarks.length) {
            const point = landmarks[idx];
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Draw eye center lines (for gaze direction)
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseTip = landmarks[4];
        
        if (leftEye && rightEye && noseTip) {
          const eyeCenterX = ((leftEye.x + rightEye.x) / 2) * canvas.width;
          const eyeCenterY = ((leftEye.y + rightEye.y) / 2) * canvas.height;
          const noseX = noseTip.x * canvas.width;
          const noseY = noseTip.y * canvas.height;

          // Draw line from eye center to nose (gaze direction indicator)
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(eyeCenterX, eyeCenterY);
          ctx.lineTo(noseX, noseY);
          ctx.stroke();
        }
        
        ctx.restore();
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [videoElement, landmarks]);

  if (!videoElement) {
    return null;
  }

  return (
    <div ref={containerRef} className="camera-view">
      <canvas ref={canvasRef} className="camera-canvas" />
    </div>
  );
}
