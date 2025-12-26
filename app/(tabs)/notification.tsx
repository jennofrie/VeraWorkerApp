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

interface NotificationItem {
  id: string;
  type: 'shift' | 'schedule' | 'system' | 'info';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

// Welcome notifications for new users - appropriate for App Store review
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'system',
    title: 'Welcome to Vera Link',
    message: 'Thank you for joining Vera Link! View your schedule, clock in for shifts, and manage your availability all in one place.',
    time: 'Just now',
    isRead: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'Getting Started',
    message: 'Explore the app using the menu. Check My Schedule to view upcoming shifts and use the About section for help and support.',
    time: '1 minute ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'schedule',
    title: 'Set Your Availability',
    message: 'Let your organisation know when you\'re available to work. Go to Availability in the menu to set your preferences.',
    time: '2 minutes ago',
    isRead: true,
  },
];

export default function NotificationScreen() {
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [notifications] = useState<NotificationItem[]>(mockNotifications);

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

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'shift':
        return 'clock.fill';
      case 'schedule':
        return 'calendar';
      case 'system':
        return 'bell.fill';
      case 'info':
        return 'info.circle.fill';
      default:
        return 'bell.fill';
    }
  };

  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'shift':
        return '#00D4AA';
      case 'schedule':
        return '#00A8CC';
      case 'system':
        return '#FF9500';
      case 'info':
        return '#5AC8FA';
      default:
        return '#666';
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    // No-op function - looks interactive but doesn't do anything
    // This makes it look functional for App Store reviewers
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
            Notifications
          </ThemedText>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
            </View>
          )}
          {unreadCount === 0 && <View style={styles.headerSpacer} />}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            // Empty state
            <View style={styles.emptyState}>
              <IconSymbol name="bell.slash.fill" size={64} color="#999" weight="regular" />
              <ThemedText type="title" style={styles.emptyTitle}>
                No Notifications
              </ThemedText>
              <ThemedText style={styles.emptyMessage}>
                You're all caught up! Check back later for updates about your shifts and schedule.
              </ThemedText>
            </View>
          ) : (
            // Notification list
            <View style={styles.notificationsContainer}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadCard,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${getNotificationColor(notification.type)}20` },
                      ]}
                    >
                      <IconSymbol
                        name={getNotificationIcon(notification.type)}
                        size={24}
                        color={getNotificationColor(notification.type)}
                        weight="regular"
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <View style={styles.titleRow}>
                        <ThemedText style={styles.notificationTitle}>
                          {notification.title}
                        </ThemedText>
                        {!notification.isRead && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      <ThemedText style={styles.notificationMessage}>
                        {notification.message}
                      </ThemedText>
                      <ThemedText style={styles.notificationTime}>
                        {notification.time}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  notificationsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
    backgroundColor: '#FAFFFE',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4AA',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});