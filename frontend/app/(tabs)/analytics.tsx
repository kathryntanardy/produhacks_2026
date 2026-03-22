import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/theme';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: Fonts.rounded, color: '#111' },
  subtitle: { fontSize: 16, fontFamily: Fonts.sans, color: '#999', marginTop: 4 },
});
