import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Download, File } from 'lucide-react';

interface Document {
  filename: string;
  originalname: string;
  path: string;
  size: number;
  uploadDate: string;
}

interface DocumentsManagerProps {
  playerId: string;
}

export const DocumentsManager: React.FC<DocumentsManagerProps> = ({ playerId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const API_URL = 'http://localhost:3001'; // URL du backend

  useEffect(() => {
    fetchDocuments();
  }, [playerId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/players/${playerId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/players/${playerId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments(); // Recharger la liste
      } else {
        alert('Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;

    try {
      const response = await fetch(`${API_URL}/api/players/${playerId}/documents/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(documents.filter(d => d.filename !== filename));
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
          <FileText size={18} />
          Documents
        </h4>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <button 
            className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors ${uploading ? 'opacity-50' : ''}`}
          >
            <Upload size={16} />
            {uploading ? 'Envoi...' : 'Ajouter'}
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <File className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Aucun document</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.filename} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-gray-100 p-2 rounded">
                  <FileText size={20} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate" title={doc.originalname}>
                    {doc.originalname}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatSize(doc.size)} • {new Date(doc.uploadDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <a 
                  href={`${API_URL}${doc.path}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Télécharger"
                >
                  <Download size={16} />
                </a>
                <button 
                  onClick={() => handleDelete(doc.filename)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
