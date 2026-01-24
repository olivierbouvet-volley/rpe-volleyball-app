import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Player, GroupType, SequenceBlock, CalendarEvent } from '../types';
import { predictGroup } from '../utils/prediction';
import { X, Printer, Plus, Trash2, Image as ImageIcon, CheckSquare, Clock, AlertTriangle, Battery, GripHorizontal, Maximize2, Video, Film, Users, Share2, MessageSquarePlus, FileDown, Copy, ClipboardPaste, ChevronLeft } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { storageService } from '../services/FirebaseStorageService';

interface DayDetailsModalProps {
  date: Date;
  players: Player[];
  initialTime?: string;
  savedSequences?: SequenceBlock[];
  onSave?: (sequences: SequenceBlock[]) => void;
  onClose: () => void;
  groupClipboard?: any | null;
  onCopyGroup?: (groupData: any) => void;
  onClearGroupClipboard?: () => void;
  importedEvents?: CalendarEvent[];
}

// --- UTILS POUR L'AGENDA ---
const PIXELS_PER_MINUTE = 2;
const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h - START_HOUR) * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const totalMin = minutes + (START_HOUR * 60);
  const h = Math.floor(totalMin / 60);
  const m = Math.floor(totalMin % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Composant Carte Joueuse Simplifiée pour la Pool
const PoolPlayerCard = React.memo(({ 
  player, 
  prediction,
  isSelected,
  onToggleSelect,
  conflict,
  projectedCycleDay
}: { 
  player: Player, 
  prediction: { group: GroupType, reason: string },
  isSelected: boolean,
  onToggleSelect: () => void,
  conflict?: boolean,
  projectedCycleDay?: number
}) => {
  const borderColor = 
    prediction.group === 'wonder_woman' ? 'border-amber-500' :
    prediction.group === 'bad_girl' ? 'border-violet-500' :
    'border-pink-500';

  // Alertes basées sur le statut actuel
  const hasAlert = player.status === 'critical' || player.status === 'attention';
  const hasSPM = player.hasSPM;

  return (
    <div 
      onClick={onToggleSelect}
      className={`bg-[#222] p-2 rounded border-l-4 ${borderColor} border-t border-r border-b border-[#333] hover:bg-[#2a2a2a] cursor-pointer transition-all relative ${isSelected ? 'ring-2 ring-[#E50914]' : ''} ${conflict ? 'opacity-50 grayscale' : ''}`}
    >
      {conflict && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded">
          <span className="text-red-500 font-bold text-xs flex items-center gap-1"><AlertTriangle size={12} /> Occupée</span>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1.5">
          {hasAlert && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
          )}
          {hasSPM && !hasAlert && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
            </span>
          )}
          <div className="font-bold text-gray-200 text-sm">{player.name}</div>
        </div>
        {isSelected && <CheckSquare size={14} className="text-[#E50914]" />}
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {projectedCycleDay && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
            prediction.group === 'wonder_woman' ? 'bg-amber-500/20 text-amber-400' :
            prediction.group === 'bad_girl' ? 'bg-violet-500/20 text-violet-400' :
            'bg-pink-500/20 text-pink-400'
          }`}>J{projectedCycleDay}</span>
        )}
        <span className="text-[9px] bg-[#333] text-gray-400 px-1 rounded">Score: {player.wellnessScore}%</span>
        <div className="flex items-center gap-1 text-[9px] bg-[#333] text-amber-400 px-1 rounded">
          <Battery size={8} /> {player.energy}
        </div>
        {hasSPM && (
          <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded font-bold">SPM</span>
        )}
        {hasAlert && (
          <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded font-bold">⚠️</span>
        )}
      </div>
    </div>
  );
});

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ 
  date, 
  players, 
  initialTime, 
  savedSequences = [], 
  onSave, 
  onClose,
  groupClipboard,
  onCopyGroup,
  onClearGroupClipboard,
  importedEvents
}) => {
  // État local strict - initialisé une seule fois
  const [sequences, setSequences] = useState<SequenceBlock[]>(() => {
    // MIGRATION AUTOMATIQUE : Si on a des anciennes données (mediaUrl), on les convertit
    const migratedSequences = savedSequences.map(seq => {
      // @ts-ignore - Pour gérer la compatibilité avec les anciennes données
      if (seq.mediaUrl && (!seq.media || seq.media.length === 0)) {
        return {
          ...seq,
          media: [{
            id: `migrated-${Date.now()}-${Math.random()}`,
            // @ts-ignore
            url: seq.mediaUrl,
            // @ts-ignore
            type: seq.mediaType || 'image'
          }]
        };
      }
      return seq;
    });

    if (migratedSequences.length > 0) return migratedSequences;
    
    // Création par défaut si vide
    
    // Si on a des événements importés, on les utilise pour initialiser les groupes
    if (importedEvents && importedEvents.length > 0) {
      return importedEvents.map((evt, index) => {
        const startT = format(evt.start, 'HH:mm');
        const endT = format(evt.end, 'HH:mm');
        
        // Déterminer une couleur par défaut basée sur l'index
        const colors = ['border-amber-500', 'border-violet-500', 'border-pink-500', 'border-blue-500'];
        const color = colors[index % colors.length];

        return {
          id: `seq-imported-${evt.id}-${index}`,
          title: evt.title,
          startTime: startT,
          endTime: endT,
          playerIds: [],
          notes: '', // On pourrait mettre evt.description si disponible
          color: color,
          media: []
        };
      });
    }

    // Sinon, AUCUN groupe par défaut - liste vide
    // L'utilisateur doit créer manuellement ou importer un agenda
    return [];
  });

  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  const [poolPlayers, setPoolPlayers] = useState<{player: Player, prediction: any}[]>([]);
  
  // Drag & Drop States
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  
  // Resize States
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeOriginalDuration, setResizeOriginalDuration] = useState(0);
  
  // Create (Drag-to-Create) States
  const [isCreating, setIsCreating] = useState(false);
  const [createStartY, setCreateStartY] = useState(0);
  const [createStartMin, setCreateStartMin] = useState(0);
  const [tempSequence, setTempSequence] = useState<SequenceBlock | null>(null);

  const [expandedSequenceId, setExpandedSequenceId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialSequencesRef = useRef<string>('');

  // Sauvegarder l'état initial des séquences
  useEffect(() => {
    initialSequencesRef.current = JSON.stringify(sequences);
  }, []);

  // Détecter les modifications
  useEffect(() => {
    const currentState = JSON.stringify(sequences);
    setHasUnsavedChanges(currentState !== initialSequencesRef.current);
  }, [sequences]);

  // Initialisation des joueurs (calculé une seule fois ou si players change)
  useEffect(() => {
    // Normaliser les dates à minuit pour éviter les décalages d'heures
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayOffset = Math.floor((dateNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const calculatedPlayers = players.map(player => {
      // Formule correcte qui gère les nombres négatifs
      let projectedCycleDay = player.cycleDay + dayOffset;
      // Ramener dans l'intervalle 1-28
      while (projectedCycleDay <= 0) projectedCycleDay += 28;
      while (projectedCycleDay > 28) projectedCycleDay -= 28;
      
      const projectedPlayer = { ...player, cycleDay: projectedCycleDay };
      return {
        player: projectedPlayer,
        prediction: predictGroup(projectedPlayer)
      };
    });

    setPoolPlayers(calculatedPlayers);
  }, [date, players]);

  // Fonction pour sauvegarder SANS fermer
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(sequences);
    }
  }, [sequences, onSave]);

  // Fonction pour fermer (utilisée par le bouton Retour)
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // --- GROUP COPY / PASTE ---
  const handleCopyGroup = (seqId: string) => {
    const seq = sequences.find(s => s.id === seqId);
    if (!seq || !onCopyGroup) return;

    // On copie tout SAUF les joueurs et l'ID
    const groupData = {
      title: seq.title,
      notes: seq.notes,
      color: seq.color,
      media: seq.media, // On garde les médias (références)
      duration: timeToMinutes(seq.endTime) - timeToMinutes(seq.startTime)
    };
    
    onCopyGroup(groupData);
    // Feedback visuel pourrait être ajouté ici
  };

  const handlePasteGroup = () => {
    if (!groupClipboard) return;

    // On crée un nouveau groupe au centre de la vue actuelle ou à 10:00 par défaut
    const startT = initialTime || '10:00';
    const startMin = timeToMinutes(startT);
    const endMin = Math.min(TOTAL_MINUTES, startMin + (groupClipboard.duration || 30));
    
    const newSequence: SequenceBlock = {
      id: `seq-pasted-${Date.now()}`,
      title: `${groupClipboard.title} (Copie)`,
      startTime: startT,
      endTime: minutesToTime(endMin),
      playerIds: [], // Pas de joueurs copiés
      notes: groupClipboard.notes || '',
      color: groupClipboard.color || 'border-gray-500',
      media: groupClipboard.media ? [...groupClipboard.media] : [] // Copie superficielle du tableau de médias
    };

    setSequences(prev => [...prev, newSequence]);
    
    // Optionnel : vider le presse-papier après collage si on veut usage unique
    // if (onClearGroupClipboard) onClearGroupClipboard();
  };

  // Scroll automatique (une seule fois au montage)
  useEffect(() => {
    if (initialTime && gridRef.current) {
      const startMin = timeToMinutes(initialTime);
      const scrollY = Math.max(0, (startMin * PIXELS_PER_MINUTE) - 100);
      
      setTimeout(() => {
        gridRef.current?.scrollTo({
          top: scrollY,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, []); // Dépendance vide pour ne le faire qu'une fois

  // --- GESTION SOURIS (DRAG & RESIZE & CREATE) ---

  const handleMouseDown = (e: React.MouseEvent, seqId: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    setActiveSequenceId(seqId);
    const seq = sequences.find(s => s.id === seqId);
    if (!seq) return;

    if (type === 'move') {
      setIsDragging(true);
      setDragStartY(e.clientY);
      setDragStartTime(timeToMinutes(seq.startTime));
    } else {
      setIsResizing(true);
      setResizeStartY(e.clientY);
      setResizeOriginalDuration(timeToMinutes(seq.endTime) - timeToMinutes(seq.startTime));
    }
  };

  const handleGridMouseDown = (e: React.MouseEvent) => {
    if (!gridRef.current) return;
    if ((e.target as HTMLElement).closest('.sequence-block')) return;

    const rect = gridRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top + gridRef.current.scrollTop;
    const clickMinutes = Math.floor(clickY / PIXELS_PER_MINUTE / 5) * 5;

    // On prépare la création mais on ne crée pas tout de suite
    // Il faut un mouvement (drag) pour valider la création
    setIsCreating(true);
    setCreateStartY(e.clientY);
    setCreateStartMin(clickMinutes);
    setTempSequence(null); // On ne crée pas encore le bloc visuel
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && activeSequenceId) {
      const deltaY = e.clientY - dragStartY;
      const deltaMinutes = Math.round(deltaY / PIXELS_PER_MINUTE / 5) * 5;
      
      const newStartMin = Math.max(0, Math.min(TOTAL_MINUTES - 15, dragStartTime + deltaMinutes));
      const seq = sequences.find(s => s.id === activeSequenceId);
      if (!seq) return;
      
      const duration = timeToMinutes(seq.endTime) - timeToMinutes(seq.startTime);
      const newEndMin = Math.min(TOTAL_MINUTES, newStartMin + duration);

      setSequences(prev => prev.map(s => s.id === activeSequenceId ? {
        ...s,
        startTime: minutesToTime(newStartMin),
        endTime: minutesToTime(newEndMin)
      } : s));
    }

    if (isResizing && activeSequenceId) {
      const deltaY = e.clientY - resizeStartY;
      const deltaMinutes = Math.round(deltaY / PIXELS_PER_MINUTE / 5) * 5;
      
      const seq = sequences.find(s => s.id === activeSequenceId);
      if (!seq) return;

      const startMin = timeToMinutes(seq.startTime);
      const newDuration = Math.max(15, resizeOriginalDuration + deltaMinutes);
      const newEndMin = Math.min(TOTAL_MINUTES, startMin + newDuration);

      setSequences(prev => prev.map(s => s.id === activeSequenceId ? {
        ...s,
        endTime: minutesToTime(newEndMin)
      } : s));
    }

    if (isCreating) {
      const deltaY = e.clientY - createStartY;
      
      // SEUIL DE DÉCLENCHEMENT : Il faut bouger d'au moins 10 pixels pour commencer à créer
      // Cela évite les créations accidentelles sur un simple clic
      if (!tempSequence && Math.abs(deltaY) < 10) return;

      const deltaMinutes = Math.round(deltaY / PIXELS_PER_MINUTE / 5) * 5;
      const newDuration = Math.max(15, 15 + deltaMinutes);
      const newEndMin = Math.min(TOTAL_MINUTES, createStartMin + newDuration);

      if (!tempSequence) {
        // Premier mouvement significatif : on initialise le bloc temporaire
        setTempSequence({
          id: 'temp-creating',
          title: 'Nouveau Groupe',
          startTime: minutesToTime(createStartMin),
          endTime: minutesToTime(newEndMin),
          playerIds: [],
          notes: '',
          color: 'border-gray-500 opacity-50 border-dashed'
        });
      } else {
        // Mise à jour continue pendant le drag
        setTempSequence({
          ...tempSequence,
          endTime: minutesToTime(newEndMin)
        });
      }
    }
  };

  const handleMouseUp = () => {
    if (isCreating && tempSequence) {
      const finalSeq: SequenceBlock = {
        ...tempSequence,
        id: `seq-${Date.now()}`,
        color: 'border-gray-500',
        title: 'Nouveau Groupe'
      };
      setSequences(prev => [...prev, finalSeq]);
      setActiveSequenceId(finalSeq.id);
      setTempSequence(null);
    }

    setIsDragging(false);
    setIsResizing(false);
    setIsCreating(false);
  };

  // --- LOGIQUE METIER ---

  const handleUpdateSequence = (id: string, updates: Partial<SequenceBlock>) => {
    setSequences(seqs => seqs.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSequence = (id: string) => {
    if (window.confirm('Supprimer ce groupe ?')) {
      setSequences(seqs => seqs.filter(s => s.id !== id));
      if (activeSequenceId === id) setActiveSequenceId(null);
    }
  };

  const isTimeOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    return (start1 < end2 && start2 < end1);
  };

  const handleTogglePlayerInSequence = (playerId: string) => {
    if (!activeSequenceId) return;

    const activeSeq = sequences.find(s => s.id === activeSequenceId);
    if (!activeSeq) return;

    const conflictingSeq = sequences.find(s => 
      s.id !== activeSequenceId && 
      s.playerIds.includes(playerId) &&
      isTimeOverlap(s.startTime, s.endTime, activeSeq.startTime, activeSeq.endTime)
    );

    if (conflictingSeq) {
      alert(`Conflit ! Cette joueuse est déjà dans "${conflictingSeq.title}" de ${conflictingSeq.startTime} à ${conflictingSeq.endTime}.`);
      return;
    }

    const newPlayerIds = activeSeq.playerIds.includes(playerId)
      ? activeSeq.playerIds.filter(id => id !== playerId)
      : [...activeSeq.playerIds, playerId];
    
    setSequences(prev => prev.map(s => s.id === activeSequenceId ? { ...s, playerIds: newPlayerIds } : s));
  };

  const isPlayerConflict = (playerId: string) => {
    if (!activeSequenceId) return false;
    const activeSeq = sequences.find(s => s.id === activeSequenceId);
    if (!activeSeq) return false;

    return sequences.some(s => 
      s.id !== activeSequenceId && 
      s.playerIds.includes(playerId) &&
      isTimeOverlap(s.startTime, s.endTime, activeSeq.startTime, activeSeq.endTime)
    );
  };

  const isPlayerSelected = (playerId: string): boolean => {
    if (!activeSequenceId) return false;
    const activeSeq = sequences.find(s => s.id === activeSequenceId);
    return activeSeq?.playerIds.includes(playerId) ?? false;
  };

  const handlePrint = () => {
    window.print();
  };

  // --- GLOBAL PDF EXPORT (CONTINUOUS FLOW) ---
  const handleGlobalExportPDF = async () => {
    // Fonction pour nettoyer le texte des emojis et caractères spéciaux
    const cleanText = (text: string): string => {
      if (!text) return '';
      // Remplacer les emojis et caractères spéciaux par des espaces
      return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symboles divers
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Drapeaux
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Symboles divers
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Sélecteurs de variation
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Emojis supplémentaires
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Emojis étendus
        .replace(/[^\x00-\x7F\u00C0-\u017F]/g, '') // Garde ASCII + caractères latins étendus
        .trim();
    };

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Configuration de la page
    const PAGE_HEIGHT = 210;
    const PAGE_WIDTH = 297;
    const MARGIN = 10;
    const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
    
    let currentY = MARGIN;

    // Fonction pour ajouter une nouvelle page avec fond sombre
    const addNewPage = () => {
      doc.addPage();
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
      currentY = MARGIN;
    };

    // Initialisation première page
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

    // Titre du document
    doc.setTextColor(229, 9, 20); // Rouge Netflix
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`PLANIFICATION - ${format(date, 'EEEE d MMMM', { locale: fr }).toUpperCase()}`, MARGIN, currentY + 5);
    currentY += 15;

    // On parcourt toutes les séquences
    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      
      // Estimation de la hauteur nécessaire pour ce bloc (Titre + Notes + Médias)
      // On fait une estimation large pour éviter de couper un bloc en plein milieu si possible
      // Hauteur min : Titre (10) + Infos (10) + Notes (30 si présentes) + Médias (80 si présents)
      let estimatedHeight = 30; 
      if (seq.notes) estimatedHeight += 30;
      if (seq.media && seq.media.length > 0) estimatedHeight += 90;

      // Si pas assez de place, nouvelle page
      if (currentY + estimatedHeight > PAGE_HEIGHT - MARGIN) {
        addNewPage();
      }

      // --- DÉBUT DU BLOC SÉQUENCE ---
      const startY = currentY;
      
      // Fond du bloc séquence (légèrement plus clair que le fond de page)
      doc.setFillColor(28, 28, 28);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, estimatedHeight, 3, 3, 'F');
      
      // Bande de couleur à gauche (selon le groupe si possible, sinon gris)
      let borderColor = [100, 100, 100];
      if (seq.color && seq.color.includes('amber')) borderColor = [245, 158, 11];
      else if (seq.color && seq.color.includes('violet')) borderColor = [139, 92, 246];
      else if (seq.color && seq.color.includes('pink')) borderColor = [236, 72, 153];
      
      doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(MARGIN, currentY, 2, estimatedHeight, 1, 1, 'F');

      // Titre Séquence
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanText(seq.title), MARGIN + 8, currentY + 10);

      // Horaire
      doc.setTextColor(229, 9, 20);
      doc.setFontSize(12);
      doc.setFont('courier', 'bold');
      doc.text(`${seq.startTime} - ${seq.endTime}`, MARGIN + 8, currentY + 18);

      // Icône Groupe Ouvert (visuel)
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      // Petit carré symbolique
      doc.rect(PAGE_WIDTH - MARGIN - 10, currentY + 5, 5, 5); 
      doc.line(PAGE_WIDTH - MARGIN - 10, currentY + 7.5, PAGE_WIDTH - MARGIN - 5, currentY + 7.5); // trait horizontal
      doc.line(PAGE_WIDTH - MARGIN - 7.5, currentY + 5, PAGE_WIDTH - MARGIN - 7.5, currentY + 10); // trait vertical

      // --- CONTENU DU BLOC ---
      let contentY = currentY + 25;
      const contentX = MARGIN + 8;
      const contentWidth = CONTENT_WIDTH - 16;

      // 1. Joueuses assignées avec couleurs du cycle
      if (seq.playerIds && seq.playerIds.length > 0) {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Joueuses (${seq.playerIds.length}):`, contentX, contentY);
        contentY += 6;

        // Afficher les joueuses avec leur couleur de cycle
        let playerX = contentX;
        seq.playerIds.forEach((pid) => {
          const player = players.find(p => p.id === pid);
          if (!player) return;

          // Déterminer la couleur selon la phase du cycle
          let playerColor: [number, number, number] = [158, 158, 158]; // Gris par défaut (unknown)
          
          switch (player.cyclePhase) {
            case 'menstrual':
              playerColor = [236, 72, 153]; // Rose
              break;
            case 'follicular':
              playerColor = [76, 175, 80]; // Vert
              break;
            case 'ovulatory':
              playerColor = [245, 158, 11]; // Amber/Orange
              break;
            case 'luteal':
              playerColor = [156, 39, 176]; // Violet
              break;
            case 'unknown':
            default:
              playerColor = [158, 158, 158]; // Gris
              break;
          }

          doc.setTextColor(...playerColor);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          const playerName = cleanText(player.name.split(' ')[0]); // Prénom seulement
          const textWidth = doc.getTextWidth(playerName);
          
          // Si on dépasse la largeur, passer à la ligne
          if (playerX + textWidth + 8 > contentX + contentWidth) {
            playerX = contentX;
            contentY += 5;
          }
          
          doc.text(playerName, playerX, contentY);
          playerX += textWidth + 8;
        });
        
        contentY += 8;
      }

      // 2. Notes du Coach
      if (seq.notes) {
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        const cleanedNotes = cleanText(seq.notes);
        const splitNotes = doc.splitTextToSize(cleanedNotes, contentWidth);
        doc.text(splitNotes, contentX, contentY);
        contentY += (splitNotes.length * 5) + 5;
      }

      // 2. Médias (Images/Vidéos)
      if (seq.media && seq.media.length > 0) {
        // On les affiche en ligne (max 3 par ligne)
        let mediaX = contentX;
        const mediaBoxWidth = 80;
        const mediaBoxHeight = 60;
        const gap = 5;

        for (let m = 0; m < seq.media.length; m++) {
          const media = seq.media[m];
          
          // Si on dépasse la largeur, on passe à la ligne (non géré ici pour simplifier, on suppose max 3)
          if (mediaX + mediaBoxWidth > PAGE_WIDTH - MARGIN) {
             mediaX = contentX;
             contentY += mediaBoxHeight + 25; // Saut de ligne
          }

          try {
            // Cadre média
            doc.setFillColor(20, 20, 20);
            doc.roundedRect(mediaX, contentY, mediaBoxWidth, mediaBoxHeight, 2, 2, 'F');

            if (media.type === 'image') {
              doc.addImage(media.url, 'JPEG', mediaX + 1, contentY + 1, mediaBoxWidth - 2, mediaBoxHeight - 2, undefined, 'FAST');
            } else {
              doc.setTextColor(100, 100, 100);
              doc.setFontSize(10);
              doc.text("[VIDÉO]", mediaX + (mediaBoxWidth/2), contentY + (mediaBoxHeight/2), { align: 'center' });
            }

            // Note média
            if (media.notes) {
              doc.setFillColor(0, 0, 0, 0.5); // Fond semi-transparent pour note
              doc.rect(mediaX, contentY + mediaBoxHeight, mediaBoxWidth, 15, 'F');
              
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(8);
              const splitMediaNote = doc.splitTextToSize(media.notes, mediaBoxWidth - 2);
              doc.text(splitMediaNote, mediaX + 1, contentY + mediaBoxHeight + 4);
            }

            mediaX += mediaBoxWidth + gap;

          } catch (e) {
            console.error("Erreur image PDF", e);
          }
        }
        // Ajuster la hauteur finale du bloc selon la ligne de médias la plus basse
        contentY += mediaBoxHeight + 20; 
      }

      // Mise à jour de la hauteur réelle du bloc (si notre estimation était fausse)
      const actualHeight = contentY - startY;
      // On redessine le fond avec la bonne hauteur (astuce : on le fait par dessus ou on aurait dû calculer avant)
      // Ici pour simplifier, on met à jour currentY pour le prochain bloc
      currentY += Math.max(estimatedHeight, actualHeight) + 5; // +5 de marge entre blocs
    }

    // Sauvegarde
    const fileName = `Seance_${format(date, 'yyyy-MM-dd')}_Timeline.pdf`;
    doc.save(fileName);
  };

  const handleShare = useCallback(async (targetId?: string) => {
    const element = targetId 
      ? document.getElementById(targetId) 
      : modalRef.current;

    if (!element) return;

    // --- STRATÉGIE DE CAPTURE UNIVERSELLE (OPTION NUCLÉAIRE) ---
    // On remplace TOUS les médias (vidéos ET images) par des canvas statiques
    // Cela contourne 100% des problèmes de sécurité/CORS/chargement lors de la capture
    
    const mediaReplacements: { original: HTMLElement, canvas: HTMLCanvasElement, parent: HTMLElement }[] = [];
    
    // 1. Traitement des VIDÉOS
    const videos = element.querySelectorAll('video');
    videos.forEach(video => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'contain';
          canvas.className = video.className;
          
          const parent = video.parentElement;
          if (parent) {
            video.style.display = 'none';
            parent.appendChild(canvas);
            mediaReplacements.push({ original: video, canvas, parent });
          }
        }
      } catch (e) { console.warn("Skip video capture", e); }
    });

    // 2. Traitement des IMAGES (C'est là que ça plantait !)
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      try {
        // Si l'image n'est pas chargée, on l'ignore
        if (!img.complete || !img.naturalWidth) return;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.clientWidth;
        canvas.height = img.naturalHeight || img.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // On dessine l'image sur le canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // On copie le style exact
          canvas.style.width = img.style.width || '100%';
          canvas.style.height = img.style.height || '100%';
          canvas.style.objectFit = getComputedStyle(img).objectFit || 'contain';
          canvas.className = img.className;

          const parent = img.parentElement;
          if (parent) {
            img.style.display = 'none';
            parent.appendChild(canvas);
            mediaReplacements.push({ original: img, canvas, parent });
          }
        }
      } catch (e) { console.warn("Skip image capture", e); }
    });

    try {
      // Configuration simplifiée car tout est maintenant du canvas pur
      // FORCE LA HAUTEUR TOTALE pour capturer tout le contenu scrollable
      const originalHeight = element.style.height;
      const originalOverflow = element.style.overflow;
      const originalMaxHeight = element.style.maxHeight;
      
      // On force l'élément à prendre toute sa hauteur réelle
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';

      const dataUrl = await toPng(element as HTMLElement, {
        backgroundColor: '#141414',
        pixelRatio: 2,
        cacheBust: false,
        height: element.scrollHeight, // Capture toute la hauteur de défilement
        style: { 
          backgroundColor: '#141414', 
          color: '#ffffff',
          height: 'auto',
          maxHeight: 'none',
          overflow: 'visible'
        },
        // On filtre les éléments originaux au cas où ils seraient encore visibles
        filter: (node) => node.tagName !== 'IMG' && node.tagName !== 'VIDEO'
      });

      // Restauration du style original
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('Image copiée ! (Ctrl+V pour coller)');
      } catch (err) {
        const link = document.createElement('a');
        link.download = `planning-${format(date, 'yyyy-MM-dd')}.png`;
        link.href = dataUrl;
        link.click();
        alert('Image téléchargée !');
      }
    } catch (error) {
      console.error('Erreur fatale capture:', error);
      alert('Erreur capture. Utilisez Win+Shift+S.');
    } finally {
      // --- RESTAURATION ---
      mediaReplacements.forEach(({ original, canvas, parent }) => {
        if (parent.contains(canvas)) parent.removeChild(canvas);
        original.style.display = '';
      });
    }
  }, [date]);

  const handleRemoveMedia = (seqId: string, mediaId: string) => {
    const seq = sequences.find(s => s.id === seqId);
    if (seq && seq.media) {
      handleUpdateSequence(seqId, { 
        media: seq.media.filter(m => m.id !== mediaId) 
      });
    }
  };

  // --- LAYOUT ALGORITHM (OVERLAP) ---
  const getBlockStyle = (seq: SequenceBlock) => {
    const startMin = timeToMinutes(seq.startTime);
    const endMin = timeToMinutes(seq.endTime);
    const height = (endMin - startMin) * PIXELS_PER_MINUTE;
    const top = startMin * PIXELS_PER_MINUTE;

    if (seq.id === 'temp-creating') {
      return {
        top: `${top}px`,
        height: `${height}px`,
        left: '0%',
        width: '100%',
        position: 'absolute' as const,
        zIndex: 50
      };
    }

    const concurrents = sequences.filter(s => s.id !== 'temp-creating' && isTimeOverlap(s.startTime, s.endTime, seq.startTime, seq.endTime));
    
    concurrents.sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return b.endTime.localeCompare(a.endTime);
    });

    const index = concurrents.findIndex(s => s.id === seq.id);
    const widthPercent = 100 / concurrents.length;
    const leftPercent = index * widthPercent;

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      position: 'absolute' as const
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-[#141414] w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl flex overflow-hidden border border-[#333]">
        
        {/* Left: Player Pool */}
        <div className="w-80 bg-[#181818] border-r border-[#333] flex flex-col">
          <div className="p-4 border-b border-[#333] bg-[#222]">
            <h3 className="text-white font-bold flex items-center gap-2">
              <CheckSquare size={18} className="text-[#E50914]" />
              Effectif Disponible
            </h3>
            <p className="text-xs text-gray-500 mt-1">Sélectionnez un groupe pour assigner</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {poolPlayers.map(({ player, prediction }) => {
              // Calculer le cycle projeté pour ce jour
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
              
              return (
                <PoolPlayerCard
                  key={player.id}
                  player={player}
                  prediction={prediction}
                  isSelected={isPlayerSelected(player.id)}
                  onToggleSelect={() => handleTogglePlayerInSequence(player.id)}
                  conflict={isPlayerConflict(player.id)}
                  projectedCycleDay={projectedCycleDay}
                />
              );
            })}
          </div>
        </div>

        {/* Center: Agenda Grid */}
        <div className="flex-1 flex flex-col relative bg-[#141414]">
          {/* Header */}
          <div className="h-16 border-b border-[#333] flex items-center justify-between px-6 bg-[#181818]">
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">
                {format(date, 'EEEE d MMMM', { locale: fr })}
              </h2>
              <p className="text-xs text-gray-400">Planification des séances</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold transition-colors flex items-center gap-2" 
                title="Enregistrer"
              >
                <CheckSquare size={18} />
                Enregistrer
              </button>
              <button onClick={() => handleShare()} className="p-2 hover:bg-[#333] rounded text-gray-300 transition-colors" title="Partager (Copier Image)">
                <Share2 size={20} />
              </button>
              <button onClick={handlePrint} className="p-2 hover:bg-[#333] rounded text-gray-300 transition-colors" title="Imprimer">
                <Printer size={20} />
              </button>
              <button onClick={handleGlobalExportPDF} className="p-2 hover:bg-blue-600 hover:text-white rounded text-gray-300 transition-colors" title="Exporter PDF Complet (Paysage)">
                <FileDown size={20} />
              </button>
              <button onClick={handleClose} className="px-4 py-2 bg-[#333] hover:bg-[#444] rounded text-white font-semibold transition-colors flex items-center gap-2" title="Retour au planning semaine">
                <ChevronLeft size={18} />
                Retour
              </button>
            </div>
          </div>
          
          {/* Paste Button Bar (if clipboard has content) */}
          {groupClipboard && (
            <div className="bg-[#222] border-b border-[#333] px-6 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <Copy size={12} />
                <span>Groupe copié : <span className="text-white font-bold">{groupClipboard.title}</span></span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePasteGroup}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
                >
                  <ClipboardPaste size={12} />
                  Coller le groupe ici
                </button>
                <button 
                  onClick={onClearGroupClipboard}
                  className="p-1 hover:bg-[#333] text-gray-500 hover:text-white rounded"
                  title="Annuler"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Timeline Grid */}
          <div 
            ref={gridRef}
            className="flex-1 overflow-y-auto relative select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleGridMouseDown}
          >
            {/* Time Markers */}
            {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
              const hour = START_HOUR + i;
              return (
                <div 
                  key={hour} 
                  className="absolute w-full border-t border-[#333] text-xs text-gray-600 pl-2 flex items-center"
                  style={{ top: `${i * 60 * PIXELS_PER_MINUTE}px` }}
                >
                  <span className="bg-[#141414] pr-2 -mt-2.5">{hour}:00</span>
                </div>
              );
            })}

            {/* Blocks */}
            <div className="absolute top-0 left-16 right-4 bottom-0">
              {sequences.map(seq => (
                <div
                  key={seq.id}
                  id={`sequence-${seq.id}`}
                  style={getBlockStyle(seq)}
                  className={`sequence-block rounded-lg border-l-4 ${seq.color || 'border-gray-500'} bg-[#222] shadow-lg overflow-hidden group hover:z-10 transition-shadow cursor-move flex flex-col`}
                  onMouseDown={(e) => handleMouseDown(e, seq.id, 'move')}
                  onClick={(e) => { e.stopPropagation(); setActiveSequenceId(seq.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setExpandedSequenceId(seq.id); }}
                >
                  <div className="h-4 bg-[#333] w-full cursor-grab active:cursor-grabbing flex items-center justify-center">
                    <GripHorizontal size={12} className="text-gray-500" />
                  </div>

                  <div className={`flex-1 p-2 flex flex-col min-h-0 ${activeSequenceId === seq.id ? 'bg-[#2a2a2a]' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <input 
                        value={seq.title}
                        onChange={(e) => handleUpdateSequence(seq.id, { title: e.target.value })}
                        className="bg-transparent font-bold text-sm text-white w-full focus:outline-none focus:border-b border-[#E50914]"
                        placeholder="Titre..."
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleShare(`sequence-${seq.id}`)} className="p-1 hover:text-green-400 text-gray-400" title="Partager ce groupe">
                          <Share2 size={12} />
                        </button>
                        <button onClick={() => setExpandedSequenceId(seq.id)} className="p-1 hover:text-blue-400 text-gray-400">
                          <Maximize2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteSequence(seq.id)} className="p-1 hover:text-red-500 text-gray-400">
                          <Trash2 size={12} />
                        </button>
                        <button onClick={() => handleCopyGroup(seq.id)} className="p-1 hover:text-white text-gray-400" title="Copier ce groupe">
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-2">
                      <Clock size={10} />
                      {seq.startTime} - {seq.endTime}
                    </div>

                    <div className="flex flex-wrap gap-1 overflow-hidden mb-1">
                      {seq.playerIds.map(pid => {
                        const p = players.find(pl => pl.id === pid);
                        if (!p) return null;
                        const pred = predictGroup(p);
                        const colorClass = 
                          pred.group === 'wonder_woman' ? 'text-amber-400 bg-amber-900/30 border-amber-500/30' :
                          pred.group === 'bad_girl' ? 'text-violet-400 bg-violet-900/30 border-violet-500/30' :
                          'text-pink-400 bg-pink-900/30 border-pink-500/30';
                        
                        return (
                          <span key={pid} className={`text-[9px] px-1.5 py-0.5 rounded border ${colorClass} truncate max-w-[80px]`}>
                            {p.name.split(' ')[0]}
                          </span>
                        );
                      })}
                    </div>

                    <textarea
                      value={seq.notes}
                      onChange={(e) => handleUpdateSequence(seq.id, { notes: e.target.value })}
                      placeholder="Notes rapides..."
                      className="w-full bg-black/20 text-gray-300 text-[10px] p-1 rounded border border-transparent focus:border-[#E50914] focus:outline-none resize-none flex-1 min-h-[20px]"
                      onMouseDown={(e) => e.stopPropagation()}
                    />

                    {seq.media && seq.media.length > 0 && (
                      <div className="mt-1 h-8 rounded bg-black/50 flex items-center justify-center overflow-hidden relative shrink-0">
                        {seq.media[0].type === 'video' ? (
                          <Video size={12} className="text-gray-400" />
                        ) : (
                          <img src={seq.media[0].url} alt="Media" className="w-full h-full object-cover opacity-70" />
                        )}
                        {seq.media.length > 1 && (
                          <div className="absolute right-0 bottom-0 bg-black/80 text-[8px] px-1 text-white">
                            +{seq.media.length - 1}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-1 pt-1 border-t border-[#333] flex justify-between items-center shrink-0">
                      <div className="flex gap-2">
                        <label className="text-gray-500 hover:text-white cursor-pointer flex items-center justify-center">
                          <ImageIcon size={12} />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,video/*"
                            multiple
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (files) {
                                // Récupérer userId depuis localStorage (stocké par l'app principale)
                                const userId = localStorage.getItem('userId') || 'coach';
                                
                                const dateKey = format(date, 'yyyy-MM-dd');
                                
                                for (const file of Array.from(files)) {
                                  try {
                                    const result = await storageService.uploadMedia(file, userId, dateKey);
                                    
                                    const newMedia = {
                                      id: `media-${Date.now()}-${Math.random()}`,
                                      url: result.url,
                                      thumbnailUrl: result.thumbnailUrl,
                                      type: result.type
                                    };
                                    
                                    setSequences(prev => {
                                      const currentSeq = prev.find(s => s.id === seq.id);
                                      if (!currentSeq) return prev;
                                      const currentMedia = currentSeq.media || [];
                                      return prev.map(s => s.id === seq.id ? { ...s, media: [...currentMedia, newMedia] } : s);
                                    });
                                  } catch (error) {
                                    console.error('Erreur upload média:', error);
                                    alert('Échec de l\'upload du média');
                                  }
                                }
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Users size={10} /> {seq.playerIds.length}
                      </span>
                    </div>
                  </div>

                  <div 
                    className="h-2 bg-transparent hover:bg-[#E50914] cursor-ns-resize w-full absolute bottom-0 transition-colors"
                    onMouseDown={(e) => handleMouseDown(e, seq.id, 'resize')}
                  />
                </div>
              ))}

              {tempSequence && (
                <div
                  style={getBlockStyle(tempSequence)}
                  className={`rounded-lg border-l-4 ${tempSequence.color} bg-[#222]/80 shadow-lg flex flex-col justify-center items-center pointer-events-none`}
                >
                  <div className="text-white font-bold text-sm">Création...</div>
                  <div className="text-xs text-gray-400">{tempSequence.startTime} - {tempSequence.endTime}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {expandedSequenceId && (() => {
        const seq = sequences.find(s => s.id === expandedSequenceId);
        if (!seq) return null;
        return (
          <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-8">
            <div id={`expanded-sequence-${seq.id}`} className="bg-[#181818] w-full max-w-4xl rounded-xl border border-[#333] p-8 relative max-h-[90vh] overflow-y-auto flex flex-col">
              
              {/* Boutons de navigation en haut à droite */}
              <div className="absolute top-4 right-4 flex gap-2 z-50">
                <button 
                  onClick={handleSave}
                  className={`px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2 shadow-lg ${
                    hasUnsavedChanges 
                      ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' 
                      : 'bg-[#333] text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!hasUnsavedChanges}
                  title={hasUnsavedChanges ? 'Enregistrer les modifications' : 'Aucune modification'}
                >
                  <CheckSquare size={18} />
                  Enregistrer
                </button>
                
                <button 
                  onClick={() => setExpandedSequenceId(null)}
                  className="px-4 py-2 bg-[#333] rounded hover:bg-[#444] transition-colors text-white shadow-lg flex items-center gap-2"
                  title="Retour au planning journée"
                >
                  <ChevronLeft size={18} />
                  Retour
                </button>
              </div>

              <button 
                onClick={() => handleGlobalExportPDF()}
                className="absolute top-20 right-4 p-2 bg-[#333] rounded-full hover:bg-blue-600 transition-colors text-white z-50 shadow-lg"
                title="Exporter en PDF"
              >
                <FileDown size={20} />
              </button>
              <button 
                onClick={() => handleShare(`expanded-sequence-${seq.id}`)}
                className="absolute top-32 right-4 p-2 bg-[#333] rounded-full hover:bg-green-600 transition-colors text-white z-50 shadow-lg"
                title="Partager cette vue"
              >
                <Share2 size={20} />
              </button>

              <div className="grid grid-cols-2 gap-8 h-full">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{seq.title}</h2>
                  <div className="text-xl text-[#E50914] font-mono mb-6 flex items-center gap-2">
                    <Clock /> {seq.startTime} - {seq.endTime}
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg border border-[#333] mb-6">
                    <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-3">Notes du Coach</h3>
                    <textarea 
                      value={seq.notes}
                      onChange={(e) => handleUpdateSequence(seq.id, { notes: e.target.value })}
                      className="w-full bg-transparent text-gray-200 focus:outline-none min-h-[100px] resize-none"
                      placeholder="Ajouter des consignes..."
                    />
                  </div>

                  <div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-3">Joueuses Assignées ({seq.playerIds.length})</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {seq.playerIds.map(pid => {
                        const p = players.find(pl => pl.id === pid);
                        if (!p) return null;
                        const pred = predictGroup(p);
                        const borderColor = 
                          pred.group === 'wonder_woman' ? 'border-amber-500' :
                          pred.group === 'bad_girl' ? 'border-violet-500' :
                          'border-pink-500';
                        
                        return (
                          <div key={pid} className={`px-3 py-1.5 bg-[#222] rounded border-l-4 ${borderColor} border-t border-r border-b border-[#333] flex items-center gap-3 group`}>
                            <span className="text-sm font-bold text-gray-200">{p.name}</span>
                            <div className="flex gap-2">
                              <span className="text-[10px] bg-[#333] text-gray-400 px-1.5 py-0.5 rounded">Score: {p.wellnessScore}%</span>
                              <div className="flex items-center gap-1 text-[10px] bg-[#333] text-amber-400 px-1.5 py-0.5 rounded">
                                <Battery size={10} /> {p.energy}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpdateSequence(seq.id, { 
                                playerIds: seq.playerIds.filter(id => id !== pid) 
                              })}
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-600 rounded text-white"
                              title="Retirer du groupe"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-3 mt-6">Joueuses Disponibles</h3>
                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2">
                      {players
                        .filter(p => !seq.playerIds.includes(p.id))
                        .map(p => {
                          const pred = predictGroup(p);
                          const borderColor = 
                            pred.group === 'wonder_woman' ? 'border-amber-500' :
                            pred.group === 'bad_girl' ? 'border-violet-500' :
                            'border-pink-500';
                          
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleUpdateSequence(seq.id, { 
                                playerIds: [...seq.playerIds, p.id] 
                              })}
                              className={`px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded border-l-4 ${borderColor} border-t border-r border-b border-[#333] flex items-center gap-3 transition-colors cursor-pointer`}
                            >
                              <span className="text-sm font-bold text-gray-400">{p.name}</span>
                              <div className="flex gap-2">
                                <span className="text-[10px] bg-[#333] text-gray-500 px-1.5 py-0.5 rounded">Score: {p.wellnessScore}%</span>
                                <div className="flex items-center gap-1 text-[10px] bg-[#333] text-amber-400 px-1.5 py-0.5 rounded">
                                  <Battery size={10} /> {p.energy}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      }
                    </div>
                  </div>
                </div>

                <div className="bg-black rounded-lg border border-[#333] flex flex-col relative group h-fit">
                  <div className="relative flex items-center justify-center bg-[#000] min-h-[300px]">
                    {seq.media && seq.media.length > 0 ? (
                      <div className="w-full p-2 grid grid-cols-1 gap-2">
                        {seq.media.map((media, index) => {
                          const hasNote = media.notes !== undefined && media.notes !== null;
                          
                          return (
                            <div key={media.id} className="relative group/media bg-[#1a1a1a] p-2 rounded border border-[#333] flex gap-4 transition-all">
                              {/* Zone Média (Dynamique) */}
                              <div className={`${hasNote ? 'w-1/2' : 'w-full'} relative transition-all duration-300`}>
                                {media.type === 'video' ? (
                                  <video src={media.url} controls className="w-full rounded max-h-[300px] object-contain bg-black" />
                                ) : (
                                  <img src={media.url} alt={`Media ${index + 1}`} className="w-full rounded max-h-[300px] object-contain bg-black" />
                                )}
                                
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/media:opacity-100 transition-opacity z-10">
                                  {!hasNote && (
                                    <button
                                      onClick={() => {
                                        setSequences(prev => {
                                          const currentSeq = prev.find(s => s.id === seq.id);
                                          if (!currentSeq || !currentSeq.media) return prev;
                                          const updatedMedia = currentSeq.media.map(m => 
                                            m.id === media.id ? { ...m, notes: '' } : m
                                          );
                                          return prev.map(s => s.id === seq.id ? { ...s, media: updatedMedia } : s);
                                        });
                                      }}
                                      className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                                      title="Ajouter une note"
                                    >
                                      <MessageSquarePlus size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRemoveMedia(seq.id, media.id)}
                                    className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                                    title="Supprimer ce média"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Zone Note (Optionnelle) */}
                              {hasNote && (
                                <div className="w-1/2 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Note du Coach</label>
                                    <button 
                                      onClick={() => {
                                        setSequences(prev => {
                                          const currentSeq = prev.find(s => s.id === seq.id);
                                          if (!currentSeq || !currentSeq.media) return prev;
                                          const updatedMedia = currentSeq.media.map(m => {
                                            if (m.id === media.id) {
                                              const { notes, ...rest } = m;
                                              return rest;
                                            }
                                            return m;
                                          });
                                          return prev.map(s => s.id === seq.id ? { ...s, media: updatedMedia } : s);
                                        });
                                      }}
                                      className="text-gray-500 hover:text-red-500"
                                      title="Supprimer la note"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <textarea
                                    value={media.notes || ''}
                                    onChange={(e) => {
                                      const newNote = e.target.value;
                                      setSequences(prev => {
                                        const currentSeq = prev.find(s => s.id === seq.id);
                                        if (!currentSeq || !currentSeq.media) return prev;
                                        
                                        const updatedMedia = currentSeq.media.map(m => 
                                          m.id === media.id ? { ...m, notes: newNote } : m
                                        );
                                        
                                        return prev.map(s => s.id === seq.id ? { ...s, media: updatedMedia } : s);
                                      });
                                    }}
                                    placeholder="Consignes spécifiques pour ce média..."
                                    className="w-full flex-1 bg-[#222] text-gray-300 text-sm p-2 rounded border border-[#333] focus:border-[#E50914] focus:outline-none resize-none"
                                    autoFocus
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-600">
                        <Film size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Aucun média associé</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-[#333] bg-[#222] flex justify-center">
                    <label className="px-4 py-2 bg-[#333] text-white rounded hover:bg-[#E50914] transition-colors text-sm flex items-center gap-2 cursor-pointer">
                      <Plus size={16} /> Ajouter Média
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,video/*"
                        multiple
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files) {
                            // Récupérer userId depuis localStorage (stocké par l'app principale)
                            const userId = localStorage.getItem('userId') || 'coach';
                            
                            const dateKey = format(date, 'yyyy-MM-dd');
                            
                            for (const file of Array.from(files)) {
                              try {
                                const result = await storageService.uploadMedia(file, userId, dateKey);
                                
                                const newMedia = {
                                  id: `media-${Date.now()}-${Math.random()}`,
                                  url: result.url,
                                  thumbnailUrl: result.thumbnailUrl,
                                  type: result.type
                                };
                                
                                setSequences(prev => {
                                  const currentSeq = prev.find(s => s.id === seq.id);
                                  if (!currentSeq) return prev;
                                  const currentMedia = currentSeq.media || [];
                                  return prev.map(s => s.id === seq.id ? { ...s, media: [...currentMedia, newMedia] } : s);
                                });
                              } catch (error) {
                                console.error('Erreur upload média:', error);
                                alert('Échec de l\'upload du média');
                              }
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
