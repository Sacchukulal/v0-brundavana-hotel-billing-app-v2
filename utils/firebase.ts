import { initializeApp, getApp, getApps } from "firebase/app"
import { getFirestore, collection, doc, setDoc } from "firebase/firestore"
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyC7mw5zjmMa89vDMoV2JwXfLKw2TyI25RQ",
  authDomain: "taskey-db17e.firebaseapp.com",
  projectId: "taskey-db17e",
  storageBucket: "taskey-db17e.firebasestorage.app",
  messagingSenderId: "1002401342100",
  appId: "1:1002401342100:web:e29c3700879c361e550a81",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app)
const auth = getAuth(app)

// Initialize collections with proper security rules
const menuItemsCollection = collection(db, "menuItems")
const ordersCollection = collection(db, "orders")

export { db, auth, menuItemsCollection, ordersCollection }

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    // Create initial menu items collection for the user
    const userMenuRef = doc(db, "menuItems", userCredential.user.uid)
    await setDoc(userMenuRef, { initialized: true })
    return userCredential
  } catch (error) {
    console.error("Error in signUp:", error)
    throw error
  }
}

export const signIn = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const logOut = () => {
  return signOut(auth)
}
