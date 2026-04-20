/**
 * @file GamePlanExportModal.tsx
 * @description Modal de prévisualisation + export "snack content" Remotion
 *
 * Affiche le <Player> Remotion avec les données de la rotation sélectionnée.
 * Permet de prévisualiser l'animation 5s avant de l'enregistrer.
 *
 * Usage :
 *   <GamePlanExportModal props={clipProps} onClose={() => setOpen(false)} />
 */

import { useState, useCallback } from 'react';
import { Player } from '@remotion/player';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { GamePlanFocusClip, type GamePlanFocusClipProps } from '../remotion/GamePlanFocusClip';

// Remotion <Player> uses a loose generic; double-cast through unknown to satisfy tsc
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RemotionPlayer = Player as any;

interface GamePlanExportModalProps {
  props: GamePlanFocusClipProps;
  onClose: () => void;
}

export function GamePlanExportModal({ props, onClose }: GamePlanExportModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="flex flex-col gap-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(99,102,241,0.3)',
          maxWidth: 480,
          width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <h2 className="text-white font-bold text-base">📱 Snack Content</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Animation 5s · {props.teamName} · P{props.rotation}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* ── Player Remotion (format 9:16 réduit) ── */}
        <div className="px-4">
          <div
            className="rounded-xl overflow-hidden mx-auto"
            style={{ width: '100%', aspectRatio: '9/16', maxHeight: 480 }}
          >
            <RemotionPlayer
              component={GamePlanFocusClip}
              inputProps={props}
              durationInFrames={150}
              fps={30}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: '100%', height: '100%' }}
              controls
              autoPlay={false}
              loop
            />
          </div>
        </div>

        {/* ── Récap des données ── */}
        <div className="px-4 pb-2">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
            <div className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Données chargées</div>
            <div className="grid grid-cols-3 gap-2">
              {[props.mainTarget, props.secondTarget, props.thirdTarget].map((t, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2 text-center"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(239,68,68,0.1)' : i === 1 ? 'rgba(246,173,85,0.08)' : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${i === 0 ? 'rgba(239,68,68,0.3)' : i === 1 ? 'rgba(246,173,85,0.2)' : 'rgba(100,116,139,0.15)'}`,
                  }}
                >
                  <div className="text-xs font-bold mb-0.5" style={{ color: i === 0 ? '#fc8181' : i === 1 ? '#f6ad55' : '#64748b' }}>
                    {t.percent}%
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{t.name}</div>
                </div>
              ))}
            </div>
            {props.mainTarget.warning && (
              <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <span>⚠️</span>
                <span className="font-semibold">{props.mainTarget.warning}</span>
              </div>
            )}
            {props.coachNote && (
              <div className="mt-1.5 text-xs text-slate-500 italic">
                💬 {props.coachNote}
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          {/* Instruction export CLI */}
          <div
            className="rounded-lg px-3 py-2.5 text-xs font-mono"
            style={{ backgroundColor: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.4)', color: '#94a3b8' }}
          >
            <div className="text-slate-500 mb-1 font-sans font-semibold not-italic">Export MP4 (terminal) :</div>
            npx remotion render GamePlanFocusClip<br />
            <span className="text-slate-600">
              --props='{JSON.stringify({ ...props }).slice(0, 60)}…'
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
