import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a profile photo to Firebase Storage
 * @param userId - The user's ID
 * @param file - The file to upload
 * @param photoIndex - The index of the photo (0-5)
 * @returns The download URL of the uploaded photo
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File,
  photoIndex: number
): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${photoIndex}_${timestamp}.${extension}`;
    
    // Create reference to storage location
    const photoRef = ref(storage, `users/${userId}/photos/${filename}`);
    
    // Upload the file
    const snapshot = await uploadBytes(photoRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        photoIndex: photoIndex.toString()
      }
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw new Error('Failed to upload photo. Please try again.');
  }
}

/**
 * Delete a profile photo from Firebase Storage
 * @param photoUrl - The URL of the photo to delete
 */
export async function deleteProfilePhoto(photoUrl: string): Promise<void> {
  try {
    // Extract the path from the URL
    const photoRef = ref(storage, photoUrl);
    await deleteObject(photoRef);
  } catch (error) {
    console.error('Error deleting photo:', error);
    // Don't throw - photo might not exist anymore
  }
}

/**
 * Upload multiple photos and return their URLs
 * @param userId - The user's ID
 * @param files - Array of files to upload
 * @returns Array of download URLs
 */
export async function uploadMultiplePhotos(
  userId: string,
  files: File[]
): Promise<string[]> {
  const uploadPromises = files.map((file, index) =>
    uploadProfilePhoto(userId, file, index)
  );
  
  return Promise.all(uploadPromises);
}

/**
 * Compress an image before uploading
 * @param file - The original file
 * @param maxWidth - Maximum width
 * @param quality - JPEG quality (0-1)
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'));
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Could not load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Could not read file'));
    };
  });
}
