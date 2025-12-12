/**
 * Native implementation of LocationMap (iOS/Android)
 * Web builds will automatically use LocationMap.web.tsx instead
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { ThemedText } from './themed-text';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address: string;
  height?: number;
}

export function LocationMap({ latitude, longitude, address, height = 200 }: LocationMapProps) {
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

