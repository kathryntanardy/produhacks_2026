import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { HapticTab } from '@/components/haptic-tab';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

import ExpensesIcon from '@/assets/images/nav_bar/Expenses_Icons.svg';
import HomeIcon from '@/assets/images/nav_bar/Home_Icon.svg';
import AnalyticsIcon from '@/assets/images/nav_bar/Analytics_Icon.svg';
import ProfileIcon from '@/assets/images/nav_bar/Profile_Icon.svg';

function TabIcon({ Icon, focused }: { Icon: React.FC<{ width: number; height: number; opacity: number }>; focused: boolean }) {
  return <Icon width={26} height={26} opacity={focused ? 1 : 0.35} />;
}

export default function TabLayout() {
  const { backendUser, utilWarningVisible, dismissUtilWarning } = useAuth();
  const insets = useSafeAreaInsets();

  const balance = backendUser?.balance ?? 0;
  const creditLimit = backendUser?.credit_limit ?? 0;
  const utilization = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;
  const isDanger = utilization >= 60;

  return (
    <View style={{ flex: 1 }}>
      {utilWarningVisible && (
        <View style={[warnStyles.toast, { top: insets.top + 8 }, isDanger && warnStyles.danger]}>
          <Text style={warnStyles.text}>
            {isDanger ? '🚨' : '⚠️'} Utilization is at {utilization.toFixed(0)}% — {isDanger ? 'immediate payment needed' : 'a payment is recommended'}
          </Text>
          <TouchableOpacity onPress={dismissUtilWarning} style={warnStyles.close}>
            <Text style={warnStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#1E0A3C',
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: {
          fontFamily: Fonts.sans,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          alignSelf: 'stretch',
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ExpensesIcon as any} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon Icon={HomeIcon as any} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => <TabIcon Icon={AnalyticsIcon as any} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ProfileIcon as any} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
    </View>
  );
}

const warnStyles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: '#F5C542',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  danger: {
    backgroundColor: '#E53935',
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#fff',
    fontWeight: '600',
  },
  close: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});
