/**
 * @file RotationView.tsx
 * @description Vue rotation avec terrains face-à-face (Home à gauche, Away à droite)
 */

import { useMemo, useState, useEffect } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useVideoStore } from '../store/videoStore';
import { useFilterStore, DEFAULT_CRITERIA } from '../store/filterStore';
import { CourtDiagram } from './CourtDiagram';
import { RallyTimeline } from './RallyTimeline';
import {
  getPlayersForRotation,
  findCurrentRally,
  countPointsInRotation,
  calculateSideOutRate,
  countBreakPoints,
  countBlocksAndDigs,
  calculateReceptionStats,
  getRalliesForRotation,
  getServerInfo,
  identifySetterPosition,
} from '../utils/rotationHelpers';
import type { TeamSide, Rally } from '@volleyvision/data-model';

/**
 * Type de rotation: Service (S1-S6) ou Réception (R1-R6)
 */
type RotationType = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';

/**
 * RotationView - Affiche les deux terrains face-à-face avec stats cumulées
 *
 * Features:
 * - Home à gauche, Away à droite (toujours)
 * - Les deux terrains avec filet en haut
 * - Sélection manuelle de rotation (S1-S6, R1-R6) pour chaque équipe
 * - Sélection de sets avec cumul des stats
 * - Stats cliquables pour charger les rallies complets
 */
export function RotationView() {
  const { match } = useMatchStore();
  const { currentTime, offset, seekTo } = useVideoStore();
  const { setCriteria } = useFilterStore();

  // Sélection de sets (par défaut tous)
  const [selectedSets, setSelectedSets] = useState<number[]>([]);

  // Sélection manuelle de rotation pour chaque équipe
  const [homeRotationType, setHomeRotationType] = useState<RotationType>('S1');
  const [awayRotationType, setAwayRotationType] = useState<RotationType>('S1');

  // Modal pour afficher les rallies
  const [rallyModalOpen, setRallyModalOpen] = useState(false);
  const [modalRallies, setModalRallies] = useState<Rally[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalHighlightTeam, setModalHighlightTeam] = useState<TeamSide | undefined>(undefined);

  // Initialiser selectedSets avec tous les sets au premier rendu
  useMemo(() => {
    if (match && selectedSets.length === 0) {
      setSelectedSets(match.sets.map(s => s.number));
    }
  }, [match]);

  // Extraire rotation number et serving status depuis le type
  const parseRotationType = (rotationType: RotationType): { rotation: number; isServing: boolean } => {
    const isServing = rotationType.startsWith('S');
    const rotation = parseInt(rotationType.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
    return { rotation, isServing };
  };

  const homeRotationInfo = parseRotationType(homeRotationType);
  const awayRotationInfo = parseRotationType(awayRotationType);

  // Trouver un rally représentatif pour chaque équipe avec la rotation sélectionnée
  const homeRally = useMemo((): Rally | null => {
    if (!match || selectedSets.length === 0) return null;

    for (const setNumber of selectedSets) {
      const servingTeam = homeRotationInfo.isServing ? 'home' : 'away';
      const rallies = getRalliesForRotation(match, 'home', setNumber, homeRotationInfo.rotation, servingTeam);
      if (rallies.length > 0) return rallies[0];
    }
    return null;
  }, [match, selectedSets, homeRotationInfo]);

  const awayRally = useMemo((): Rally | null => {
    if (!match || selectedSets.length === 0) return null;

    for (const setNumber of selectedSets) {
      const servingTeam = awayRotationInfo.isServing ? 'away' : 'home';
      const rallies = getRalliesForRotation(match, 'away', setNumber, awayRotationInfo.rotation, servingTeam);
      if (rallies.length > 0) return rallies[0];
    }
    return null;
  }, [match, selectedSets, awayRotationInfo]);

  // Récupérer les joueurs pour chaque rotation
  const homePlayers = useMemo(() => {
    if (!match || !homeRally) return [];
    return getPlayersForRotation(match, 'home', homeRally);
  }, [match, homeRally]);

  const awayPlayers = useMemo(() => {
    if (!match || !awayRally) return [];
    return getPlayersForRotation(match, 'away', awayRally);
  }, [match, awayRally]);

  // Récupérer les infos du serveur pour chaque équipe
  const homeServerInfo = useMemo(() => {
    if (!match || !homeRally || !homeRotationInfo.isServing) return null;
    return getServerInfo(match, homeRally);
  }, [match, homeRally, homeRotationInfo.isServing]);

  const awayServerInfo = useMemo(() => {
    if (!match || !awayRally || !awayRotationInfo.isServing) return null;
    return getServerInfo(match, awayRally);
  }, [match, awayRally, awayRotationInfo.isServing]);

  // Identifier la position du passeur pour chaque équipe
  const homeSetterPosition = useMemo(() => {
    if (!match || !homeRally) return null;
    return identifySetterPosition(match, 'home', homeRally);
  }, [match, homeRally]);

  const awaySetterPosition = useMemo(() => {
    if (!match || !awayRally) return null;
    return identifySetterPosition(match, 'away', awayRally);
  }, [match, awayRally]);

  // Calcul des stats pour HOME (cumul des sets sélectionnés)
  const homeStats = useMemo(() => {
    if (!match || selectedSets.length === 0) return null;

    const rotation = homeRotationInfo.rotation;
    let totalPoints = 0;
    let totalBreakPoints = 0;
    let totalBlocks = 0;
    let totalDigs = 0;
    let totalSideOutOpportunities = 0;
    let totalSuccessfulSideOuts = 0;
    let totalReceptions = 0;
    let totalPositiveReceptions = 0;
    let totalPerfectReceptions = 0;

    for (const setNumber of selectedSets) {
      totalPoints += countPointsInRotation(match, 'home', setNumber, rotation);
      totalBreakPoints += countBreakPoints(match, 'home', setNumber, rotation);

      const { blocks, digs } = countBlocksAndDigs(match, 'home', setNumber, rotation);
      totalBlocks += blocks;
      totalDigs += digs;

      // Pour side-out rate, on cumule les opportunités et réussites
      const sideOutRate = calculateSideOutRate(match, 'home', setNumber, rotation);
      const rallies = getRalliesForRotation(match, 'home', setNumber, rotation);
      const sideOutOpportunities = rallies.filter(r => r.servingTeam !== 'home').length;
      const successfulSideOuts = Math.round((sideOutRate / 100) * sideOutOpportunities);
      totalSideOutOpportunities += sideOutOpportunities;
      totalSuccessfulSideOuts += successfulSideOuts;

      // Pour les réceptions
      const { posRate, perfectCount, totalReceptions: recCount } = calculateReceptionStats(match, 'home', setNumber, rotation);
      totalReceptions += recCount;
      totalPerfectReceptions += perfectCount;
      totalPositiveReceptions += Math.round((posRate / 100) * recCount);
    }

    const sideOutRate = totalSideOutOpportunities > 0 ? (totalSuccessfulSideOuts / totalSideOutOpportunities) * 100 : 0;
    const posRate = totalReceptions > 0 ? (totalPositiveReceptions / totalReceptions) * 100 : 0;

    return {
      points: totalPoints,
      breakPoints: totalBreakPoints,
      blocks: totalBlocks,
      digs: totalDigs,
      sideOutRate,
      posRate,
      perfectCount: totalPerfectReceptions,
      totalReceptions,
    };
  }, [match, homeRotationInfo.rotation, selectedSets]);

  // Calcul des stats pour AWAY (cumul des sets sélectionnés)
  const awayStats = useMemo(() => {
    if (!match || selectedSets.length === 0) return null;

    const rotation = awayRotationInfo.rotation;
    let totalPoints = 0;
    let totalBreakPoints = 0;
    let totalBlocks = 0;
    let totalDigs = 0;
    let totalSideOutOpportunities = 0;
    let totalSuccessfulSideOuts = 0;
    let totalReceptions = 0;
    let totalPositiveReceptions = 0;
    let totalPerfectReceptions = 0;

    for (const setNumber of selectedSets) {
      totalPoints += countPointsInRotation(match, 'away', setNumber, rotation);
      totalBreakPoints += countBreakPoints(match, 'away', setNumber, rotation);

      const { blocks, digs } = countBlocksAndDigs(match, 'away', setNumber, rotation);
      totalBlocks += blocks;
      totalDigs += digs;

      // Pour side-out rate
      const sideOutRate = calculateSideOutRate(match, 'away', setNumber, rotation);
      const rallies = getRalliesForRotation(match, 'away', setNumber, rotation);
      const sideOutOpportunities = rallies.filter(r => r.servingTeam !== 'away').length;
      const successfulSideOuts = Math.round((sideOutRate / 100) * sideOutOpportunities);
      totalSideOutOpportunities += sideOutOpportunities;
      totalSuccessfulSideOuts += successfulSideOuts;

      // Pour les réceptions
      const { posRate, perfectCount, totalReceptions: recCount } = calculateReceptionStats(match, 'away', setNumber, rotation);
      totalReceptions += recCount;
      totalPerfectReceptions += perfectCount;
      totalPositiveReceptions += Math.round((posRate / 100) * recCount);
    }

    const sideOutRate = totalSideOutOpportunities > 0 ? (totalSuccessfulSideOuts / totalSideOutOpportunities) * 100 : 0;
    const posRate = totalReceptions > 0 ? (totalPositiveReceptions / totalReceptions) * 100 : 0;

    return {
      points: totalPoints,
      breakPoints: totalBreakPoints,
      blocks: totalBlocks,
      digs: totalDigs,
      sideOutRate,
      posRate,
      perfectCount: totalPerfectReceptions,
      totalReceptions,
    };
  }, [match, awayRotationInfo.rotation, selectedSets]);

  // Gestionnaires de clic pour les stats - Ouvre le modal RallyTimeline
  const handlePointsClick = (teamSide: TeamSide, rotation: number) => {
    if (!match || selectedSets.length === 0) return;

    // Récupérer tous les rallies de cette rotation dans les sets sélectionnés
    const allRallies: Rally[] = [];
    for (const setNumber of selectedSets) {
      const rallies = getRalliesForRotation(match, teamSide, setNumber, rotation);
      allRallies.push(...rallies);
    }

    if (allRallies.length === 0) return;

    const teamName = teamSide === 'home' ? match.homeTeam.name : match.awayTeam.name;
    setModalRallies(allRallies);
    setModalTitle(`Points - ${teamName} - Rotation ${rotation}`);
    setModalHighlightTeam(teamSide);
    setRallyModalOpen(true);
  };

  const handleBreakPointsClick = (teamSide: TeamSide, rotation: number) => {
    if (!match || selectedSets.length === 0) return;

    const allRallies: Rally[] = [];
    for (const setNumber of selectedSets) {
      const rallies = getRalliesForRotation(match, teamSide, setNumber, rotation, teamSide);
      allRallies.push(...rallies);
    }

    if (allRallies.length === 0) return;

    const teamName = teamSide === 'home' ? match.homeTeam.name : match.awayTeam.name;
    setModalRallies(allRallies);
    setModalTitle(`Break Points - ${teamName} - Rotation ${rotation}`);
    setModalHighlightTeam(teamSide);
    setRallyModalOpen(true);
  };

  const handleSideOutClick = (teamSide: TeamSide, rotation: number) => {
    if (!match || selectedSets.length === 0) return;

    const oppositeTeam = teamSide === 'home' ? 'away' : 'home';
    const allRallies: Rally[] = [];
    for (const setNumber of selectedSets) {
      const rallies = getRalliesForRotation(match, teamSide, setNumber, rotation, oppositeTeam);
      allRallies.push(...rallies);
    }

    if (allRallies.length === 0) return;

    const teamName = teamSide === 'home' ? match.homeTeam.name : match.awayTeam.name;
    setModalRallies(allRallies);
    setModalTitle(`Side-Out - ${teamName} - Rotation ${rotation}`);
    setModalHighlightTeam(teamSide);
    setRallyModalOpen(true);
  };

  const handleReceptionClick = (teamSide: TeamSide, rotation: number) => {
    if (!match || selectedSets.length === 0) return;

    const oppositeTeam = teamSide === 'home' ? 'away' : 'home';
    const allRallies: Rally[] = [];
    for (const setNumber of selectedSets) {
      const rallies = getRalliesForRotation(match, teamSide, setNumber, rotation, oppositeTeam);
      allRallies.push(...rallies);
    }

    if (allRallies.length === 0) return;

    const teamName = teamSide === 'home' ? match.homeTeam.name : match.awayTeam.name;
    setModalRallies(allRallies);
    setModalTitle(`Réceptions - ${teamName} - Rotation ${rotation}`);
    setModalHighlightTeam(teamSide);
    setRallyModalOpen(true);
  };

  // Gestionnaire de clic sur un rally dans le modal
  const handleRallyClick = (rally: Rally) => {
    if (rally.videoTimestamp !== undefined) {
      seekTo(rally.videoTimestamp + offset);
      setRallyModalOpen(false);
    }
  };

  // Toggle set selection
  const toggleSet = (setNumber: number) => {
    setSelectedSets(prev => {
      if (prev.includes(setNumber)) {
        // Si c'est le dernier set sélectionné, ne pas le désélectionner
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== setNumber);
      } else {
        return [...prev, setNumber].sort((a, b) => a - b);
      }
    });
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Aucun match chargé</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-slate-800 rounded-lg p-3 text-center">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Vue Rotation - {match.homeTeam.name} vs {match.awayTeam.name}
        </h3>
        <p className="text-xs text-slate-400">
          Sélectionnez manuellement les rotations pour chaque équipe
        </p>
      </div>

      {/* Sélection de sets */}
      <div className="bg-slate-800 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">📊 Sélection de sets</h4>
        <div className="flex gap-2 flex-wrap">
          {match.sets.map((set) => (
            <button
              key={set.number}
              onClick={() => toggleSet(set.number)}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                selectedSets.includes(set.number)
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Set {set.number}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Stats affichées : {selectedSets.length > 0 ? `Cumul des sets ${selectedSets.join(', ')}` : 'Aucun set sélectionné'}
        </p>
      </div>

      {/* Terrains face-à-face */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terrain HOME (toujours à gauche) */}
        <div className="bg-slate-800 rounded-lg p-4">
          {/* Sélecteur de rotation HOME */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Rotation {match.homeTeam.name}
            </label>
            <select
              value={homeRotationType}
              onChange={(e) => setHomeRotationType(e.target.value as RotationType)}
              className="w-full bg-slate-700 text-slate-100 px-3 py-2 rounded text-sm border border-slate-600 focus:border-primary-blue focus:outline-none"
            >
              <optgroup label="Au Service">
                <option value="S1">S1 - Service Rotation 1</option>
                <option value="S2">S2 - Service Rotation 2</option>
                <option value="S3">S3 - Service Rotation 3</option>
                <option value="S4">S4 - Service Rotation 4</option>
                <option value="S5">S5 - Service Rotation 5</option>
                <option value="S6">S6 - Service Rotation 6</option>
              </optgroup>
              <optgroup label="En Réception">
                <option value="R1">R1 - Réception Rotation 1</option>
                <option value="R2">R2 - Réception Rotation 2</option>
                <option value="R3">R3 - Réception Rotation 3</option>
                <option value="R4">R4 - Réception Rotation 4</option>
                <option value="R5">R5 - Réception Rotation 5</option>
                <option value="R6">R6 - Réception Rotation 6</option>
              </optgroup>
            </select>
          </div>

          {/* Badge indiquant si HOME sert */}
          <div className="flex justify-center mb-3">
            {homeRotationInfo.isServing ? (
              <span className="inline-flex items-center gap-2 bg-yellow-900/40 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-600/50">
                🏐 AU SERVICE
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold border border-blue-600/50">
                🛡️ EN RÉCEPTION
              </span>
            )}
          </div>

          <CourtDiagram
            teamSide="home"
            teamName={match.homeTeam.name}
            players={homePlayers}
            server={
              homeRotationInfo.isServing && homeServerInfo && homeServerInfo.player
                ? {
                    playerName: homeServerInfo.player.lastName,
                    playerNumber: homeServerInfo.player.number,
                    position: 1,
                  }
                : undefined
            }
            highlightPosition={homeSetterPosition as 1 | 2 | 3 | 4 | 5 | 6}
            size="medium"
            compact={false}
            flipped={false}
          />

          {/* Stats HOME */}
          {homeStats && homeRotationInfo.isServing && (
            <RotationStatsServing
              teamSide="home"
              rotation={homeRotationInfo.rotation}
              stats={{
                points: homeStats.points,
                breakPoints: homeStats.breakPoints,
                blocks: homeStats.blocks,
                digs: homeStats.digs,
              }}
              onPointsClick={handlePointsClick}
              onBreakPointsClick={handleBreakPointsClick}
            />
          )}
          {homeStats && !homeRotationInfo.isServing && (
            <RotationStatsReceiving
              teamSide="home"
              rotation={homeRotationInfo.rotation}
              stats={{
                points: homeStats.points,
                sideOutRate: homeStats.sideOutRate,
                posRate: homeStats.posRate,
                perfectCount: homeStats.perfectCount,
                totalReceptions: homeStats.totalReceptions,
              }}
              onPointsClick={handlePointsClick}
              onSideOutClick={handleSideOutClick}
              onReceptionClick={handleReceptionClick}
            />
          )}
        </div>

        {/* Terrain AWAY (toujours à droite) */}
        <div className="bg-slate-800 rounded-lg p-4">
          {/* Sélecteur de rotation AWAY */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Rotation {match.awayTeam.name}
            </label>
            <select
              value={awayRotationType}
              onChange={(e) => setAwayRotationType(e.target.value as RotationType)}
              className="w-full bg-slate-700 text-slate-100 px-3 py-2 rounded text-sm border border-slate-600 focus:border-primary-blue focus:outline-none"
            >
              <optgroup label="Au Service">
                <option value="S1">S1 - Service Rotation 1</option>
                <option value="S2">S2 - Service Rotation 2</option>
                <option value="S3">S3 - Service Rotation 3</option>
                <option value="S4">S4 - Service Rotation 4</option>
                <option value="S5">S5 - Service Rotation 5</option>
                <option value="S6">S6 - Service Rotation 6</option>
              </optgroup>
              <optgroup label="En Réception">
                <option value="R1">R1 - Réception Rotation 1</option>
                <option value="R2">R2 - Réception Rotation 2</option>
                <option value="R3">R3 - Réception Rotation 3</option>
                <option value="R4">R4 - Réception Rotation 4</option>
                <option value="R5">R5 - Réception Rotation 5</option>
                <option value="R6">R6 - Réception Rotation 6</option>
              </optgroup>
            </select>
          </div>

          {/* Badge indiquant si AWAY sert */}
          <div className="flex justify-center mb-3">
            {awayRotationInfo.isServing ? (
              <span className="inline-flex items-center gap-2 bg-yellow-900/40 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-600/50">
                🏐 AU SERVICE
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold border border-blue-600/50">
                🛡️ EN RÉCEPTION
              </span>
            )}
          </div>

          <CourtDiagram
            teamSide="away"
            teamName={match.awayTeam.name}
            players={awayPlayers}
            server={
              awayRotationInfo.isServing && awayServerInfo && awayServerInfo.player
                ? {
                    playerName: awayServerInfo.player.lastName,
                    playerNumber: awayServerInfo.player.number,
                    position: 1,
                  }
                : undefined
            }
            highlightPosition={awaySetterPosition as 1 | 2 | 3 | 4 | 5 | 6}
            size="medium"
            compact={false}
            flipped={false}
          />

          {/* Stats AWAY */}
          {awayStats && awayRotationInfo.isServing && (
            <RotationStatsServing
              teamSide="away"
              rotation={awayRotationInfo.rotation}
              stats={{
                points: awayStats.points,
                breakPoints: awayStats.breakPoints,
                blocks: awayStats.blocks,
                digs: awayStats.digs,
              }}
              onPointsClick={handlePointsClick}
              onBreakPointsClick={handleBreakPointsClick}
            />
          )}
          {awayStats && !awayRotationInfo.isServing && (
            <RotationStatsReceiving
              teamSide="away"
              rotation={awayRotationInfo.rotation}
              stats={{
                points: awayStats.points,
                sideOutRate: awayStats.sideOutRate,
                posRate: awayStats.posRate,
                perfectCount: awayStats.perfectCount,
                totalReceptions: awayStats.totalReceptions,
              }}
              onPointsClick={handlePointsClick}
              onSideOutClick={handleSideOutClick}
              onReceptionClick={handleReceptionClick}
            />
          )}
        </div>
      </div>

      {/* Légende */}
      <div className="bg-slate-800 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">📖 Légende</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
            <span className="text-slate-400">Joueur</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-violet-500"></span>
            <span className="text-slate-400">Libéro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-red-500"></span>
            <span className="text-slate-400">Passeur</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🏐</span>
            <span className="text-slate-400">Serveur</span>
          </div>
        </div>
      </div>

      {/* Modal Rally Timeline */}
      {rallyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* En-tête du modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">{modalTitle}</h3>
              <button
                onClick={() => setRallyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenu du modal */}
            <div className="flex-1 overflow-hidden p-4">
              <RallyTimeline
                rallies={modalRallies}
                match={match}
                onRallyClick={handleRallyClick}
                highlightTeam={modalHighlightTeam}
                title=""
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * RotationStatsServing - Stats pour l'équipe au service
 */
interface RotationStatsServingProps {
  teamSide: TeamSide;
  rotation: number;
  stats: {
    points: number;
    breakPoints: number;
    blocks: number;
    digs: number;
  };
  onPointsClick: (teamSide: TeamSide, rotation: number) => void;
  onBreakPointsClick: (teamSide: TeamSide, rotation: number) => void;
}

function RotationStatsServing({
  teamSide,
  rotation,
  stats,
  onPointsClick,
  onBreakPointsClick,
}: RotationStatsServingProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">📊 Stats - Rotation {rotation}</h4>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Points - Cliquable */}
        <button
          onClick={() => onPointsClick(teamSide, rotation)}
          className="bg-slate-900 hover:bg-slate-700 transition-colors rounded p-2 text-center cursor-pointer"
        >
          <div className="text-slate-400 mb-1">Points</div>
          <div className="text-lg font-bold text-white">{stats.points}</div>
        </button>

        {/* Break Points - Cliquable */}
        <button
          onClick={() => onBreakPointsClick(teamSide, rotation)}
          className="bg-slate-900 hover:bg-slate-700 transition-colors rounded p-2 text-center cursor-pointer"
        >
          <div className="text-slate-400 mb-1">Break Pts</div>
          <div className="text-lg font-bold text-amber-400">{stats.breakPoints}</div>
        </button>

        {/* Blocks / Digs */}
        <div className="bg-slate-900 rounded p-2 text-center">
          <div className="text-slate-400 mb-1">B / D</div>
          <div className="text-lg font-bold text-blue-400">
            {stats.blocks} / {stats.digs}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RotationStatsReceiving - Stats pour l'équipe en réception
 */
interface RotationStatsReceivingProps {
  teamSide: TeamSide;
  rotation: number;
  stats: {
    points: number;
    sideOutRate: number;
    posRate: number;
    perfectCount: number;
    totalReceptions: number;
  };
  onPointsClick: (teamSide: TeamSide, rotation: number) => void;
  onSideOutClick: (teamSide: TeamSide, rotation: number) => void;
  onReceptionClick: (teamSide: TeamSide, rotation: number) => void;
}

function RotationStatsReceiving({
  teamSide,
  rotation,
  stats,
  onPointsClick,
  onSideOutClick,
  onReceptionClick,
}: RotationStatsReceivingProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">📊 Stats - Rotation {rotation}</h4>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Points - Cliquable */}
        <button
          onClick={() => onPointsClick(teamSide, rotation)}
          className="bg-slate-900 hover:bg-slate-700 transition-colors rounded p-2 text-center cursor-pointer"
        >
          <div className="text-slate-400 mb-1">Points</div>
          <div className="text-lg font-bold text-white">{stats.points}</div>
        </button>

        {/* Side-Out % - Cliquable */}
        <button
          onClick={() => onSideOutClick(teamSide, rotation)}
          className="bg-slate-900 hover:bg-slate-700 transition-colors rounded p-2 text-center cursor-pointer"
        >
          <div className="text-slate-400 mb-1">Side-Out</div>
          <div className="text-lg font-bold text-green-400">{stats.sideOutRate.toFixed(0)}%</div>
        </button>

        {/* Réceptions positives - Cliquable */}
        <button
          onClick={() => onReceptionClick(teamSide, rotation)}
          className="bg-slate-900 hover:bg-slate-700 transition-colors rounded p-2 text-center cursor-pointer"
        >
          <div className="text-slate-400 mb-1">Réc. ++</div>
          <div className="text-lg font-bold text-purple-400">
            {stats.perfectCount} / {stats.totalReceptions}
          </div>
        </button>
      </div>
    </div>
  );
}
