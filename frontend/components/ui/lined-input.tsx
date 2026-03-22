import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { colors } from '@/theme/colors';

type LinedInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function LinedInput({
  label,
  value,
  onChangeText,
  autoCapitalize = 'words',
}: LinedInputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#5A5A5A"
        textAlign="center"
        autoCapitalize={autoCapitalize}
      />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#2F2F2F',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  line: {
    height: 1,
    backgroundColor: colors.primary900,
  },
});
