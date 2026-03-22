import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { updateProfile } from 'firebase/auth';

import { auth } from '@/constants/firebase';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { LinedInput } from '@/components/ui/lined-input';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';


import Bg1 from '@/assets/images/signup_questions/1.svg';
import Bg2 from '@/assets/images/signup_questions/2.svg';
import Bg3 from '@/assets/images/signup_questions/3.svg';
import Bg4 from '@/assets/images/signup_questions/4.svg';
import Bg5 from '@/assets/images/signup_questions/5.svg';
import Bg6 from '@/assets/images/signup_questions/6.svg';
import Bg7 from '@/assets/images/signup_questions/7.svg';
import Bg8 from '@/assets/images/signup_questions/8.svg';

const TOTAL_STEPS = 8;
const STEP_BACKGROUNDS: Record<number, any> = {
  1: Bg1,
  2: Bg2,
  3: Bg3,
  4: Bg4,
  5: Bg5,
  6: Bg6,
  7: Bg7,
  8: Bg8,
};

function getStep(rawStep: string | string[] | undefined) {
  const numericStep = Number(Array.isArray(rawStep) ? rawStep[0] : rawStep);
  if (!Number.isFinite(numericStep)) return 1;
  return Math.min(Math.max(1, Math.trunc(numericStep)), TOTAL_STEPS);
}

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:5001`;

  return 'http://127.0.0.1:5001';
}

type CheckerRowProps = {
  label: string;
  checked: boolean;
  multiline?: boolean;
  onToggle: () => void;
};

function CheckerRow({ label, checked, multiline = false, onToggle }: CheckerRowProps) {
  return (
    <Pressable style={styles.checkerRow} onPress={onToggle}>
      <View style={[styles.checkerBox, checked ? styles.checkerBoxChecked : undefined]} />
      <Text style={[styles.checkerLabel, multiline ? styles.checkerLabelMultiline : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignupQuestionsStep() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const currentStep = getStep(step);
  const isLastStep = currentStep === TOTAL_STEPS;
  const isFirstStep = currentStep === 1;
  const isSecondStep = currentStep === 2;
  const isThirdStep = currentStep === 3;
  const isFourthStep = currentStep === 4;
  const isFifthStep = currentStep === 5;
  const isSixthStep = currentStep === 6;
  const isSeventhStep = currentStep === 7;
  const { syncBackendUser } = useAuth();
  const [checkState, setCheckState] = useState({
    personalInformation: false,
    homeAddress: false,
    financialGoals: false,
    literacyTest: false,
    consent: false,
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressUnit, setAddressUnit] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressProvince, setAddressProvince] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedIncomeRange, setSelectedIncomeRange] = useState<string | null>(null);

  const goalOptions = [
    'Get my first credit card',
    'Learning credit utilization',
    'Improve credit score',
    'Organize credit cards',
  ];
  const incomeOptions = [
    '$0 to $19,999',
    '$20,000 to $39,999',
    '$40,000 to $59,999',
    '$60,000 to $79,999',
    '$80,000 to $99,999',
    '$100,000 or more',
  ];

  const toggleCheck = (key: keyof typeof checkState) => {
    setCheckState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((item) => item !== goal);
      }

      if (prev.length >= 2) {
        Alert.alert('Selection limit', 'Please select up to 2 goals.');
        return prev;
      }

      return [...prev, goal];
    });
  };

  const handleContinue = async () => {
    const apiBaseUrl = getApiBaseUrl();

    if (isSecondStep) {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (!fullName) {
        Alert.alert('Missing name', 'Please enter your first and last name.');
        return;
      }

      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: fullName });
          await syncBackendUser();
        }
      } catch (error: any) {
        Alert.alert('Could not save name', error?.message || 'Please try again.');
        return;
      }
    }

    if (isSeventhStep) {
      if (!selectedIncomeRange) {
        Alert.alert('Missing selection', 'Please select one annual income range.');
        return;
      }

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          Alert.alert('Session expired', 'Please log in again.');
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/annual-income`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            annual_income: selectedIncomeRange,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to update annual income');
        }
      } catch (error: any) {
        Alert.alert('Save failed', error?.message || 'Could not update annual income.');
        return;
      }
    }

    if (isSixthStep) {
      if (selectedGoals.length !== 2) {
        Alert.alert('Selection required', 'Please select exactly 2 goals.');
        return;
      }

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          Alert.alert('Session expired', 'Please log in again.');
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/goals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            goals: selectedGoals,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to update goals');
        }
      } catch (error: any) {
        Alert.alert('Save failed', error?.message || 'Could not update goals.');
        return;
      }
    }

    if (isLastStep) {
      router.replace('/(tabs)');
      return;
    }

    router.push(`/signup-questions/${currentStep + 1}`);
  };

  const handleBack = () => {
    const previousStep = Math.max(1, currentStep - 1);
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(`/signup-questions/${previousStep}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" style="light" />
      {isFirstStep ? (
        <View style={styles.background}>
          {(() => {
            const Bg = STEP_BACKGROUNDS[1];
            return <Bg width="100%" height="100%" style={StyleSheet.absoluteFillObject} />;
          })()}
          <ScrollView contentContainerStyle={styles.firstStepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Provide/Complete the Following:</Text>
              <CheckerRow
                label="Personal Information"
                checked={checkState.personalInformation}
                onToggle={() => toggleCheck('personalInformation')}
              />
              <CheckerRow
                label="Home Address"
                checked={checkState.homeAddress}
                onToggle={() => toggleCheck('homeAddress')}
              />
              <CheckerRow
                label="Financial Goals"
                checked={checkState.financialGoals}
                onToggle={() => toggleCheck('financialGoals')}
              />
              <CheckerRow
                label="Short Financial Literacy Test"
                checked={checkState.literacyTest}
                onToggle={() => toggleCheck('literacyTest')}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeading}>Consent Form</Text>
              <CheckerRow
                multiline
                checked={checkState.consent}
                onToggle={() => toggleCheck('consent')}
                label="I consent to Credify periodically obtaining my credit score, report, and related information from agencies including Equifax as long as I have an account. I understand that information will only be used for the purpose of providing Credify services, including personal recommendations."
              />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.background}>
          {(() => {
            const Bg = STEP_BACKGROUNDS[currentStep];
            return <Bg width="100%" height="100%" style={StyleSheet.absoluteFillObject} />;
          })()}
          {isSecondStep ? (
            <View style={styles.secondStepForm}>
              <LinedInput label="First Name" value={firstName} onChangeText={setFirstName} />
              <View style={styles.secondStepGap} />
              <LinedInput label="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
          ) : null}

          {isThirdStep ? (
            <View style={styles.thirdStepForm}>
              <LinedInput label="Month (MM)" value={dobMonth} onChangeText={setDobMonth} autoCapitalize="none" />
              <View style={styles.thirdStepGap} />
              <LinedInput label="Day (DD)" value={dobDay} onChangeText={setDobDay} autoCapitalize="none" />
              <View style={styles.thirdStepGap} />
              <LinedInput label="Year (YYYY)" value={dobYear} onChangeText={setDobYear} autoCapitalize="none" />
            </View>
          ) : null}

          {isFourthStep ? (
            <View style={styles.fourthStepForm}>
              <LinedInput label="Address" value={addressLine1} onChangeText={setAddressLine1} />
              <View style={styles.fourthStepGap} />
              <LinedInput label="Unit / Apartment # (Optional)" value={addressUnit} onChangeText={setAddressUnit} />
              <View style={styles.fourthStepGap} />
              <LinedInput label="City" value={addressCity} onChangeText={setAddressCity} />
              <View style={styles.fourthStepGap} />
              <View style={styles.fourthStepRow}>
                <View style={styles.fourthStepHalf}>
                  <LinedInput label="Province" value={addressProvince} onChangeText={setAddressProvince} />
                </View>
                <View style={styles.fourthStepHalf}>
                  <LinedInput label="Postal Code" value={addressPostalCode} onChangeText={setAddressPostalCode} />
                </View>
              </View>
            </View>
          ) : null}

          {isFifthStep ? (
            <View style={styles.fifthStepForm}>
              <LinedInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoCapitalize="none"
              />
            </View>
          ) : null}

          {isSixthStep ? (
            <View style={styles.sixthStepForm}>
              <Text style={styles.sixthStepHeading}>Select two of the following:</Text>
              {goalOptions.map((goal) => (
                <CheckerRow
                  key={goal}
                  label={goal}
                  checked={selectedGoals.includes(goal)}
                  onToggle={() => toggleGoal(goal)}
                />
              ))}
            </View>
          ) : null}

          {isSeventhStep ? (
            <View style={styles.seventhStepForm}>
              <Text style={styles.sixthStepHeading}>Select one of the following:</Text>
              {incomeOptions.map((incomeRange) => (
                <CheckerRow
                  key={incomeRange}
                  label={incomeRange}
                  checked={selectedIncomeRange === incomeRange}
                  onToggle={() =>
                    setSelectedIncomeRange((prev) => (prev === incomeRange ? null : incomeRange))
                  }
                />
              ))}
            </View>
          ) : null}

          {isLastStep ? (
            <View style={styles.lastStepButtonWrap}>
              <SecondaryButton content="Continue" width="100%" onPress={handleContinue} />
            </View>
          ) : null}
        </View>
      )}

      {isThirdStep || isFourthStep || isFifthStep || isSixthStep || isSeventhStep ? (
        <View style={styles.footerRow}>
          <PrimaryButton content="←" width={56} onPress={handleBack} style={styles.backButton} />
          <PrimaryButton content="Continue" width="auto" onPress={handleContinue} style={styles.continueButton} />
        </View>
      ) : !isLastStep ? (
        <View style={styles.footer}>
          <PrimaryButton
            content={isFirstStep ? "Let's Get Started" : isLastStep ? 'Finish' : 'Continue'}
            width="100%"
            onPress={handleContinue}
          />
        </View>
      ) : null}
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
  firstStepContent: {
    paddingTop: 320,
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  secondStepForm: {
    marginTop: 438,
    paddingHorizontal: 44,
  },
  secondStepGap: {
    height: 34,
  },
  thirdStepForm: {
    marginTop: 425,
    paddingHorizontal: 44,
  },
  thirdStepGap: {
    height: 30,
  },
  fourthStepForm: {
    marginTop: 410,
    paddingHorizontal: 44,
  },
  fourthStepGap: {
    height: 24,
  },
  fourthStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  fourthStepHalf: {
    flex: 1,
  },
  fifthStepForm: {
    marginTop: 522,
    paddingHorizontal: 60,
  },
  sixthStepForm: {
    marginTop: 390,
    paddingHorizontal: 44,
  },
  seventhStepForm: {
    marginTop: 390,
    paddingHorizontal: 44,
  },
  lastStepButtonWrap: {
    marginTop: 470,
    paddingHorizontal: 46,
  },
  sixthStepHeading: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: colors.primary700,
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHeading: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: colors.primary700,
    marginBottom: 10,
  },
  checkerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 22,
  },
  checkerBox: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D4A7F5',
  },
  checkerBoxChecked: {
    backgroundColor: colors.primary700,
    borderColor: colors.primary700,
  },
  checkerLabel: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary700,
  },
  checkerLabelMultiline: {
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
  },
  footerRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    minHeight: 46,
  },
  continueButton: {
    flex: 1,
    minHeight: 46,
  },
});
