import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { State } from '../../../packages/ui';
import { AppLayout, PublicLayout } from './components/Layout';
import { useSession } from './lib/hooks';
import { InformationPage, NotFound } from './features/public/Pages';
const Landing = lazy(() => import('./features/public/Landing'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Auth = lazy(() => import('./features/auth/Auth'));
const MapPage = lazy(() =>
  import('./features/mobility/Mobility').then((m) => ({ default: m.MapPage })),
);
const Bikes = lazy(() =>
  import('./features/mobility/Mobility').then((m) => ({ default: m.BikesPage })),
);
const ActiveRide = lazy(() =>
  import('./features/mobility/Mobility').then((m) => ({ default: m.ActiveRidePage })),
);
const Rentals = lazy(() =>
  import('./features/mobility/Mobility').then((m) => ({ default: m.RentalsPage })),
);
const Missions = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.MissionsPage })),
);
const Leaderboard = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.LeaderboardPage })),
);
const Territories = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.TerritoriesPage })),
);
const Teams = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.TeamsPage })),
);
const Battles = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.BattlesPage })),
);
const Friends = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.FriendsPage })),
);
const PublicProfile = lazy(() => import('./features/community/PublicProfile'));
const Sponsors = lazy(() => import('./features/business/Sponsors'));
const Passport = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.PassportPage })),
);
const Rewards = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.RewardsPage })),
);
const Seasons = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.SeasonsPage })),
);
const RoutesPage = lazy(() =>
  import('./features/community/Community').then((m) => ({ default: m.RoutesPage })),
);
const Fitness = lazy(() =>
  import('./features/account/Account').then((m) => ({ default: m.FitnessPage })),
);
const Goals = lazy(() =>
  import('./features/account/Account').then((m) => ({ default: m.GoalsPage })),
);
const Wallet = lazy(() =>
  import('./features/account/Account').then((m) => ({ default: m.WalletPage })),
);
const Settings = lazy(() =>
  import('./features/account/Account').then((m) => ({ default: m.SettingsPage })),
);
const Notifications = lazy(() =>
  import('./features/account/Account').then((m) => ({ default: m.NotificationsPage })),
);
const Profile = lazy(() =>
  import('./features/account/Account').then((m) => ({ default: m.ProfilePage })),
);
const AdminOverview = lazy(() =>
  import('./features/admin/Admin').then((m) => ({ default: m.AdminOverview })),
);
const AdminFleet = lazy(() =>
  import('./features/admin/Admin').then((m) => ({ default: m.AdminFleet })),
);
const AdminStations = lazy(() =>
  import('./features/admin/Admin').then((m) => ({ default: m.AdminStations })),
);
const AdminMissions = lazy(() =>
  import('./features/admin/Admin').then((m) => ({ default: m.AdminMissions })),
);
const AdminRecords = lazy(() =>
  import('./features/admin/Admin').then((m) => ({ default: m.AdminRecords })),
);
const Investor = lazy(() =>
  import('./features/admin/Admin').then((m) => ({ default: m.InvestorOverview })),
);
const AdminControl = lazy(() => import('./features/admin/Controls'));
const Intelligence = lazy(() => import('./features/admin/Intelligence'));
const Billing = lazy(() =>
  import('./features/account/Extras').then((module) => ({ default: module.BillingPage })),
);
const Contact = lazy(() => import('./features/public/Contact'));
const Business = lazy(() =>
  import('./features/business/Business').then((m) => ({ default: m.BusinessDashboard })),
);
const BusinessEmployees = lazy(() =>
  import('./features/business/Business').then((m) => ({ default: m.BusinessEmployees })),
);
const BusinessMarketing = lazy(() =>
  import('./features/business/Business').then((m) => ({ default: m.BusinessMarketing })),
);
function Guard({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const session = useSession();
  const location = useLocation();
  if (session.isPending) return <State />;
  if (session.error) return <State error={session.error.message} retry={() => session.refetch()} />;
  if (!session.data?.user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (roles && !roles.includes(session.data.user.role))
    return (
      <div className="planned-page">
        <h1>This workspace needs a different role.</h1>
        <p>
          Your account cannot access this page. Administrator and organization permissions are
          enforced by the backend.
        </p>
        <a className="button" href="/dashboard">
          Return to your workspace
        </a>
      </div>
    );
  return children;
}
export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <Suspense fallback={<State />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          {['features', 'how-it-works', 'about', 'privacy', 'terms'].map((path) => (
            <Route key={path} path={path} element={<InformationPage />} />
          ))}
          <Route path="contact" element={<Contact />} />
          <Route
            path="explore"
            element={
              <div className="public-app-page">
                <MapPage />
              </div>
            }
          />
          <Route
            path="challenges"
            element={
              <div className="public-app-page">
                <Missions />
              </div>
            }
          />
          <Route
            path="leaderboard"
            element={
              <div className="public-app-page">
                <Leaderboard />
              </div>
            }
          />
          <Route path="business" element={<BusinessMarketing />} />
        </Route>
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route path="forgot-password" element={<Auth mode="forgot" />} />
        <Route
          element={
            <Guard>
              <AppLayout />
            </Guard>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="bikes" element={<Bikes />} />
          <Route path="bikes/:id" element={<Bikes />} />
          <Route path="ride/active" element={<ActiveRide />} />
          <Route path="rentals" element={<Rentals />} />
          <Route path="missions" element={<Missions />} />
          <Route path="missions/:id" element={<Missions />} />
          <Route path="territories" element={<Territories />} />
          <Route path="territories/:id" element={<Territories />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:id" element={<Teams />} />
          <Route path="battles" element={<Battles />} />
          <Route path="friends" element={<Friends />} />
          <Route path="profiles/:id" element={<PublicProfile />} />
          <Route path="passport" element={<Passport />} />
          <Route path="achievements" element={<Passport achievements />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="seasons" element={<Seasons />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="fitness" element={<Fitness />} />
          <Route path="goals" element={<Goals />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="subscriptions" element={<Billing />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        <Route
          element={
            <Guard roles={['ADMIN', 'SUPER_ADMIN']}>
              <AppLayout />
            </Guard>
          }
        >
          <Route path="admin" element={<AdminOverview />} />
          <Route path="admin/analytics" element={<AdminOverview />} />
          <Route path="admin/intelligence" element={<Intelligence />} />
          <Route path="admin/bikes" element={<AdminFleet />} />
          <Route path="admin/stations" element={<AdminStations />} />
          <Route path="admin/missions" element={<AdminMissions />} />
          <Route path="admin/map" element={<MapPage />} />
          <Route path="admin/territories" element={<AdminControl />} />
          <Route path="admin/investor-overview" element={<Investor />} />
          {['rentals', 'reports', 'audit-logs', 'maintenance', 'payments'].map((path) => (
            <Route key={path} path={`admin/${path}`} element={<AdminRecords />} />
          ))}
          {[
            'challenges',
            'teams',
            'seasons',
            'rewards',
            'settings',
            'users',
            'feedback',
            'plans',
            'sponsors',
          ].map((path) => (
            <Route key={path} path={`admin/${path}`} element={<AdminControl />} />
          ))}
        </Route>
        <Route
          element={
            <Guard roles={['BUSINESS_ADMIN']}>
              <AppLayout />
            </Guard>
          }
        >
          {['dashboard', 'challenges', 'analytics'].map((path) => (
            <Route key={path} path={`business/${path}`} element={<Business />} />
          ))}
          <Route path="business/employees" element={<BusinessEmployees />} />
          <Route path="business/billing" element={<Billing />} />
          <Route path="business/sponsors" element={<Sponsors />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
