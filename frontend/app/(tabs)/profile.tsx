import React from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '@/constants/firebase';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import AlphaBadge from '@/assets/images/test/alpha.svg';
import BetaBadge from '@/assets/images/test/beta.svg';
import SigmaBadge from '@/assets/images/test/sigma.svg';
import LogoutIcon from '@/assets/images/profile/logout_icon.svg';
import { useUserRank } from '@/hooks/useUserRank';

const circleBg = require('@/assets/images/home/Circle_Background_Home.png');

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
      <Image source={circleBg} style={styles.circleBg} resizeMode="cover" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <LogoutIcon width={30} height={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Badge + rank */}
        <View style={styles.badgeSection}>
          <View style={styles.badgeCircle}>
            <BadgeIcon width={90} height={90} />
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

        {/* Weekly Quests */}
        <QuestCard title="Weekly Quests" quests={WEEKLY_QUESTS} completed={completedQuests} />

        {/* Monthly Quests */}
        <QuestCard title="Monthly Quests" quests={MONTHLY_QUESTS} completed={completedQuests} />
      </View>
    </View>
  );
}

function QuestCard({ title, quests, completed }: { title: string; quests: Quest[]; completed: string[] }) {
  return (
    <View style={styles.questCard}>
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
  circleBg: {
    position: 'absolute',
    top: -140,
    alignSelf: 'center',
    width: 400,
    height: 400,
  },

  header: {
    paddingBottom: 28,
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
    top: 45,
    bottom: 0,
    justifyContent: 'center',
    padding: 4,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Badge + rank
  badgeSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  badgeCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#5F4BF5',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankName: {
    fontSize: 32,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 14,
  },
  progressTrack: {
    width: '70%',
    height: 8,
    backgroundColor: '#E8DDFA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#07004D',
    borderRadius: 4,
  },
  xpRemaining: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#888',
  },

  // Quest cards
  questCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    height: 175,
    ...CARD_SHADOW,
  },
  questTitle: {
    fontSize: 18,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  questRow: {
    flexDirection: 'row',
    gap: 16,
  },
  questItem: {
    flex: 1,
    alignItems: 'center',
  },
  xpBadge: {
    backgroundColor: '#D4C5F0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  xpBadgeText: {
    fontSize: 15,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    fontWeight: '700',
  },
  questDesc: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#555',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 110,
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
