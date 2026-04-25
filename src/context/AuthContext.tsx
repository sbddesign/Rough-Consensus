import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, checkIsAdmin } from "../services/supabase";
import { OAuthProvider, SessionUser, User } from "../types";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (provider?: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signIn: async (_provider = "github") => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUserWithAdminCheck = async (sessionUser: SessionUser) => {
    const isAdmin = await checkIsAdmin(sessionUser.id);
    const displayName =
      sessionUser.user_metadata.full_name ||
      sessionUser.user_metadata.name ||
      sessionUser.email ||
      "Anonymous";

    setCurrentUser({
      id: sessionUser.id,
      displayName,
      isAdmin,
    });
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserWithAdminCheck(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserWithAdminCheck(session.user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (provider: OAuthProvider = "github") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Failed to sign in:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Failed to sign out:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
