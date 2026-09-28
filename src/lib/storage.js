import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import app from "./firebase";

export const storage = getStorage(app);

/**
 * Upload an image file to Firebase Storage.
 *
 * @param {File}     file       - The File object to upload
 * @param {string}   folder     - Storage folder: 'bucketList' | 'gaming' | 'creditCards' | 'uploads'
 * @param {Function} onProgress - Optional callback(percent: number)
 * @returns {Promise<string>}   - Resolves with the public download URL
 */
export async function uploadImage(file, folder = "uploads", onProgress) {
  const ext = file.name.split(".").pop();
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, `${folder}/${uniqueName}`);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(pct);
        }
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Delete an image from Firebase Storage by its full download URL.
 * Silently ignores errors (e.g., file already deleted).
 *
 * @param {string} url - The full Firebase Storage download URL
 */
export async function deleteImage(url) {
  if (!url || !url.includes("firebasestorage")) return;
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (_) {
    // Ignore — file may already be deleted or URL may be external
  }
}
