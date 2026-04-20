import { useState, useCallback } from 'react';
import { parseDVW } from '@volleyvision/dvw-parser';
import { useMatchStore } from '../store/matchStore';

/**
 * Read file as text using FileReader API
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Custom hook for handling DVW file uploads
 */
export function useFileUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setMatch = useMatchStore((state) => state.setMatch);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.dvw')) {
        setError('Please select a valid .dvw file');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Read file content
        const content = await readFileAsText(file);

        // Parse DVW
        const match = parseDVW(content);

        // Store in Zustand (will auto-calculate stats)
        setMatch(match);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to parse DVW file';
        setError(errorMessage);
        console.error('DVW parsing error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [setMatch]
  );

  return { handleFile, isLoading, error };
}
