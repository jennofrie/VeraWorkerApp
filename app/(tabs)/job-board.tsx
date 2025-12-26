import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Drawer } from '@/components/Drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function JobBoardScreen() {
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);

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
            Job Board
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty state */}
          <View style={styles.emptyState}>
            <IconSymbol name="briefcase.fill" size={64} color="#999" weight="regular" />
            <ThemedText type="title" style={styles.emptyTitle}>
              No Available Jobs
            </ThemedText>
            <ThemedText style={styles.emptyMessage}>
              Check back later for new job opportunities. Available positions will appear here when they become available.
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
    flex: 1,
    textAlign: 'center',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F1D2B',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
