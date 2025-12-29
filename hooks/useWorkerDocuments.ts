import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { File as ExpoFile } from 'expo-file-system';

// TypeScript interfaces
export interface WorkerDocument {
  id: string;
  worker_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  document_title: string | null;
  document_description: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResult {
  success: boolean;
  document?: WorkerDocument;
  error?: string;
}

const MAX_DOCUMENTS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

export function useWorkerDocuments() {
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Fetch worker documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const workerId = await AsyncStorage.getItem('@veralink:workerId');
      if (!workerId) {
        throw new Error('Worker ID not found. Please log in again.');
      }

      const { data, error: fetchError } = await supabase
        .from('worker_documents')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
      setDocumentCount(data?.length || 0);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Upload document
  const uploadDocument = async (
    title?: string,
    description?: string
  ): Promise<DocumentUploadResult> => {
    try {
      setUploading(true);

      // Check document count limit
      if (documentCount >= MAX_DOCUMENTS) {
        return {
          success: false,
          error: `You have reached the maximum limit of ${MAX_DOCUMENTS} documents.`,
        };
      }

      // Get worker info
      const workerId = await AsyncStorage.getItem('@veralink:workerId');
      if (!workerId) {
        return { success: false, error: 'Worker ID not found. Please log in again.' };
      }

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, error: 'Document selection cancelled' };
      }

      const file = result.assets[0];

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.mimeType || '')) {
        return {
          success: false,
          error: 'Invalid file type. Only PDF and Word documents are allowed.',
        };
      }

      // Validate file size
      if (file.size && file.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds 10MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
        };
      }

      // Generate unique file path
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `document-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const storagePath = `${workerId}/${uniqueFileName}`;

      console.log('🔄 Starting document upload:', {
        fileName: file.name,
        expectedSize: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
        storagePath,
      });

      // CRITICAL FIX: Read file content properly for React Native/Expo
      // Using expo-file-system to read file as base64, then convert to blob
      // This is more reliable than fetch(file.uri) which can result in 0-byte files
      let blob: Blob;
      let actualFileSize: number;

      if (Platform.OS === 'web') {
        // Web platform: Use fetch API
        const response = await fetch(file.uri);
        blob = await response.blob();
        actualFileSize = blob.size;
      } else {
        // iOS/Android: Use expo-file-system File class for reliable file reading
        try {
          // Create ExpoFile instance from URI
          const expoFile = new ExpoFile(file.uri);
          
          // Read file content as base64
          const base64Content = await expoFile.base64();

          if (!base64Content || base64Content.length === 0) {
            throw new Error('Failed to read file content - file appears to be empty');
          }

          // Convert base64 to binary
          const binaryString = atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Create blob from binary data
          blob = new Blob([bytes], { type: file.mimeType || 'application/octet-stream' });
          actualFileSize = blob.size;

          console.log('✅ File read successfully via ExpoFile:', {
            base64Length: base64Content.length,
            blobSize: blob.size,
            expectedSize: file.size,
          });
        } catch (readError: any) {
          console.error('❌ Error reading file with ExpoFile:', readError);
          
          // Fallback: Try fetch API as backup (may not work reliably on all devices)
          console.log('⚠️ Attempting fallback with fetch API...');
          try {
            const response = await fetch(file.uri);
            blob = await response.blob();
            actualFileSize = blob.size;
            
            console.log('📦 Fallback fetch result:', {
              blobSize: blob.size,
              blobType: blob.type,
            });
          } catch (fetchError: any) {
            console.error('❌ Fallback fetch also failed:', fetchError);
            return {
              success: false,
              error: 'Failed to read file. Please try again or select a different file.',
            };
          }
        }
      }

      // CRITICAL: Validate blob has actual content
      if (actualFileSize === 0) {
        console.error('❌ CRITICAL: Blob size is 0 bytes!', {
          uri: file.uri,
          expectedSize: file.size,
          actualSize: actualFileSize,
        });
        return {
          success: false,
          error: 'Failed to read file content. The file appears to be empty or unreadable.',
        };
      }

      // Warn if size mismatch (but don't fail - some size reporting can be inconsistent)
      if (file.size && Math.abs(actualFileSize - file.size) > 100) {
        console.warn('⚠️ File size mismatch:', {
          expected: file.size,
          actual: actualFileSize,
          difference: Math.abs(actualFileSize - file.size),
        });
      }

      console.log('📤 Uploading to Supabase Storage:', {
        storagePath,
        blobSize: actualFileSize,
        contentType: file.mimeType,
      });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('worker-documents')
        .upload(storagePath, blob, {
          contentType: file.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ Storage upload successful');

      // Create database entry with ACTUAL blob size (not reported size)
      const { data: session } = await supabase.auth.getSession();
      const { data: documentData, error: dbError } = await supabase
        .from('worker_documents')
        .insert({
          worker_id: workerId,
          file_name: file.name,
          file_type: file.mimeType,
          file_size: actualFileSize, // Use actual blob size, not reported size
          storage_path: storagePath,
          document_title: title || file.name,
          document_description: description,
          uploaded_by: session?.session?.user?.id,
        })
        .select()
        .single();

      console.log('📝 Database insert result:', { success: !dbError, documentId: documentData?.id });

      if (dbError) {
        // Rollback: Delete uploaded file if DB insert fails
        await supabase.storage.from('worker-documents').remove([storagePath]);
        throw dbError;
      }

      // Refresh document list
      await fetchDocuments();

      return { success: true, document: documentData };
    } catch (err: any) {
      console.error('Error uploading document:', err);
      return {
        success: false,
        error: err.message || 'Failed to upload document',
      };
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find document
      const document = documents.find((doc) => doc.id === documentId);
      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('worker-documents')
        .remove([document.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('worker_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Refresh document list
      await fetchDocuments();

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting document:', err);
      return {
        success: false,
        error: err.message || 'Failed to delete document',
      };
    }
  };

  // Update document metadata (title/description only)
  const updateDocument = async (
    documentId: string,
    title?: string,
    description?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('worker_documents')
        .update({
          document_title: title,
          document_description: description,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Refresh document list
      await fetchDocuments();

      return { success: true };
    } catch (err: any) {
      console.error('Error updating document:', err);
      return {
        success: false,
        error: err.message || 'Failed to update document',
      };
    }
  };

  // Get document download URL (for viewing)
  const getDocumentUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('worker-documents')
        .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (err: any) {
      console.error('Error getting document URL:', err);
      return null;
    }
  };

  // Download document to local cache and return file URI (for native viewing)
  const downloadDocumentToCache = async (
    storagePath: string,
    fileName: string
  ): Promise<{ success: boolean; fileUri?: string; error?: string }> => {
    try {
      // Only available on native platforms (not web)
      if (Platform.OS === 'web') {
        return {
          success: false,
          error: 'Document download is not supported on web. Use getDocumentUrl instead.',
        };
      }

      // Get signed URL first
      const signedUrl = await getDocumentUrl(storagePath);
      if (!signedUrl) {
        return { success: false, error: 'Failed to generate download URL' };
      }

      // Create cache directory for documents if it doesn't exist
      const cacheDir = `${FileSystem.cacheDirectory ?? ''}worker-documents/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      // Sanitize filename (remove special characters, keep extension)
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileUri = `${cacheDir}${sanitizedFileName}`;

      console.log('📥 Downloading document to cache:', {
        storagePath,
        fileName: sanitizedFileName,
        fileUri,
      });

      // Download file to cache
      const downloadResult = await FileSystem.downloadAsync(signedUrl, fileUri);

      if (downloadResult.status !== 200) {
        console.error('❌ Download failed:', {
          status: downloadResult.status,
          uri: downloadResult.uri,
        });
        return {
          success: false,
          error: `Download failed with status ${downloadResult.status}`,
        };
      }

      // Verify file was downloaded successfully
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File download failed - file not found' };
      }

      // Check file size (should not be 0 bytes)
      if ('size' in fileInfo && fileInfo.size === 0) {
        console.error('⚠️ Downloaded file is empty (0 bytes)');
        return {
          success: false,
          error: 'Downloaded file is empty. The file may be corrupted or was uploaded incorrectly.',
        };
      }

      console.log('✅ Document downloaded successfully:', {
        uri: downloadResult.uri,
        size: 'size' in fileInfo ? fileInfo.size : 'unknown',
      });

      return { success: true, fileUri: downloadResult.uri };
    } catch (err: any) {
      console.error('Error downloading document:', err);
      return {
        success: false,
        error: err.message || 'Failed to download document',
      };
    }
  };

  // Check if can upload more documents
  const canUploadMore = documentCount < MAX_DOCUMENTS;

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    error,
    documentCount,
    uploading,
    canUploadMore,
    maxDocuments: MAX_DOCUMENTS,
    uploadDocument,
    deleteDocument,
    updateDocument,
    getDocumentUrl,
    downloadDocumentToCache,
    refreshDocuments: fetchDocuments,
  };
}
