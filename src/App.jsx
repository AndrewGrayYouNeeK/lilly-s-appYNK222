import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import RoleRedirect from '@/pages/RoleRedirect';
import Onboarding from '@/pages/Onboarding';
import ParentDashboard from '@/pages/ParentDashboard';
import ParentChores from '@/pages/ParentChores';
import ParentApprovals from '@/pages/ParentApprovals';
import ParentQuests from '@/pages/ParentQuests';
import ParentShop from '@/pages/ParentShop';
import KidHome from '@/pages/KidHome';
import ChorePool from '@/pages/ChorePool';
import ChoreDo from '@/pages/ChoreDo';
import KidWallet from '@/pages/KidWallet';
import KidBadges from '@/pages/KidBadges';
import KidShop from '@/pages/KidShop';
import KidStreak from '@/pages/KidStreak';
import Leaderboard from '@/pages/Leaderboard';
import ParentReports from '@/pages/ParentReports';
import FamilyChat from '@/pages/FamilyChat';
import KidGoals from '@/pages/KidGoals';
import ParentKids from '@/pages/ParentKids';
import ParentCoach from '@/pages/ParentCoach';
import ParentFunds from '@/pages/ParentFunds';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/parent" element={<ParentDashboard />} />
      <Route path="/parent/chores" element={<ParentChores />} />
      <Route path="/parent/approvals" element={<ParentApprovals />} />
      <Route path="/parent/quests" element={<ParentQuests />} />
      <Route path="/parent/shop" element={<ParentShop />} />
      <Route path="/kid" element={<KidHome />} />
      <Route path="/kid/pool" element={<ChorePool />} />
      <Route path="/kid/do/:id" element={<ChoreDo />} />
      <Route path="/kid/wallet" element={<KidWallet />} />
      <Route path="/kid/badges" element={<KidBadges />} />
      <Route path="/kid/shop" element={<KidShop />} />
      <Route path="/kid/streak" element={<KidStreak />} />
      <Route path="/kid/leaderboard" element={<Leaderboard />} />
      <Route path="/parent/reports" element={<ParentReports />} />
      <Route path="/parent/leaderboard" element={<Leaderboard />} />
      <Route path="/parent/chat" element={<FamilyChat />} />
      <Route path="/kid/chat" element={<FamilyChat />} />
      <Route path="/kid/goals" element={<KidGoals />} />
      <Route path="/parent/kids" element={<ParentKids />} />
      <Route path="/parent/coach" element={<ParentCoach />} />
      <Route path="/parent/funds" element={<ParentFunds />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
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