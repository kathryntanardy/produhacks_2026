// screens/SignupScreen.tsx
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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../constants/firebase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
    onGoToLogin: () => void;
};

export default function SignupScreen({ onGoToLogin }: Props) {
    const { syncBackendUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSignup = async () => {
        if (!name.trim() || !email || !password || !confirmPassword) {
            Alert.alert('Missing fields', 'Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Password mismatch', 'Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Weak password', 'Password must be at least 6 characters.');
            return;
        }

        try {
            setSubmitting(true);
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            await updateProfile(userCredential.user, { displayName: name.trim() });
            await syncBackendUser();
        } catch (error: any) {
            Alert.alert('Signup failed', error.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Create account</Text>
                <Text style={styles.subtitle}>Sign up to get started</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                />

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

                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSignup}
                    disabled={submitting}
                >
                    <Text style={styles.buttonText}>
                        {submitting ? 'Creating account...' : 'Sign Up'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onGoToLogin}>
                    <Text style={styles.link}>Already have an account? Log in</Text>
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