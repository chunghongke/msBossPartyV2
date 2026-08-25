export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface GroupConfig {
  id: string;
  name: string;
  firebaseConfig: FirebaseConfig;
  joinedAt?: number;
}
