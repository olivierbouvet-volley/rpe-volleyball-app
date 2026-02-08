import { FileDropZone } from '../components/FileDropZone';
import { useFileUpload } from '../hooks/useFileUpload';

/**
 * Page for importing DVW files
 */
export default function ImportPage() {
  const { handleFile, isLoading, error } = useFileUpload();

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-primary-green">Volley</span>
          <span className="text-primary-blue">Vision</span>
        </h1>
        <p className="text-xl text-slate-300">
          Analyze volleyball match statistics from DVW files
        </p>
        <p className="text-slate-400 mt-2">
          Import a DataVolley (.dvw) file to get started
        </p>
      </header>

      {/* File upload zone */}
      <FileDropZone onFileSelect={handleFile} error={error} isLoading={isLoading} />

      {/* Instructions */}
      <div className="max-w-2xl mx-auto mt-12">
        <h2 className="text-xl font-semibold mb-4 text-center">How to use</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">📁</div>
            <h3 className="font-semibold mb-2">1. Select File</h3>
            <p className="text-sm text-slate-400">
              Drag & drop or click to select your .dvw file
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">2. Auto Parse</h3>
            <p className="text-sm text-slate-400">
              The file is automatically analyzed and statistics calculated
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">3. View Stats</h3>
            <p className="text-sm text-slate-400">
              Explore detailed player statistics with filters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
