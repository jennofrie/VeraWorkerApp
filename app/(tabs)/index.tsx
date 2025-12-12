import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Drawer } from '@/components/Drawer';
import { CalendarPicker } from '@/components/CalendarPicker';
import { useWorkerSchedules } from '@/hooks/useWorkerSchedules';
import { formatScheduleTime, formatDateForQuery, getWeekStart, getWeekEnd } from '@/lib/utils/dateFormat';

const WORKER_ID_KEY = '@veralink:workerId';

interface ClientShift {
  id: string;
  clientName: string;
  serviceType: string;
  date: string;
  dayName: string;
  dayNumber: string;
  startTime: string;
  endTime: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED';
}

export default function ScheduleHomeScreen() {
  const router = useRouter();
  // Initialize to Monday of current week
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);

  // Calculate week date range for fetching schedules
  const weekDateRange = useMemo(() => {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = getWeekEnd(currentDate);
    const dateFrom = formatDateForQuery(weekStart);
    const dateTo = formatDateForQuery(weekEnd);
    
    return {
      dateFrom,
      dateTo,
    };
  }, [currentDate]);

  // Fetch schedules from database
  const { schedules, isLoading, error, refetch } = useWorkerSchedules({
    dateFrom: weekDateRange.dateFrom,
    dateTo: weekDateRange.dateTo,
  });

  // Convert WorkerSchedule to ClientShift format
  const clientShifts = useMemo(() => {
    return schedules.map((schedule) => {
      // Ensure date is in YYYY-MM-DD format (handle any timezone issues)
      const scheduleDateStr = schedule.scheduled_date.split('T')[0]; // Remove time if present
      const scheduleDate = new Date(scheduleDateStr + 'T00:00:00');
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return {
        id: schedule.id,
        clientName: schedule.location_name || 'Client',
        serviceType: 'Scheduled Shift',
        date: scheduleDateStr, // Use normalized date string
        dayName: dayNames[scheduleDate.getDay()],
        dayNumber: scheduleDate.getDate().toString(),
        startTime: formatScheduleTime(schedule.start_time),
        endTime: formatScheduleTime(schedule.end_time),
        location: schedule.location_address || schedule.location_name || 'Location TBD',
        latitude: undefined,
        longitude: undefined,
        status: schedule.status === 'cancelled' ? 'COMPLETED' : 'BOOKED' as 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED',
      };
    });
  }, [schedules]);

  // Get current month and year
  const currentMonth = useMemo(() => {
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return monthNames[currentDate.getMonth()];
  }, [currentDate]);

  const currentYear = currentDate.getFullYear();

  // Load worker info
  useEffect(() => {
    const loadWorkerInfo = async () => {
      try {
        const storedName = await AsyncStorage.getItem('@veralink:workerName');
        const storedEmail = await AsyncStorage.getItem('@veralink:workerEmail');
        if (storedName) setWorkerName(storedName);
        if (storedEmail) setWorkerEmail(storedEmail);
      } catch (error) {
        console.error('Error loading worker info:', error);
      }
    };
    loadWorkerInfo();
  }, []);

  // Generate week days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const days: { dayName: string; dayNumber: string; date: string }[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Monday first
    
    // Get the start of the week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    // Calculate Monday: if Sunday (0), go back 6 days; otherwise go back (day - 1) days
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      // Use local date to avoid timezone issues - format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      days.push({
        dayName: dayNames[i],
        dayNumber: date.getDate().toString(),
        date: dateString,
      });
    }
    
    return days;
  }, [currentDate]);

  // Get shifts for a specific date
  const getShiftsForDate = (date: string) => {
    // Normalize date to YYYY-MM-DD format
    const normalizedDate = date.split('T')[0];
    
    return clientShifts.filter(shift => {
      // Normalize both dates for comparison
      const shiftDateNormalized = shift.date.split('T')[0];
      return shiftDateNormalized === normalizedDate;
    });
  };

  const handleDeleteShift = (shiftId: string) => {
    Alert.alert(
      'Delete Shift',
      'Are you sure you want to delete this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setClientShifts(prev => prev.filter(shift => shift.id !== shiftId));
          },
        },
      ]
    );
  };

  const handleShiftPress = (shift: ClientShift) => {
    router.push({
      pathname: '/(tabs)/client-detail',
      params: {
        clientId: shift.id,
        clientName: shift.clientName,
        serviceType: shift.serviceType,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        latitude: (shift.latitude ?? -33.8825).toString(),
        longitude: (shift.longitude ?? 151.1986).toString(),
      },
    });
  };

  const handleRefresh = () => {
    refetch();
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
            {currentMonth} {currentYear}
          </ThemedText>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <IconSymbol name="arrow.clockwise" size={24} color="#1F1D2B" weight="regular" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar Week View */}
          <View style={styles.calendarContainer}>
            <View style={styles.calendarDaysRow}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.calendarDay}>
                  <ThemedText style={styles.dayName}>{day.dayName}</ThemedText>
                  <ThemedText style={styles.dayNumber}>{day.dayNumber}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Double Arrow Down Icon - positioned below calendar */}
          <TouchableOpacity
            style={styles.arrowContainer}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.arrowWrapper}>
              <IconSymbol name="chevron.down" size={22} color="#5B9BD5" weight="bold" />
              <View style={styles.secondArrowContainer}>
                <IconSymbol name="chevron.down" size={22} color="#5B9BD5" weight="bold" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Shifts List */}
          <View style={styles.shiftsContainer}>
            {weekDays.map((day, dayIndex) => {
              const shifts = getShiftsForDate(day.date);
              
              return (
                <View key={dayIndex} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <ThemedText style={styles.dayHeaderText}>
                      {day.dayNumber} {day.dayName}
                    </ThemedText>
                  </View>
                  
                  {shifts.length > 0 ? (
                    shifts.map((shift) => (
                      <TouchableOpacity
                        key={shift.id}
                        style={styles.shiftCard}
                        onPress={() => handleShiftPress(shift)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.shiftCardHeader}>
                          <ThemedText style={styles.shiftTime}>
                            {shift.startTime} - {shift.endTime}
                          </ThemedText>
                          <View style={styles.shiftActions}>
                            <ThemedText style={styles.shiftStatus}>{shift.status}</ThemedText>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteShift(shift.id);
                              }}
                            >
                              <IconSymbol name="trash" size={16} color="#FF6B6B" weight="regular" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.shiftClientInfo}>
                          <IconSymbol name="person.fill" size={16} color="#5B9BD5" weight="regular" />
                          <ThemedText style={styles.shiftClientName}>
                            {shift.clientName}
                          </ThemedText>
                        </View>
                        <View style={styles.shiftLocationInfo}>
                          <IconSymbol name="mappin" size={14} color="#999" weight="regular" />
                          <ThemedText style={styles.shiftLocation} numberOfLines={1}>
                            {shift.location}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.noShiftsCard}>
                      <ThemedText style={styles.noShiftsText}>No Shifts!</ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        workerName={workerName}
        workerEmail={workerEmail}
      />

      <CalendarPicker
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={currentDate}
        onDateSelect={(date) => {
          setCurrentDate(date);
          setCalendarVisible(false);
        }}
      />
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
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  calendarContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    width: '100%',
    minHeight: 50,
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    alignItems: 'center',
    flex: 1,
  },
  arrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    position: 'relative',
    width: 30,
  },
  secondArrowContainer: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1D2B',
  },
  shiftsContainer: {
    paddingHorizontal: 20,
  },
  daySection: {
    marginBottom: 16,
  },
  dayHeader: {
    marginBottom: 8,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
  },
  shiftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22B07D',
    backgroundColor: '#E6F9F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteButton: {
    padding: 4,
  },
  shiftClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  shiftClientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1D2B',
  },
  shiftLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftLocation: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  noShiftsCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  noShiftsText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
});
