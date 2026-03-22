// screens/HomeScreen.tsx
import React from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../constants/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
    const { user, backendUser } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error: any) {
            Alert.alert('Logout failed', error.message || 'Something went wrong.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>You are logged in</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.backendText}>Backend ID: {backendUser?.id ?? 'syncing...'}</Text>
                <Text style={styles.backendText}>Rank: {backendUser?.rank ?? 0}</Text>

                <TouchableOpacity style={styles.button} onPress={handleLogout}>
                    <Text style={styles.buttonText}>Log Out</Text>
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
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    email: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    backendText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    button: {
        backgroundColor: '#111',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
    },
});