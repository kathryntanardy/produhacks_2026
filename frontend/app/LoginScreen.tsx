// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../constants/firebase';
import { Fonts } from '../constants/theme';

type Props = {
  onGoToSignup: () => void;
};

export default function LoginScreen({ onGoToSignup }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      Alert.alert('Sign in failed', error.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>Credify</Text>

        <View style={styles.headerBlock}>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.copy}>We are excited that you are joining us on this journey.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#D4D4D8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#D4D4D8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={onGoToSignup}>
            <Text style={styles.link}>Don&apos;t have account?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? 'Signing In...' : 'Sign In'}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  brand: {
    textAlign: 'center',
    fontSize: 50,
    color: '#07004D',
    fontFamily: Fonts.rounded,
    marginTop: 20,
    marginBottom: 56,
  },
  headerBlock: {
    paddingHorizontal: 8,
  },
  welcome: {
    fontSize: 22,
    color: '#07004D',
    fontFamily: Fonts.rounded,
    marginBottom: 8,
  },
  copy: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: '#8569F4',
    maxWidth: 230,
  },
  card: {
    marginTop: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    marginBottom: 28,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#8E84BF',
    paddingHorizontal: 0,
    paddingVertical: 10,
    marginBottom: 22,
    fontSize: 14,
    color: '#07004D',
    fontFamily: Fonts.sans,
  },
  link: {
    color: '#07004D',
    fontFamily: Fonts.rounded,
    textDecorationLine: 'underline',
    marginBottom: 18,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#07004D',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontSize: 15,
  },
});