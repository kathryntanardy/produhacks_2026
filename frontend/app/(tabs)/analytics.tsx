import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import CircleBgExpenses from '@/assets/images/expenses/Circle_Background_Expenses.svg';

const TABS = ['Score', 'Spending', 'Utili.'] as const;
type Tab = (typeof TABS)[number];

const LEGEND = [
  { label: '300 - 659', color: '#F44336' },
  { label: '660 - 724', color: '#FF9800' },
  { label: '725 - 759', color: '#888' },
  { label: '760+', color: '#4CAF50' },
];

function dotColor(score: number): string {
  if (score >= 760) return '#4CAF50';
  if (score >= 725) return '#888';
  if (score >= 660) return '#FF9800';
  return '#F44336';
}

// Hardcoded monthly spending & utilization for demo (real data would come from backend)
const MONTHLY_STATS: Record<string, { spending: number; utilization: number }> = {
  Jan: { spending: 420, utilization: 28 },
  Feb: { spending: 510, utilization: 34 },
  Mar: { spending: 380, utilization: 25 },
};

export default function AnalyticsScreen() {
  const { backendUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('Score');

  // Credit score history sorted by key
  const scoreEntries = Object.entries(backendUser?.credit_score ?? {})
    .sort(([a], [b]) => a.localeCompare(b));

  const latestScore = scoreEntries.length > 0
    ? scoreEntries[scoreEntries.length - 1][1]
    : null;

  const prevScore = scoreEntries.length > 1
    ? scoreEntries[scoreEntries.length - 2][1]
    : null;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const currentMonth = today.toLocaleDateString('en-US', { month: 'long' });
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1)
    .toLocaleDateString('en-US', { month: 'long' });

  // Build bar chart data based on active tab
  const months = ['Jan', 'Feb', 'Mar'];

  function getBarData(): { month: string; bars: number[] }[] {
    if (activeTab === 'Score') {
      return months.map((m) => {
        const entry = scoreEntries.find(([k]) => k.toLowerCase().startsWith(m.toLowerCase()));
        const val = entry ? entry[1] : 0;
        // Two bars per month for visual interest
        return { month: m, bars: [val * 0.85, val * 0.4] };
      });
    }
    if (activeTab === 'Spending') {
      return months.map((m) => {
        const s = MONTHLY_STATS[m]?.spending ?? 0;
        return { month: m, bars: [s, s * 0.6] };
      });
    }
    // Utilization
    return months.map((m) => {
      const u = MONTHLY_STATS[m]?.utilization ?? 0;
      return { month: m, bars: [u * 3, u * 1.5] };
    });
  }

  const barData = getBarData();
  const maxBar = Math.max(...barData.flatMap((d) => d.bars), 1);
  const BAR_MAX_H = 120;

  // Month-over-month changes
  const scoreChange = latestScore && prevScore
    ? (((latestScore - prevScore) / prevScore) * 100).toFixed(2)
    : null;
  const spendChange = MONTHLY_STATS.Mar && MONTHLY_STATS.Feb
    ? (((MONTHLY_STATS.Mar.spending - MONTHLY_STATS.Feb.spending) / MONTHLY_STATS.Feb.spending) * 100).toFixed(0)
    : null;
  const utilChange = MONTHLY_STATS.Mar && MONTHLY_STATS.Feb
    ? (((MONTHLY_STATS.Mar.utilization - MONTHLY_STATS.Feb.utilization) / MONTHLY_STATS.Feb.utilization) * 100).toFixed(0)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.circleBg}>
        <CircleBgExpenses width="100%" height="100%" preserveAspectRatio="xMidYMin slice" />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.heroScore}>{latestScore ?? '—'}</Text>
        <Text style={styles.heroDate}>{dateStr}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab selector */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bar chart */}
        <View style={styles.chartWrap}>
          {barData.map((group) => (
            <View key={group.month} style={styles.chartGroup}>
              <View style={styles.barGroup}>
                {group.bars.map((val, i) => {
                  const h = Math.max(6, Math.round((val / maxBar) * BAR_MAX_H));
                  return (
                    <View
                      key={i}
                      style={[
                        styles.bar,
                        {
                          height: h,
                          backgroundColor: i === 0 ? '#5F4BF5' : '#D4C5F0',
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.chartLabel}>{group.month}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Report */}
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>{currentMonth} Report</Text>

          <View style={styles.reportRow}>
            <View style={[styles.scoreBox, { borderColor: dotColor(prevScore ?? 0) }]}>
              <Text style={[styles.scoreBoxNum, { color: dotColor(prevScore ?? 0) }]}>
                {prevScore ?? '—'}
              </Text>
              <Text style={styles.scoreBoxLabel}>{prevMonth}</Text>
              <Text style={styles.scoreBoxSub}>Credit Score</Text>
            </View>

            <Text style={styles.arrow}>→</Text>

            <View style={[styles.scoreBox, { borderColor: dotColor(latestScore ?? 0) }]}>
              <Text style={[styles.scoreBoxNum, { color: dotColor(latestScore ?? 0) }]}>
                {latestScore ?? '—'}
              </Text>
              <Text style={styles.scoreBoxLabel}>{currentMonth.slice(0, 3)}</Text>
              <Text style={styles.scoreBoxSub}>Credit Score</Text>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            {LEGEND.map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsCard}>
          <StatItem
            label="Credit Score"
            value={scoreChange ? `${Number(scoreChange) >= 0 ? '↑' : '↓'} ${Math.abs(Number(scoreChange))}%` : '—'}
            positive={Number(scoreChange) >= 0}
          />
          <StatItem
            label="Spending"
            value={spendChange ? `${Number(spendChange) > 0 ? '↑' : '↓'} ${Math.abs(Number(spendChange))}%` : '—'}
            positive={Number(spendChange) <= 0}
          />
          <StatItem
            label="Utilization"
            value={utilChange ? `${Number(utilChange) > 0 ? '↑' : '↓'} ${Math.abs(Number(utilChange))}%` : '—'}
            positive={Number(utilChange) <= 0}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: positive ? '#4CAF50' : '#F44336' }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },

  header: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.rounded,
    color: '#fff',
    textAlign: 'center',
  },
  heroScore: {
    fontSize: 56,
    fontFamily: Fonts.rounded,
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  heroDate: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 160,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
    ...CARD_SHADOW,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#F4F0FA',
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#888',
  },
  tabTextActive: {
    color: '#07004D',
    fontWeight: '600',
  },

  // Bar chart
  chartWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 28,
    paddingHorizontal: 16,
    height: 160,
  },
  chartGroup: {
    alignItems: 'center',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bar: {
    width: 18,
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#888',
    marginTop: 8,
  },

  // Report card
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: Fonts.rounded,
    color: '#5F4BF5',
    fontWeight: '700',
    marginBottom: 18,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  scoreBox: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 100,
  },
  scoreBoxNum: {
    fontSize: 28,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  scoreBoxLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#555',
    marginTop: 2,
  },
  scoreBoxSub: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#aaa',
  },
  arrow: {
    fontSize: 22,
    color: '#888',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#888',
  },

  // Stats card
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    ...CARD_SHADOW,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#888',
  },
});
