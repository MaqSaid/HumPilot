import { useState, useCallback, useRef } from 'react';
import { StartScreen } from './ui/StartScreen';
import { CalibrationScreen } from './ui/CalibrationScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { HUD } from './ui/HUD';
import { GameCanvas } from './ui/GameCanvas';
import { CalibrationManager } from './audio/CalibrationManager';
import { AudioCapture } from './audio/AudioCapture';
import { setMode as setDailyMode } from './game/DailyChallenge';
import './ui/styles.css';

type AppScreen = 'calibration' | 'start' | 'playing' | 'gameover';

interface GameOverState {
  score: number;
  highScore: number;
  isNewBest: boolean;
}

function App() {
  const calibrationManager = useRef(new CalibrationManager()).current;
  const hasCalibration = calibrationManager.hasCalibration();

  const [screen, setScreen] = useState<AppScreen>(hasCalibration ? 'start' : 'calibration');
  const [error, setError] = useState<string | null>(null);
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [gameOverState, setGameOverState] = useState<GameOverState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [streamLost, setStreamLost] = useState(false);

  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const scoreUpdateRef = useRef<((score: number) => void) | null>(null);
  const muteRef = useRef(false);

  const startGame = useCallback(async (daily: boolean) => {
    setError(null);
    setDailyMode(daily);
    setIsDailyMode(daily);

    try {
      // Initialize audio capture
      const capture = new AudioCapture();
      await capture.init();

      // Resume AudioContext (browser autoplay policy)
      await capture.resume();

      audioCaptureRef.current = capture;
      setScreen('playing');
      setStreamLost(false);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Permission') || err.message.includes('NotAllowed')) {
          setError('Microphone access denied. Please allow microphone permission and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Could not start game. Please check microphone access.');
      }
    }
  }, []);

  const handleStart = useCallback(() => startGame(false), [startGame]);
  const handleDailyChallenge = useCallback(() => startGame(true), [startGame]);

  const handleRecalibrate = useCallback(() => {
    calibrationManager.clearCalibration();
    setScreen('calibration');
  }, [calibrationManager]);

  const handleCalibrationComplete = useCallback(() => {
    setScreen('start');
  }, []);

  const handleCalibrationSkip = useCallback(() => {
    setScreen('start');
  }, []);

  const handleGameOver = useCallback((score: number, highScore: number, isNewBest: boolean) => {
    setGameOverState({ score, highScore, isNewBest });
    setScreen('gameover');

    // Clean up audio
    if (audioCaptureRef.current) {
      audioCaptureRef.current.dispose();
      audioCaptureRef.current = null;
    }
  }, []);

  const handleRestart = useCallback(() => {
    setGameOverState(null);
    setScreen('start');
  }, []);

  const handleStreamLost = useCallback(() => {
    setStreamLost(true);
  }, []);

  const handleResume = useCallback(async () => {
    if (audioCaptureRef.current) {
      try {
        await audioCaptureRef.current.resume();
        setStreamLost(false);
      } catch {
        setError('Could not resume microphone. Returning to start.');
        if (audioCaptureRef.current) {
          audioCaptureRef.current.dispose();
          audioCaptureRef.current = null;
        }
        setScreen('start');
      }
    }
  }, []);

  const handleRegisterScoreUpdate = useCallback((updater: (score: number) => void) => {
    scoreUpdateRef.current = updater;
  }, []);

  const handleToggleMute = useCallback(() => {
    muteRef.current = !muteRef.current;
    setIsMuted(muteRef.current);
  }, []);

  return (
    <div className="game-container">
      {screen === 'calibration' && (
        <CalibrationScreen
          onComplete={handleCalibrationComplete}
          onSkip={handleCalibrationSkip}
        />
      )}

      {screen === 'start' && (
        <StartScreen
          onStart={handleStart}
          onDailyChallenge={handleDailyChallenge}
          onRecalibrate={handleRecalibrate}
          error={error}
        />
      )}

      {screen === 'playing' && audioCaptureRef.current && (
        <>
          <GameCanvas
            isDailyMode={isDailyMode}
            onGameOver={handleGameOver}
            onStreamLost={handleStreamLost}
            onScoreUpdate={scoreUpdateRef.current}
            audioCapture={audioCaptureRef.current}
          />
          <HUD
            isDailyMode={isDailyMode}
            onRegisterScoreUpdate={handleRegisterScoreUpdate}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
          />
          {streamLost && (
            <div className="stream-lost-notification">
              <h3 className="stream-lost-notification__title">Microphone Lost</h3>
              <p className="stream-lost-notification__message">
                Your microphone connection was interrupted.
              </p>
              <button className="btn btn--primary" onClick={handleResume}>
                Resume
              </button>
              <button className="btn btn--ghost" onClick={handleRestart} style={{ marginTop: '0.5rem' }}>
                Back to Menu
              </button>
            </div>
          )}
        </>
      )}

      {screen === 'gameover' && gameOverState && (
        <>
          <GameOverScreen
            score={gameOverState.score}
            highScore={gameOverState.highScore}
            isNewBest={gameOverState.isNewBest}
            isDailyMode={isDailyMode}
            onRestart={handleRestart}
          />
        </>
      )}
    </div>
  );
}

export default App;
