/**
 * @file OffsetCalibrator.tsx
 * @description Tool for calibrating video-to-DVW time offset
 */

import { useState, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { formatVideoTime, youTubeToDvwTime, parseTimeString } from '../utils/videoHelpers';

/**
 * OffsetCalibrator component
 * Helps users calibrate the time offset between video start and match start
 *
 * Usage:
 * 1. Play video to the moment when the first rally starts
 * 2. Pause video
 * 3. Click "Set Offset to Current Time"
 * OR manually adjust offset with +/- buttons or direct input
 */
export function OffsetCalibrator() {
  const { offset, currentTime, setOffset } = useVideoStore();
  const [manualInput, setManualInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Set offset to current video time
  const handleSetToCurrent = useCallback(() => {
    setOffset(currentTime);
  }, [currentTime, setOffset]);

  // Adjust offset by delta
  const handleAdjustOffset = useCallback((delta: number) => {
    setOffset(Math.max(0, offset + delta));
  }, [offset, setOffset]);

  // Reset offset to 0
  const handleReset = useCallback(() => {
    setOffset(0);
  }, [setOffset]);

  // Handle manual offset input
  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Try parsing as time string (MM:SS or HH:MM:SS)
    const parsedTime = parseTimeString(manualInput);
    if (parsedTime !== null) {
      setOffset(parsedTime);
      setManualInput('');
      return;
    }

    // Try parsing as number (seconds)
    const parsedNumber = parseFloat(manualInput);
    if (!isNaN(parsedNumber) && parsedNumber >= 0) {
      setOffset(parsedNumber);
      setManualInput('');
    } else {
      alert('Invalid input. Enter seconds (e.g., 150) or time format (e.g., 2:30)');
    }
  }, [manualInput, setOffset]);

  // Calculate DVW time from current video time
  const dvwTime = youTubeToDvwTime(currentTime, offset);
  const dvwTimeFormatted = dvwTime >= 0 ? formatVideoTime(dvwTime) : '-' + formatVideoTime(Math.abs(dvwTime));

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Video Sync Calibration</h3>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showHelp ? 'Hide Help' : 'Show Help'}
        </button>
      </div>

      {/* Help text */}
      {showHelp && (
        <div className="text-xs text-slate-400 bg-slate-900 p-3 rounded space-y-2">
          <p className="font-semibold text-slate-300">How to calibrate:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Load a match with DVW data</li>
            <li>Load a YouTube video of the same match</li>
            <li>Play the video to the moment when the <strong>first rally starts</strong></li>
            <li>Pause the video at that exact moment</li>
            <li>Click "Set to Current Time" below</li>
          </ol>
          <p className="pt-2">
            The offset tells the app when the match starts in the video timeline.
            DVW time 00:00 corresponds to the first rally.
          </p>
        </div>
      )}

      {/* Current state */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">Video Time</span>
          <span className="font-mono font-semibold text-blue-400">
            {formatVideoTime(currentTime)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">Match Time (DVW)</span>
          <span className={`font-mono font-semibold ${dvwTime < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {dvwTimeFormatted}
          </span>
        </div>
      </div>

      {/* Offset display and controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Offset (Match Start)</span>
          <span className="font-mono text-sm font-semibold text-slate-200">
            {formatVideoTime(offset)}
          </span>
        </div>

        {/* Quick adjustment buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSetToCurrent}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
          >
            Set to Current Time
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors"
            title="Reset offset to 0"
          >
            Reset
          </button>
        </div>

        {/* Fine adjustment */}
        <div className="flex gap-1">
          <button
            onClick={() => handleAdjustOffset(-10)}
            className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          >
            -10s
          </button>
          <button
            onClick={() => handleAdjustOffset(-1)}
            className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          >
            -1s
          </button>
          <button
            onClick={() => handleAdjustOffset(-0.1)}
            className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          >
            -0.1s
          </button>
          <button
            onClick={() => handleAdjustOffset(0.1)}
            className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          >
            +0.1s
          </button>
          <button
            onClick={() => handleAdjustOffset(1)}
            className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          >
            +1s
          </button>
          <button
            onClick={() => handleAdjustOffset(10)}
            className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          >
            +10s
          </button>
        </div>

        {/* Manual input */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Manual offset (150 or 2:30)"
            className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors"
          >
            Set
          </button>
        </form>
      </div>

      {/* Status indicator */}
      {dvwTime < 0 && (
        <div className="text-xs text-amber-400 bg-amber-900/20 p-2 rounded">
           Negative match time - the offset may need adjustment
        </div>
      )}
    </div>
  );
}
