import React, { useState, useMemo } from 'react';
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

interface TimeEntry {
  id: string;
  client: string;
  startTime: string;
  endTime: string;
  date: string;
  avatarColor?: string;
}

interface WeekGroup {
  weekRange: string;
  totalHours: string;
  entries: TimeEntry[];
}

export default function TimesheetScreen() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [shiftClient, setShiftClient] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');

  // Sample data - replace with real API call later
  const [timesheetData, setTimesheetData] = useState<WeekGroup[]>([
    {
      weekRange: 'Mon, Apr 01 - Sun, Apr 07',
      totalHours: '08:35',
      entries: [
        {
          id: '1',
          client: 'Bespoke Digital',
          startTime: '03:06AM',
          endTime: '12:16PM',
          date: 'Apr 01',
          avatarColor: '#5B9BD5',
        },
        {
          id: '2',
          client: 'Bespoke Digital',
          startTime: '03:03AM',
          endTime: '02:55PM',
          date: 'Apr 02',
          avatarColor: '#5B9BD5',
        },
        {
          id: '3',
          client: 'Bespoke Digital',
          startTime: '02:55AM',
          endTime: '12:10PM',
          date: 'Apr 03',
          avatarColor: '#5B9BD5',
        },
      ],
    },
    {
      weekRange: 'Mon, Mar 25 - Sun, Mar 31',
      totalHours: '17:08',
      entries: [
        {
          id: '4',
          client: 'Bespoke Digital',
          startTime: '03:57AM',
          endTime: '12:00PM',
          date: 'Mar 25',
          avatarColor: '#5B9BD5',
        },
        {
          id: '5',
          client: 'Bespoke Digital',
          startTime: '03:06AM',
          endTime: '12:16PM',
          date: 'Mar 26',
          avatarColor: '#5B9BD5',
        },
        {
          id: '6',
          client: 'Bespoke Digital',
          startTime: '03:03AM',
          endTime: '02:55PM',
          date: 'Mar 27',
          avatarColor: '#5B9BD5',
        },
        {
          id: '7',
          client: 'Bespoke Digital',
          startTime: '02:55AM',
          endTime: '12:10PM',
          date: 'Mar 28',
          avatarColor: '#5B9BD5',
        },
      ],
    },
    {
      weekRange: 'Mon, Mar 18 - Sun, Mar 24',
      totalHours: '15:30',
      entries: [
        {
          id: '8',
          client: 'Bespoke Digital',
          startTime: '03:06AM',
          endTime: '12:16PM',
          date: 'Mar 18',
          avatarColor: '#5B9BD5',
        },
        {
          id: '9',
          client: 'Bespoke Digital',
          startTime: '03:03AM',
          endTime: '02:55PM',
          date: 'Mar 19',
          avatarColor: '#5B9BD5',
        },
        {
          id: '10',
          client: 'Bespoke Digital',
          startTime: '02:55AM',
          endTime: '12:10PM',
          date: 'Mar 20',
          avatarColor: '#5B9BD5',
        },
      ],
    },
  ]);

  // Get current week range for header
  const getCurrentWeekRange = () => {
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monStr = `${dayNames[monday.getDay()]}, ${monthNames[monday.getMonth()]} ${String(monday.getDate()).padStart(2, '0')}`;
    const sunStr = `${dayNames[sunday.getDay()]}, ${monthNames[sunday.getMonth()]} ${String(sunday.getDate()).padStart(2, '0')}`;
    
    return `${monStr} - ${sunStr}`;
  };

  // Helper function to parse time string (e.g., "03:06AM" -> minutes since midnight)
  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})(AM|PM)/i);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Helper function to format minutes to time string
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}${period}`;
  };

  // Calculate total hours for current week
  const currentWeekTotal = useMemo(() => {
    const weekRange = getCurrentWeekRange();
    const currentWeek = timesheetData.find(week => week.weekRange === weekRange);
    if (!currentWeek) return '00:00';
    
    let totalMinutes = 0;
    currentWeek.entries.forEach(entry => {
      const start = parseTime(entry.startTime);
      const end = parseTime(entry.endTime);
      if (start && end) {
        let diff = end - start;
        if (diff < 0) diff += 24 * 60; // Handle overnight shifts
        totalMinutes += diff;
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, [timesheetData, currentWeekStart]);

  // Week navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(monday);
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
          <TouchableOpacity style={styles.menuButton}>
            <IconSymbol name="line.3.horizontal" size={24} color="#1F1D2B" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Timesheet
          </ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingEntry(null);
              setShiftClient('');
              setShiftDate('');
              setShiftStartTime('');
              setShiftEndTime('');
              setShowAddShiftModal(true);
            }}
          >
            <View style={styles.plusIconContainer}>
              <View style={styles.plusHorizontal} />
              <View style={styles.plusVertical} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Date Range Selector */}
        <TouchableOpacity
          style={styles.dateRangeContainer}
          onPress={() => setShowWeekPicker(true)}
          activeOpacity={0.7}
        >
          <BlurView intensity={40} tint="dark" style={styles.dateRangeBlur}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.androidDateOverlay]} />
            )}
            <View style={styles.dateRangeContent}>
              <View style={styles.dateRangeLeft}>
                <ThemedText style={styles.dateRangeText}>
                  {getCurrentWeekRange()}
                </ThemedText>
                <IconSymbol name="chevron.right" size={16} color="#666" />
              </View>
              <View style={styles.totalHoursContainer}>
                <ThemedText style={styles.totalHoursText}>{currentWeekTotal}</ThemedText>
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Scrollable List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {timesheetData.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekGroup}>
              {/* Week Header */}
              <View style={styles.weekHeader}>
                <ThemedText style={styles.weekRangeText}>
                  {week.weekRange}
                </ThemedText>
                <ThemedText style={styles.weekTotalHours}>
                  {week.totalHours}
                </ThemedText>
              </View>

              {/* Week Entries */}
              {week.entries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => {
                    setEditingEntry(entry);
                    setShiftClient(entry.client);
                    setShiftDate(entry.date);
                    setShiftStartTime(entry.startTime);
                    setShiftEndTime(entry.endTime);
                    setShowAddShiftModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <BlurView intensity={40} tint="dark" style={styles.entryBlur}>
                    {Platform.OS === 'ios' ? (
                      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.androidEntryOverlay]} />
                    )}
                    <View style={styles.entryContent}>
                      {/* Avatar */}
                      <View style={[styles.avatar, { backgroundColor: entry.avatarColor || '#5B9BD5' }]}>
                        <View style={styles.avatarIcon}>
                          <View style={styles.avatarHead} />
                          <View style={styles.avatarBody} />
                        </View>
                      </View>

                      {/* Entry Details */}
                      <View style={styles.entryDetails}>
                        <ThemedText style={styles.clientName}>
                          {entry.client}
                        </ThemedText>
                        
                        <View style={styles.timeRow}>
                          <IconSymbol name="clock.fill" size={14} color="rgba(255, 255, 255, 0.7)" />
                          <ThemedText style={styles.timeText}>
                            {entry.startTime} - {entry.endTime}
                          </ThemedText>
                        </View>

                        <View style={styles.dateRow}>
                          <IconSymbol name="calendar" size={14} color="rgba(255, 255, 255, 0.7)" />
                          <ThemedText style={styles.dateText}>
                            {entry.date}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Week Picker Modal */}
      <Modal
        visible={showWeekPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeekPicker(false)}
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
            onPress={() => setShowWeekPicker(false)}
          />
          <View style={styles.modalContainer}>
            <BlurView intensity={80} tint="dark" style={styles.modalBlurContent}>
              <View style={styles.modalHandle} />
              <ThemedText type="title" style={styles.modalTitle}>
                Select Week
              </ThemedText>
              
              <View style={styles.weekRangeContainer}>
                <ThemedText style={styles.weekRangeText}>
                  {getCurrentWeekRange()}
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
                onPress={() => setShowWeekPicker(false)}
              >
                <ThemedText style={styles.closeButtonText}>Close</ThemedText>
              </TouchableOpacity>
            </BlurView>
          </View>
        </LinearGradient>
      </Modal>

      {/* Add/Edit Shift Modal */}
      <Modal
        visible={showAddShiftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddShiftModal(false)}
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
            onPress={() => setShowAddShiftModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <BlurView intensity={80} tint="dark" style={styles.modalBlurContent}>
              <View style={styles.modalHandle} />
              <ThemedText type="title" style={styles.modalTitle}>
                {editingEntry ? 'Edit Shift' : 'Add Shift'}
              </ThemedText>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Client Name</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter client name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={shiftClient}
                    onChangeText={setShiftClient}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Date (e.g., Dec 08)</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Dec 08"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={shiftDate}
                    onChangeText={setShiftDate}
                  />
                </View>

                <View style={styles.timeInputRow}>
                  <View style={[styles.inputContainer, styles.timeInput]}>
                    <ThemedText style={styles.inputLabel}>Start Time</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="03:06AM"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={shiftStartTime}
                      onChangeText={setShiftStartTime}
                    />
                  </View>

                  <View style={[styles.inputContainer, styles.timeInput]}>
                    <ThemedText style={styles.inputLabel}>End Time</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="12:16PM"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={shiftEndTime}
                      onChangeText={setShiftEndTime}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowAddShiftModal(false)}
                >
                  <ThemedText style={styles.modalCancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => {
                    if (!shiftClient || !shiftDate || !shiftStartTime || !shiftEndTime) {
                      return;
                    }

                    const newEntry: TimeEntry = {
                      id: editingEntry?.id || Date.now().toString(),
                      client: shiftClient,
                      startTime: shiftStartTime,
                      endTime: shiftEndTime,
                      date: shiftDate,
                      avatarColor: '#5B9BD5',
                    };

                    // Update or add entry to the appropriate week
                    const weekRange = getCurrentWeekRange();
                    setTimesheetData(prev => {
                      const updated = [...prev];
                      const weekIndex = updated.findIndex(w => w.weekRange === weekRange);
                      
                      if (weekIndex >= 0) {
                        if (editingEntry) {
                          // Update existing entry
                          updated[weekIndex] = {
                            ...updated[weekIndex],
                            entries: updated[weekIndex].entries.map(e =>
                              e.id === editingEntry.id ? newEntry : e
                            ),
                          };
                        } else {
                          // Add new entry
                          updated[weekIndex] = {
                            ...updated[weekIndex],
                            entries: [...updated[weekIndex].entries, newEntry],
                          };
                        }
                      } else {
                        // Create new week group
                        updated.push({
                          weekRange,
                          totalHours: '00:00',
                          entries: [newEntry],
                        });
                      }
                      
                      return updated;
                    });

                    setShowAddShiftModal(false);
                    setShiftClient('');
                    setShiftDate('');
                    setShiftStartTime('');
                    setShiftEndTime('');
                    setEditingEntry(null);
                  }}
                >
                  <LinearGradient
                    colors={['#00D4AA', '#00A8CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveButtonGradient}
                  >
                    <ThemedText style={styles.modalSaveButtonText}>
                      {editingEntry ? 'Save Changes' : 'Add Shift'}
                    </ThemedText>
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
    marginBottom: 16,
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
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusHorizontal: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: '#1F1D2B',
    borderRadius: 1,
  },
  plusVertical: {
    position: 'absolute',
    width: 2,
    height: 18,
    backgroundColor: '#1F1D2B',
    borderRadius: 1,
  },
  dateRangeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateRangeBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  androidDateOverlay: {
    backgroundColor: '#FFFFFF',
  },
  dateRangeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 1,
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
  },
  totalHoursContainer: {
    backgroundColor: '#E6F9F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22B07D',
  },
  totalHoursText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22B07D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  weekGroup: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekTotalHours: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22B07D',
  },
  entryCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  androidEntryOverlay: {
    backgroundColor: '#FFFFFF',
  },
  entryContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    zIndex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  avatarBody: {
    width: 20,
    height: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  entryDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1D2B',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#999',
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
    maxHeight: '90%',
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
    color: '#1F1D2B',
    textAlign: 'center',
    marginBottom: 20,
  },
  weekRangeContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  weekRangeText: {
    fontSize: 16,
    color: '#1F1D2B',
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
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  navButtonPrimary: {
    backgroundColor: '#E6F9F4',
    borderColor: '#22B07D',
  },
  navButtonText: {
    fontSize: 14,
    color: '#1F1D2B',
    fontWeight: '600',
  },
  navButtonPrimaryText: {
    fontSize: 14,
    color: '#22B07D',
    fontWeight: '700',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#1F1D2B',
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1D2B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
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

