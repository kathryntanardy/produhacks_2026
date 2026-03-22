import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import CardSvg from '@/assets/images/expenses/card.svg';
import CircleBgExpenses from '@/assets/images/expenses/Circle_Background_Expenses.svg';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

// Card aspect ratio from Card.svg viewBox: 334×202
const CARD_ASPECT = 334 / 202;

type Transaction = {
  id: number;
  amount: number;
  day: string;
  company: string;
};

type ExpenseStatus = {
  paid: boolean;
  remaining: number;
  dueDate: string;
  daysUntilDue: number;
  paidOnDate?: string;
  paidLateDays?: number;
};

function isPaymentTransaction(tx: Transaction): boolean {
  const company = (tx.company || '').toLowerCase();
  return tx.amount < 0 || company.includes('credit card payment') || company.includes('payment');
}

const ICON_COLORS = [
  '#E8F5E9', '#FFF3E0', '#E3F2FD', '#F3E5F5', '#FCE4EC',
  '#E0F7FA', '#FFF8E1', '#EDE7F6',
];

function iconColor(company: string): string {
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function iconText(company: string): string {
  return (company.trim()[0] ?? '?').toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Group transactions by date label (Today / Yesterday / date)
function groupByDate(txns: Transaction[]): { label: string; items: Transaction[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const d = new Date(t.day);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = formatDate(t.day);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(t);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function addDays(isoDate: string, days: number): Date {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d;
}

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeExpenseStatuses(txns: Transaction[]): Record<number, ExpenseStatus> {
  const sortedAsc = [...txns].sort((a, b) => {
    if (a.day === b.day) return a.id - b.id;
    return a.day.localeCompare(b.day);
  });

  const outstanding: Array<{ id: number; remaining: number; dueDate: string; paidOnDate?: string }> = [];
  const statuses: Record<number, ExpenseStatus> = {};

  for (const tx of sortedAsc) {
    const isPayment = isPaymentTransaction(tx);

    if (!isPayment) {
      const dueDate = addDays(tx.day, 21);
      statuses[tx.id] = {
        paid: false,
        remaining: tx.amount,
        dueDate: dueDate.toISOString().slice(0, 10),
        daysUntilDue: daysUntil(dueDate),
      };
      outstanding.push({
        id: tx.id,
        remaining: tx.amount,
        dueDate: dueDate.toISOString().slice(0, 10),
      });
      continue;
    }

    let paymentLeft = Math.abs(tx.amount);
    const allocationOrder = [...outstanding].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    for (const expense of allocationOrder) {
      if (paymentLeft <= 0) break;
      if (expense.remaining <= 0) continue;
      const applied = Math.min(expense.remaining, paymentLeft);
      expense.remaining -= applied;
      paymentLeft -= applied;
      if (expense.remaining <= 0) {
        expense.paidOnDate = tx.day;
      }
    }
  }

  for (const expense of outstanding) {
    const status = statuses[expense.id];
    if (!status) continue;
    status.remaining = Math.max(0, Number(expense.remaining.toFixed(2)));
    status.paid = status.remaining <= 0;
    if (status.paid && expense.paidOnDate) {
      const due = new Date(status.dueDate);
      const paidOn = new Date(expense.paidOnDate);
      due.setHours(0, 0, 0, 0);
      paidOn.setHours(0, 0, 0, 0);
      const lateDays = Math.ceil((paidOn.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      status.paidOnDate = expense.paidOnDate;
      status.paidLateDays = Math.max(0, lateDays);
    }
  }

  return statuses;
}

export default function ExpensesScreen() {
  const { backendUser, syncBackendUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/api/transactions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(transactions.length === 0);
      syncBackendUser();
    }, [fetchTransactions, syncBackendUser])
  );

  const groups = groupByDate(transactions);
  const expenseStatuses = computeExpenseStatuses(transactions);

  const totalSpend = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const creditAvailable = Math.max(0, (backendUser?.credit_limit ?? 0) - (backendUser?.balance ?? 0));

  return (
    <View style={styles.container}>
      {/* Circle background — sits behind everything */}
      <View style={styles.circleBg}>
        <CircleBgExpenses width="100%" height="100%" preserveAspectRatio="xMidYMin slice" />
      </View>

      {/* ── Fixed top section ── */}
      <View style={[styles.fixedTop, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Expenses</Text>
        </View>

        <View style={styles.cardSection}>
          <View style={styles.cardWrap}>
            <CardSvg width="100%" height="100%" />
            <View style={styles.cardOverlay} pointerEvents="none">
              <Text style={styles.cardBalance}>
                ${creditAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.cardLabel}>Credit Available</Text>
            </View>
          </View>

          <Text style={styles.addCardText}>Add another card</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Balance Owed</Text>
            <Text style={styles.totalAmount}>
              ${(backendUser?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable transactions ── */}
      <View style={styles.txSection}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color="#7B2FBE" />
          ) : transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            groups.map(({ label, items }) => (
              <View key={label}>
                <Text style={styles.groupLabel}>{label}</Text>
                {items.map((t) => (
                  (() => {
                    const isPayment = isPaymentTransaction(t);
                    const status = expenseStatuses[t.id];
                    const isPaidExpense = !isPayment && Boolean(status?.paid);
                    const isPaidOverdue = isPaidExpense && (status?.paidLateDays ?? 0) > 0;
                    return (
                  <View
                    key={t.id}
                    style={[
                      styles.txRow,
                      isPayment ? styles.txRowPaid : undefined,
                      isPaidExpense ? styles.txRowPaid : undefined,
                      isPaidOverdue ? styles.txRowPaidOverdue : undefined,
                      !isPayment &&
                      !status?.paid &&
                      (status?.daysUntilDue ?? 999) <= 5
                        ? styles.txRowDueSoon
                        : undefined,
                    ]}>
                    <View style={[styles.txIcon, { backgroundColor: iconColor(t.company) }]}>
                      <Text style={styles.txIconText}>{iconText(t.company)}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text
                        style={[
                          styles.txCompany,
                          isPayment || isPaidExpense ? styles.txCompanyPaid : undefined,
                          isPaidOverdue ? styles.txCompanyPaidOverdue : undefined,
                          !isPayment &&
                          !status?.paid &&
                          (status?.daysUntilDue ?? 999) <= 5
                            ? styles.txCompanyDueSoon
                            : undefined,
                        ]}
                        numberOfLines={1}>
                        {t.company}
                      </Text>
                      {isPayment ? (
                        <Text style={[styles.txDate, styles.txDatePaid]}>Payment recorded</Text>
                      ) : isPaidOverdue ? (
                        <Text style={[styles.txDate, styles.txDatePaidOverdue]}>
                          Paid after due date · Overdue by {status?.paidLateDays ?? 0} day(s)
                        </Text>
                      ) : status?.paid ? (
                        <Text style={[styles.txDate, styles.txDatePaid]}>
                          Paid · Due {formatDate(status.dueDate)}
                        </Text>
                      ) : (status?.daysUntilDue ?? 999) <= 5 ? (
                        <Text style={[styles.txDate, styles.txDateDueSoon]}>
                          {status && status.daysUntilDue < 0
                            ? `Overdue by ${Math.abs(status.daysUntilDue)} day(s)`
                            : `Due in ${status?.daysUntilDue ?? 0} day(s)`}
                        </Text>
                      ) : (
                        <Text style={styles.txDate}>
                          Due {formatDate(status?.dueDate ?? t.day)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.txAmount, isPayment && styles.txCredit, isPaidOverdue && styles.txAmountPaidOverdue]}>
                      {isPayment ? '-' : ''}${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                    );
                  })()
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

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
  fixedTop: {
    paddingBottom: 8,
  },
  headerContent: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.rounded,
    color: '#fff',
    textAlign: 'center',
  },
  cardSection: {
    paddingHorizontal: 24,
  },

  txSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scroll: { flex: 1 },

  // Card
  cardWrap: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    position: 'relative',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 24,
  },
  cardBalance: {
    fontSize: 28,
    fontFamily: Fonts.rounded,
    color: '#fff',
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  addCardText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#A483F2',
    textAlign: 'right',
    marginBottom: 16,
  },

  // Total row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: '#555',
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: Fonts.rounded,
    color: '#07004D',
    fontWeight: '700',
  },

  // Transactions
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.rounded,
    color: '#1E0A3C',
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  txRowPaid: {
    borderWidth: 1.5,
    borderColor: '#62C37C',
    shadowColor: '#62C37C',
    shadowOpacity: 0.15,
  },
  txRowDueSoon: {
    borderWidth: 1.5,
    borderColor: '#F44336',
    shadowColor: '#F44336',
    shadowOpacity: 0.12,
  },
  txRowPaidOverdue: {
    borderColor: '#2F80ED',
    shadowColor: '#2F80ED',
    shadowOpacity: 0.14,
  },
  txIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  txIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  txInfo: {
    flex: 1,
  },
  txCompany: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: '#1E0A3C',
    fontWeight: '600',
  },
  txCompanyPaid: {
    color: '#2E7D32',
  },
  txCompanyDueSoon: {
    color: '#C62828',
  },
  txCompanyPaidOverdue: {
    color: '#2F80ED',
  },
  txDate: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#aaa',
    marginTop: 2,
  },
  txDatePaid: {
    color: '#2E7D32',
  },
  txDateDueSoon: {
    color: '#C62828',
  },
  txDatePaidOverdue: {
    color: '#2F80ED',
  },
  txAmount: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: '#07004D',
    fontWeight: '700',
  },
  txCredit: {
    color: '#4CAF50',
  },
  txAmountPaidOverdue: {
    color: '#2F80ED',
  },

  empty: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: '#bbb',
  },
});
