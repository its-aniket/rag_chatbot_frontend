// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Lazy initialization variables
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let initializationAttempted = false;

// Initialize Firebase function
const initializeFirebase = (): { app: FirebaseApp | null; auth: Auth | null } => {
  if (initializationAttempted) {
    return { app, auth };
  }
  
  initializationAttempted = true;
  
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return { app: null, auth: null };
  }
  
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Validate required config
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.warn('Firebase configuration incomplete:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasAuthDomain: !!firebaseConfig.authDomain,
      hasProjectId: !!firebaseConfig.projectId,
    });
    return { app: null, auth: null };
  }

  try {
    // Initialize Firebase
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    app = null;
    auth = null;
  }
  
  return { app, auth };
};

// Export getter functions instead of direct exports
export const getFirebaseApp = (): FirebaseApp | null => {
  const { app } = initializeFirebase();
  return app;
};

export const getFirebaseAuth = (): Auth | null => {
  const { auth } = initializeFirebase();
  return auth;
};

// For backward compatibility
export { getFirebaseAuth as auth };
export default getFirebaseApp();