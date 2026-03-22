// App.tsx
import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import LoginScreen from '../LoginScreen';
import SignupScreen from '../SignupScreen';
import HomeScreen from '../HomeScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <View>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (user) {
    return <HomeScreen />;
  }

  if (authScreen === 'login') {
    return <LoginScreen onGoToSignup={() => setAuthScreen('signup')} />;
  }

  return <SignupScreen onGoToLogin={() => setAuthScreen('login')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});