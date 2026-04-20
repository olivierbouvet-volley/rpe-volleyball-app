/**
 * @file RemotionRoot.tsx
 * @description Point d'entrée Remotion — déclare toutes les compositions
 *
 * Utilisé par le Remotion Studio (npx remotion studio) pour prévisualiser
 * et par le CLI pour exporter en MP4.
 */

import { Composition } from 'remotion';
import { GamePlanFocusClip, type GamePlanFocusClipProps } from './GamePlanFocusClip';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GamePlanFocusClipAny = GamePlanFocusClip as any;

export const RemotionRoot = () => {
  const defaultProps: GamePlanFocusClipProps = {
    teamName: 'MONTPELLIER',
    rotation: 1,
    mainTarget:   { name: 'Chone (Z4)',   percent: 58, warning: 'GRANDE DIAG / TIP' },
    secondTarget: { name: 'Raux (Z3)',    percent: 25 },
    thirdTarget:  { name: 'Morgado (Z2)', percent: 17 },
    coachNote: 'Bloquer Z4 en priorité, libérer Z2',
  };

  return (
    <>
      <Composition
        id="GamePlanFocusClip"
        component={GamePlanFocusClipAny}
        durationInFrames={150}   // 5 secondes @ 30fps
        fps={30}
        width={1080}             // Format vertical 9:16 (mobile / Reels)
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};
