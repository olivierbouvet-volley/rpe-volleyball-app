import React from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GROUPS } from '../types';
import type { CalendarEvent, Player } from '../types';
import { predictGroup } from '../utils/prediction';
import { Users, Info, Clock, Copy, ClipboardPaste } from 'lucide-react';

interface WeekCalendarProps {
  currentDate: Date;
  events: CalendarEvent[];
  players: Player[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onPasteEvent?: (clipboardEvent: CalendarEvent, targetDate: Date) => void;
}

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  currentDate,
  events,
  players,
  onEventClick,
  onDayClick,
  onPasteEvent
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [clipboard, setClipboard] = React.useState<CalendarEvent | null>(null);

  const handleCopyEvent = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setClipboard(event);
    // Feedback visuel (toast ou autre) pourrait être ajouté ici
  };

  const handlePasteEvent = (e: React.MouseEvent, day: Date) => {
    e.stopPropagation();
    if (!clipboard || !onPasteEvent) return;
    
    onPasteEvent(clipboard, day);
    // On ne vide pas le presse-papier pour permettre le collage multiple
  };

  const getDailyStats = (date: Date) => {
    const counts = {
      wonder_woman: 0,
      bad_girl: 0,
      recovery: 0
    };

    players.forEach(player => {
      // Normaliser les dates à minuit pour éviter les décalages d'heures
      const dateNormalized = new Date(date);
      dateNormalized.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dayOffset = Math.floor((dateNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Formule correcte qui gère les nombres négatifs
      let projectedCycleDay = player.cycleDay + dayOffset;
      // Ramener dans l'intervalle 1-28
      while (projectedCycleDay <= 0) projectedCycleDay += 28;
      while (projectedCycleDay > 28) projectedCycleDay -= 28;
      
      const projectedPlayer = { ...player, cycleDay: projectedCycleDay };
      
      if (projectedPlayer.cycleDay <= 5) projectedPlayer.cyclePhase = 'menstrual';
      else if (projectedPlayer.cycleDay <= 13) projectedPlayer.cyclePhase = 'follicular';
      else if (projectedPlayer.cycleDay <= 16) projectedPlayer.cyclePhase = 'ovulatory';
      else projectedPlayer.cyclePhase = 'luteal';

      const prediction = predictGroup(projectedPlayer);
      counts[prediction.group]++;
    });

    return counts;
  };

  return (
    <div className="grid grid-cols-7 gap-4 overflow-x-auto pb-4">
      {days.map((day) => {
        const isToday = isSameDay(day, new Date());
        const dayEvents = events.filter(e => isSameDay(e.start, day));
        const stats = getDailyStats(day);

        return (
          <div 
            key={day.toISOString()} 
            className={`min-w-[200px] rounded-lg border transition-all duration-300 flex flex-col h-full group hover:scale-[1.02] ${
              isToday 
                ? 'bg-[#1a1a1a] border-[#E50914] shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                : 'bg-[#181818] border-[#333] hover:border-gray-500'
            }`}
          >
            {/* Header */}
            <div className={`p-4 text-center border-b ${isToday ? 'border-[#E50914]/30 bg-[#E50914]/10' : 'border-[#333] bg-[#222]'} rounded-t-lg`}>
              <div className={`font-bold capitalize text-lg ${isToday ? 'text-[#E50914]' : 'text-gray-300'}`}>
                {format(day, 'EEEE', { locale: fr })}
              </div>
              <div className={`text-sm ${isToday ? 'text-white' : 'text-gray-500'}`}>
                {format(day, 'd MMMM', { locale: fr })}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col gap-4">
              {/* Events */}
              <div className="space-y-3">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="p-3 bg-[#2A2A2A] border-l-4 border-[#E50914] rounded cursor-pointer hover:bg-[#333] transition-colors group/event relative pr-8"
                  >
                    <div className="font-bold text-sm text-white group-hover/event:text-[#E50914] transition-colors">{event.title}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </div>
                    
                    <button 
                      onClick={(e) => handleCopyEvent(e, event)}
                      className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white opacity-0 group-hover/event:opacity-100 transition-opacity"
                      title="Copier la séance"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
                {dayEvents.length === 0 && (
                  <div className="text-center text-xs text-gray-600 py-6 italic border border-dashed border-[#333] rounded relative group/empty">
                    Repos
                    {clipboard && (
                      <button 
                        onClick={(e) => handlePasteEvent(e, day)}
                        className="absolute inset-0 flex items-center justify-center bg-[#2A2A2A]/90 text-white opacity-0 group-hover/empty:opacity-100 transition-opacity gap-2 font-bold text-sm"
                      >
                        <ClipboardPaste size={16} />
                        Coller
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Players Projected States */}
              <div className="mt-4 pt-4 border-t border-[#333]">
                <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Users size={12} />
                  État Projeté des Joueuses
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {players.map(player => {
                    // Normaliser les dates à minuit pour éviter les décalages d'heures
                    const dayNormalized = new Date(day);
                    dayNormalized.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const dayOffset = Math.floor((dayNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // Formule correcte qui gère les nombres négatifs
                    let projectedCycleDay = player.cycleDay + dayOffset;
                    // Ramener dans l'intervalle 1-28
                    while (projectedCycleDay <= 0) projectedCycleDay += 28;
                    while (projectedCycleDay > 28) projectedCycleDay -= 28;
                    
                    let projectedPhase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' = 'follicular';
                    if (projectedCycleDay <= 5) projectedPhase = 'menstrual';
                    else if (projectedCycleDay <= 13) projectedPhase = 'follicular';
                    else if (projectedCycleDay <= 16) projectedPhase = 'ovulatory';
                    else projectedPhase = 'luteal';

                    const projectedPlayer = { ...player, cycleDay: projectedCycleDay, cyclePhase: projectedPhase };
                    const prediction = predictGroup(projectedPlayer);
                    const groupConfig = GROUPS[prediction.group];

                    return (
                      <div 
                        key={player.id}
                        className={`flex items-center justify-between p-1.5 rounded text-xs hover:bg-[#222] transition-colors border ${
                          prediction.group === 'wonder_woman' ? 'border-amber-500/20 bg-amber-500/5' :
                          prediction.group === 'bad_girl' ? 'border-violet-500/20 bg-violet-500/5' :
                          'border-pink-500/20 bg-pink-500/5'
                        }`}
                      >
                        <span className="text-gray-300 font-medium truncate flex-1 min-w-0">
                          {player.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            prediction.group === 'wonder_woman' ? 'text-amber-400' :
                            prediction.group === 'bad_girl' ? 'text-violet-400' :
                            'text-pink-400'
                          }`}>
                            J{projectedCycleDay}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            prediction.group === 'wonder_woman' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            prediction.group === 'bad_girl' ? 'bg-violet-500/10 text-violet-400 border-violet-500/30' :
                            'bg-pink-500/10 text-pink-400 border-pink-500/30'
                          }`}>
                            {groupConfig.icon}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group Stats */}
              <div className="mt-4 pt-4 border-t border-[#333]">
                <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Users size={12} />
                  Prévisions
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-[#222] transition-colors">
                    <span className="flex items-center gap-2 text-amber-400 font-medium">
                      <span>{GROUPS.wonder_woman.icon}</span>
                      Wonder Woman
                    </span>
                    <span className="font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      {stats.wonder_woman}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-[#222] transition-colors">
                    <span className="flex items-center gap-2 text-violet-400 font-medium">
                      <span>{GROUPS.bad_girl.icon}</span>
                      Bad Girl
                    </span>
                    <span className="font-bold text-white bg-violet-500/20 px-2 py-0.5 rounded border border-violet-500/30">
                      {stats.bad_girl}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-[#222] transition-colors">
                    <span className="flex items-center gap-2 text-pink-400 font-medium">
                      <span>{GROUPS.recovery.icon}</span>
                      Récupération
                    </span>
                    <span className="font-bold text-white bg-pink-500/20 px-2 py-0.5 rounded border border-pink-500/30">
                      {stats.recovery}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => onDayClick(day)}
                  className="w-full mt-4 py-2 text-xs font-bold text-gray-300 bg-[#2A2A2A] hover:bg-[#3A3A3A] hover:text-white border border-[#404040] rounded flex items-center justify-center gap-2 transition-all"
                >
                  <Info size={14} />
                  DÉTAILS
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
