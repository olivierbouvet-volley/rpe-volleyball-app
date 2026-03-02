type Position = 'OH' | 'OPP' | 'MB' | 'SET' | 'LIB' | 'unknown';

/**
 * Capture a DOM element as PNG image and trigger download
 * Uses dynamic import to avoid bundling html2canvas unless needed
 * @param elementId - DOM element ID to capture
 * @param filename - Output filename (without extension)
 */
export async function captureElementAsImage(
  elementId: string,
  filename: string
): Promise<void> {
  try {
    // Dynamic import to avoid bundle bloat
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Capture at 2x scale for better quality
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#0f172a', // slate-900
      logging: false,
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('[shareHelpers] Failed to capture image:', error);
    throw error;
  }
}

/**
 * Generate a shareable URL for a player page
 * @param playerId - Player ID (e.g., "H-15")
 * @returns Full URL with ?player= and ?share=true parameters
 */
export function generatePlayerShareURL(playerId: string): string {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5173';
  return `${origin}?player=${playerId}&share=true`;
}

/**
 * Get French position label from Position enum
 * @param position - Optional position from player data
 * @returns French position label
 */
export function getPositionLabel(position?: Position): string {
  if (!position || position === 'unknown') return 'Joueur';

  const labels: Record<Exclude<Position, 'unknown'>, string> = {
    OH: 'Attaquante réceptrice',
    OPP: 'Attaquante pointue',
    MB: 'Centrale',
    SET: 'Passeuse',
    LIB: 'Libéro',
  };

  return labels[position] || 'Joueur';
}

/**
 * Get Tailwind color class based on efficiency value
 * @param efficiency - Efficiency value (typically -1.0 to 1.0)
 * @returns Tailwind text color class
 */
export function getEfficiencyColor(efficiency: number): string {
  if (efficiency >= 0.4) return 'text-green-500';
  if (efficiency >= 0.2) return 'text-yellow-500';
  if (efficiency >= 0) return 'text-orange-500';
  return 'text-red-500';
}
