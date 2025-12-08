import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address: string;
  height?: number;
}

// Conditionally import react-native-maps only on native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  try {
    const mapsModule = require('react-native-maps');
    MapView = mapsModule.default;
    Marker = mapsModule.Marker;
    PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE;
    PROVIDER_DEFAULT = mapsModule.PROVIDER_DEFAULT;
  } catch (error) {
    console.warn('react-native-maps not available:', error);
  }
}

export function LocationMap({ latitude, longitude, address, height = 200 }: LocationMapProps) {
  // Web fallback - show a clickable map link
  if (Platform.OS === 'web') {
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

  // Native platforms - use react-native-maps
  if (!MapView || !Marker) {
    // Fallback if maps module failed to load
    return (
      <View style={[styles.mapContainer, { height }]}>
        <View style={styles.mapFallback}>
          <IconSymbol name="mappin.circle.fill" size={48} color="#5B9BD5" weight="regular" />
          <ThemedText style={styles.mapFallbackText} numberOfLines={2}>
            {address}
          </ThemedText>
        </View>
        <View style={styles.addressOverlay}>
          <ThemedText style={styles.addressOverlayText} numberOfLines={2}>
            {address}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Use default provider (OpenStreetMap) if Google Maps not configured
  // For better quality, configure Google Maps API key in app.json
  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <View style={[styles.mapContainer, { height }]}>
      <MapView
        style={styles.map}
        provider={mapProvider}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker
          coordinate={{
            latitude,
            longitude,
          }}
          title={address}
          pinColor="#1E3A8A"
        />
      </MapView>
      
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
  map: {
    width: '100%',
    height: '100%',
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
  mapFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapFallbackText: {
    fontSize: 14,
    color: '#1F1D2B',
    fontWeight: '500',
    marginTop: 12,
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

