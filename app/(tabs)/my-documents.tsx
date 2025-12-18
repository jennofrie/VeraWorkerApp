import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Drawer } from '@/components/Drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
}

export default function MyDocumentsScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const documentTypes = ['All', 'ID', 'Certificate', 'License', 'Other'];

  const filteredDocuments = selectedFilter === 'All' 
    ? documents 
    : documents.filter(doc => doc.type === selectedFilter);

  const handleAddDocument = () => {
    Alert.alert(
      'Upload Document',
      'Document uploads are managed through your organisation. Please contact your supervisor to upload documents.',
      [{ text: 'OK' }]
    );
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
            My Document
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Document Type Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={styles.filterLabel}>Document type</ThemedText>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={styles.filterDropdown}
                onPress={() => {
                  // Show filter options - simplified for now
                  Alert.alert('Filter', 'Select document type', [
                    ...documentTypes.map(type => ({
                      text: type,
                      onPress: () => setSelectedFilter(type),
                    })),
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <ThemedText style={styles.filterText}>{selectedFilter}</ThemedText>
                <IconSymbol name="chevron.down" size={16} color="#666" weight="regular" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Documents List */}
          {filteredDocuments.length > 0 ? (
            <View style={styles.documentsList}>
              {filteredDocuments.map((doc) => (
                <View key={doc.id} style={styles.documentCard}>
                  <IconSymbol name="doc.fill" size={24} color="#5B9BD5" weight="regular" />
                  <View style={styles.documentInfo}>
                    <ThemedText style={styles.documentName}>{doc.name}</ThemedText>
                    <ThemedText style={styles.documentDate}>{doc.uploadDate}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No documents found</ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Add New Document Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddDocument}
        >
          <ThemedText style={styles.addButtonText}>Add New Document</ThemedText>
        </TouchableOpacity>

        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  filterText: {
    fontSize: 16,
    color: '#1F1D2B',
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
  documentDate: {
    fontSize: 14,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
  },
});
