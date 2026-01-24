import React from 'react';
import type { Player } from '../types';
import { X, Activity, Battery, Smile } from 'lucide-react';

interface PlayerProfileModalProps {
  player: Player;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#333]">
        {/* Header */}
        <div className="p-6 border-b border-[#333] flex justify-between items-center bg-gradient-to-r from-[#181818] to-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E50914] rounded flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-red-900/20">
              {player.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{player.name}</h2>
              <p className="text-sm text-gray-400">Profil Joueuse</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#333] rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-[#141414]">
          {/* Stats Rapides */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-[#222] p-6 rounded-xl border border-[#333] text-center hover:border-[#E50914] transition-colors group">
              <Activity className="mx-auto text-gray-400 group-hover:text-[#E50914] mb-3 transition-colors" size={28} />
              <div className="text-3xl font-bold text-white mb-1">{player.readinessScore}%</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Forme</div>
            </div>
            <div className="bg-[#222] p-6 rounded-xl border border-[#333] text-center hover:border-green-500 transition-colors group">
              <Smile className="mx-auto text-gray-400 group-hover:text-green-500 mb-3 transition-colors" size={28} />
              <div className="text-3xl font-bold text-white mb-1">{player.mood || '-'}/10</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Humeur</div>
            </div>
            <div className="bg-[#222] p-6 rounded-xl border border-[#333] text-center hover:border-amber-500 transition-colors group">
              <Battery className="mx-auto text-gray-400 group-hover:text-amber-500 mb-3 transition-colors" size={28} />
              <div className="text-3xl font-bold text-white mb-1">{player.energy}/10</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Énergie</div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="border-t border-[#333] pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#E50914] rounded-full"></span>
              Documents & Fichiers
            </h3>
            <div className="bg-[#181818] rounded-xl border border-[#333] p-6">
               {/* Placeholder pour DocumentsManager qui n'est pas encore stylisé */}
               <div className="text-gray-400 text-sm text-center py-8 border border-dashed border-[#333] rounded-lg">
                  Zone de gestion des documents (Photos, Certificats...)
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
