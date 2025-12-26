import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Drawer } from '@/components/Drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const WORKER_ID_KEY = '@veralink:workerId';

export default function AboutScreen() {
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Logout handler - runs outside Modal context for proper navigation
  const handleLogout = () => {
    setDrawerVisible(false);
    router.replace('/');
  };

  React.useEffect(() => {
    const loadWorkerInfo = async () => {
      try {
        const storedName = await AsyncStorage.getItem('@veralink:workerName');
        const storedEmail = await AsyncStorage.getItem('@veralink:workerEmail');
        if (storedName) setWorkerName(storedName);
        if (storedEmail) setWorkerEmail(storedEmail);
      } catch (error) {
        if (__DEV__) {
          console.error('Error loading worker info:', error);
        }
      }
    };
    loadWorkerInfo();
  }, []);

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        if (__DEV__) {
          console.error("Don't know how to open URI: " + url);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error opening URL:', error);
      }
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ],
      { cancelable: true }
    );
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Sign out from Supabase Auth
      await supabase.auth.signOut();

      // Clear all local storage data
      const keysToRemove = [
        WORKER_ID_KEY,
        '@veralink:workerName',
        '@veralink:workerEmail',
        '@veralink:currentShiftId',
      ];
      await AsyncStorage.multiRemove(keysToRemove);

      setIsDeleting(false);

      // Show success message and redirect
      Alert.alert(
        'Account Deleted',
        'Your account has been deleted successfully. For complete data removal, please contact support@veralinkcrm.online.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/');
            },
          },
        ]
      );
    } catch (error) {
      setIsDeleting(false);
      if (__DEV__) {
        console.error('Error deleting account:', error);
      }
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support@veralinkcrm.online.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#E6F4FE', '#F0F8FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setDrawerVisible(true)}
          >
            <IconSymbol name="line.3.horizontal" size={24} color="#1F1D2B" weight="regular" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            About
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Version */}
          <ThemedText style={styles.versionText}>Version 1.0.0</ThemedText>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenURL('https://veralinkcrm.online')}
            >
              <ThemedText style={styles.linkText}>Official Website</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenURL('https://veralinkcrm.online/help')}
            >
              <ThemedText style={styles.linkText}>Help</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenURL('https://veralinkcrm.online/terms-of-service')}
            >
              <ThemedText style={styles.linkText}>Terms of Service</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenURL('https://veralinkcrm.online/privacy-policy')}
            >
              <ThemedText style={styles.linkText}>Privacy Policy</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View style={styles.accountSection}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <View style={styles.linksContainer}>
              <TouchableOpacity
                style={styles.deleteAccountItem}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <>
                    <IconSymbol name="trash.fill" size={20} color="#FF3B30" weight="regular" />
                    <ThemedText style={styles.deleteAccountText}>Delete Account</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Copyright */}
          <View style={styles.copyrightContainer}>
            <ThemedText style={styles.copyrightText}>
              Copyright © JD Digital Systems
            </ThemedText>
          </View>
        </ScrollView>

        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onLogout={handleLogout}
          workerName={workerName}
          workerEmail={workerEmail}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F1D2B',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 16,
    color: '#1F1D2B',
    textAlign: 'center',
    marginBottom: 40,
  },
  linksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#1F1D2B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 16,
  },
  copyrightContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  copyrightText: {
    fontSize: 14,
    color: '#666',
  },
  accountSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  deleteAccountText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
