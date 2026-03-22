// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../constants/firebase';

type Props = {
    onGoToSignup: () => void;
};

export default function LoginScreen({ onGoToSignup }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }

        try {
            setSubmitting(true);
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (error: any) {
            Alert.alert('Login failed', error.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Log in to continue</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={submitting}
                >
                    <Text style={styles.buttonText}>
                        {submitting ? 'Logging in...' : 'Log In'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onGoToSignup}>
                    <Text style={styles.link}>Don’t have an account? Sign up</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f7f7f7',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#111',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 14,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
    },
    link: {
        textAlign: 'center',
        color: '#2563eb',
        fontWeight: '500',
    },
});