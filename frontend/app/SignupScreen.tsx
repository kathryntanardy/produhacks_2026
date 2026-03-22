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
import { router } from 'expo-router';
import { PrimaryButton } from '../components/ui/primary-button';
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
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const derivedName = email.trim().split('@')[0];
            await updateProfile(userCredential.user, { displayName: derivedName });
            await syncBackendUser();
            router.replace('/signup-questions/1');
        } catch (error: any) {
            Alert.alert('Signup failed', error.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.brand} allowFontScaling={false}>Credify</Text>
                <Text style={styles.welcome} allowFontScaling={false}>Welcome</Text>
                <Text style={styles.copy} allowFontScaling={false}>We are excited that you are joining us on this journey.</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle} allowFontScaling={false}>Create an Account</Text>

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
                        <Text style={styles.link} allowFontScaling={false}>Already have an account?</Text>
                    </TouchableOpacity>

                    <PrimaryButton
                        content={submitting ? 'Creating Account...' : 'Create Account'}
                        width="100%"
                        onPress={handleSignup}
                        disabled={submitting}
                        style={styles.button}
                    />
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
        paddingTop: 28,
        paddingBottom: 32,
    },
    brand: {
        textAlign: 'center',
        fontSize: 36,
        color: '#0A0A72',
        fontFamily: Fonts.rounded,
        marginBottom: 46,
    },
    welcome: {
        fontSize: 16,
        color: '#0A0A72',
        fontFamily: Fonts.rounded,
        marginBottom: 8,
    },
    copy: {
        fontSize: 16,
        fontFamily: Fonts.sans,
        lineHeight: 26,
        color: '#7F68FF',
        maxWidth: 280,
    },
    card: {
        marginTop: 82,
        backgroundColor: 'white',
        borderRadius: 2,
        paddingHorizontal: 24,
        paddingVertical: 22,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    cardTitle: {
        fontSize: 14,
        fontFamily: Fonts.rounded,
        color: '#0A0A72',
        marginBottom: 24,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A85',
        paddingHorizontal: 0,
        paddingVertical: 10,
        marginBottom: 18,
        fontSize: 14,
        fontFamily: Fonts.sans,
    },
    button: {
        marginTop: 8,
    },
    link: {
        color: '#0A0A72',
        fontFamily: Fonts.rounded,
        textDecorationLine: 'underline',
        marginBottom: 14,
        fontSize: 14,
    },
});