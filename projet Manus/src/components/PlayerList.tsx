import React, { useState } from 'react';
import type { Player } from '../types';
import { predictGroup, calculateWellnessScore } from '../utils/prediction';
import { GROUPS } from '../types';
import { Activity, Battery, ChevronRight } from 'lucide-react';
import { PlayerProfileModal } from './PlayerProfileModal';

interface PlayerListProps {
  players: Player[];
  onUpdatePlayer: (player: Player) => void;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, onUpdatePlayer }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  return (
    <>
    <div className="bg-[#181818] rounded-xl border border-[#333] overflow-hidden shadow-xl">
      <div className="divide-y divide-[#2A2A2A]">
        {players.map(player => {
          const prediction = predictGroup(player);
          const groupConfig = GROUPS[prediction.group];
          const wellnessScore = player.wellnessScore || calculateWellnessScore(player);

          return (
            <div key={player.id} className="p-4 hover:bg-[#222] transition-colors group relative">
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="cursor-pointer transition-colors flex-1"
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="flex items-center justify-between pr-2">
                    <div className="font-bold text-gray-200 group-hover:text-white flex items-center gap-2 text-base">
                      {/* Point rouge clignotant pour status critical/attention */}
                      {player.hasCheckin && (player.status === 'critical' || player.status === 'attention') && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                      )}
                      {/* Point orange clignotant pour no checkin */}
                      {!player.hasCheckin && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
                        </span>
                      )}
                      {player.name}
                      {!player.hasCheckin && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 font-bold">No Checkin</span>
                      )}
                      {player.hasCheckin && (player.status === 'critical' || player.status === 'attention') && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold">⚠️ Alerte</span>
                      )}
                      {player.hasSPM && (
                        <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/30 font-bold">SPM</span>
                      )}
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                      prediction.group === 'wonder_woman' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      prediction.group === 'bad_girl' ? 'bg-violet-500/10 text-violet-400 border-violet-500/30' :
                      'bg-pink-500/10 text-pink-400 border-pink-500/30'
                    }`}>
                      <span>{groupConfig.icon}</span>
                      {groupConfig.name}
                    </div>
                  </div>
                  
                  {/* Valeurs compactes affichées directement */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1" title="Score Bien-être">
                      <Activity size={12} className={wellnessScore < 50 ? "text-red-500" : "text-green-500"} />
                      <span className="font-bold text-white">{wellnessScore}%</span>
                    </div>
                    <div className="h-3 w-px bg-[#333]"></div>
                    <div className="flex items-center gap-1" title="Énergie">
                      <Battery size={12} className="text-amber-500" />
                      <span className="font-bold text-white">{player.energy}/10</span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight size={16} className="text-[#E50914] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 self-center ml-2" />
              </div>

              {/* Sliders compacts pour mise à jour rapide */}
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#2A2A2A]">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Forme</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={player.readinessScore}
                    onChange={(e) => onUpdatePlayer({ ...player, readinessScore: parseInt(e.target.value) })}
                    className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                    title="Forme Physique"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Énergie</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={player.energy}
                    onChange={(e) => onUpdatePlayer({ ...player, energy: parseInt(e.target.value) })}
                    className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    title="Énergie"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {selectedPlayer && (
      <PlayerProfileModal 
        player={selectedPlayer} 
        onClose={() => setSelectedPlayer(null)} 
      />
    )}
    </>
  );
};
