import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from './themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface WorkerIdModalProps {
  visible: boolean;
  onSave: (workerId: string) => void;
}

export function WorkerIdModal({ visible, onSave }: WorkerIdModalProps) {
  const [workerId, setWorkerId] = useState('');
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(500, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 }, () => {
        // Reset after animation completes
        runOnJS(() => setWorkerId(''))();
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleSave = () => {
    if (workerId.trim()) {
      onSave(workerId.trim());
      setWorkerId('');
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {}}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {}} // Prevent closing on background tap - require explicit save
        style={styles.blurContainer}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.handle} />
            <ThemedText type="title" style={styles.title}>
              Set Worker ID
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your worker ID to continue
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter Worker ID"
              placeholderTextColor="#999"
              value={workerId}
              onChangeText={setWorkerId}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity onPress={handleSave} style={styles.saveButtonContainer}>
              <LinearGradient
                colors={['#00D4AA', '#00A8CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  keyboardView: {
    flex: 1,
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
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButtonContainer: {
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

