import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Drawer } from '@/components/Drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AboutScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);

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

  const handleOfficialWebsite = async () => {
    const url = 'https://quantumcare.com.au';
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
            <View style={styles.logo}>
              <ThemedText style={styles.logoText}>VL</ThemedText>
            </View>
          </View>

          {/* Version */}
          <ThemedText style={styles.versionText}>Version 1.0.0</ThemedText>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={handleOfficialWebsite}
            >
              <ThemedText style={styles.linkText}>Official Website</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Help</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Terms & Conditions</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Privacy Policy</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E3A8A',
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
});
