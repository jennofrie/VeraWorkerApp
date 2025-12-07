import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from './themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface ShiftNotesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export function ShiftNotesModal({ visible, onClose, onSave }: ShiftNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(500, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleSave = () => {
    if (!notes || !notes.trim()) {
      setError('Shift Notes is Required!');
      return;
    }
    setError(null);
    onSave(notes);
    setNotes('');
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.blurContainer}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidOverlay]} />
        )}
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <View style={styles.handle} />
          <ThemedText type="title" style={styles.title}>
            Shift Notes
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Add any notes about your shift
          </ThemedText>

          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.input}
                placeholder="Enter shift notes..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={Platform.OS === 'android' ? 8 : 6}
                value={notes}
                onChangeText={(text) => {
                  setNotes(text);
                  setError(null); // Clear error when user types
                }}
                textAlignVertical="top"
                autoFocus={Platform.OS === 'android'}
              />
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setNotes('');
                onClose();
              }}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveButtonContainer}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                <ThemedText style={styles.saveButtonText}>Save & Clock Out</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  androidOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 40,
    maxHeight: Platform.OS === 'android' ? '90%' : '80%',
    minHeight: Platform.OS === 'android' ? 400 : undefined,
  },
  keyboardView: {
    flex: 1,
    maxHeight: Platform.OS === 'android' ? Dimensions.get('window').height * 0.4 : undefined,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: Platform.OS === 'android' ? 200 : 120,
    maxHeight: Platform.OS === 'android' ? 300 : 200,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonContainer: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

