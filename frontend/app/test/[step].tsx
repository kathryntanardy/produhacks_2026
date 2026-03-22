import React, { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

import { PrimaryButton } from '@/components/ui/primary-button';
import { auth } from '@/constants/firebase';
import { Fonts } from '@/constants/theme';
import { colors } from '@/theme/colors';

import TestBg1 from '@/assets/images/test/1.svg';
import TestBg2 from '@/assets/images/test/2.svg';
import TestBg3 from '@/assets/images/test/3.svg';
import TestBg4 from '@/assets/images/test/4.svg';
import TestBg5 from '@/assets/images/test/5.svg';
import CircleBackground from '@/assets/images/test/circlebackground.svg';
import AlphaBadge from '@/assets/images/test/alpha.svg';
import BetaBadge from '@/assets/images/test/beta.svg';
import SigmaBadge from '@/assets/images/test/sigma.svg';

const TOTAL_TEST_STEPS = 5;
const QUESTION_CONFIGS: Record<number, { options: string[]; correctOption: string }> = {
  1: {
    options: ['Under 10%', 'Under 20%', 'Under 30%', 'Under 35%'],
    correctOption: 'Under 30%',
  },
  2: {
    options: ['Weekly', 'Bi-Weekly', 'Monthly', 'Every 45 Days'],
    correctOption: 'Monthly',
  },
  3: {
    options: ['Lengths of credit history', 'Amounts owed', 'Credit Mix', 'Payment History'],
    correctOption: 'Amounts owed',
  },
  4: {
    options: [
      'Paying the minimum balance each month',
      'Making consistent on-time payments',
      'Keeping utilization exactly at 35%',
      'Making one large payment per quarter',
    ],
    correctOption: 'Making consistent on-time payments',
  },
};
const TEST_BACKGROUNDS: Record<number, any> = {
  1: TestBg1,
  2: TestBg2,
  3: TestBg3,
  4: TestBg4,
  5: TestBg5,
};

function getStep(rawStep: string | string[] | undefined) {
  const numericStep = Number(Array.isArray(rawStep) ? rawStep[0] : rawStep);
  if (!Number.isFinite(numericStep)) return 1;
  return Math.min(Math.max(1, Math.trunc(numericStep)), TOTAL_TEST_STEPS);
}

function getScore(rawScore: string | string[] | undefined) {
  const numericScore = Number(Array.isArray(rawScore) ? rawScore[0] : rawScore);
  if (!Number.isFinite(numericScore) || numericScore < 0) return 0;
  return Math.trunc(numericScore);
}

function getButtonText(step: number) {
  if (step <= 3) return 'Next';
  if (step === 4) return 'Finish';
  return 'To Home';
}

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:5001`;

  return 'http://127.0.0.1:5001';
}

function getRankByScore(score: number) {
  if (score >= 4) return 'sigma';
  if (score >= 2) return 'alpha';
  return 'beta';
}

function parseRank(rawRank: string | string[] | undefined): 'alpha' | 'beta' | 'sigma' | null {
  const normalized = String(Array.isArray(rawRank) ? rawRank[0] : rawRank || '').toLowerCase();
  if (normalized === 'alpha' || normalized === 'beta' || normalized === 'sigma') return normalized;
  return null;
}

const RANK_CONTENT: Record<'alpha' | 'beta' | 'sigma', { title: string; description: string; Badge: any }> = {
  alpha: {
    title: 'Alpha',
    description: 'The one who leads the pack!',
    Badge: AlphaBadge,
  },
  beta: {
    title: 'Beta',
    description: 'A solid start. Your journey to mastery begins here.',
    Badge: BetaBadge,
  },
  sigma: {
    title: 'Sigma',
    description: 'The top 1%. Financial mastery unlocked.',
    Badge: SigmaBadge,
  },
};

type CheckerRowProps = {
  label: string;
  checked: boolean;
  validationState?: 'none' | 'correct' | 'incorrect';
  onToggle: () => void;
};

function CheckerRow({ label, checked, validationState = 'none', onToggle }: CheckerRowProps) {
  return (
    <Pressable
      style={[
        styles.checkerRow,
        validationState === 'correct' ? styles.validationCorrect : undefined,
        validationState === 'incorrect' ? styles.validationIncorrect : undefined,
      ]}
      onPress={onToggle}>
      <View style={[styles.checkerBox, checked ? styles.checkerBoxChecked : undefined]} />
      <Text style={styles.checkerLabel}>{label}</Text>
    </Pressable>
  );
}

export default function TestStepScreen() {
  const { step, score, rank } = useLocalSearchParams<{ step?: string; score?: string; rank?: string }>();
  const currentStep = getStep(step);
  const currentScore = getScore(score);
  const Bg = TEST_BACKGROUNDS[currentStep];
  const questionConfig = QUESTION_CONFIGS[currentStep];
  const isResultsStep = currentStep === 5;
  const resolvedRank = parseRank(rank) ?? getRankByScore(currentScore);
  const rankContent = RANK_CONTENT[resolvedRank];
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [validationShown, setValidationShown] = useState(false);
  const buttonText = useMemo(() => getButtonText(currentStep), [currentStep]);

  useEffect(() => {
    setSelectedOption(null);
    setValidationShown(false);
  }, [currentStep]);

  const handlePress = async () => {
    let nextScore = currentScore;

    if (questionConfig) {
      if (!selectedOption) {
        Alert.alert('Missing selection', 'Please select one answer to continue.');
        return;
      }

      if (selectedOption === questionConfig.correctOption) {
        nextScore += 1;
      }
    }

    if (currentStep === 4) {
      const rank = getRankByScore(nextScore);
      const apiBaseUrl = getApiBaseUrl();

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          Alert.alert('Session expired', 'Please log in again.');
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/rank`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ rank }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to update rank');
        }
      } catch (error: any) {
        Alert.alert('Could not update rank', error?.message || 'Please try again.');
        return;
      }
    }

    if (currentStep < TOTAL_TEST_STEPS) {
      const nextRank = currentStep === 4 ? getRankByScore(nextScore) : parseRank(rank) ?? getRankByScore(nextScore);
      router.push({
        pathname: '/test/[step]',
        params: { step: String(currentStep + 1), score: String(nextScore), rank: nextRank },
      });
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" style="light" />
      <View style={styles.background}>
        <Bg width="100%" height="100%" style={StyleSheet.absoluteFillObject} />

        {questionConfig ? (
          <View style={styles.firstQuestionForm}>
            <Text style={styles.firstQuestionPrompt}>Select one of the following:</Text>
            {questionConfig.options.map((option) => (
              <CheckerRow
                key={option}
                label={option}
                checked={selectedOption === option}
                validationState={
                  validationShown
                    ? option === questionConfig.correctOption
                      ? 'correct'
                      : selectedOption === option
                        ? 'incorrect'
                        : 'none'
                    : 'none'
                }
                onToggle={() => {
                  if (validationShown) return;
                  setSelectedOption(option);
                  setValidationShown(true);
                }}
              />
            ))}
          </View>
        ) : null}

        {isResultsStep ? (
          <View style={styles.resultsWrap}>
            <View style={styles.rankBadgeWrap}>
              <CircleBackground width={117} height={117} />
              <rankContent.Badge width={143} height={137.69} style={styles.rankBadge} />
            </View>
            <Text style={styles.rankTitle}>{rankContent.title}</Text>
            <Text style={styles.rankDescription}>{rankContent.description}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PrimaryButton content={buttonText} width="100%" onPress={handlePress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  background: {
    flex: 1,
  },
  firstQuestionForm: {
    marginTop: 360,
    paddingHorizontal: 42,
  },
  firstQuestionPrompt: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#07004D',
    marginBottom: 20,
  },
  checkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  validationCorrect: {
    borderColor: '#34C38F',
  },
  validationIncorrect: {
    borderColor: '#FF3B30',
  },
  checkerBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4A7F5',
  },
  checkerBoxChecked: {
    backgroundColor: colors.primary700,
    borderColor: colors.primary700,
  },
  checkerLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#07004D',
  },
  resultsWrap: {
    marginTop: 385,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  rankBadgeWrap: {
    width: 143,
    height: 137.69,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  rankBadge: {
    position: 'absolute',
  },
  rankTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 36,
    lineHeight: 40,
    color: '#07004D',
    marginBottom: 8,
  },
  rankDescription: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: '#07004D',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
  },
});
