import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { auth } from '@/constants/firebase';

type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const idToken = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

export default function LinkBankScreen() {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setFetchingAccounts(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/accounts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    } finally {
      setFetchingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleLinkBank = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/create_link_token`, {
        method: 'POST',
        headers,
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
      setLoading(false);
    }
  }, []);

  const dismissLink = useCallback(() => {
    setShowWebView(false);
    setLinkToken(null);
  }, []);

  const handleWebViewMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.event === 'success' && data.public_token) {
          dismissLink();
          try {
            const headers = await getAuthHeaders();
            await fetch(`${API_BASE}/api/set_access_token`, {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              },
              body: `public_token=${data.public_token}`,
            });
            Alert.alert('Success', 'Bank account linked!');
            fetchAccounts();
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
    [dismissLink, fetchAccounts],
  );

  const plaidLinkUri = linkToken
    ? `${API_BASE}/plaid-link?token=${linkToken}`
    : '';

  // Stub EME API to prevent FairPlay DRM crash in the iOS simulator.
  // Plaid's JS SDK probes navigator.requestMediaKeySystemAccess for device
  // attestation; on the simulator WebKit's GPU process aborts because
  // FairPlay hardware isn't present. Returning a rejection is safe —
  // Plaid Link still functions without EME.
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

  const handleContentProcessTerminated = useCallback(() => {
    dismissLink();
    Alert.alert(
      'WebView Crashed',
      'The bank linking page encountered an issue. Please try again on a physical device.',
    );
  }, [dismissLink]);

  const renderAccount = ({ item }: { item: PlaidAccount }) => (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <Text style={styles.accountName}>{item.name}</Text>
        {item.mask && <Text style={styles.accountMask}>••••{item.mask}</Text>}
      </View>
      {item.official_name && (
        <Text style={styles.officialName}>{item.official_name}</Text>
      )}
      <View style={styles.accountDetails}>
        <Text style={styles.accountType}>
          {item.type}{item.subtype ? ` · ${item.subtype}` : ''}
        </Text>
        {item.balances.current != null && (
          <Text style={styles.balance}>
            ${item.balances.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        )}
      </View>
    </View>
  );

  if (fetchingAccounts) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bank Accounts</Text>
        <Text style={styles.subtitle}>
          {accounts.length > 0
            ? `${accounts.length} account${accounts.length > 1 ? 's' : ''} linked`
            : 'Link your bank account to get started'}
        </Text>
      </View>

      {accounts.length > 0 ? (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.account_id}
          renderItem={renderAccount}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏦</Text>
          <Text style={styles.emptyText}>No bank accounts linked yet</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleLinkBank}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {accounts.length > 0 ? 'Link Another Account' : 'Link Bank Account'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showWebView} animationType="slide" presentationStyle="pageSheet" onRequestClose={dismissLink}>
        <SafeAreaView style={styles.modalContainer}>
          <WebView
            style={styles.webView}
            ref={webViewRef}
            source={{ uri: plaidLinkUri }}
            onMessage={handleWebViewMessage}
            injectedJavaScriptBeforeContentLoaded={DISABLE_EME_JS}
            onContentProcessDidTerminate={handleContentProcessTerminated}
            javaScriptEnabled
            domStorageEnabled
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  accountMask: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  officialName: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  accountDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  accountType: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  balance: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
});
