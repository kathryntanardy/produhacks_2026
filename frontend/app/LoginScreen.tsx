// screens/SignupScreen.tsx
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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../constants/firebase';
import { Fonts } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

type Props = {
    onGoToLogin: () => void;
};

export default function SignupScreen({ onGoToLogin }: Props) {
    const { syncBackendUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSignup = async () => {
        if (!email || !password || !confirmPassword) {
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
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );
            const derivedName = email.trim().split('@')[0];
            await updateProfile(userCredential.user, { displayName: derivedName });
            await syncBackendUser();
        } catch (error: any) {
            Alert.alert('Signup failed', error.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.brand}>Credify</Text>

                <View style={styles.headerBlock}>
                    <Text style={styles.welcome}>Welcome</Text>
                    <Text style={styles.copy}>
                        We are excited that you are joining us on this journey.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Create an Account</Text>

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

                    <TextInput
                        style={styles.input}
                        placeholder="Re-enter Password"
                        placeholderTextColor="#D4D4D8"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    <TouchableOpacity onPress={onGoToLogin}>
                        <Text style={styles.link}>Already have an account?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSignup}
                        disabled={submitting}
                    >
                        <Text style={styles.buttonText}>
                            {submitting ? 'Creating Account...' : 'Create Account'}
                        </Text>
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
    },
    buttonText: {
        color: '#FFFFFF',
        fontFamily: Fonts.rounded,
        fontSize: 15,
    },
});