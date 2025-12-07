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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  const [selectedDate, setSelectedDate] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [clientName, setClientName] = useState('Bespoke Digital');
  const datePickerRef = useRef<ScrollView>(null);
  const timeSlotsRef = useRef<ScrollView>(null);

  // Generate week data based on currentWeekStart
  const scheduleData: DaySchedule[] = useMemo(() => {
    const weekStart = new Date(currentWeekStart);
    // Get Monday of the week
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(weekStart.setDate(diff));
    
    const days: DaySchedule[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const dayNumber = date.getDate().toString();
      const month = monthNames[date.getMonth()];
      const dayName = dayNames[i];
      
      // Sample data - replace with real API call later
      // For demo: Tue-Sat have shifts
      const hasShift = i >= 1 && i <= 5;
      
      days.push({
        date: dayNumber,
        dayName,
        dayNumber,
        month,
        timeSlots: hasShift ? [
          { startTime: i === 1 ? '04:12am' : '04:00am', endTime: '13:00pm' },
        ] : [],
        client: hasShift ? clientName : undefined,
      });
    }
    
    return days;
  }, [currentWeekStart, clientName]);

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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.datePickerContainer}
            contentContainerStyle={styles.datePickerContent}
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

          {/* Client Name */}
          {scheduleData[selectedDate]?.client && (
            <View style={styles.clientContainer}>
              <ThemedText style={styles.clientText}>
                {scheduleData[selectedDate].client}
              </ThemedText>
            </View>
          )}

          {/* Time Slots - Horizontal Layout */}
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
              
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Client Name</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter client name"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={clientName}
                  onChangeText={setClientName}
                  autoCapitalize="words"
                  autoFocus={Platform.OS === 'android'}
                />
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowClientModal(false)}
                >
                  <ThemedText style={styles.modalCancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => setShowClientModal(false)}
                >
                  <LinearGradient
                    colors={['#00D4AA', '#00A8CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveButtonGradient}
                  >
                    <ThemedText style={styles.modalSaveButtonText}>Save</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
  datePickerContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
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
});

