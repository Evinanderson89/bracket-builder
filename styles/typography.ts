import { TextStyle } from 'react-native';

export const Fonts = {
  serifBold: 'PlayfairDisplay-Bold',
  serifBoldItalic: 'PlayfairDisplay-BoldItalic',
  sansRegular: 'Inter-Regular',
  sansMedium: 'Inter-Medium',
  sansBold: 'Inter-Bold',
} as const;

/** Engraved serif — scores, headings, large display values */
export const serifBold: TextStyle = { fontFamily: Fonts.serifBold };

/** Clean sans-serif presets */
export const sansRegular: TextStyle = { fontFamily: Fonts.sansRegular };
export const sansMedium: TextStyle = { fontFamily: Fonts.sansMedium };
export const sansBold: TextStyle = { fontFamily: Fonts.sansBold };

/** Composite text style presets */
export const TextStyles = {
  /** Large score values — engraved brass feel */
  scoreDisplay: { ...serifBold, letterSpacing: 1.2 } as TextStyle,
  /** Section headings — authoritative serif */
  heading: { ...serifBold, letterSpacing: 0.5 } as TextStyle,
  /** Uppercase stat labels — wide-set sans */
  statLabel: { ...sansMedium, letterSpacing: 1.5, textTransform: 'uppercase' } as TextStyle,
  /** Body text */
  body: { ...sansRegular } as TextStyle,
  /** Buttons and interactive text */
  button: { ...sansBold, letterSpacing: 0.3 } as TextStyle,
} as const;
