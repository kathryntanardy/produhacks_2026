import { Tabs } from 'expo-router';
import React from 'react';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { HapticTab } from '@/components/haptic-tab';
import { Fonts } from '@/constants/theme';

import ExpensesIcon from '@/assets/images/nav_bar/Expenses_Icons.svg';
import HomeIcon from '@/assets/images/nav_bar/Home_Icon.svg';
import AnalyticsIcon from '@/assets/images/nav_bar/Analytics_Icon.svg';
import ProfileIcon from '@/assets/images/nav_bar/Profile_Icon.svg';

function TabIcon({ Icon, focused }: { Icon: React.FC<{ width: number; height: number; opacity: number }>; focused: boolean }) {
  return <Icon width={26} height={26} opacity={focused ? 1 : 0.35} />;
}

export default function TabLayout() {
  return (
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
  );
}
