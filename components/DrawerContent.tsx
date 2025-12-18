import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeSignOut } from '@/lib/supabase';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const WORKER_ID_KEY = '@veralink:workerId';
const SHIFT_NOTIFICATIONS_KEY = '@veralink:shiftNotifications';
const PROFILE_PHOTO_KEY = '@veralink:profilePhoto';
const DISPLAY_NAME_KEY = '@veralink:displayName';

interface DrawerContentProps {
  workerName?: string | null;
  workerEmail?: string | null;
  onClose?: () => void;
}

export function DrawerContent({ workerName, workerEmail, onClose }: DrawerContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [shiftNotifications, setShiftNotifications] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedNotif, savedPhoto, savedName] = await AsyncStorage.multiGet([
          SHIFT_NOTIFICATIONS_KEY,
          PROFILE_PHOTO_KEY,
          DISPLAY_NAME_KEY,
        ]);
        if (savedNotif[1] !== null) {
          setShiftNotifications(savedNotif[1] === 'true');
        }
        if (savedPhoto[1]) {
          setProfilePhoto(savedPhoto[1]);
        }
        if (savedName[1]) {
          setDisplayName(savedName[1]);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error loading preferences:', error);
        }
      }
    };
    loadPreferences();
  }, []);

  // Handle notification toggle with feedback
  const handleNotificationToggle = async (value: boolean) => {
    setShiftNotifications(value);
    try {
      await AsyncStorage.setItem(SHIFT_NOTIFICATIONS_KEY, value.toString());
      Alert.alert(
        'Notification Settings',
        value
          ? 'Shift notifications enabled. You will receive reminders for upcoming shifts.'
          : 'Shift notifications disabled. You will no longer receive shift reminders.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving notification preference:', error);
      }
    }
  };

  // Handle photo selection
  const handleSelectPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to set a profile photo.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setProfilePhoto(photoUri);
        await AsyncStorage.setItem(PROFILE_PHOTO_KEY, photoUri);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error selecting photo:', error);
      }
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  // Handle name editing
  const handleEditName = () => {
    setTempName(displayName || workerName || '');
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    const trimmedName = tempName.trim();
    if (trimmedName) {
      setDisplayName(trimmedName);
      try {
        await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
      } catch (error) {
        if (__DEV__) {
          console.error('Error saving display name:', error);
        }
      }
    }
    setShowNameModal(false);
  };

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

  const handleLogout = async () => {
    try {
      // Close drawer first - this is important for navigation to work
      if (onClose) {
        onClose();
      }
      
      // Clear all stored data including local profile customizations
      const keysToRemove = [
        WORKER_ID_KEY,
        '@veralink:workerName',
        '@veralink:workerEmail',
        '@veralink:currentShiftId',
        PROFILE_PHOTO_KEY,
        DISPLAY_NAME_KEY,
        SHIFT_NOTIFICATIONS_KEY,
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Sign out from Supabase Auth using safe helper (won't crash if not configured)
      const { error: signOutError } = await safeSignOut();
      if (signOutError && __DEV__) {
        console.warn('Supabase sign out warning:', signOutError.message);
      }
      
      // Wait for drawer to fully close before navigating
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate to login screen - use replace to clear navigation stack
      router.replace('/');
      
    } catch (error) {
      if (__DEV__) {
        console.error('Error signing out:', error);
      }
      
      // Even if there's an error, try to clear storage and navigate to login
      try {
        await AsyncStorage.multiRemove([
          WORKER_ID_KEY,
          '@veralink:workerName',
          '@veralink:workerEmail',
          '@veralink:currentShiftId',
          PROFILE_PHOTO_KEY,
          DISPLAY_NAME_KEY,
        ]);
        await safeSignOut();
      } catch (clearError) {
        if (__DEV__) {
          console.error('Error clearing data:', clearError);
        }
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
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleSelectPhoto}
            activeOpacity={0.7}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#5B9BD5', '#4A8BC2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <IconSymbol name="person.fill" size={32} color="#FFFFFF" weight="regular" />
              </LinearGradient>
            )}
            <View style={styles.avatarBadge}>
              <IconSymbol name="camera.fill" size={10} color="#FFFFFF" weight="bold" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEditName} activeOpacity={0.7}>
            <View style={styles.nameContainer}>
              <ThemedText style={styles.userName}>
                {displayName || workerName || 'Worker Name'}
              </ThemedText>
              <IconSymbol name="pencil" size={14} color="#666" weight="regular" />
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.userEmail}>
            {workerEmail || 'worker@example.com'}
          </ThemedText>
        </View>

        {/* Name Edit Modal */}
        <Modal
          visible={showNameModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Edit Display Name</ThemedText>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Enter your name"
                placeholderTextColor="#999"
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setShowNameModal(false)}
                >
                  <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalSaveButton}
                  onPress={handleSaveName}
                >
                  <ThemedText style={styles.modalSaveText}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E0E0E0', true: '#5B9BD5' }}
              thumbColor={shiftNotifications ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <View style={styles.divider} />
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
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5B9BD5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1D2B',
    marginBottom: 16,
    textAlign: 'center',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F1D2B',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#5B9BD5',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

