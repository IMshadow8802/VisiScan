import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Contact } from './types';

const MAX_EDGE = 1600;

/** Resize arg that fits the longest edge to MAX_EDGE; null when already small enough (never upscale). */
export function resizeTarget(width: number, height: number): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= MAX_EDGE) return null;
  return width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE };
}

export async function prepareImage(uri: string): Promise<{ uri: string; base64: string }> {
  let ref = await ImageManipulator.manipulate(uri).renderAsync();
  const target = resizeTarget(ref.width, ref.height);
  if (target) ref = await ImageManipulator.manipulate(ref).resize(target).renderAsync();
  const out = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  return { uri: out.uri, base64: out.base64 ?? '' };
}

function copyIn(dir: Directory, src: string, name: string): string {
  const dest = new File(dir, name);
  new File(src).copy(dest, { overwrite: true });
  return dest.uri;
}

export async function persistPhotos(
  id: string,
  front: string,
  back: string | null,
): Promise<{ frontUri: string; backUri: string | null }> {
  const dir = new Directory(Paths.document, 'cards');
  dir.create({ idempotent: true, intermediates: true });
  return {
    frontUri: copyIn(dir, front, `${id}-front.jpg`),
    backUri: back ? copyIn(dir, back, `${id}-back.jpg`) : null,
  };
}

export async function deletePhotos(c: Pick<Contact, 'frontUri' | 'backUri'>): Promise<void> {
  for (const uri of [c.frontUri, c.backUri]) {
    try {
      if (uri) new File(uri).delete();
    } catch {
      // already gone
    }
  }
}
