import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' }, // Hide tab bar - using drawer navigation instead
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="timesheet"
        options={{
          title: 'Timesheet',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          title: 'Notification',
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="job-board"
        options={{
          title: 'Job Board',
          href: null,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Availability',
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-forms"
        options={{
          title: 'My Forms',
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-documents"
        options={{
          title: 'My Documents',
          href: null,
        }}
      />
      <Tabs.Screen
        name="document-hub"
        options={{
          title: 'Document Hub',
          href: null,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          href: null,
        }}
      />
      <Tabs.Screen
        name="client-detail"
        options={{
          title: 'Client Detail',
          href: null,
        }}
      />
      <Tabs.Screen
        name="clock-in"
        options={{
          title: 'Clock In',
          href: null,
        }}
      />
    </Tabs>
  );
}
