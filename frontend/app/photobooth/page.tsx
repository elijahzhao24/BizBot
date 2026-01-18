'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as coco from '@tensorflow-models/coco-ssd';

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<coco.ObjectDetection | null>(null);
  const [peopleCount, setPeopleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPhotoTime, setLastPhotoTime] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const photoScheduledRef = useRef(false);
  const MIN_PEOPLE_DETECTED = 1; // Minimum number of people to trigger photo
  const PHOTO_COOLDOWN = 5000; // 5 seconds between photos
  const DETECTION_DELAY = 1000; // Delay in ms after detecting people before taking photo

  useEffect(() => {
    const initializeModel = async () => {
      try {
        // Load TensorFlow.js
        await tf.ready();
        
        // Load COCO-SSD model
        const model = await coco.load();
        modelRef.current = model;
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setUploadStatus('Error loading detection model');
        setIsLoading(false);
      }
    };

    initializeModel();
  }, []);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing webcam:', error);
        setUploadStatus('Error accessing camera');
      }
    };

    startWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!modelRef.current || !videoRef.current || isLoading) return;

    let detectionFrameCount = 0;

    const detectObjects = async () => {
      if (!videoRef.current || !modelRef.current || videoRef.current.paused) {
        requestAnimationFrame(detectObjects);
        return;
      }

      try {
        const predictions = await modelRef.current.detect(videoRef.current);
        
        // Count people (class_name: 'person')
        const peopleDetections = predictions.filter(pred => pred.class === 'person');
        const count = peopleDetections.length;

        setPeopleCount(count);

        // Draw canvas visualization
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;

            // Draw all detections
            predictions.forEach(pred => {
              const [x, y] = pred.bbox;
              const [width, height] = [pred.bbox[2], pred.bbox[3]];

              // Draw box
              ctx.strokeStyle = pred.class === 'person' ? '#00ff00' : '#ff0000';
              ctx.lineWidth = 3;
              ctx.strokeRect(x, y, width, height);

              // Draw label
              ctx.fillStyle = pred.class === 'person' ? '#00ff00' : '#ff0000';
              ctx.font = 'bold 16px Arial';
              ctx.fillText(
                `${pred.class} (${(pred.score * 100).toFixed(0)}%)`,
                x,
                y - 10
              );
            });

            // Draw people count
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`People Detected: ${count}`, 20, 40);

            if (count >= MIN_PEOPLE_DETECTED) {
              ctx.fillStyle = '#00ff00';
              ctx.font = 'bold 20px Arial';
              ctx.fillText('✓ Ready to take photo!', 20, 70);
            }
          }
        }

        // Handle photo taking
        const now = Date.now();
        const timeSinceLastPhoto = now - lastPhotoTime;
        
        if (count >= MIN_PEOPLE_DETECTED && timeSinceLastPhoto > PHOTO_COOLDOWN) {
          // Only schedule photo once per detection period
          if (!photoScheduledRef.current) {
            console.log(`Scheduling photo in ${DETECTION_DELAY}ms`);
            photoScheduledRef.current = true;
            
            detectionTimeoutRef.current = setTimeout(() => {
              console.log('Taking photo now!');
              takePhoto();
            }, DETECTION_DELAY);
          }
        } else {
          // Reset flag when out of ready state (either people gone or in cooldown)
          if (photoScheduledRef.current) {
            photoScheduledRef.current = false;
            if (detectionTimeoutRef.current) {
              clearTimeout(detectionTimeoutRef.current);
            }
          }
        }
      } catch (error) {
        console.error('Detection error:', error);
      }

      requestAnimationFrame(detectObjects);
    };

    detectObjects();

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [modelRef, isLoading, lastPhotoTime]);

  const takePhoto = async () => {
    if (!canvasRef.current || !videoRef.current || isTakingPhoto) return;

    setIsTakingPhoto(true);
    setShowFlash(true);
    setUploadStatus('Taking photo...');

    // Flash effect duration
    setTimeout(() => setShowFlash(false), 300);

    try {
      // Draw current video frame to canvas
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        // Convert canvas to blob
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) {
            setUploadStatus('Error creating image');
            setIsTakingPhoto(false);
            return;
          }

          try {
            const formData = new FormData();
            const filename = `photobooth_${Date.now()}.jpg`;
            formData.append('file', blob, filename);

            setUploadStatus('Uploading...');
            console.log('Uploading file:', filename, 'Size:', blob.size, 'Type:', blob.type);

            const response = await fetch('http://localhost:8000/upload', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const result = await response.json();
              setUploadStatus('✓ Photo uploaded successfully!');
              setLastPhotoTime(Date.now());

              // Reset status after 3 seconds
              setTimeout(() => {
                setUploadStatus('');
              }, 3000);
            } else {
              const errorData = await response.json();
              const errorMsg = errorData?.error || errorData?.detail || `Upload failed: ${response.status}`;
              setUploadStatus(`❌ ${errorMsg}`);
              console.error('Upload error:', response.status, errorData);
            }
          } catch (error) {
            setUploadStatus(`Error uploading: ${error}`);
            console.error('Upload error:', error);
          } finally {
            setIsTakingPhoto(false);
          }
        }, 'image/jpeg', 0.95);
      }
    } catch (error) {
      setUploadStatus(`Error: ${error}`);
      console.error('Photo error:', error);
      setIsTakingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Flash effect overlay */}
      {showFlash && (
        <div 
          className="fixed inset-0 bg-white z-50 pointer-events-none" 
          style={{ animation: 'photo-flash 0.3s ease-out' }} 
        />
      )}
      
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white text-center mb-4">Photo Booth</h1>
        
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-6 border-4 border-gray-700">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          {/* Photo taken indicator */}
          {isTakingPhoto && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-white text-3xl font-bold">📸 PHOTO!</div>
            </div>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="text-6xl font-bold text-white mb-2">
            {peopleCount}
          </div>
          <p className="text-xl text-gray-400 mb-4">
            {peopleCount < MIN_PEOPLE_DETECTED
              ? `${MIN_PEOPLE_DETECTED - peopleCount} more people needed`
              : 'Ready to take a photo!'}
          </p>

          {isLoading && (
            <p className="text-lg text-yellow-400">Loading detection model...</p>
          )}

          {uploadStatus && (
            <p className={`text-lg font-semibold ${
              uploadStatus.includes('✓') ? 'text-green-400' : 'text-blue-400'
            }`}>
              {uploadStatus}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-white text-sm">
          <div className="bg-gray-800 p-4 rounded">
            <p className="text-gray-400">Instructions</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>✓ Get {MIN_PEOPLE_DETECTED} or more people in frame</li>
              <li>✓ Photo will be taken automatically after {DETECTION_DELAY / 1000}s</li>
              <li>✓ {PHOTO_COOLDOWN / 1000}s wait between photos</li>
            </ul>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <p className="text-gray-400">Status</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>Model: {isLoading ? 'Loading...' : 'Ready'}</li>
              <li>Camera: {videoRef.current?.readyState === 2 ? 'Active' : 'Initializing'}</li>
              <li>Photos: {Math.floor((Date.now() - lastPhotoTime) / 1000)}s since last</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
