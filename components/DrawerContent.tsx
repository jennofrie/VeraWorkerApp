import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const WORKER_ID_KEY = '@veralink:workerId';

interface DrawerContentProps {
  workerName?: string | null;
  workerEmail?: string | null;
  onClose?: () => void;
}

export function DrawerContent({ workerName, workerEmail, onClose }: DrawerContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [shiftNotifications, setShiftNotifications] = useState(false);

  const menuItems = [
    { id: 'notification', label: 'Notification', icon: 'bell', route: '/(tabs)/notification' },
    { id: 'schedule', label: 'My Schedule', icon: 'house.fill', route: '/(tabs)/' },
    { id: 'job-board', label: 'Job Board', icon: 'briefcase.fill', route: '/(tabs)/job-board' },
    { id: 'availability', label: 'Availability', icon: 'calendar', route: '/(tabs)/availability' },
    { id: 'my-forms', label: 'My Forms', icon: 'doc.text.fill', route: '/(tabs)/my-forms' },
    { id: 'timesheet', label: 'My Timesheet', icon: 'clock.fill', route: '/(tabs)/timesheet' },
    { id: 'my-documents', label: 'My Documents', icon: 'doc.fill', route: '/(tabs)/my-documents' },
    { id: 'document-hub', label: 'Document Hub', icon: 'folder.fill', route: '/(tabs)/document-hub' },
    { id: 'about', label: 'About', icon: 'info.circle.fill', route: '/(tabs)/about' },
  ];

  const handleNavigation = (route: string) => {
    router.push(route as any);
    onClose?.();
  };

  const handleRequestAccountDeletion = () => {
    Alert.alert(
      'Request Account Deletion',
      'Are you sure you want to request account deletion? This action will send an email to our support team.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: () => {
            const email = 'support@veralink.online';
            const subject = 'Account Deletion Request';
            const body = `Please delete my account.\n\nEmail: ${workerEmail || 'Not provided'}\n\nReason: `;
            const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(mailtoUrl).catch((err) => {
              console.error('Error opening email:', err);
              Alert.alert('Error', 'Could not open email client. Please contact support@veralink.online directly.');
            });
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      // Close drawer first - this is important for navigation to work
      if (onClose) {
        onClose();
      }
      
      // Clear all stored data
      const keysToRemove = [
        WORKER_ID_KEY,
        '@veralink:workerName',
        '@veralink:workerEmail',
        '@veralink:currentShiftId',
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Sign out from Supabase Auth
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Supabase sign out error:', signOutError);
      }
      
      // Wait for drawer to fully close before navigating
      // This ensures the modal doesn't block navigation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate to login screen - use replace to clear navigation stack
      router.replace('/');
      
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Even if there's an error, try to clear storage and navigate to login
      try {
        await AsyncStorage.multiRemove([
          WORKER_ID_KEY,
          '@veralink:workerName',
          '@veralink:workerEmail',
          '@veralink:currentShiftId',
        ]);
        await supabase.auth.signOut();
      } catch (clearError) {
        console.error('Error clearing data:', clearError);
      }
      
      // Wait for drawer to close
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Always navigate to login, even on error
      router.replace('/');
    }
  };

  const isActive = (route: string) => {
    if (route === '/(tabs)/') {
      return pathname === '/(tabs)/' || pathname === '/(tabs)/index';
    }
    return pathname === route;
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F5F5F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#5B9BD5', '#4A8BC2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <IconSymbol name="person.fill" size={32} color="#FFFFFF" weight="regular" />
              <View style={styles.avatarBadge}>
                <IconSymbol name="plus" size={12} color="#FFFFFF" weight="bold" />
              </View>
            </LinearGradient>
          </View>
          <ThemedText style={styles.userName}>
            {workerName || 'Worker Name'}
          </ThemedText>
          <ThemedText style={styles.userEmail}>
            {workerEmail || 'worker@example.com'}
          </ThemedText>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                isActive(item.route) && styles.menuItemActive,
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <IconSymbol
                name={item.icon as any}
                size={20}
                color={isActive(item.route) ? '#5B9BD5' : '#666'}
                weight="regular"
              />
              <ThemedText
                style={[
                  styles.menuItemText,
                  isActive(item.route) && styles.menuItemTextActive,
                ]}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          ))}

          {/* Shift Notifications Toggle */}
          <View style={styles.toggleItem}>
            <IconSymbol name="bell" size={20} color="#666" weight="regular" />
            <ThemedText style={styles.toggleLabel}>Shift Notifications</ThemedText>
            <Switch
              value={shiftNotifications}
              onValueChange={setShiftNotifications}
              trackColor={{ false: '#E0E0E0', true: '#5B9BD5' }}
              thumbColor={shiftNotifications ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Account Deletion & Logout Section */}
      <View style={styles.logoutSection}>
        <View style={styles.divider} />
        
        {/* Request Account Deletion Button */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleRequestAccountDeletion}
          activeOpacity={0.7}
        >
          <IconSymbol name="trash" size={18} color="#FF6B6B" weight="regular" />
          <ThemedText style={styles.deleteAccountText}>Request Account Deletion</ThemedText>
        </TouchableOpacity>

        <View style={styles.divider} />
        
        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <IconSymbol name="power" size={20} color="#FF6B6B" weight="regular" />
          <ThemedText style={styles.logoutText}>Log out</ThemedText>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22B07D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1D2B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: '#E6F4FE',
  },
  menuItemText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  menuItemTextActive: {
    color: '#5B9BD5',
    fontWeight: '600',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  logoutSection: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  deleteAccountText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

