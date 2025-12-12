/**
 * Date and time formatting utilities for displaying schedules
 */

/**
 * Formats a date string (YYYY-MM-DD) to a readable format
 * Example: "2024-01-15" -> "Monday, Jan 15, 2024"
 */
export function formatScheduleDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = dayNames[date.getDay()];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${dayName}, ${month} ${day}, ${year}`;
}

/**
 * Formats a time string (HH:MM:SS) to 12-hour format
 * Example: "09:00:00" -> "9:00 AM", "13:30:00" -> "1:30 PM"
 */
export function formatScheduleTime(timeString: string): string {
  // Handle both HH:MM:SS and HH:MM formats
  const [hours, minutes] = timeString.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return timeString; // Return original if parsing fails
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12, 13 to 1, etc.
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Formats a time range from start and end times
 * Example: "09:00:00" and "17:00:00" -> "9:00 AM - 5:00 PM"
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatScheduleTime(startTime)} - ${formatScheduleTime(endTime)}`;
}

/**
 * Gets the day name abbreviation from a date string
 * Example: "2024-01-15" -> "Mon"
 * Note: Returns day name based on actual day of week (not position in week)
 */
export function getDayName(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayNames[date.getDay()];
}

/**
 * Gets the day name for a week position (0-6 where 0=Monday, 6=Sunday)
 * Use this when displaying days in Monday-first week order
 * Example: getDayNameForWeekPosition(0) -> "Mon"
 */
export function getDayNameForWeekPosition(position: number): string {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return dayNames[position];
}

/**
 * Gets the month abbreviation from a date string
 * Example: "2024-01-15" -> "Jan"
 */
export function getMonthName(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[date.getMonth()];
}

/**
 * Gets the day number from a date string
 * Example: "2024-01-15" -> "15"
 */
export function getDayNumber(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.getDate().toString();
}

/**
 * Formats date to YYYY-MM-DD format (for API queries)
 * Example: new Date() -> "2024-01-15"
 */
export function formatDateForQuery(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Gets the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const sunday = new Date(getWeekStart(date));
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

