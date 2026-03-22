import React from 'react';
import { router } from 'expo-router';

import LoginScreen from './LoginScreen';

export default function LoginRoute() {
  return <LoginScreen onGoToSignup={() => router.push('/signup')} />;
}
