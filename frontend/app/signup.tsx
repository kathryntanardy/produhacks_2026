import React from 'react';
import { router } from 'expo-router';

import SignupScreen from './SignupScreen';

export default function SignupRoute() {
  return <SignupScreen onGoToLogin={() => router.replace('/login')} />;
}
