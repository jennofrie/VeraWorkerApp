import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWorkerSchedules } from '@/hooks/useWorkerSchedules';
import { WorkerSchedule } from '@/types/schedule';
import {
  formatScheduleTime,
  getDayName,
  getDayNameForWeekPosition,
  getMonthName,
  getDayNumber,
  formatDateForQuery,
  getWeekStart,
  getWeekEnd,
} from '@/lib/utils/dateFormat';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: string;
  month: string;
  timeSlots: TimeSlot[];
  client?: string;
}

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(0); // Start with Monday (index 0)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  // Initialize to Monday of current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const datePickerRef = useRef<ScrollView>(null);
  const timeSlotsRef = useRef<ScrollView>(null);

  // Calculate week date range for filtering
  const weekDateRange = useMemo(() => {
    const weekStart = getWeekStart(currentWeekStart);
    const weekEnd = getWeekEnd(currentWeekStart);
    const dateFrom = formatDateForQuery(weekStart);
    const dateTo = formatDateForQuery(weekEnd);
    
    // Debug: Log week range calculation
    console.log('[ScheduleScreen] Week range calculated:', {
      currentWeekStart: currentWeekStart.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      dateFrom,
      dateTo,
      includesDec14: dateFrom <= '2025-12-14' && dateTo >= '2025-12-14',
    });
    
    return {
      dateFrom,
      dateTo,
    };
  }, [currentWeekStart]);

  // Fetch schedules for the current week
  const { schedules, isLoading, error, refetch } = useWorkerSchedules({
    dateFrom: weekDateRange.dateFrom,
    dateTo: weekDateRange.dateTo,
  });

  // Map WorkerSchedule data to DaySchedule format
  const scheduleData: DaySchedule[] = useMemo(() => {
    const weekStart = getWeekStart(currentWeekStart);
    const days: DaySchedule[] = [];
    
    // Debug: Log all schedules received
    console.log('[ScheduleScreen] All schedules received:', {
      totalSchedules: schedules.length,
      schedules: schedules.map(s => ({
        id: s.id,
        scheduled_date: s.scheduled_date,
        start_time: s.start_time,
        end_time: s.end_time,
        worker_id: s.worker_id,
        location_name: s.location_name,
      })),
      dec14Schedule: schedules.find(s => s.scheduled_date === '2025-12-14'),
    });
    
    // Generate 7 days (Monday to Sunday)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateString = formatDateForQuery(date);
      
      // Find schedules for this date
      const daySchedules = schedules.filter(
        (schedule) => schedule.scheduled_date === dateString
      );
      
      // Debug: Log if December 14 is found
      if (dateString === '2025-12-14') {
        console.log('[ScheduleScreen] December 14, 2025 processing:', {
          dateString,
          daySchedulesFound: daySchedules.length,
          daySchedules: daySchedules.map(s => ({
            id: s.id,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        });
      }
      
      // Map schedules to time slots
      const timeSlots: TimeSlot[] = daySchedules.map((schedule) => ({
        startTime: formatScheduleTime(schedule.start_time),
        endTime: formatScheduleTime(schedule.end_time),
      }));
      
      // Get location name from first schedule (if available)
      const locationName = daySchedules.length > 0 
        ? daySchedules[0].location_name 
        : undefined;
      
      days.push({
        date: dateString,
        dayName: getDayNameForWeekPosition(i), // Use week position (0=Mon, 6=Sun) instead of actual day
        dayNumber: getDayNumber(dateString),
        month: getMonthName(dateString),
        timeSlots,
        client: locationName || undefined,
      });
    }
    
    return days;
  }, [currentWeekStart, schedules]);

  // Navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
    setSelectedDate(0); // Reset to first day of new week
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
    setSelectedDate(0); // Reset to first day of new week
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(monday);
    
    // Find today's index in the week (0-6, where 0 is Monday)
    const todayDayOfWeek = day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, Monday (1) to 0, etc.
    setSelectedDate(todayDayOfWeek);
  };

  // PanResponder for swipe gestures on calendar section
  const swipeStartX = useRef<number | null>(null);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Capture the starting X position
        swipeStartX.current = evt.nativeEvent.pageX;
        return false; // Don't capture immediately
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes (more horizontal than vertical)
        const { dx, dy } = gestureState;
        // Require significant horizontal movement and minimal vertical movement
        return Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 30;
      },
      onPanResponderGrant: () => {
        // Disable scrolling temporarily when gesture starts
        if (datePickerRef.current) {
          datePickerRef.current.setNativeProps({ scrollEnabled: false });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Re-enable scrolling
        if (datePickerRef.current) {
          datePickerRef.current.setNativeProps({ scrollEnabled: true });
        }
        
        const { dx, vx } = gestureState;
        const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels
        const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum swipe velocity

        // Check if swipe is significant enough (distance or velocity)
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD) {
          if (dx > 0 || vx > 0) {
            // Swipe right - go to previous week
            goToPreviousWeek();
          } else {
            // Swipe left - go to next week
            goToNextWeek();
          }
        }
        
        swipeStartX.current = null;
      },
      onPanResponderTerminate: () => {
        // Re-enable scrolling if gesture is cancelled
        if (datePickerRef.current) {
          datePickerRef.current.setNativeProps({ scrollEnabled: true });
        }
        swipeStartX.current = null;
      },
    })
  ).current;

  // Get current week range for display
  const weekRange = useMemo(() => {
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    if (monday.getMonth() === sunday.getMonth()) {
      return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${sunday.getDate()}, ${monday.getFullYear()}`;
    } else {
      return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${monthNames[sunday.getMonth()]} ${sunday.getDate()}, ${monday.getFullYear()}`;
    }
  }, [currentWeekStart]);

  return (
    <LinearGradient
      colors={['#1F1D2B', '#2B2B40']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowClientModal(true)}
          >
            <IconSymbol name="line.3.horizontal" size={24} color="#FFFFFF" weight="regular" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Schedule
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Week Navigation - Always visible */}
        <View style={styles.weekNavigationContainer}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={goToPreviousWeek}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" weight="regular" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.weekRangeButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.weekRangeText}>
              {weekRange}
            </ThemedText>
            <ThemedText style={styles.weekRangeSubtext}>
              Tap to jump to date
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={goToNextWeek}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.right" size={24} color="#FFFFFF" weight="regular" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {/* Loading State */}
          {isLoading && schedules.length === 0 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00D4AA" />
              <ThemedText style={styles.loadingText}>Loading schedules...</ThemedText>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <View style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#FF6B6B" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={refetch}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Date Picker - Swipeable for week navigation */}
          {!error && (
            <View
              {...panResponder.panHandlers}
              style={styles.datePickerWrapper}
            >
              <ScrollView
                ref={datePickerRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.datePickerContainer}
                contentContainerStyle={styles.datePickerContent}
                scrollEnabled={true}
              >
              {scheduleData.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  selectedDate === index && styles.dateItemSelected,
                ]}
                onPress={() => setSelectedDate(index)}
              >
                <ThemedText
                  style={[
                    styles.dateDayName,
                    selectedDate === index && styles.dateDayNameSelected,
                  ]}
                >
                  {day.dayName}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dateNumber,
                    selectedDate === index && styles.dateNumberSelected,
                  ]}
                >
                  {day.dayNumber}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dateMonth,
                    selectedDate === index && styles.dateMonthSelected,
                  ]}
                >
                  {day.month}
                </ThemedText>
                {index === 3 && (
                  <View style={styles.dateUnderline} />
                )}
              </TouchableOpacity>
              ))}
              </ScrollView>
            </View>
          )}

          {/* Client Name / Location */}
          {!error && scheduleData[selectedDate]?.client && (
            <View style={styles.clientContainer}>
              <ThemedText style={styles.clientText}>
                {scheduleData[selectedDate].client}
              </ThemedText>
            </View>
          )}

          {/* Time Slots - Horizontal Layout */}
          {!error && (
            <ScrollView
            ref={timeSlotsRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.timeSlotsScrollContainer}
            contentContainerStyle={styles.timeSlotsContent}
            onScroll={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              if (datePickerRef.current) {
                datePickerRef.current.scrollTo({ x: offsetX, animated: false });
              }
            }}
            scrollEventThrottle={16}
          >
            {scheduleData.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayColumn}>
                {day.timeSlots.length > 0 ? (
                  day.timeSlots.map((slot, slotIndex) => (
                    <View key={slotIndex} style={styles.timeSlotCard}>
                      <ThemedText style={styles.timeSlotStart}>
                        {slot.startTime}
                      </ThemedText>
                      <ThemedText style={styles.timeSlotEnd}>
                        {slot.endTime}
                      </ThemedText>
                      <View style={styles.timeSlotIcon}>
                        <IconSymbol name="clock.fill" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptySlotCard}>
                    <ThemedText style={styles.emptySlotText}>No shifts</ThemedText>
                  </View>
                )}
              </View>
              ))}
            </ScrollView>
          )}

          {/* Empty State */}
          {!isLoading && !error && schedules.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <IconSymbol name="calendar" size={64} color="rgba(255, 255, 255, 0.3)" />
              <ThemedText style={styles.emptyStateText}>
                No schedules for this week
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Your upcoming schedules will appear here
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Date/Week Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <LinearGradient
          colors={['#1F1D2B', '#2B2B40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={styles.modalContainer}>
            <BlurView intensity={80} tint="dark" style={styles.modalBlurContent}>
              <View style={styles.modalHandle} />
              <ThemedText type="title" style={styles.modalTitle}>
                Select Week
              </ThemedText>
              
              <View style={styles.weekRangeContainer}>
                <ThemedText style={styles.weekRangeText}>
                  {weekRange}
                </ThemedText>
              </View>

              <View style={styles.dateNavigationContainer}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={goToPreviousWeek}
                >
                  <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.navButtonText}>Prev</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonPrimary]}
                  onPress={goToToday}
                >
                  <ThemedText style={styles.navButtonPrimaryText}>Today</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={goToNextWeek}
                >
                  <ThemedText style={styles.navButtonText}>Next</ThemedText>
                  <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDatePicker(false)}
              >
                <ThemedText style={styles.closeButtonText}>Close</ThemedText>
              </TouchableOpacity>
            </BlurView>
          </View>
        </LinearGradient>
      </Modal>

      {/* Client Name Editor Modal */}
      <Modal
        visible={showClientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClientModal(false)}
      >
        <LinearGradient
          colors={['#1F1D2B', '#2B2B40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowClientModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <BlurView intensity={80} tint="dark" style={styles.modalBlurContent}>
              <View style={styles.modalHandle} />
              <ThemedText type="title" style={styles.modalTitle}>
                Edit Client Name
              </ThemedText>
              
              <ThemedText style={styles.modalInfoText}>
                Client names are displayed from your schedule location information.
              </ThemedText>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowClientModal(false)}
              >
                <ThemedText style={styles.closeButtonText}>Close</ThemedText>
              </TouchableOpacity>
            </BlurView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  weekNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  weekNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  weekRangeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weekRangeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  weekRangeSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 2,
  },
  datePickerWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  datePickerContainer: {
    width: '100%',
  },
  datePickerContent: {
    paddingRight: 20,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 12,
    width: 78, // Match dayColumn width (120 - gap adjustments)
    position: 'relative',
  },
  dateItemSelected: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.4)',
  },
  dateDayName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
    fontWeight: '600',
  },
  dateDayNameSelected: {
    color: '#FFFFFF',
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  dateNumberSelected: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  dateMonth: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dateMonthSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dateUnderline: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -15 }],
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  clientContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
  },
  clientText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  timeSlotsScrollContainer: {
    marginTop: 8,
  },
  timeSlotsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayColumn: {
    width: 78, // Match dateItem width
    marginRight: 8, // Match dateItem marginRight
    gap: 12,
  },
  timeSlotCard: {
    backgroundColor: '#5B9BD5', // Modern blue color
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#5B9BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  timeSlotStart: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1D2B',
    marginBottom: 4,
  },
  timeSlotEnd: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1D2B',
  },
  timeSlotIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 29, 43, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  emptySlotText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalBlurContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 40,
    borderRadius: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  weekRangeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  weekRangeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateNavigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  navButtonPrimary: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    borderColor: 'rgba(0, 212, 170, 0.4)',
  },
  navButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navButtonPrimaryText: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '700',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveButtonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  modalInfoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
});

