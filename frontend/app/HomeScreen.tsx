import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Fonts } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../constants/firebase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

const DISABLE_EME_JS = `
  (function(){
    if (navigator.requestMediaKeySystemAccess) {
      navigator.requestMediaKeySystemAccess = function() {
        return Promise.reject(new DOMException('Not supported','NotSupportedError'));
      };
    }
    true;
  })();
`;

import PlusIcon from '../assets/images/home/Plus_Icon.svg';

const lockIcon = require('../assets/images/home/Lock_Icon.png');
const circleBg = require('../assets/images/home/Circle_Background_Home.png');

export default function HomeScreen() {
  const { backendUser, syncBackendUser } = useAuth();
  const hasCard = (backendUser?.credit_limit ?? 0) > 0;

  const [refreshing, setRefreshing] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncBackendUser();
    setRefreshing(false);
  }, [syncBackendUser]);
  const [showWebView, setShowWebView] = useState(false);
  const [linking, setLinking] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const dismissLink = useCallback(() => {
    setShowWebView(false);
    setLinkToken(null);
  }, []);

  const handleLinkCard = useCallback(async () => {
    try {
      setLinking(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/api/create_link_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
        setShowWebView(true);
      } else {
        Alert.alert('Error', data?.error?.display_message ?? 'Could not create link token');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create link token');
    } finally {
      setLinking(false);
    }
  }, []);

  const handleWebViewMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.event === 'success' && data.public_token) {
          dismissLink();
          try {
            const idToken = await auth.currentUser?.getIdToken();
            await fetch(`${API_BASE}/api/set_access_token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                Authorization: `Bearer ${idToken}`,
              },
              body: `public_token=${data.public_token}`,
            });
            Alert.alert('Success', 'Credit card linked!');
            await syncBackendUser();
          } catch {
            Alert.alert('Error', 'Failed to exchange token');
          }
        } else if (data.event === 'exit') {
          dismissLink();
        }
      } catch {
        // non-JSON — ignore
      }
    },
    [dismissLink, syncBackendUser],
  );

  const handleContentProcessTerminated = useCallback(() => {
    dismissLink();
    Alert.alert(
      'WebView Crashed',
      'The bank linking page encountered an issue. Please try again on a physical device.',
    );
  }, [dismissLink]);

  const plaidUri = linkToken ? `${API_BASE}/plaid-link?token=${linkToken}` : '';

  return (
    <View style={styles.container}>
      <Image source={circleBg} style={styles.circleBg} resizeMode="cover" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5F4BF5" />}
      >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{backendUser?.name || 'there'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {!hasCard ? (
          <TouchableOpacity
            style={styles.addCardContainer}
            activeOpacity={0.7}
            onPress={handleLinkCard}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator color="#B8A0D8" />
            ) : (
              <>
                <Text style={styles.addCardTitle}>Add your credit card</Text>
                <View style={styles.addCardIconCenter}>
                  <PlusIcon width={32} height={32} />
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.cardInfo}>
            <Text style={styles.cardInfoLabel}>Credit Card Linked</Text>
            <View style={styles.cardRow}>
              <View style={styles.cardStat}>
                <Text style={styles.cardStatValue}>
                  ${backendUser?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
                </Text>
                <Text style={styles.cardStatLabel}>Balance</Text>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardStat}>
                <Text style={styles.cardStatValue}>
                  ${backendUser?.credit_limit?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
                </Text>
                <Text style={styles.cardStatLabel}>Credit Limit</Text>
              </View>
            </View>
          </View>
        )}

        <LockedCard
          locked={!hasCard}
          title="Credit Score"
          content={
            hasCard ? (
              <Text style={styles.scoreValue}>
                {Object.values(backendUser?.credit_score ?? {})[0] ?? '—'}
              </Text>
            ) : undefined
          }
        />

        <View style={styles.lockedRow}>
          <LockedCard locked={!hasCard} title="Insights" compact />
          <LockedCard locked={!hasCard} title="Goals" compact />
        </View>
      </View>
      </ScrollView>

      <Modal visible={showWebView} animationType="slide" presentationStyle="pageSheet" onRequestClose={dismissLink}>
        <SafeAreaView style={styles.modalContainer}>
          <WebView
            ref={webViewRef}
            style={styles.webView}
            source={{ uri: plaidUri }}
            onMessage={handleWebViewMessage}
            injectedJavaScriptBeforeContentLoaded={DISABLE_EME_JS}
            onContentProcessDidTerminate={handleContentProcessTerminated}
            javaScriptEnabled
            domStorageEnabled
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function LockedCard({
  locked,
  title,
  content,
  compact,
}: {
  locked: boolean;
  title: string;
  content?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.lockedCard, compact && styles.lockedCardCompact]}>
      {locked ? (
        <View style={styles.lockedInner}>
          <Image
            source={lockIcon}
            style={styles.lockIcon}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={styles.unlockedInner}>
          <Text style={styles.lockedCardTitle}>{title}</Text>
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F0FA',
  },

  header: {
    height: 170,
  },
  circleBg: {
    position: 'absolute',
    top: -140,
    alignSelf: 'center',
    width: 400,
    height: 400,
  },
  headerContent: {
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 22,
    fontFamily: Fonts.sans,
    color: 'rgba(255,255,255,0.85)',
  },
  name: {
    fontSize: 32,
    fontFamily: Fonts.rounded,
    color: '#fff',
    marginTop: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 33,
    paddingTop: 4,
  },

  addCardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 215,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 14,
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addCardTitle: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: '#555',
    marginBottom: 0,
  },
  addCardIconCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  cardInfo: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 26,
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardInfoLabel: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#999',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStat: {
    flex: 1,
    alignItems: 'center',
  },
  cardStatValue: {
    fontSize: 22,
    fontFamily: Fonts.rounded,
    color: '#222',
  },
  cardStatLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#888',
    marginTop: 4,
  },
  cardDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },

  lockedCard: {
    backgroundColor: '#E8DDFA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
    minHeight: 175,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedCardCompact: {
    flex: 1,
    // height 146px, gap 20px: 33+153+20+153+33 = 392 ≈ 393px reference width
    height: 146,
    minHeight: undefined,
    marginHorizontal: 10,
  },
  lockedInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedInner: {
    alignItems: 'center',
  },
  lockedCardTitle: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#7B2FBE',
    marginBottom: 8,
  },
  lockIcon: {
    width: 40,
    height: 48,
  },
  lockedRow: {
    flexDirection: 'row',
    marginHorizontal: -10,
  },

  scoreValue: {
    fontSize: 48,
    fontFamily: Fonts.rounded,
    color: '#4B0082',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
});
