import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function CalendarPicker({ visible, onClose, selectedDate, onDateSelect }: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState(selectedDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(selectedDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(selectedDate.getFullYear());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar for a specific month
  const generateCalendar = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handleDateSelect = (day: number, month: number, year: number) => {
    setSelectedDay(day);
    setSelectedMonth(month);
    setSelectedYear(year);
    const newDate = new Date(year, month, day);
    onDateSelect(newDate);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    } else {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Generate calendars for multiple years (2025-2028)
  const generateYearCalendars = () => {
    const years = [2025, 2026, 2027, 2028];
    const calendars: { year: number; months: { month: number; monthName: string; days: (number | null)[] }[] }[] = [];
    
    years.forEach(year => {
      const months: { month: number; monthName: string; days: (number | null)[] }[] = [];
      for (let month = 0; month < 12; month++) {
        months.push({
          month,
          monthName: monthNames[month],
          days: generateCalendar(month, year),
        });
      }
      calendars.push({ year, months });
    });
    
    return calendars;
  };

  const yearCalendars = useMemo(() => generateYearCalendars(), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#FFFFFF', '#F5F5F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalGradient}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
            {/* Render all calendars for 2025-2028 */}
            {yearCalendars.map((yearData) => (
              <View key={yearData.year}>
                {yearData.months.map((monthData) => {
                  const isSelected = 
                    selectedDay !== null &&
                    selectedMonth === monthData.month &&
                    selectedYear === yearData.year &&
                    monthData.days.includes(selectedDay);
                  
                  return (
                    <View key={`${yearData.year}-${monthData.month}`} style={styles.calendarSection}>
                      <ThemedText style={styles.monthTitle}>
                        {monthData.monthName} {yearData.year}
                      </ThemedText>
                      <View style={styles.calendarGrid}>
                        {/* Day headers */}
                        {dayNames.map((day) => (
                          <View key={day} style={styles.dayHeader}>
                            <ThemedText style={styles.dayHeaderText}>{day}</ThemedText>
                          </View>
                        ))}
                        {/* Calendar days */}
                        {monthData.days.map((day, index) => {
                          const dayIsSelected = 
                            day !== null &&
                            day === selectedDay &&
                            monthData.month === selectedMonth &&
                            yearData.year === selectedYear;
                          
                          return (
                            <TouchableOpacity
                              key={`${yearData.year}-${monthData.month}-${index}`}
                              style={styles.dayCell}
                              onPress={() => day !== null && handleDateSelect(day, monthData.month, yearData.year)}
                              disabled={day === null}
                            >
                              {day !== null && (
                                <View style={[
                                  styles.dayContent,
                                  dayIsSelected && styles.selectedDay,
                                ]}>
                                  <ThemedText style={[
                                    styles.dayText,
                                    dayIsSelected && styles.selectedDayText,
                                  ]}>
                                    {day}
                                  </ThemedText>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Close Calendar Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <LinearGradient
                colors={['#1E3A8A', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.closeButtonGradient}
              >
                <ThemedText style={styles.closeButtonText}>Close Calendar</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    minHeight: 500,
    width: '100%',
  },
  modalGradient: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  calendarSection: {
    marginBottom: 30,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1D2B',
    textAlign: 'center',
    marginBottom: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#1E3A8A',
  },
  highlightedDay: {
    // No background, just text color
  },
  dayText: {
    fontSize: 14,
    color: '#1F1D2B',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  highlightedDayText: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  closeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

