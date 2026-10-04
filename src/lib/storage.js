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

/**
 * Upload an official gaming branding asset (trophy, ribbon, platform logo)
 * to Firebase Storage under gaming/branding/<filename>.
 *
 * @param {Blob|File} blob - Image data
 * @param {string} filename - e.g. 'trophy-platinum.png'
 * @returns {Promise<string>} - Download URL
 */
export async function uploadGamingBrandAsset(blob, filename) {
  const storageRef = ref(storage, `gaming/branding/${filename}`);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: "image/png",
  });
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Batch sync all local original gaming assets to Firebase Cloud Storage.
 *
 * @param {Function} onProgress - Optional callback(current, total, filename)
 * @returns {Promise<Record<string, string>>} - Map of filename -> cloud URL
 */
export async function syncAllGamingAssetsToStorage(onProgress) {
  const assets = [
    { path: "trophies/trophy-platinum.png", filename: "trophy-platinum.png" },
    { path: "trophies/trophy-gold.png", filename: "trophy-gold.png" },
    { path: "trophies/trophy-silver.png", filename: "trophy-silver.png" },
    { path: "trophies/trophy-bronze.png", filename: "trophy-bronze.png" },
    { path: "ribbons/steam-ribbon.png", filename: "steam-ribbon.png" },
    { path: "platforms/steam-logo.png", filename: "steam-logo.png" },
    { path: "platforms/playstation-logo.png", filename: "playstation-logo.png" },
    { path: "platforms/playstation-logo-white.png", filename: "playstation-logo-white.png" },
    { path: "coc/clash-of-clans-cover.jpg", filename: "clash-of-clans-cover.jpg" },
  ];

  const results = {};
  for (let i = 0; i < assets.length; i++) {
    const { path, filename } = assets[i];
    if (onProgress) onProgress(i + 1, assets.length, filename);
    const res = await fetch(`/icons/gaming/${path}`);
    if (!res.ok) throw new Error(`Could not read /icons/gaming/${path}`);
    const blob = await res.blob();
    const url = await uploadGamingBrandAsset(blob, filename);
    results[filename] = url;
  }
  return results;
}

