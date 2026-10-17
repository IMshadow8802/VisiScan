import DocumentScanner from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';

async function cameraFallback(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
  return res.canceled ? null : res.assets[0].uri;
}

/** Scans one card side; returns a file URI, or null if cancelled / permission denied. */
export async function scanSide(): Promise<string | null> {
  try {
    const { scannedImages, status } = await DocumentScanner.scanDocument({
      maxNumDocuments: 1,
      croppedImageQuality: 90,
    });
    if (status !== 'success' || !scannedImages?.length) return null;
    const p = scannedImages[0];
    return p.includes('://') ? p : `file://${p}`;
  } catch {
    // ponytail: any scanner failure (unavailable/unsupported) falls back to the plain camera
    return cameraFallback();
  }
}
