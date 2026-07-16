import { useEffect, useRef, useState } from 'react';
import { AudioCapture } from '../audio/AudioCapture';
import { PitchDetection } from '../audio/PitchDetection';
import { CalibrationManager } from '../audio/CalibrationManager';
import { GAME_CONFIG } from '../game/config';
import type { CalibrationData } from '../audio/types';

interface CalibrationScreenProps {
  onComplete: (data: CalibrationData) => void;
  onSkip: () => void;
}

type CalibrationStep = 'low' | 'high' | 'done';

export function CalibrationScreen({ onComplete, onSkip }: CalibrationScreenProps) {
  const [step, setStep] = useState<CalibrationStep>('low');
  const [progress, setProgress] = useState(0);
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const pitchDetectionRef = useRef<PitchDetection | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pitchSamplesRef = useRef<number[]>([]);
  const lowFreqRef = useRef<number>(0);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function initAudio() {
      try {
        const capture = new AudioCapture();
        await capture.init();
        audioCaptureRef.current = capture;

        const detection = new PitchDetection();
        detection.init(capture.getSampleRate(), GAME_CONFIG.FFT_SIZE);
        pitchDetectionRef.current = detection;

        if (!disposed) {
          startCapture();
        }
      } catch (err) {
        if (!disposed) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not access microphone. Please grant permission and try again.'
          );
        }
      }
    }

    initAudio();

    return () => {
      disposed = true;
      isCapturingRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (audioCaptureRef.current) {
        audioCaptureRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCapture() {
    isCapturingRef.current = true;
    startTimeRef.current = performance.now();
    pitchSamplesRef.current = [];
    captureLoop();
  }

  function captureLoop() {
    if (!isCapturingRef.current) return;

    const capture = audioCaptureRef.current;
    const detection = pitchDetectionRef.current;
    if (!capture || !detection) return;

    const analyser = capture.getAnalyser();
    const result = detection.detect(analyser);

    if (result.frequency !== null) {
      pitchSamplesRef.current.push(result.frequency);
      setDetectedPitch(result.frequency);
    }

    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const duration = GAME_CONFIG.CALIBRATION_DURATION;
    setProgress(Math.min(elapsed / duration, 1));

    if (elapsed >= duration) {
      isCapturingRef.current = false;
      handleStepComplete();
      return;
    }

    rafRef.current = requestAnimationFrame(captureLoop);
  }

  function handleStepComplete() {
    const samples = pitchSamplesRef.current;

    if (samples.length === 0) {
      // No pitch detected — restart this step
      startCapture();
      return;
    }

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

    if (step === 'low') {
      lowFreqRef.current = avg;
      setStep('high');
      setProgress(0);
      setDetectedPitch(null);
      // Small delay before starting next capture
      setTimeout(() => startCapture(), 500);
    } else if (step === 'high') {
      const highFreq = avg;
      const lowFreq = lowFreqRef.current;

      const calibrationData: CalibrationData = {
        lowFrequency: Math.min(lowFreq, highFreq),
        highFrequency: Math.max(lowFreq, highFreq),
        timestamp: Date.now(),
      };

      const manager = new CalibrationManager();
      manager.saveCalibration(calibrationData);
      setStep('done');
      onComplete(calibrationData);
    }
  }

  if (error) {
    return (
      <div className="calibration-screen">
        <h2 className="calibration-screen__title">Calibration</h2>
        <div className="start-screen__error" role="alert">{error}</div>
        <button className="btn btn--ghost calibration-screen__skip" onClick={onSkip}>
          Skip
        </button>
      </div>
    );
  }

  const promptText = step === 'low'
    ? 'Hum your lowest note...'
    : step === 'high'
      ? 'Now hum your highest note...'
      : 'Calibration complete!';

  return (
    <div className="calibration-screen">
      <h2 className="calibration-screen__title">Calibration</h2>
      <p className="calibration-screen__prompt">{promptText}</p>

      {step !== 'done' && (
        <>
          <div className="calibration-screen__progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="calibration-screen__progress-bar"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <p className="calibration-screen__pitch-display">
            {detectedPitch !== null
              ? `Detected: ${Math.round(detectedPitch)} Hz`
              : 'Listening...'}
          </p>
        </>
      )}

      <button className="btn btn--ghost calibration-screen__skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
