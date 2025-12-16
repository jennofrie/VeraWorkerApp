import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Drawer } from '@/components/Drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useTimesheets, Timesheet } from '@/hooks/useTimesheets';
import { formatDateForQuery, getWeekStart, getWeekEnd, formatScheduleTime, getMonthName, getDayName } from '@/lib/utils/dateFormat';

const WORKER_ID_KEY = '@veralink:workerId';

interface TimeEntry {
  id: string;
  client: string;
  startTime: string;
  endTime: string;
  date: string;
  avatarColor?: string;
  source?: 'mobile' | 'admin'; // Distinguish between shifts and timesheets
  isAdminAdded?: boolean; // Flag for admin-added entries
}

interface WeekGroup {
  weekRange: string;
  totalHours: string;
  entries: TimeEntry[];
}

export default function TimesheetScreen() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Calculate Monday
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [displayTimesheets, setDisplayTimesheets] = useState<Timesheet[]>([]);

  // Calculate date range for current week
  // IMPORTANT: Fetch a wider range (1 day before and after) to account for timezone differences
  // The entry for Dec 8 might be stored as Dec 7 in UTC, so we need to include Dec 7 in the query
  const weekDateRange = useMemo(() => {
    const weekStart = getWeekStart(currentWeekStart);
    const weekEnd = getWeekEnd(currentWeekStart);
    
    // Expand range by 1 day on each side to catch timezone edge cases
    // Reset time to midnight to ensure clean date calculations
    const expandedStart = new Date(weekStart);
    expandedStart.setHours(0, 0, 0, 0);
    expandedStart.setDate(expandedStart.getDate() - 1);
    
    const expandedEnd = new Date(weekEnd);
    expandedEnd.setHours(23, 59, 59, 999);
    expandedEnd.setDate(expandedEnd.getDate() + 1);
    
    const dateFrom = formatDateForQuery(expandedStart);
    const dateTo = formatDateForQuery(expandedEnd);
    return {
      dateFrom,
      dateTo,
    };
  }, [currentWeekStart]);

  // Fetch timesheets from Supabase (admin-added entries only)
  // Note: Mobile shifts are excluded - only showing admin timesheets
  // We fetch a wider date range and filter client-side to avoid timezone issues
  const { timesheets, isLoading, error, refetch: refetchTimesheets } = useTimesheets({
    workerId: workerId || undefined,
    dateFrom: weekDateRange.dateFrom,
    dateTo: weekDateRange.dateTo,
    completedOnly: true, // Only show completed timesheets
  });

  // Update display data - only update when we have valid data to prevent flickering
  useEffect(() => {
    // Always update display data when timesheets change
    // The expanded date range ensures we fetch entries even with timezone differences
    setDisplayTimesheets(timesheets);
  }, [timesheets]);

  // Track when initial load completes - ensure loading state clears
  useEffect(() => {
    if (!isLoading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
      setDisplayTimesheets(timesheets);
    }
  }, [isLoading, hasLoadedOnce, timesheets]);

  // Load worker info
  useEffect(() => {
    const loadWorkerInfo = async () => {
      try {
        const storedId = await AsyncStorage.getItem(WORKER_ID_KEY);
        const storedName = await AsyncStorage.getItem('@veralink:workerName');
        const storedEmail = await AsyncStorage.getItem('@veralink:workerEmail');
        if (storedId) setWorkerId(storedId);
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

  // Handle pull-to-refresh - keep display data stable during refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refetch timesheets only
      await refetchTimesheets();
    } finally {
      // Small delay to ensure data is updated before showing it
      setTimeout(() => {
        setIsRefreshing(false);
      }, 100);
    }
  }, [refetchTimesheets]);

  // Auto-refresh when screen is focused (only after initial load, and only once per focus)
  const lastFocusTimeRef = useRef<number>(0);
  useFocusEffect(
    useCallback(() => {
      // Only refresh if:
      // 1. Initial load has completed
      // 2. Not currently refreshing
      // 3. At least 2 seconds since last focus refresh (prevent spam)
      const now = Date.now();
      if (hasLoadedOnce && !isRefreshing && (now - lastFocusTimeRef.current > 2000)) {
        lastFocusTimeRef.current = now;
        refetchTimesheets();
      }
    }, [hasLoadedOnce, isRefreshing, refetchTimesheets])
  );

  // Helper function to create consistent week range strings
  // This ensures week ranges match exactly when comparing
  const createWeekRangeString = useCallback((weekStartDate: Date): string => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Sunday-first (matches getDay() return values)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monStr = `${dayNames[weekStartDate.getDay()]}, ${monthNames[weekStartDate.getMonth()]} ${String(weekStartDate.getDate()).padStart(2, '0')}`;
    const sunStr = `${dayNames[weekEndDate.getDay()]}, ${monthNames[weekEndDate.getMonth()]} ${String(weekEndDate.getDate()).padStart(2, '0')}`;
    return `${monStr} - ${sunStr}`;
  }, []);

  // Transform timesheets into WeekGroup format
  // Only show admin-added timesheets (remove mobile shifts)
  const timesheetData: WeekGroup[] = useMemo(() => {
    // Only use admin timesheets, filter out mobile shifts
    if (!displayTimesheets || displayTimesheets.length === 0) {
      return [];
    }

    // Group entries by week
    const weekMap = new Map<string, TimeEntry[]>();

    displayTimesheets.forEach((timesheet) => {
      const clockInTime = timesheet.clock_in_time;
      const clockOutTime = timesheet.clock_out_time;
      
      if (!clockInTime || !clockOutTime) return;

      // Parse ISO timestamp - Supabase stores in UTC, we convert to local time for display

      // Parse ISO timestamp string - Supabase returns TIMESTAMPTZ in UTC
      // The CRM stores times in a specific timezone, but Supabase converts to UTC
      // We need to parse the full ISO string to get the correct Date object,
      // then extract the LOCAL time components (which represent the CRM's timezone)
      const clockInDateObj = new Date(clockInTime);
      const clockOutDateObj = new Date(clockOutTime);

      // Validate dates - skip if invalid
      if (isNaN(clockInDateObj.getTime()) || isNaN(clockOutDateObj.getTime())) {
        if (__DEV__) {
          console.warn('[Timesheet] Invalid date detected, skipping entry:', timesheet.id);
        }
        return;
      }

      // Extract LOCAL date/time components from the Date object
      // These will be in the device's local timezone, which should match CRM timezone
      const clockInYear = clockInDateObj.getFullYear();
      const clockInMonth = clockInDateObj.getMonth() + 1; // getMonth() returns 0-11
      const clockInDay = clockInDateObj.getDate();
      const clockInHours = clockInDateObj.getHours();
      const clockInMinutes = clockInDateObj.getMinutes();

      const clockOutYear = clockOutDateObj.getFullYear();
      const clockOutMonth = clockOutDateObj.getMonth() + 1;
      const clockOutDay = clockOutDateObj.getDate();
      const clockOutHours = clockOutDateObj.getHours();
      const clockOutMinutes = clockOutDateObj.getMinutes();

      // Validate month range (should be 1-12)
      if (clockInMonth < 1 || clockInMonth > 12) {
        if (__DEV__) {
          console.warn('[Timesheet] Invalid month detected, skipping entry:', timesheet.id, 'month:', clockInMonth);
        }
        return;
      }


      // Create date strings for week calculation (YYYY-MM-DD format)
      const clockInDateStr = `${clockInYear}-${String(clockInMonth).padStart(2, '0')}-${String(clockInDay).padStart(2, '0')}`;
      const clockOutDateStr = `${clockOutYear}-${String(clockOutMonth).padStart(2, '0')}-${String(clockOutDay).padStart(2, '0')}`;

      // Create Date objects for week calculation using local date components
      const clockInDate = new Date(clockInYear, clockInMonth - 1, clockInDay, 0, 0, 0);
      const clockOutDate = new Date(clockOutYear, clockOutMonth - 1, clockOutDay, 0, 0, 0);

      // Calculate week start (Monday) for this entry using the date part only
      // Use the date string directly to avoid any timezone issues
      const weekStart = getWeekStart(clockInDate);
      const weekKey = formatDateForQuery(weekStart);
      
      // Format week range string using the helper function for consistency
      const weekRange = createWeekRangeString(weekStart);
      

      // Format time strings using LOCAL time components (converted from UTC)
      // Format: "HH:MM:SS" -> "H:MM AM/PM"
      const startTime = formatScheduleTime(`${String(clockInHours).padStart(2, '0')}:${String(clockInMinutes).padStart(2, '0')}:00`);
      const endTime = formatScheduleTime(`${String(clockOutHours).padStart(2, '0')}:${String(clockOutMinutes).padStart(2, '0')}:00`);

      // Format date string (MMM DD) using LOCAL date components
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = clockInMonth - 1; // clockInMonth is 1-12, array is 0-indexed
      if (monthIndex < 0 || monthIndex >= monthNames.length) {
        if (__DEV__) {
          console.warn('[Timesheet] Invalid month index, using fallback:', monthIndex);
        }
        return;
      }
      const monthName = monthNames[monthIndex];
      const dateStr = `${monthName} ${clockInDay}`;

      // Extract client/location name from shift_notes
      // Clean up the text: remove "work for", duration text, etc. to show just the name
      let client = timesheet.shift_notes || 'Scheduled Shift';
      
      // Remove common prefixes and patterns
      client = client
        .replace(/work\s+for\s+/gi, '') // Remove "work for"
        .replace(/\d+(\.\d+)?\s*hours?\s*/gi, '') // Remove "3 Hours" or "3.5 Hours"
        .replace(/^\s*-\s*/, '') // Remove leading dash
        .trim();
      
      // If empty after cleaning, use fallback
      if (!client || client.length === 0) {
        client = 'Scheduled Shift';
      }
      
      const avatarColor = '#22B07D'; // Green for admin

      const entry: TimeEntry = {
        id: timesheet.id,
        client,
        startTime,
        endTime,
        date: dateStr,
        avatarColor,
        source: 'admin',
        isAdminAdded: true,
      };

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(entry);
    });

    // Convert map to WeekGroup array and calculate totals
    const weekGroups: WeekGroup[] = Array.from(weekMap.entries())
      .map(([weekKey, entries]) => {
      // Calculate total hours for this week
    let totalMinutes = 0;
      entries.forEach((entry) => {
        // Parse time strings back to minutes
        const startMatch = entry.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        const endMatch = entry.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (startMatch && endMatch) {
          let startHours = parseInt(startMatch[1]);
          const startMinutes = parseInt(startMatch[2]);
          const startPeriod = startMatch[3].toUpperCase();
          
          let endHours = parseInt(endMatch[1]);
          const endMinutes = parseInt(endMatch[2]);
          const endPeriod = endMatch[3].toUpperCase();

          if (startPeriod === 'PM' && startHours !== 12) startHours += 12;
          if (startPeriod === 'AM' && startHours === 12) startHours = 0;
          if (endPeriod === 'PM' && endHours !== 12) endHours += 12;
          if (endPeriod === 'AM' && endHours === 12) endHours = 0;

          const startTotalMinutes = startHours * 60 + startMinutes;
          const endTotalMinutes = endHours * 60 + endMinutes;
          
          let diff = endTotalMinutes - startTotalMinutes;
        if (diff < 0) diff += 24 * 60; // Handle overnight shifts
        totalMinutes += diff;
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
      const totalHours = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      // Get week range string using the helper function for consistency
      const weekKeyParts = weekKey.split('-');
      if (weekKeyParts.length !== 3) {
        if (__DEV__) {
          console.warn('[Timesheet] Invalid weekKey format, skipping:', weekKey);
        }
        return { weekRange: '', totalHours: '00:00', entries: [] };
      }
      const [weekYear, weekMonth, weekDay] = weekKeyParts.map(Number);
      if (isNaN(weekYear) || isNaN(weekMonth) || isNaN(weekDay)) {
        if (__DEV__) {
          console.warn('[Timesheet] Invalid weekKey values, skipping:', weekKey);
        }
        return { weekRange: '', totalHours: '00:00', entries: [] };
      }
      const weekStartDate = new Date(weekYear, weekMonth - 1, weekDay, 0, 0, 0);
      if (isNaN(weekStartDate.getTime())) {
        if (__DEV__) {
          console.warn('[Timesheet] Invalid weekStartDate, skipping:', weekKey);
        }
        return { weekRange: '', totalHours: '00:00', entries: [] };
      }
      const weekRange = createWeekRangeString(weekStartDate);

      return {
        weekRange,
        totalHours,
        entries: entries.sort((a, b) => {
          // Sort entries by date (most recent first)
          return b.date.localeCompare(a.date);
        }),
      };
      })
      .filter((group): group is WeekGroup => group.weekRange !== ''); // Filter out invalid groups

    // Sort by week (most recent first)
    return weekGroups.sort((a, b) => {
      return b.weekRange.localeCompare(a.weekRange);
    });
  }, [displayTimesheets, createWeekRangeString]);

  // Get current week range for header (simplified format: "Dec 08 - Dec 14")
  const getCurrentWeekRange = () => {
    const start = getWeekStart(currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startStr = `${monthNames[start.getMonth()]} ${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${monthNames[end.getMonth()]} ${String(end.getDate()).padStart(2, '0')}`;
    
    return `${startStr} - ${endStr}`;
  };

  // Calculate total hours for current week (format: "3h 0m")
  const currentWeekTotal = useMemo(() => {
    const start = getWeekStart(currentWeekStart);
    const fullWeekRange = createWeekRangeString(start);
    const currentWeek = timesheetData.find(week => week.weekRange === fullWeekRange);
    if (!currentWeek) return '0h 0m';
    
    // Convert "03:00" to "3h 0m" format
    const totalHoursParts = currentWeek.totalHours.split(':');
    if (totalHoursParts.length !== 2) {
      if (__DEV__) {
        console.warn('[Timesheet] Invalid totalHours format:', currentWeek.totalHours);
      }
      return '0h 0m';
    }
    const hours = Number(totalHoursParts[0]);
    const minutes = Number(totalHoursParts[1]);
    if (isNaN(hours) || isNaN(minutes)) {
      if (__DEV__) {
        console.warn('[Timesheet] Invalid totalHours values:', currentWeek.totalHours);
      }
      return '0h 0m';
    }
    return `${hours}h ${minutes}m`;
  }, [timesheetData, currentWeekStart, createWeekRangeString]);

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
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
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
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setDrawerVisible(true)}
          >
            <IconSymbol name="line.3.horizontal" size={24} color="#1F1D2B" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Timesheet
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Week Navigator */}
        <View style={styles.weekNavigator}>
        <TouchableOpacity
            style={styles.navArrow}
            onPress={goToPreviousWeek}
          activeOpacity={0.7}
        >
            <IconSymbol name="chevron.left" size={24} color="#1F1D2B" />
          </TouchableOpacity>
          
          <View style={styles.weekNavigatorCenter}>
            <ThemedText style={styles.weekNavigatorDate}>
                  {getCurrentWeekRange()}
                </ThemedText>
            <ThemedText style={styles.weekNavigatorHours}>
              {currentWeekTotal}
            </ThemedText>
              </View>
          
          <TouchableOpacity
            style={styles.navArrow}
            onPress={goToNextWeek}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.right" size={24} color="#1F1D2B" />
        </TouchableOpacity>
        </View>

        {/* Scrollable List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh}
              tintColor="#5B9BD5"
              colors={['#5B9BD5']}
              progressViewOffset={Platform.OS === 'ios' ? 0 : undefined}
            />
          }
        >
          {/* Initial Loading State */}
          {isLoading && !hasLoadedOnce && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5B9BD5" />
              <ThemedText style={styles.loadingText}>Loading timesheet...</ThemedText>
              </View>
          )}

          {/* Error State */}
          {error && hasLoadedOnce && !isLoading && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State - Only show if no entries exist for current week AND no error AND timesheetData is ready */}
          {!error && hasLoadedOnce && !isLoading && timesheetData.length === 0 && (
            <View style={styles.emptyContainer}>
              <IconSymbol name="clock.fill" size={48} color="#999" />
              <ThemedText style={styles.emptyText}>No timesheet entries found</ThemedText>
              <ThemedText style={styles.emptySubtext}>Admin-added timesheets will appear here</ThemedText>
            </View>
          )}
          
          {/* Empty State for specific week - Only show if timesheetData exists but current week has no entries */}
          {!error && hasLoadedOnce && !isLoading && timesheetData.length > 0 && (() => {
            const start = getWeekStart(currentWeekStart);
            const fullWeekRange = createWeekRangeString(start);
            const currentWeek = timesheetData.find(week => week.weekRange === fullWeekRange);
            const hasEntries = currentWeek && currentWeek.entries.length > 0;
            
            // Only show empty state if we have timesheetData but current week has no entries
            return !hasEntries ? (
              <View style={styles.emptyContainer}>
                <IconSymbol name="clock.fill" size={48} color="#999" />
                <ThemedText style={styles.emptyText}>No timesheet entries found</ThemedText>
                <ThemedText style={styles.emptySubtext}>Admin-added timesheets will appear here</ThemedText>
              </View>
            ) : null;
          })()}

          {/* Timesheet Data - Show only current week entries */}
          {!error && timesheetData.length > 0 && (() => {
            const start = getWeekStart(currentWeekStart);
            const fullWeekRange = createWeekRangeString(start);
            const currentWeek = timesheetData.find(week => week.weekRange === fullWeekRange);
            const entriesToShow = currentWeek?.entries || [];
            
            return entriesToShow.length > 0 ? (
              <View style={styles.weekGroup}>
                {entriesToShow.map((entry) => (
                    <View
                  key={entry.id}
                  style={styles.entryCard}
                    >
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
                          {/* Title Row: Client Name + Badge (flexbox layout) */}
                          <View style={styles.titleRow}>
                            <ThemedText style={styles.clientName} numberOfLines={1}>
                          {entry.client}
                        </ThemedText>
                            {entry.isAdminAdded && (
                              <View style={styles.adminBadge}>
                                <ThemedText style={styles.adminBadgeText}>Admin Added</ThemedText>
                              </View>
                            )}
                          </View>
                          
                          {/* Time Range - Subtitle */}
                        <View style={styles.timeRow}>
                            <IconSymbol name="clock.fill" size={14} color="#666" />
                          <ThemedText style={styles.timeText}>
                            {entry.startTime} - {entry.endTime}
                          </ThemedText>
                        </View>

                          {/* Date */}
                        <View style={styles.dateRow}>
                            <IconSymbol name="calendar" size={14} color="#999" />
                          <ThemedText style={styles.dateText}>
                            {entry.date}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
            </View>
          ))}
              </View>
            ) : null;
          })()}
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

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        workerName={workerName}
        workerEmail={workerEmail}
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
  headerSpacer: {
    width: 40,
  },
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  navArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  weekNavigatorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  weekNavigatorDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
    marginBottom: 4,
  },
  weekNavigatorHours: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22B07D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
    minHeight: '100%', // Ensure content takes full height for proper centering
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
    minHeight: 400,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#5B9BD5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    minHeight: 300,
    width: '100%',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  weekGroup: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1D2B',
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  adminBadge: {
    backgroundColor: '#E6F9F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22B07D',
    flexShrink: 0, // Prevent badge from shrinking
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22B07D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: '#FFFFFF',
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
});
