'use client';

import React, { useState, useEffect } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { getFirebaseAuth } from '../firebase'
import { AuthContext } from './AuthContext'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase not initialized')
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase not initialized')
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const signOut = async () => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase not initialized')
    await firebaseSignOut(auth)
  }

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase not initialized')
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const getToken = async (): Promise<string | null> => {
    if (user) {
      try {
        return await user.getIdToken()
      } catch (error) {
        console.error('Error getting token:', error)
        return null
      }
    }
    return null
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    getToken
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid #334155',
              borderTopColor: '#3b82f6', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
            <p style={{ fontSize: 14 }}>Loading...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}