import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  error?: string | null;
  isLoading?: boolean;
}

/**
 * Drag & drop zone for file uploads with click fallback
 */
export function FileDropZone({ onFileSelect, error, isLoading }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg
          p-12 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? 'border-primary-green bg-primary-green/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload DVW file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".dvw"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium">Parsing DVW file...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-16 w-16 text-slate-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <p className="text-xl font-semibold mb-2">
              Drop your .dvw file here
            </p>
            <p className="text-slate-400 mb-4">
              or click to select from your computer
            </p>
            <p className="text-sm text-slate-500">
              DataVolley (.dvw) files only
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
