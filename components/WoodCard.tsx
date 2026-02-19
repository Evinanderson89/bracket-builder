import React from 'react';
import { ImageBackground, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { Colors } from '../styles/colors';
import { recessedCard, elevatedCard } from '../styles/cards';

const grainImage = require('../assets/textures/mahogany-grain.png');

interface WoodCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use recessed (carved-in) or elevated (floating) card style. Default: recessed */
  variant?: 'recessed' | 'elevated';
  /** Override the grain texture opacity (0–1). Default: 0.06 */
  grainOpacity?: number;
  /** Additional padding inside the card. Default: 14 */
  padding?: number;
}

export default function WoodCard({
  children,
  style,
  variant = 'recessed',
  grainOpacity = 0.06,
  padding = 14,
}: WoodCardProps) {
  const baseStyle = variant === 'recessed' ? recessedCard : elevatedCard;

  return (
    <View style={[baseStyle, style]}>
      <ImageBackground
        source={grainImage}
        resizeMode="repeat"
        imageStyle={{ opacity: grainOpacity }}
        style={[styles.inner, { padding }]}
      >
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
