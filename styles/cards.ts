import { ViewStyle } from 'react-native';
import { Colors } from './colors';

/**
 * Recessed card — appears "carved into mahogany."
 * Dark top-left edges (shadow falls INTO the card),
 * lighter bottom-right edges (light catches the rim).
 * No outward shadow/elevation.
 */
export const recessedCard: ViewStyle = {
  backgroundColor: Colors.surface,
  borderRadius: 14,
  borderWidth: 1.5,
  borderTopColor: '#061210',
  borderLeftColor: '#061210',
  borderBottomColor: Colors.borderLight,
  borderRightColor: Colors.borderLight,
  borderColor: Colors.border,
  // No outward elevation — card is sunken
  shadowColor: 'transparent',
  elevation: 0,
};

/**
 * Elevated card — floats above the surface (for hero/welcome cards).
 * Traditional outward shadow.
 */
export const elevatedCard: ViewStyle = {
  backgroundColor: Colors.surface,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: Colors.border,
  shadowColor: Colors.shadow,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.36,
  shadowRadius: 18,
  elevation: 8,
};

/**
 * Inner padding wrapper for recessed cards — adds subtle darkening.
 */
export const recessedCardInner: ViewStyle = {
  backgroundColor: 'rgba(0,0,0,0.06)',
  borderRadius: 12,
  padding: 14,
};
