import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

/**
 * Default BottomTabItem uses tabVerticalUiKit with justifyContent: 'flex-start',
 * which pins icon+label to the top and leaves extra space at the bottom of the pill.
 * We override after RN's styles so content is vertically centered.
 */
export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      style={[props.style, styles.tabButtonCentered]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

const styles = StyleSheet.create({
  tabButtonCentered: {
    // Override RN's tabVerticalUiKit which uses justifyContent:'flex-start'
    // Now that flex:1 is set via tabBarItemStyle the pressable fills the full
    // pill height and centering actually works.
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
});
