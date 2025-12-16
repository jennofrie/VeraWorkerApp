import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUTTON_SIZE = 250;
const STORAGE_KEY = '@veralink:currentShiftId';
const WORKER_ID_KEY = '@veralink:workerId';

export default function HomeScreen() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [showWorkerIdModal, setShowWorkerIdModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        // Load worker ID
        try {
          const stored = await AsyncStorage.getItem(WORKER_ID_KEY);
          if (stored) {
            setWorkerId(stored);
          }
        } catch (e) {
          if (__DEV__) {
            console.log('Could not load worker ID:', e);
          }
        }

        // Check for existing shift
        try {
          const shiftId = await AsyncStorage.getItem(STORAGE_KEY);
          if (shiftId) {
            setIsClockedIn(true);
          }
        } catch (e) {
          if (__DEV__) {
            console.log('Could not check shift:', e);
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.error('Init error:', e);
        }
        setError('Initialization error');
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  const handleSaveWorkerId = async (id: string) => {
    try {
      setWorkerId(id);
      await AsyncStorage.setItem(WORKER_ID_KEY, id);
      setShowWorkerIdModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save worker ID');
    }
  };

  const handleClockIn = async () => {
    if (!workerId) {
      setShowWorkerIdModal(true);
      return;
    }

    setIsLoading(true);
    try {
      // For now, just simulate clock in
      const shiftId = `shift-${Date.now()}`;
      await AsyncStorage.setItem(STORAGE_KEY, shiftId);
      setIsClockedIn(true);
      Alert.alert('Success', 'Clocked in successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setIsClockedIn(false);
      Alert.alert('Success', 'Clocked out successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to clock out');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setError(null)}
          >
            <ThemedText style={styles.buttonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Vera Link Shift
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {isClockedIn ? 'You are currently clocked in' : 'Ready to start your shift'}
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.circleButton]}
            onPress={isClockedIn ? handleClockOut : handleClockIn}
            disabled={isLoading}
          >
            {isClockedIn ? (
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <ThemedText style={styles.buttonText}>End Shift</ThemedText>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['#00D4AA', '#00A8CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <ThemedText style={styles.buttonText}>Start Shift</ThemedText>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {!workerId && (
          <TouchableOpacity
            onPress={() => setShowWorkerIdModal(true)}
            style={styles.workerIdButton}
          >
            <ThemedText style={styles.workerIdText}>
              Tap here to set Worker ID
            </ThemedText>
          </TouchableOpacity>
        )}

        {isLoading && (
          <ActivityIndicator size="small" color="#00D4AA" style={styles.loader} />
        )}
      </View>

      {showWorkerIdModal && (
        <WorkerIdInputModal
          visible={showWorkerIdModal}
          onClose={() => setShowWorkerIdModal(false)}
          onSave={handleSaveWorkerId}
        />
      )}
    </ThemedView>
  );
}

function WorkerIdInputModal({ visible, onClose, onSave }: any) {
  const [workerId, setWorkerId] = useState('');

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <ThemedText type="title" style={styles.modalTitle}>
          Set Worker ID
        </ThemedText>
        <TextInput
          style={styles.input}
          value={workerId}
          onChangeText={setWorkerId}
          placeholder="Enter Worker ID"
          placeholderTextColor="#999"
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <ThemedText>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalButtonPrimary]}
            onPress={() => {
              if (workerId.trim()) {
                onSave(workerId.trim());
                setWorkerId('');
              }
            }}
          >
            <ThemedText style={styles.modalButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 60,
    textAlign: 'center',
    opacity: 0.7,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  circleButton: {
    // Additional styles if needed
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  workerIdButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    alignItems: 'center',
  },
  workerIdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.6,
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#00D4AA',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

