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
import { auth } from '../firebase'
import { AuthContext } from './AuthContext'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    if (!auth) throw new Error('Firebase not initialized')
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not initialized')
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const signOut = async () => {
    if (!auth) throw new Error('Firebase not initialized')
    await firebaseSignOut(auth)
  }

  const signInWithGoogle = async () => {
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
      {!loading && children}
    </AuthContext.Provider>
  )
}