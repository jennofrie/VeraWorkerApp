import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ThemedText } from './themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './ui/icon-symbol';
import {
  enhanceShiftNotes,
  validateNotesLength,
  isGeminiConfigured,
  MIN_NOTES_LENGTH,
  MAX_NOTES_LENGTH,
} from '@/lib/utils/gemini';

interface ShiftNotesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export function ShiftNotesModal({ visible, onClose, onSave }: ShiftNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [enhancedNotes, setEnhancedNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<'original' | 'enhanced'>('enhanced');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setNotes('');
      setEnhancedNotes(null);
      setError(null);
      setIsEnhancing(false);
      setShowComparison(false);
      setSelectedVersion('enhanced');
    }
  }, [visible]);

  const handleEnhanceNotes = async () => {
    // Validate notes length
    const validation = validateNotesLength(notes);
    if (!validation.valid) {
      setError(validation.error || 'Invalid notes');
      return;
    }

    setError(null);
    setIsEnhancing(true);

    try {
      const result = await enhanceShiftNotes(notes);

      if (result.success && result.enhancedNotes) {
        setEnhancedNotes(result.enhancedNotes);
        setShowComparison(true);
        setSelectedVersion('enhanced');
      } else {
        setError(result.error || 'Failed to enhance notes');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = () => {
    const notesToSave = showComparison
      ? (selectedVersion === 'enhanced' && enhancedNotes ? enhancedNotes : notes)
      : notes;

    if (!notesToSave || !notesToSave.trim()) {
      setError('Shift Notes is Required!');
      return;
    }
    setError(null);
    onSave(notesToSave);
    setNotes('');
    setEnhancedNotes(null);
    setShowComparison(false);
    onClose();
  };

  const handleCancel = () => {
    setNotes('');
    setEnhancedNotes(null);
    setError(null);
    setShowComparison(false);
    onClose();
  };

  const handleBackToEdit = () => {
    setShowComparison(false);
    setEnhancedNotes(null);
  };

  const canEnhance = notes.trim().length >= MIN_NOTES_LENGTH && !isEnhancing;
  const charCount = notes.trim().length;
  const isOverLimit = charCount > MAX_NOTES_LENGTH;

  // Comparison View
  if (showComparison && enhancedNotes) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleCancel}
          />

          <View style={styles.comparisonContainer}>
            <View style={styles.handle} />

            <View style={styles.comparisonHeader}>
              <TouchableOpacity onPress={handleBackToEdit} style={styles.backButton}>
                <IconSymbol name="chevron.left" size={20} color="#5B9BD5" weight="regular" />
                <ThemedText style={styles.backButtonText}>Edit</ThemedText>
              </TouchableOpacity>
              <ThemedText type="title" style={styles.comparisonTitle}>
                Choose Version
              </ThemedText>
              <View style={styles.headerSpacer} />
            </View>

            <ThemedText style={styles.comparisonSubtitle}>
              Select which version to use for your shift notes
            </ThemedText>

            <ScrollView
              style={styles.comparisonScroll}
              contentContainerStyle={styles.comparisonScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Original Notes Card */}
              <TouchableOpacity
                style={[
                  styles.versionCard,
                  selectedVersion === 'original' && styles.versionCardSelected,
                ]}
                onPress={() => setSelectedVersion('original')}
                activeOpacity={0.7}
              >
                <View style={styles.versionHeader}>
                  <View style={styles.versionTitleRow}>
                    <IconSymbol name="doc.text" size={18} color="#666" weight="regular" />
                    <ThemedText style={styles.versionTitle}>Original Notes</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedVersion === 'original' && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedVersion === 'original' && <View style={styles.radioButtonInner} />}
                  </View>
                </View>
                <ThemedText style={styles.versionText} numberOfLines={8}>
                  {notes}
                </ThemedText>
              </TouchableOpacity>

              {/* Enhanced Notes Card */}
              <TouchableOpacity
                style={[
                  styles.versionCard,
                  styles.enhancedCard,
                  selectedVersion === 'enhanced' && styles.versionCardSelected,
                ]}
                onPress={() => setSelectedVersion('enhanced')}
                activeOpacity={0.7}
              >
                <View style={styles.versionHeader}>
                  <View style={styles.versionTitleRow}>
                    <IconSymbol name="sparkles" size={18} color="#5B9BD5" weight="regular" />
                    <ThemedText style={[styles.versionTitle, styles.enhancedTitle]}>
                      AI Enhanced (Recommended)
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedVersion === 'enhanced' && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedVersion === 'enhanced' && <View style={styles.radioButtonInner} />}
                  </View>
                </View>
                <View style={styles.ndisTag}>
                  <ThemedText style={styles.ndisTagText}>NDIS Compliant</ThemedText>
                </View>
                <ThemedText style={styles.versionText}>{enhancedNotes}</ThemedText>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.comparisonButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSave} style={styles.saveButtonContainer}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButton}
                >
                  <ThemedText style={styles.saveButtonText}>
                    Use {selectedVersion === 'enhanced' ? 'Enhanced' : 'Original'} & Clock Out
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Default Input View
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />

        <View style={styles.modalContainer}>
          <View style={styles.handle} />

          <ThemedText type="title" style={styles.title}>
            Shift Notes
          </ThemedText>

          <ThemedText style={styles.subtitle}>
            Add notes about your shift activities and client observations
          </ThemedText>

          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <TextInput
            style={[styles.input, isOverLimit && styles.inputError]}
            placeholder="Enter shift notes (e.g., Assisted client with morning routine, prepared breakfast, administered medication at 9am...)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              if (error) setError(null);
            }}
            textAlignVertical="top"
            maxLength={MAX_NOTES_LENGTH + 100} // Allow slight overflow for UX
          />

          {/* Character Counter */}
          <View style={styles.charCountContainer}>
            <ThemedText
              style={[
                styles.charCount,
                charCount < MIN_NOTES_LENGTH && styles.charCountWarning,
                isOverLimit && styles.charCountError,
              ]}
            >
              {charCount}/{MAX_NOTES_LENGTH}
              {charCount < MIN_NOTES_LENGTH && ` (min ${MIN_NOTES_LENGTH})`}
            </ThemedText>
          </View>

          {/* AI Enhancement Section */}
          {isGeminiConfigured() && (
            <View style={styles.aiSection}>
              <TouchableOpacity
                style={[styles.aiButton, !canEnhance && styles.aiButtonDisabled]}
                onPress={handleEnhanceNotes}
                disabled={!canEnhance || isOverLimit}
                activeOpacity={0.7}
              >
                {isEnhancing ? (
                  <ActivityIndicator size="small" color="#5B9BD5" />
                ) : (
                  <IconSymbol name="sparkles" size={18} color={canEnhance ? '#5B9BD5' : '#CCC'} weight="regular" />
                )}
                <ThemedText
                  style={[styles.aiButtonText, !canEnhance && styles.aiButtonTextDisabled]}
                >
                  {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.aiHint}>
                AI will format your notes to NDIS standards
              </ThemedText>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveButtonContainer}
              disabled={isOverLimit}
            >
              <LinearGradient
                colors={isOverLimit ? ['#CCC', '#CCC'] : ['#FF6B6B', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                <ThemedText style={styles.saveButtonText}>Save & Clock Out</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#1F1D2B',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    height: 120,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlignVertical: 'top',
    color: '#1F1D2B',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
  charCountWarning: {
    color: '#F5A623',
  },
  charCountError: {
    color: '#FF6B6B',
  },
  aiSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#5B9BD5',
  },
  aiButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5B9BD5',
  },
  aiButtonTextDisabled: {
    color: '#999',
  },
  aiHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonContainer: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButton: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Comparison View Styles
  comparisonContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#5B9BD5',
    fontWeight: '600',
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F1D2B',
  },
  headerSpacer: {
    width: 60,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  comparisonScroll: {
    maxHeight: 400,
  },
  comparisonScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  versionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  enhancedCard: {
    backgroundColor: '#F0F8FF',
  },
  versionCardSelected: {
    borderColor: '#5B9BD5',
    backgroundColor: '#FFFFFF',
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  versionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  enhancedTitle: {
    color: '#5B9BD5',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#5B9BD5',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5B9BD5',
  },
  ndisTag: {
    backgroundColor: '#E6F4FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  ndisTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B9BD5',
    textTransform: 'uppercase',
  },
  versionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  comparisonButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
