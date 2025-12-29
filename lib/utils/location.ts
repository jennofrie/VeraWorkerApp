/**
 * Location Permission & Capture Utilities
 *
 * This module provides robust location handling for the Vera Worker App.
 * It handles:
 * - Permission requests with user feedback
 * - Permanent denial detection (guides user to Settings)
 * - Location capture with validation
 * - Error handling with user-friendly messages
 */

import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

export interface LocationResult {
  success: boolean;
  coords?: {
    latitude: number;
    longitude: number;
  };
  error?: string;
  permissionDenied?: boolean;
  requiresSettings?: boolean;
}

/**
 * Check if location services are available and enabled
 */
export async function checkLocationServices(): Promise<{
  available: boolean;
  enabled: boolean;
  error?: string;
}> {
  // Web platform doesn't support location
  if (Platform.OS === 'web') {
    return {
      available: false,
      enabled: false,
      error: 'Location services are not available on web platform',
    };
  }

  // Check if Location module is available
  if (!Location || typeof Location.hasServicesEnabledAsync !== 'function') {
    return {
      available: false,
      enabled: false,
      error: 'Location module is not available on this device',
    };
  }

  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return {
      available: true,
      enabled,
      error: enabled ? undefined : 'Location services are disabled on this device',
    };
  } catch (err: any) {
    return {
      available: true,
      enabled: false,
      error: err.message || 'Failed to check location services',
    };
  }
}

/**
 * Request location permission with comprehensive handling
 *
 * This function:
 * 1. Checks current permission status
 * 2. Requests permission if not granted
 * 3. Detects permanent denial and guides user to Settings
 * 4. Returns detailed status for UI handling
 */
export async function requestLocationPermission(): Promise<{
  granted: boolean;
  status: Location.PermissionStatus;
  canAskAgain: boolean;
}> {
  if (Platform.OS === 'web') {
    return {
      granted: false,
      status: Location.PermissionStatus.DENIED,
      canAskAgain: false,
    };
  }

  try {
    // First, check current permission status
    const currentPermission = await Location.getForegroundPermissionsAsync();

    if (__DEV__) {
      console.log('📍 Current location permission:', {
        status: currentPermission.status,
        canAskAgain: currentPermission.canAskAgain,
        granted: currentPermission.granted,
      });
    }

    // Already granted
    if (currentPermission.status === Location.PermissionStatus.GRANTED) {
      return {
        granted: true,
        status: currentPermission.status,
        canAskAgain: currentPermission.canAskAgain ?? true,
      };
    }

    // If permanently denied (can't ask again), return early
    // canAskAgain is false when user has denied permission AND selected "Don't ask again"
    // OR on iOS after first denial (iOS doesn't show prompt again)
    if (currentPermission.canAskAgain === false) {
      if (__DEV__) {
        console.log('⚠️ Location permission permanently denied, cannot ask again');
      }
      return {
        granted: false,
        status: currentPermission.status,
        canAskAgain: false,
      };
    }

    // Request permission
    if (__DEV__) {
      console.log('📍 Requesting location permission...');
    }

    const permissionResponse = await Location.requestForegroundPermissionsAsync();

    if (__DEV__) {
      console.log('📍 Permission response:', {
        status: permissionResponse.status,
        canAskAgain: permissionResponse.canAskAgain,
        granted: permissionResponse.granted,
      });
    }

    return {
      granted: permissionResponse.status === Location.PermissionStatus.GRANTED,
      status: permissionResponse.status,
      canAskAgain: permissionResponse.canAskAgain ?? false,
    };
  } catch (err: any) {
    if (__DEV__) {
      console.error('❌ Error requesting location permission:', err);
    }
    return {
      granted: false,
      status: Location.PermissionStatus.DENIED,
      canAskAgain: false,
    };
  }
}

/**
 * Show alert prompting user to enable location in Settings
 */
export function showLocationSettingsAlert(): void {
  Alert.alert(
    'Location Permission Required',
    'Location access is required to record your clock-in and clock-out locations for shift tracking.\n\nPlease enable location access in your device Settings.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => {
          // Open app settings on iOS
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            // Open app settings on Android
            Linking.openSettings();
          }
        },
      },
    ],
    { cancelable: true }
  );
}

/**
 * Show alert when location services are disabled
 */
export function showLocationServicesDisabledAlert(): void {
  Alert.alert(
    'Location Services Disabled',
    'Please enable Location Services in your device settings to record clock-in/out locations.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('App-Prefs:Privacy&path=LOCATION');
          } else {
            Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
          }
        },
      },
    ],
    { cancelable: true }
  );
}

/**
 * Get current location with comprehensive error handling
 *
 * This is the main function to use for clock-in/out location capture.
 * It handles all permission checks, requests, and error scenarios.
 *
 * @param options Configuration options
 * @returns LocationResult with success status and coordinates or error
 */
export async function getCurrentLocationWithPermission(options?: {
  timeout?: number;
  accuracy?: Location.Accuracy;
  showAlerts?: boolean;
}): Promise<LocationResult> {
  const {
    timeout = 10000,
    accuracy = Location.Accuracy.Balanced,
    showAlerts = true,
  } = options || {};

  // Check platform
  if (Platform.OS === 'web') {
    return {
      success: false,
      error: 'Location not available on web',
    };
  }

  // Step 1: Check if location services are available and enabled
  const servicesCheck = await checkLocationServices();

  if (!servicesCheck.available) {
    return {
      success: false,
      error: servicesCheck.error || 'Location services not available',
    };
  }

  if (!servicesCheck.enabled) {
    if (showAlerts) {
      showLocationServicesDisabledAlert();
    }
    return {
      success: false,
      error: 'Location services are disabled',
    };
  }

  // Step 2: Request permission
  const permission = await requestLocationPermission();

  if (!permission.granted) {
    // Permission denied
    if (!permission.canAskAgain) {
      // Permanently denied - guide to Settings
      if (showAlerts) {
        showLocationSettingsAlert();
      }
      return {
        success: false,
        error: 'Location permission permanently denied',
        permissionDenied: true,
        requiresSettings: true,
      };
    } else {
      // User denied this time
      if (showAlerts) {
        Alert.alert(
          'Location Permission Denied',
          'Location access is required to record your clock-in/out location. Please allow location access to continue.',
          [{ text: 'OK' }]
        );
      }
      return {
        success: false,
        error: 'Location permission denied',
        permissionDenied: true,
        requiresSettings: false,
      };
    }
  }

  // Step 3: Get current location
  try {
    if (__DEV__) {
      console.log('📍 Getting current location...');
    }

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy,
      timeInterval: 5000,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Location request timed out')), timeout)
    );

    const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;

    if (!location?.coords) {
      return {
        success: false,
        error: 'Invalid location data received',
      };
    }

    const { latitude, longitude } = location.coords;

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return {
        success: false,
        error: 'Invalid coordinates received',
      };
    }

    if (__DEV__) {
      console.log('✅ Location captured:', { latitude, longitude });
    }

    return {
      success: true,
      coords: {
        latitude,
        longitude,
      },
    };
  } catch (err: any) {
    if (__DEV__) {
      console.error('❌ Error getting location:', err);
    }

    let errorMessage = 'Failed to get location';
    if (err.message === 'Location request timed out') {
      errorMessage = 'Location request timed out. Please try again.';
    } else if (err.message?.includes('Location services')) {
      errorMessage = 'Location services unavailable';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Pre-check location permission before showing clock-in button
 *
 * Use this to check permission status without requesting it.
 * Useful for showing permission status indicators in UI.
 */
export async function getLocationPermissionStatus(): Promise<{
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  servicesEnabled: boolean;
}> {
  if (Platform.OS === 'web') {
    return {
      status: 'denied',
      canAskAgain: false,
      servicesEnabled: false,
    };
  }

  try {
    const services = await checkLocationServices();
    const permission = await Location.getForegroundPermissionsAsync();

    let status: 'granted' | 'denied' | 'undetermined' = 'undetermined';

    if (permission.status === Location.PermissionStatus.GRANTED) {
      status = 'granted';
    } else if (permission.status === Location.PermissionStatus.DENIED) {
      status = 'denied';
    }

    return {
      status,
      canAskAgain: permission.canAskAgain ?? true,
      servicesEnabled: services.enabled,
    };
  } catch (err) {
    return {
      status: 'denied',
      canAskAgain: false,
      servicesEnabled: false,
    };
  }
}
