import React, { useState } from 'react';
import { X, Upload, AlertTriangle, Check, FileText } from 'lucide-react';
import { CalendarService } from '../services/CalendarService';
import type { CalendarEvent } from '../types';

interface CalendarImportModalProps {
  onClose: () => void;
  onImport: (events: CalendarEvent[]) => void;
}

export const CalendarImportModal: React.FC<CalendarImportModalProps> = ({ onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [parsedEvents, setParsedEvents] = useState<CalendarEvent[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      parseFile(e.target.files[0]);
    }
  };

  const parseFile = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const events = CalendarService.parseICS(content);
        setParsedEvents(events);
        setPreviewCount(events.length);
      } catch (err) {
        setError("Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un format .ics valide.");
      }
    };
    reader.readAsText(fileToParse);
  };

  const handleConfirm = () => {
    onImport(parsedEvents);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#181818] w-full max-w-md rounded-xl border border-[#333] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#222]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#E50914]">📅</span> Importer un Agenda
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Informations */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-400 flex items-center gap-2">
              <FileText size={16} />
              <strong>Téléchargez votre calendrier Google/Outlook au format .ics</strong>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Les proxys CORS publics étant instables, l'import par URL est désactivé.
              Utilisez l'upload de fichier pour une meilleure fiabilité.
            </p>
          </div>

          {/* File Input */}
          <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Téléchargez le fichier .ics depuis votre agenda et déposez-le ici.
              </p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#333] rounded-lg cursor-pointer hover:border-[#E50914] hover:bg-[#222] transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-gray-500 group-hover:text-[#E50914] transition-colors" />
                  <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Cliquez pour upload</span></p>
                  <p className="text-xs text-gray-500">Fichier ICS uniquement</p>
                </div>
                <input type="file" accept=".ics" className="hidden" onChange={handleFileChange} />
              </label>
              {file && (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 p-2 rounded border border-green-900/50">
                  <FileText size={14} />
                  <span className="truncate">{file.name}</span>
                </div>
              )}
            </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Preview */}
          {previewCount !== null && (
            <div className="bg-green-900/20 border border-green-900/50 p-4 rounded-lg space-y-3 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-green-400 font-bold">
                <Check size={18} />
                <span>{previewCount} événements trouvés</span>
              </div>
              <p className="text-xs text-gray-400">
                Ces événements seront ajoutés à votre planning. Les doublons exacts seront ignorés.
              </p>
              <button 
                onClick={handleConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold text-sm transition-colors"
              >
                Confirmer l'importation
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
