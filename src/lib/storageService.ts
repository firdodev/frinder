import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a profile photo to Firebase Storage
 * @param userId - The user's ID
 * @param file - The file to upload
 * @param photoIndex - The index of the photo (0-5)
 * @returns The download URL of the uploaded photo
 */
export async function uploadProfilePhoto(userId: string, file: File, photoIndex: number): Promise<string> {
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
export async function uploadMultiplePhotos(userId: string, files: File[]): Promise<string[]> {
  const uploadPromises = files.map((file, index) => uploadProfilePhoto(userId, file, index));

  return Promise.all(uploadPromises);
}

/**
 * Compress an image before uploading
 * @param file - The original file
 * @param maxWidth - Maximum width
 * @param quality - JPEG quality (0-1)
 * @returns Compressed file
 */
export async function compressImage(file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = e => {
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
          blob => {
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

/**
 * Upload a message image to Firebase Storage
 * @param matchId - The match/conversation ID
 * @param senderId - The sender's user ID
 * @param file - The file to upload
 * @returns The download URL of the uploaded image
 */
export async function uploadMessageImage(matchId: string, senderId: string, file: File): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${senderId}.${extension}`;

    // Create reference to storage location
    const imageRef = ref(storage, `messages/${matchId}/${filename}`);

    // Upload the file
    const snapshot = await uploadBytes(imageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        senderId
      }
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading message image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Upload a group profile photo to Firebase Storage
 * @param groupId - The group's ID
 * @param file - The file to upload
 * @returns The download URL of the uploaded photo
 */
export async function uploadGroupPhoto(groupId: string, file: File): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `photo_${timestamp}.${extension}`;

    // Create reference to storage location
    const photoRef = ref(storage, `groups/${groupId}/${filename}`);

    // Upload the file
    const snapshot = await uploadBytes(photoRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString()
      }
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading group photo:', error);
    throw new Error('Failed to upload group photo. Please try again.');
  }
}

/**
 * Upload a story photo to Firebase Storage
 * @param userId - The user's ID
 * @param file - The file to upload
 * @returns The download URL of the uploaded photo
 */
export async function uploadStoryPhoto(userId: string, file: File): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `story_${timestamp}.${extension}`;

    // Create reference to storage location
    const photoRef = ref(storage, `users/${userId}/stories/${filename}`);

    // Upload the file
    const snapshot = await uploadBytes(photoRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString()
      }
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading story photo:', error);
    throw new Error('Failed to upload story. Please try again.');
  }
}
