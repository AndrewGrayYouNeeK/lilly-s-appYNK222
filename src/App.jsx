import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageTransition from '@/components/PageTransition';
import { useSystemDarkMode } from '@/lib/useSystemDarkMode';

const RoleRedirect = lazy(() => import('@/pages/RoleRedirect'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const ParentDashboard = lazy(() => import('@/pages/ParentDashboard'));
const ParentChores = lazy(() => import('@/pages/ParentChores'));
const ParentApprovals = lazy(() => import('@/pages/ParentApprovals'));
const ParentQuests = lazy(() => import('@/pages/ParentQuests'));
const ParentShop = lazy(() => import('@/pages/ParentShop'));
const KidHome = lazy(() => import('@/pages/KidHome'));
const ChorePool = lazy(() => import('@/pages/ChorePool'));
const ChoreDo = lazy(() => import('@/pages/ChoreDo'));
const KidWallet = lazy(() => import('@/pages/KidWallet'));
const KidBadges = lazy(() => import('@/pages/KidBadges'));
const KidShop = lazy(() => import('@/pages/KidShop'));
const KidStreak = lazy(() => import('@/pages/KidStreak'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const ParentReports = lazy(() => import('@/pages/ParentReports'));
const FamilyChat = lazy(() => import('@/pages/FamilyChat'));
const KidGoals = lazy(() => import('@/pages/KidGoals'));
const ParentKids = lazy(() => import('@/pages/ParentKids'));
const ParentCoach = lazy(() => import('@/pages/ParentCoach'));
const ParentFunds = lazy(() => import('@/pages/ParentFunds'));
const ParentCashouts = lazy(() => import('@/pages/ParentCashouts'));
const KidCashout = lazy(() => import('@/pages/KidCashout'));
const Settings = lazy(() => import('@/pages/Settings'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />} key={location.pathname}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><RoleRedirect /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route path="/parent" element={<PageTransition><ParentDashboard /></PageTransition>} />
        <Route path="/parent/chores" element={<PageTransition><ParentChores /></PageTransition>} />
        <Route path="/parent/approvals" element={<PageTransition><ParentApprovals /></PageTransition>} />
        <Route path="/parent/quests" element={<PageTransition><ParentQuests /></PageTransition>} />
        <Route path="/parent/shop" element={<PageTransition><ParentShop /></PageTransition>} />
        <Route path="/kid" element={<PageTransition><KidHome /></PageTransition>} />
        <Route path="/kid/pool" element={<PageTransition><ChorePool /></PageTransition>} />
        <Route path="/kid/do/:id" element={<PageTransition><ChoreDo /></PageTransition>} />
        <Route path="/kid/wallet" element={<PageTransition><KidWallet /></PageTransition>} />
        <Route path="/kid/badges" element={<PageTransition><KidBadges /></PageTransition>} />
        <Route path="/kid/shop" element={<PageTransition><KidShop /></PageTransition>} />
        <Route path="/kid/streak" element={<PageTransition><KidStreak /></PageTransition>} />
        <Route path="/kid/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
        <Route path="/parent/reports" element={<PageTransition><ParentReports /></PageTransition>} />
        <Route path="/parent/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
        <Route path="/parent/chat" element={<PageTransition><FamilyChat /></PageTransition>} />
        <Route path="/kid/chat" element={<PageTransition><FamilyChat /></PageTransition>} />
        <Route path="/kid/goals" element={<PageTransition><KidGoals /></PageTransition>} />
        <Route path="/parent/kids" element={<PageTransition><ParentKids /></PageTransition>} />
        <Route path="/parent/coach" element={<PageTransition><ParentCoach /></PageTransition>} />
        <Route path="/parent/funds" element={<PageTransition><ParentFunds /></PageTransition>} />
        <Route path="/parent/cashouts" element={<PageTransition><ParentCashouts /></PageTransition>} />
        <Route path="/kid/cashout" element={<PageTransition><KidCashout /></PageTransition>} />
        <Route path="/parent/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/kid/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  useSystemDarkMode();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return <AnimatedRoutes />;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App