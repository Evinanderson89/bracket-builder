import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const CardStyles = StyleSheet.create({
  /** "Carved into mahogany" — inset shadow effect via asymmetric borders */
  recessedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopColor: '#2E3F34',
    borderLeftColor: '#2E3F34',
    borderBottomColor: '#1A261F',
    borderRightColor: '#1A261F',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    padding: 16,
  },

  /** Elevated hero card — raised above the surface */
  elevatedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#3A5040',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    padding: 18,
  },
});
