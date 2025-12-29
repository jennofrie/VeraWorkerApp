import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Drawer } from '@/components/Drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import { useWorkerDocuments } from '@/hooks/useWorkerDocuments';

export default function MyDocumentsScreen() {
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(false);

  // Logout handler - runs outside Modal context for proper navigation
  const handleLogout = () => {
    setDrawerVisible(false);
    router.replace('/');
  };

  const {
    documents,
    loading,
    error,
    documentCount,
    uploading,
    canUploadMore,
    maxDocuments,
    uploadDocument,
    getDocumentUrl,
    downloadDocumentToCache,
    refreshDocuments,
  } = useWorkerDocuments();

  React.useEffect(() => {
    const loadWorkerInfo = async () => {
      try {
        const storedName = await AsyncStorage.getItem('@veralink:workerName');
        const storedEmail = await AsyncStorage.getItem('@veralink:workerEmail');
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

  // Handle document upload
  const handleAddDocument = async () => {
    if (!canUploadMore) {
      Alert.alert(
        'Limit Reached',
        `You have reached the maximum limit of ${maxDocuments} documents. Please delete a document to upload a new one.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await uploadDocument();
    if (result.success) {
      Alert.alert('Success', 'Document uploaded successfully!');
    } else {
      Alert.alert('Upload Failed', result.error || 'Could not upload document');
    }
  };

  // Handle document view - platform-specific implementation
  const handleViewDocument = async (storagePath: string, fileName: string) => {
    if (viewingDocument) return; // Prevent double-tap

    try {
      setViewingDocument(true);

      if (Platform.OS === 'web') {
        // Web: Use WebBrowser (works fine on web)
        const url = await getDocumentUrl(storagePath);
        if (url) {
          await WebBrowser.openBrowserAsync(url, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            controlsColor: '#5B9BD5',
            toolbarColor: '#E6F4FE',
          });
        } else {
          Alert.alert('Error', 'Could not generate document URL');
        }
      } else {
        // iOS/Android: Download to cache and open with native viewer
        console.log('📱 Opening document with native viewer:', fileName);

        const downloadResult = await downloadDocumentToCache(storagePath, fileName);

        if (!downloadResult.success) {
          console.error('❌ Download failed:', downloadResult.error);

          // Special handling for empty file error
          if (downloadResult.error?.includes('empty')) {
            Alert.alert(
              'Empty Document',
              'This document appears to be empty (0 bytes). It may have been uploaded with an older version of the app.\n\nPlease delete and re-upload this document.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Download Failed', downloadResult.error || 'Could not download document');
          }
          return;
        }

        // Check if sharing is available (should be on iOS/Android)
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(
            'Not Supported',
            'Document viewing is not available on this device. Please try on a different device.'
          );
          return;
        }

        // Open document with native viewer (iOS QuickLook, Android default viewer)
        // UTI parameter tells iOS to use QuickLook preview instead of share sheet
        console.log('📄 Opening native viewer for:', downloadResult.fileUri);

        // Type guard to ensure fileUri exists
        if (!downloadResult.fileUri) {
          Alert.alert('Error', 'Failed to get file location');
          return;
        }

        await Sharing.shareAsync(downloadResult.fileUri, {
          mimeType: fileName.endsWith('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          UTI: fileName.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.openxmlformats.wordprocessingml.document',
          dialogTitle: 'View Document',
        });

        console.log('✅ Document viewer opened successfully');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);

      // User-friendly error messages
      let errorMessage = 'Failed to open document. Please try again.';
      if (err?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err?.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please check app permissions in Settings.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setViewingDocument(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDocuments();
    setRefreshing(false);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
            <IconSymbol name="line.3.horizontal" size={24} color="#1F1D2B" weight="regular" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            My Documents
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Document Counter */}
        <View style={styles.counterSection}>
          <ThemedText style={styles.counterText}>
            {documentCount} of {maxDocuments} documents uploaded
          </ThemedText>
          {!canUploadMore && (
            <ThemedText style={styles.warningText}>
              Maximum limit reached
            </ThemedText>
          )}
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBanner}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#E53935" weight="regular" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {/* Documents List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5B9BD5" />
            <ThemedText style={styles.loadingText}>Loading documents...</ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#5B9BD5"
              />
            }
          >
            {documents.length > 0 ? (
              <View style={styles.documentsList}>
                {documents.map((doc) => (
                  <View key={doc.id} style={styles.documentCard}>
                    <IconSymbol
                      name={doc.file_type.includes('pdf') ? 'doc.text.fill' : 'doc.fill'}
                      size={32}
                      color={doc.file_type.includes('pdf') ? '#E53935' : '#2196F3'}
                      weight="regular"
                    />
                    <View style={styles.documentInfo}>
                      <ThemedText style={styles.documentName} numberOfLines={1}>
                        {doc.document_title || doc.file_name}
                      </ThemedText>
                      <ThemedText style={styles.documentMeta}>
                        {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                      </ThemedText>
                      {doc.document_description && (
                        <ThemedText style={styles.documentDescription} numberOfLines={2}>
                          {doc.document_description}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.documentActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, viewingDocument && styles.actionButtonDisabled]}
                        onPress={() => handleViewDocument(doc.storage_path, doc.file_name)}
                        disabled={viewingDocument}
                      >
                        {viewingDocument ? (
                          <ActivityIndicator size="small" color="#2196F3" />
                        ) : (
                          <IconSymbol name="eye.fill" size={20} color="#2196F3" weight="regular" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="doc.text" size={80} color="#BDBDBD" weight="regular" />
                <ThemedText style={styles.emptyTitle}>No Documents Yet</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Upload your first document by tapping the button below
                </ThemedText>
              </View>
            )}
          </ScrollView>
        )}

        {/* Add New Document Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            (!canUploadMore || uploading) && styles.addButtonDisabled,
          ]}
          onPress={handleAddDocument}
          disabled={!canUploadMore || uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#1F1D2B" size="small" style={{ marginRight: 8 }} />
              <ThemedText style={styles.addButtonText}>Uploading...</ThemedText>
            </>
          ) : (
            <ThemedText style={[
              styles.addButtonText,
              !canUploadMore && styles.addButtonTextDisabled,
            ]}>
              {canUploadMore ? 'Add New Document' : 'Limit Reached'}
            </ThemedText>
          )}
        </TouchableOpacity>

        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onLogout={handleLogout}
          workerName={workerName}
          workerEmail={workerEmail}
        />
      </View>
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
    marginBottom: 8,
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
  counterSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  counterText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '600',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#E53935',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  documentsList: {
    paddingHorizontal: 20,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  documentActions: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#424242',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  addButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#5B9BD5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButtonTextDisabled: {
    color: '#757575',
  },
});
