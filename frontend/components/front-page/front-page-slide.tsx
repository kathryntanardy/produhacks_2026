import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

export type SlideOverlay = {
  Svg: React.FC<SvgProps>;
  width: number;
  height: number;
  containerStyle?: StyleProp<ViewStyle>;
};

type FrontPageSlideProps = {
  Background: React.FC<SvgProps>;
  overlays?: SlideOverlay[];
};

export function FrontPageSlide({ Background, overlays = [] }: FrontPageSlideProps) {
  return (
    <View style={styles.slide}>
      <Background width="100%" height="100%" style={styles.background} />
      {overlays.map((item, index) => (
        <View
          key={`${index}-${item.width}-${item.height}`}
          style={[styles.overlayBase, { width: item.width, height: item.height }, item.containerStyle]}>
          <item.Svg width="100%" height="100%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBase: {
    position: 'absolute',
  },
});
