/**
 * Web-specific implementation of LocationMap
 * Expo automatically uses this file for web builds
 * Native builds will use LocationMap.tsx instead
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address: string;
  height?: number;
}

export function LocationMap({ latitude, longitude, address, height = 200 }: LocationMapProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  return (
    <View style={[styles.mapContainer, { height }]}>
      <TouchableOpacity
        style={styles.webMapPlaceholder}
        onPress={() => Linking.openURL(googleMapsUrl)}
        activeOpacity={0.8}
      >
        <View style={styles.webMapContent}>
          <IconSymbol name="mappin.circle.fill" size={48} color="#5B9BD5" weight="regular" />
          <ThemedText style={styles.webMapText} numberOfLines={2}>
            {address}
          </ThemedText>
          <ThemedText style={styles.webMapSubtext}>
            Tap to open in Google Maps
          </ThemedText>
        </View>
      </TouchableOpacity>
      
      {/* Address overlay */}
      <View style={styles.addressOverlay}>
        <ThemedText style={styles.addressOverlayText} numberOfLines={2}>
          {address}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B0D4E8',
    position: 'relative',
    backgroundColor: '#D0E8F5',
  },
  webMapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapContent: {
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    fontSize: 14,
    color: '#1F1D2B',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
    maxWidth: '90%',
  },
  webMapSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  addressOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addressOverlayText: {
    fontSize: 12,
    color: '#1F1D2B',
    fontWeight: '500',
  },
});

