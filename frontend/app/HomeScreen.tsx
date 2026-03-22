import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

const lockIcon = require('../assets/images/home/Lock_Icon.png');
const circleBg = require('../assets/images/home/Circle_Background_Home.png');

export default function HomeScreen() {
  const { backendUser } = useAuth();
  const router = useRouter();
  const hasCard = (backendUser?.credit_limit ?? 0) > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={circleBg} style={styles.circleBg} resizeMode="cover" />
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{backendUser?.name || 'there'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasCard ? (
          <TouchableOpacity
            style={styles.addCardContainer}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.addCardTitle}>Add your credit card</Text>
            <View style={styles.addCardIconWrap}>
              <Text style={styles.addCardPlus}>+</Text>
            </View>
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
      </ScrollView>
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

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 120,
  },

  addCardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 16,
  },
  addCardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F4F0FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardPlus: {
    fontSize: 32,
    color: '#B8A0D8',
    fontWeight: '300',
  },

  cardInfo: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 12,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedCardCompact: {
    flex: 1,
    height: 146,
    minHeight: undefined,
    marginHorizontal: 4,
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
    marginHorizontal: -4,
  },

  scoreValue: {
    fontSize: 48,
    fontFamily: Fonts.rounded,
    color: '#4B0082',
  },
});
