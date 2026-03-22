import { BottomTabBar } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HORIZONTAL_MARGIN = 24;
const BOTTOM_MARGIN = 27;

/**
 * Wraps the default tab bar in a positioned View so left/right margins work reliably
 * (some RN / React Navigation builds error on `left`/`right` in tabBarStyle).
 */
export function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // 27px from the physical bottom edge of the screen (not above the safe area inset)
  const bottomOffset = BOTTOM_MARGIN;

  // BottomTabBar adds paddingBottom: insets.bottom by default — that pushed icons up inside the pill.
  // We handle safe area on the wrapper only, so zero insets on the inner bar for proper vertical centering.
  const barInsets = { ...props.insets, top: 0, bottom: 0, left: 0, right: 0 };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: HORIZONTAL_MARGIN + insets.left,
        right: HORIZONTAL_MARGIN + insets.right,
        bottom: bottomOffset,
      }}
    >
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 32,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 16,
        }}
      >
        <BottomTabBar
          {...props}
          insets={barInsets}
          style={{
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            // Fixed height — content centers vertically via flex in HapticTab
            height: 68,
          }}
        />
      </View>
    </View>
  );
}
