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

const TABS = ['Score', 'Spending'] as const;
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
  const utilizationSeries = report?.utilization_series?.length ? report.utilization_series : [28, 34, 25];

  const chartData = useMemo(() => {
    const maxScore = Math.max(...scoreSeries, 1);
    const maxSpending = Math.max(...spendingSeries, 1);
    const BAR_MAX_H = 120;

    return monthItems.map((monthItem, i) => {
      const score = Number(scoreSeries[i] ?? 0);
      const spending = Number(spendingSeries[i] ?? 0);

      return {
        key: monthItem.key || `${monthItem.label}-${i}`,
        month: monthItem.label,
        metrics: [
          {
            id: 'score',
            height: Math.max(6, Math.round((score / maxScore) * BAR_MAX_H)),
            color: '#5F4BF5',
            valueText: `${Math.round(score)}`,
          },
          {
            id: 'spending',
            height: Math.max(6, Math.round((spending / maxSpending) * BAR_MAX_H)),
            color: '#7C6BF8',
            valueText: `$${Math.round(spending)}`,
          },
        ],
      };
    });
  }, [monthItems, scoreSeries, spendingSeries]);
  const latestScore = report?.latest_score ?? fallbackLatest;
  const dateStr = report?.latest_date ?? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currentMonth = report?.current_month_label ?? 'Mar';
  const prevMonth = report?.previous_month_label ?? 'Feb';
  const prevScore = report?.previous_score ?? fallbackPrev;

  const scoreStat = formatPct(report?.score_change_pct ?? 0);
  const spendStat = formatPct(report?.spending_change_pct ?? 0, true);
  const utilStat = formatPct(report?.utilization_change_pct ?? 0, true);
  const insightItems = report?.insights?.length ? report.insights : FALLBACK_INSIGHTS;
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab selector */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <View key={tab} style={styles.tab}>
              <Text style={styles.tabTextStatic}>{tab}</Text>
            </View>
          ))}
        </View>

        {/* Bar chart: left=score, middle=spending, right=utilization */}
        <View style={styles.chartWrap}>
          {chartData.map((group) => (
            <View key={group.key} style={styles.chartGroup}>
              <View style={styles.barGroup}>
                {group.metrics.map((metric) => {
                  return (
                    <View key={metric.id} style={styles.metricCol}>
                      <Text style={styles.metricValue}>{metric.valueText}</Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: metric.height,
                            backgroundColor: metric.color,
                          },
                        ]}
                      />
                    </View>
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

        {insightItems.map((item, idx) => (
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
  tabTextStatic: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#07004D',
  },

  // Bar chart
  chartWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 28,
    paddingHorizontal: 4,
    height: 172,
  },
  chartGroup: {
    alignItems: 'center',
    width: '31%',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  metricCol: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: '#6C6C6C',
    marginBottom: 4,
  },
  bar: {
    width: 22,
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
  insightCard: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
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
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  habitTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 34,
    lineHeight: 38,
    color: '#07004D',
    marginBottom: 8,
  },
  habitMessage: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: '#07004D',
    textAlign: 'center',
  },
});
