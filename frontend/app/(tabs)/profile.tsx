import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/constants/firebase';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import AlphaBadge from '@/assets/images/test/alpha.svg';
import BetaBadge from '@/assets/images/test/beta.svg';
import SigmaBadge from '@/assets/images/test/sigma.svg';
import LogoutIcon from '@/assets/images/profile/logout_icon.svg';
import { useUserRank } from '@/hooks/useUserRank';
import CircleBgExpenses from '@/assets/images/expenses/Circle_Background_Expenses.svg';

// Rank tiers — each tier needs `xpRequired` total XP to reach
const RANKS = [
  { name: 'Alpha', xp: 0 },
  { name: 'Beta', xp: 200 },
  { name: 'Gamma', xp: 500 },
  { name: 'Delta', xp: 1000 },
  { name: 'Omega', xp: 2000 },
];

function getRankInfo(xp: number) {
  let current = RANKS[0];
  let next = RANKS[1];
  for (let i = 0; i < RANKS.length - 1; i++) {
    if (xp >= RANKS[i].xp) {
      current = RANKS[i];
      next = RANKS[i + 1];
    }
  }
  if (xp >= RANKS[RANKS.length - 1].xp) {
    current = RANKS[RANKS.length - 1];
    next = null as any;
  }
  const xpIntoLevel = xp - current.xp;
  const xpForLevel = next ? next.xp - current.xp : 1;
  const remaining = next ? next.xp - xp : 0;
  const pct = next ? Math.min(1, xpIntoLevel / xpForLevel) : 1;
  return { name: current.name, remaining, pct };
}

type Quest = { id: string; xp: number; description: string };

const WEEKLY_QUESTS: Quest[] = [
  { id: 'weekly_payment_25pct', xp: 10, description: 'Make 1 payment of at least 25% of current balance' },
  { id: 'weekly_util_30pct', xp: 15, description: 'Keep utilization under 30% for 7 days straight' },
];

const MONTHLY_QUESTS: Quest[] = [
  { id: 'monthly_balance_250', xp: 50, description: 'Keep your balance under $250 for 14 consecutive days' },
  { id: 'monthly_util_30pct', xp: 65, description: 'Stay below 30% utilization all month' },
];

function toDisplayRank(rank: 'alpha' | 'beta' | 'sigma') {
  if (rank === 'alpha') return 'Alpha';
  if (rank === 'sigma') return 'Sigma';
  return 'Beta';
}

export default function ProfileScreen() {
  const { backendUser, syncBackendUser } = useAuth();
  const { rank: userRank, refreshRank } = useUserRank();
  const insets = useSafeAreaInsets();
  const resolvedRank = userRank ?? backendUser?.rank ?? 'beta';
  const BadgeIcon = resolvedRank === 'alpha' ? AlphaBadge : resolvedRank === 'sigma' ? SigmaBadge : BetaBadge;
  useFocusEffect(
    React.useCallback(() => {
      refreshRank();
      syncBackendUser();
    }, [refreshRank, syncBackendUser]),
  );

  const completedQuests = backendUser?.completed_quests ?? [];


  const xp = backendUser?.xp ?? 0;
  const rank = getRankInfo(xp);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert('Logout failed', error.message || 'Something went wrong.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBg}>
        <CircleBgExpenses width="100%" height="100%" preserveAspectRatio="xMidYMin slice" />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <LogoutIcon width={30} height={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge + rank */}
        <View style={styles.badgeSection}>
          <View style={styles.badgeRing}>
            <View style={styles.badgeCircle}>
              <BadgeIcon width={114} height={110} />
            </View>
          </View>
          <Text style={styles.rankName}>{toDisplayRank(resolvedRank)}</Text>

          {/* XP progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(rank.pct * 100)}%` as any }]} />
          </View>
          <Text style={styles.xpRemaining}>
            {rank.remaining > 0 ? `${rank.remaining} Exp Until Next Level` : 'Max Level Reached'}
          </Text>
        </View>

        <View style={styles.questsSection}>
          {/* Weekly Quests */}
          <QuestCard title="Weekly Quests" quests={WEEKLY_QUESTS} completed={completedQuests} tone="weekly" />

          {/* Monthly Quests */}
          <QuestCard title="Monthly Quests" quests={MONTHLY_QUESTS} completed={completedQuests} tone="monthly" />
        </View>
      </ScrollView>
    </View>
  );
}

function QuestCard({
  title,
  quests,
  completed,
  tone,
}: {
  title: string;
  quests: Quest[];
  completed: string[];
  tone: 'weekly' | 'monthly';
}) {
  const isMonthly = tone === 'monthly';
  const cardInner = (
    <>
      <Text style={styles.questTitle}>{title}</Text>
      <View style={styles.questRow}>
        {quests.map((q, i) => {
          const done = completed.includes(q.id);
          return (
            <View key={i} style={styles.questItem}>
              <View style={[styles.xpBadge, done && styles.xpBadgeDone]}>
                <Text style={[styles.xpBadgeText, done && styles.xpBadgeTextDone]}>
                  {done ? 'Completed' : `+ ${q.xp} Exp`}
                </Text>
              </View>
              <Text style={[styles.questDesc, done && styles.questDescDone]}>{q.description}</Text>
            </View>
          );
        })}
      </View>
    </>
  );

  if (isMonthly) {
    return (
      <LinearGradient
        colors={['#FFFFFF', '#F2E7FF']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.questCard, styles.questCardMonthly]}>
        {cardInner}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.questCard, styles.questCardWeekly]}>
      {cardInner}
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#7B2FBE',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F0FA',
  },
  topBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },

  header: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.rounded,
    color: '#fff',
    textAlign: 'center',
  },
  logoutIcon: {
    position: 'absolute',
    right: 24,
    top: 14,
    bottom: 0,
    justifyContent: 'center',
    padding: 4,
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Badge + rank
  badgeSection: {
    alignItems: 'center',
    marginBottom: 10,
    top: 40,
  },
  badgeRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#5F4BF5',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankName: {
    fontSize: 35.8,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    marginTop: 6,
    marginBottom: 6,
  },
  progressTrack: {
    width: '75%',
    height: 7,
    backgroundColor: '#E8DDFA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: {
    height: 7,
    backgroundColor: '#5F4BF5',
    borderRadius: 4,
  },
  xpRemaining: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#07004D',
  },

  // Quest cards
  questCard: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  questsSection: {
    top: 55,
  },
  questCardWeekly: {
    backgroundColor: '#FFFFFF',
  },
  questCardMonthly: {
    backgroundColor: 'transparent',
  },
  questTitle: {
    fontSize: 16,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    textAlign: 'center',
    marginBottom: 14,
  },
  questRow: {
    flexDirection: 'row',
    gap: 14,
  },
  questItem: {
    flex: 1,
    alignItems: 'center',
  },
  xpBadge: {
    backgroundColor: '#D4C5F0',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 22,
    marginBottom: 10,
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  xpBadgeText: {
    fontSize: 16,
    fontFamily: Fonts.rounded,
    color: '#07004D',
  },
  questDesc: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#07004D',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 130,
  },
  questDescDone: {
    color: '#4CAF50',
  },
  xpBadgeDone: {
    backgroundColor: '#4CAF50',
  },
  xpBadgeTextDone: {
    color: '#fff',
  },

});
