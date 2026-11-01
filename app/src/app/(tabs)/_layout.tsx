import React from 'react';
import { Tabs } from 'expo-router';
import { Map, Navigation, Shield, User } from 'lucide-react-native';
import { lightColors, darkColors } from '@/theme/tokens';
import { useUserStore } from '@/store';

export default function TabLayout() {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.signal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size || 22} />,
          tabBarAccessibilityLabel: 'Map tab, navigation and route planning',
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <Navigation color={color} size={size || 22} />,
          tabBarAccessibilityLabel: 'Trips tab, active and past journeys',
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: 'Safety',
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size || 22} />,
          tabBarAccessibilityLabel: 'Safety tab, community reports and safe havens',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 22} />,
          tabBarAccessibilityLabel: 'Profile tab, trusted contacts and emergency settings',
        }}
      />
    </Tabs>
  );
}
