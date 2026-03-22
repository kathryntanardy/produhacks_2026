import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '@/constants/firebase';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import CircleBgExpenses from '@/assets/images/expenses/Circle_Background_Expenses.svg';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

const LEGEND = [
  { label: '300 - 659', color: '#F44336' },
  { label: '660 - 724', color: '#FF9800' },
  { label: '725 - 759', color: '#C8E6C9' },
  { label: '760+', color: '#4CAF50' },
];

type AnalyticsInsight = {
  type: 'positive' | 'warning';
  text: string;
};

type AnalyticsReport = {
  latest_score: number;
  latest_date: string;
  current_month_label: string;
  previous_month_label: string;
  monthly: { key: string; label: string }[];
  score_series: number[];
  spending_series: number[];
  utilization_series: number[];
  score_change_pct: number;
  spending_change_pct: number;
  utilization_change_pct: number;
  previous_score: number;
  current_score: number;
  insights: AnalyticsInsight[];
  habit_builder_title: string;
  habit_builder_message: string;
};

const FALLBACK_INSIGHTS: AnalyticsInsight[] = [
  { type: 'positive', text: 'You checked your credit score 5 times this month.' },
  { type: 'warning', text: 'Your credit utilization was 33% this month.' },
  { type: 'warning', text: 'You missed 1 payment, decreased your score.' },
];

function scoreColor(score: number): string {
  if (score >= 760) return '#4CAF50';
  if (score >= 725) return '#8BC34A';
  if (score >= 660) return '#FF9800';
  return '#F44336';
}

function formatPct(value: number, invert = false) {
  const positive = invert ? value <= 0 : value >= 0;
  return {
    text: `${positive ? '↑' : '↓'} ${Math.abs(value).toFixed(2)}%`,
    positive,
  };
}

export default function AnalyticsScreen() {
  const { backendUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) return;
        const res = await fetch(`${API_BASE}/api/analytics-report`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!res.ok) return;
        const payload = await res.json();
        setReport(payload);
      } catch {
        // keep fallback UI
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const fallbackScoreEntries = Object.entries(backendUser?.credit_score ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const fallbackLatest = fallbackScoreEntries.length ? fallbackScoreEntries[fallbackScoreEntries.length - 1][1] : 0;
  const fallbackPrev = fallbackScoreEntries.length > 1 ? fallbackScoreEntries[fallbackScoreEntries.length - 2][1] : fallbackLatest;
  const fallbackMonths = ['Jan', 'Feb', 'Mar'];

  const monthItems = report?.monthly?.length
    ? report.monthly
    : fallbackMonths.map((label, i) => ({ key: `fallback-${label}-${i}`, label }));

  const scoreSeries = report?.score_series?.length
    ? report.score_series
    : [fallbackPrev * 0.9, fallbackPrev, fallbackLatest];
  const spendingSeries = report?.spending_series?.length ? report.spending_series : [450, 520, 410];

  const chartData = useMemo(
    () =>
      monthItems.map((monthItem, i) => {
        const score = Number(scoreSeries[i] ?? 0);
        const spending = Number(spendingSeries[i] ?? 0);
        return {
          key: monthItem.key || `${monthItem.label}-${i}`,
          month: monthItem.label,
          score,
          spending,
        };
      }),
    [monthItems, scoreSeries, spendingSeries]
  );
  const scoreValues = chartData.map((d) => d.score);
  const spendingValues = chartData.map((d) => d.spending);
  const minScore = Math.min(...scoreValues);
  const maxScore = Math.max(...scoreValues, 1);
  const scoreRange = Math.max(maxScore - minScore, 1);
  const scoreLowerBound = Math.max(0, minScore - scoreRange * 0.25);
  const scoreUpperBound = maxScore + scoreRange * 0.15;
  const minSpending = Math.min(...spendingValues);
  const maxSpending = Math.max(...spendingValues, 1);
  const spendingRange = Math.max(maxSpending - minSpending, 1);
  const spendingLowerBound = Math.max(0, minSpending - spendingRange * 0.25);
  const spendingUpperBound = maxSpending + spendingRange * 0.15;
  const BAR_MAX_H = 120;
  const BAR_MIN_H = 10;
  const latestScore = report?.latest_score ?? fallbackLatest;
  const dateStr = report?.latest_date ?? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currentMonth = report?.current_month_label ?? 'Mar';
  const prevMonth = report?.previous_month_label ?? 'Feb';
  const prevScore = report?.previous_score ?? fallbackPrev;

  const scoreStat = formatPct(report?.score_change_pct ?? 0);
  const spendStat = formatPct(report?.spending_change_pct ?? 0, true);
  const utilStat = formatPct(report?.utilization_change_pct ?? 0, true);
  const insightItems = report?.insights?.length ? report.insights : FALLBACK_INSIGHTS;
  const visibleInsights = insightItems.slice(0, 2);
  const habitTitle = report?.habit_builder_title ?? 'Habit Builder';
  const habitMessage =
    report?.habit_builder_message ??
    'Make sure to pay before your due date by checking your expenses and transferring money into the credit account.';

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5F4BF5" />
        </View>
      ) : null}

      <View style={styles.circleBg}>
        <CircleBgExpenses width="100%" height="100%" preserveAspectRatio="xMidYMin slice" />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.heroScore}>{latestScore || '—'}</Text>
        <Text style={styles.heroDate}>{dateStr}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chartCard}>
          <View style={styles.tabBar}>
            <View style={styles.tab}>
              <Text style={styles.tabTextFixed}>Score</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabTextFixed}>Spending</Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            {chartData.map((group) => (
              <View key={group.key} style={styles.chartGroup}>
                <View style={styles.barGroup}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(
                          BAR_MIN_H,
                          Math.round(
                            ((group.score - scoreLowerBound) / Math.max(scoreUpperBound - scoreLowerBound, 1)) * BAR_MAX_H
                          )
                        ),
                        backgroundColor: '#7C6BF8',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(
                          BAR_MIN_H,
                          Math.round(
                            ((group.spending - spendingLowerBound) /
                              Math.max(spendingUpperBound - spendingLowerBound, 1)) *
                              BAR_MAX_H
                          )
                        ),
                        backgroundColor: '#D4C5F0',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{group.month}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.analysisSection, { paddingBottom: insets.bottom + 44 }]}>
          {/* Monthly Report */}
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>{currentMonth} Report</Text>

            <View style={styles.reportRow}>
              <View style={[styles.scoreBox, { borderColor: scoreColor(prevScore ?? 0) }]}>
                <Text style={[styles.scoreBoxNum, { color: scoreColor(prevScore ?? 0) }]}>
                  {prevScore ?? '—'}
                </Text>
                <Text style={styles.scoreBoxLabel}>{prevMonth}</Text>
                <Text style={styles.scoreBoxSub}>Credit Score</Text>
              </View>

              <Text style={styles.arrow}>→</Text>

              <View style={[styles.scoreBox, { borderColor: scoreColor(latestScore ?? 0) }]}>
                <Text style={[styles.scoreBoxNum, { color: scoreColor(latestScore ?? 0) }]}>
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
              value={scoreStat.text}
              positive={scoreStat.positive}
            />
            <StatItem
              label="Spending"
              value={spendStat.text}
              positive={spendStat.positive}
            />
            <StatItem
              label="Utilization"
              value={utilStat.text}
              positive={utilStat.positive}
            />
          </View>

          {visibleInsights.map((item, idx) => (
            <View
              key={`${item.text}-${idx}`}
              style={[styles.insightCard, item.type === 'positive' ? styles.insightPositive : styles.insightWarning]}
            >
              <View style={[styles.insightIcon, item.type === 'positive' ? styles.iconPositive : styles.iconWarning]}>
                <Text style={[styles.insightIconText, item.type === 'positive' ? styles.iconTextPositive : styles.iconTextWarning]}>
                  {item.type === 'positive' ? 'O' : 'X'}
                </Text>
              </View>
              <Text style={styles.insightText}>{item.text}</Text>
            </View>
          ))}

          <View style={styles.habitCard}>
            <Text style={styles.habitTitle}>{habitTitle}</Text>
            <Text style={styles.habitMessage}>{habitMessage}</Text>
          </View>
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
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

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  analysisSection: {
    marginTop: 8,
    marginBottom: 0,
    marginHorizontal: -24,
    backgroundColor: '#EEEEEE',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 14,
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F4F3FF',
    borderRadius: 26,
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabTextFixed: {
    fontSize: 16,
    fontFamily: Fonts.rounded,
    color: '#07004D',
  },
  chartWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 170,
    paddingHorizontal: 4,
  },
  chartGroup: {
    alignItems: 'center',
    width: '31%',
  },
  metricValue: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6C6C6C',
    marginBottom: 5,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  bar: {
    width: 30,
    borderRadius: 5,
  },
  chartLabel: {
    fontSize: 14,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    marginTop: 10,
  },

  // Report card
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 10,
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
    paddingVertical: 12,
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
  insightCard: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...CARD_SHADOW,
  },
  insightPositive: {
    backgroundColor: '#E8FFD8',
  },
  insightWarning: {
    backgroundColor: '#FFDDE0',
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPositive: {
    backgroundColor: '#C6F7AA',
  },
  iconWarning: {
    backgroundColor: '#FFCDD4',
  },
  insightIconText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
  },
  iconTextPositive: {
    color: '#2E7D32',
  },
  iconTextWarning: {
    color: '#C62828',
  },
  insightText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#07004D',
    lineHeight: 20,
  },
  habitCard: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  habitTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    lineHeight: 28,
    color: '#07004D',
    marginBottom: 8,
  },
  habitMessage: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: '#07004D',
    textAlign: 'center',
  },
});
