import { initializeApp } from 'firebase/app';
import {
  addDoc, collection, connectFirestoreEmulator, deleteDoc, getFirestore,
  onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';

export function openBoard(boardKey) {
  const config = {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  if (!config.projectId || !config.apiKey || !config.appId) return null;

  const db = getFirestore(initializeApp(config));
  if (import.meta.env.DEV && import.meta.env.VITE_FIRESTORE_EMULATOR === 'true') {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  const trailers = collection(db, 'boards', boardKey, 'trailers');

  return {
    subscribe(onChange, onError) {
      return onSnapshot(query(trailers, orderBy('createdAt', 'desc')),
        { includeMetadataChanges: true }, onChange, onError);
    },
    add(videoId, column) {
      return addDoc(trailers, { videoId, column, watched: false, createdAt: serverTimestamp() });
    },
    setWatched(ref, watched) {
      return updateDoc(ref, { watched });
    },
    remove(ref) {
      return deleteDoc(ref);
    },
  };
}
