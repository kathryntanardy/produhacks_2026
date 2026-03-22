import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { colors } from '@/theme/colors';

type SecondaryButtonProps = {
  content: React.ReactNode;
  width?: number | `${number}%` | 'auto';
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SecondaryButton({
  content,
  width = '100%',
  onPress,
  disabled = false,
  style,
}: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { width },
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        style,
      ]}>
      {typeof content === 'string' ? <Text style={styles.text}>{content}</Text> : content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  text: {
    color: colors.primary700,
    fontFamily: Fonts.rounded,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
});
