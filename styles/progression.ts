import { Colors } from './colors';

export type ProgressionTier = 'matte' | 'brushed' | 'polished';

/**
 * Determine the visual tier based on the player's bowling average.
 * - Matte (< 180): Clean, functional, muted — "the tool."
 * - Brushed (180–209): Standard brass accents, subtle glow — "the member."
 * - Polished (210+): Glossy brass, lacquered wood, prominent glow — "the elite."
 */
export function getProgressionTier(average: number): ProgressionTier {
  if (average >= 210) return 'polished';
  if (average >= 180) return 'brushed';
  return 'matte';
}

export const TierStyles = {
  matte: {
    borderColor: Colors.border,
    borderWidth: 1,
    scoreColor: Colors.textPrimary,
    accentColor: Colors.textSecondary,
    grainOpacity: 0.03,
    glowOpacity: 0,
    cardBorderRadius: 12,
  },
  brushed: {
    borderColor: Colors.brass,
    borderWidth: 1,
    scoreColor: Colors.brass,
    accentColor: Colors.primary,
    grainOpacity: 0.06,
    glowOpacity: 0.18,
    cardBorderRadius: 14,
  },
  polished: {
    borderColor: Colors.brassLight,
    borderWidth: 2,
    scoreColor: Colors.brassLight,
    accentColor: Colors.brassLight,
    grainOpacity: 0.12,
    glowOpacity: 0.28,
    cardBorderRadius: 16,
  },
} as const;
