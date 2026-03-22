import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CurvedBar from '../assets/images/home/Curved_Bar.svg';
import AlphaBadge from '@/assets/images/test/alpha.svg';
import BetaBadge from '@/assets/images/test/beta.svg';
import SigmaBadge from '@/assets/images/test/sigma.svg';
import { Fonts } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useUserRank } from '@/hooks/useUserRank';

const circleBg = require('../assets/images/home/Circle_Background_Home.png');

// Curved_Bar.svg native viewBox is 199×111
const BAR_ASPECT = 199 / 111;

function scoreTag(score: number): string {
  if (score >= 740) return 'Excellent';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Needs Work';
}

function scoreColor(score: number): string {
  if (score >= 740) return '#4CAF50';
  if (score >= 670) return '#5F4BF5';
  if (score >= 580) return '#FF9800';
  return '#F44336';
}

function ScoreGauge({ score }: { score: number }) {
  const color = scoreColor(score);
  const tag   = scoreTag(score);

  return (
    <View style={gaugeStyles.wrap}>
      {/* Arc image scales to fill width */}
      <CurvedBar width="100%" height="100%" />
      {/* Text centred in the arc bowl */}
      <View style={gaugeStyles.overlay} pointerEvents="none">
        <Text style={[gaugeStyles.number, { color }]}>{score}</Text>
        <Text style={gaugeStyles.tag}>{tag}</Text>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  wrap: {
    width: '70%',
    aspectRatio: BAR_ASPECT,
    position: 'relative',
    marginTop: -16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    bottom: -7,
  },
  number: {
    fontSize: 44,
    fontWeight: '700',
  },
  tag: {
    fontSize: 14,
    color: '#000',
    marginTop: 2,
  },
});

export default function LinkedHomeScreen() {
  const { backendUser } = useAuth();
  const { rank, refreshRank } = useUserRank();
  const resolvedRank = rank ?? backendUser?.rank ?? 'beta';
  const BadgeIcon = resolvedRank === 'alpha' ? AlphaBadge : resolvedRank === 'sigma' ? SigmaBadge : BetaBadge;

  useFocusEffect(
    React.useCallback(() => {
      refreshRank();
    }, [refreshRank]),
  );

  const latestScore = (() => {
    const entries = Object.entries(backendUser?.credit_score ?? {});
    if (entries.length === 0) return null;
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries[entries.length - 1][1];
  })();

  const utilization =
    backendUser?.credit_limit && backendUser.credit_limit > 0
      ? Math.round((backendUser.balance / backendUser.credit_limit) * 100)
      : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={circleBg} style={styles.circleBg} resizeMode="cover" />
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{backendUser?.name || 'there'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* ── Box 1: Credit Score with gauge ── */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreTitle}>Your Score</Text>
          <View style={styles.gaugeWrap}>
            <ScoreGauge score={latestScore ?? 300} />
          </View>
        </View>

        {/* ── Box 2: Credit Card Info ── */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardLabel}>My Credit Card</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                ${backendUser?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
              </Text>
              <Text style={styles.statLabel}>Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                ${backendUser?.credit_limit?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
              </Text>
              <Text style={styles.statLabel}>Credit Limit</Text>
            </View>
          </View>

          <View style={styles.utilizationWrap}>
            <View style={styles.utilizationRow}>
              <Text style={styles.utilizationLabel}>Utilization</Text>
              <Text style={styles.utilizationPct}>{utilization}%</Text>
            </View>
            <View style={styles.utilizationTrack}>
              <View
                style={[
                  styles.utilizationFill,
                  {
                    width: `${Math.min(utilization, 100)}%` as any,
                    backgroundColor:
                      utilization <= 30 ? '#4CAF50'
                      : utilization <= 60 ? '#FF9800'
                      : '#F44336',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ── Bottom row: Utilization + Alpha Badge ── */}
        <View style={styles.bottomRow}>
          {/* Left: Credit Utilization */}
          <View style={[styles.bottomBox, styles.utilizationBox]}>
            <Text style={styles.utilizationBig}>
              {backendUser?.credit_limit && backendUser.credit_limit > 0
                ? `${((backendUser.balance / backendUser.credit_limit) * 100).toFixed(1)}%`
                : '—'}
            </Text>
            <Text style={styles.utilizationBoxLabel}>Current Credit{'\n'}Utilization</Text>
          </View>

          {/* Right: Alpha Badge */}
          <View style={[styles.bottomBox, styles.badgeBox]}>
            <BadgeIcon width={116} height={116} />
          </View>
        </View>
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

  // ── Header ──
  header: { height: 170 },
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

  // ── Box 1: Score ──
  scoreContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 215,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 14,
    ...CARD_SHADOW,
  },
  scoreTitle: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: '#555',
    alignSelf: 'center',
  },
  gaugeWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Box 2: Card Info ──
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 175,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
    marginBottom: 14,
    ...CARD_SHADOW,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: Fonts.rounded,
    color: '#222',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#888',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  utilizationWrap: { marginTop: 16 },
  utilizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  utilizationLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#aaa',
  },
  utilizationPct: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#555',
    fontWeight: '600',
  },
  utilizationTrack: {
    height: 6,
    backgroundColor: '#F0EBF8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: 6,
    borderRadius: 3,
  },

  // ── Bottom row ──
  bottomRow: {
    flexDirection: 'row',
    marginHorizontal: -10,
  },
  bottomBox: {
    flex: 1,
    height: 146,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    ...CARD_SHADOW,
  },
  utilizationBox: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilizationBig: {
    fontSize: 30,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  utilizationBoxLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#07004D',
    lineHeight: 18,
    textAlign: 'center',
  },
  badgeBox: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
