import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Map,
  Bike,
  Hexagon,
  Flag,
  Trophy,
  Users,
  Compass,
  Gift,
  ChartNoAxesCombined,
  Wallet,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ArrowUpRight,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Building2,
  Clock,
  Route,
  Command,
  Swords,
  Target,
  UserRoundPlus,
} from 'lucide-react';
import { Logo, Modal } from '../../../../packages/ui';
import { useAction, useSession } from '../lib/hooks';
import { useUi } from '../lib/state';
const navigation: { label: string; items: [string, typeof Bike][] }[] = [
  {
    label: 'activity',
    items: [
      ['dashboard', LayoutDashboard],
      ['map', Map],
      ['bikes', Bike],
      ['fitness', ChartNoAxesCombined],
      ['rentals', Clock],
    ],
  },
  {
    label: 'discover',
    items: [
      ['territories', Hexagon],
      ['missions', Flag],
      ['leaderboard', Trophy],
      ['teams', Users],
      ['battles', Swords],
      ['friends', UserRoundPlus],
      ['passport', Compass],
      ['routes', Route],
      ['rewards', Gift],
    ],
  },
  {
    label: 'account',
    items: [
      ['wallet', Wallet],
      ['subscriptions', Gift],
      ['goals', Target],
      ['settings', Settings],
    ],
  },
];
export function Preferences() {
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useUi();
  return (
    <div className="preferences">
      <button className="icon-button" aria-label="Toggle color theme" onClick={toggleTheme}>
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <select
        className="language-select"
        aria-label="Language"
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        <option value="uz">UZ</option>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
    </div>
  );
}
export function PublicLayout() {
  const { t } = useTranslation();
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="public-site">
      <header className="public-header">
        <Link to="/" aria-label="VELOCITY home">
          <Logo />
        </Link>
        <nav className={open ? 'open' : ''}>
          <NavLink to="/features" onClick={() => setOpen(false)}>
            {t('product')}
          </NavLink>
          <NavLink to="/explore" onClick={() => setOpen(false)}>
            {t('explore')}
          </NavLink>
          <NavLink to="/challenges" onClick={() => setOpen(false)}>
            {t('missions')}
          </NavLink>
          <NavLink to="/business" onClick={() => setOpen(false)}>
            {t('business')}
          </NavLink>
        </nav>
        <div className="header-actions">
          <Preferences />
          <Link className="text-link sign-in-link" to={data?.user ? '/dashboard' : '/login'}>
            {data?.user ? t('dashboard') : t('signIn')}
          </Link>
          <Link className="button" to={data?.user ? '/dashboard' : '/register'}>
            {t('start')}
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <div key={location.pathname}>
        <Outlet />
      </div>
      <footer className="public-footer">
        <div className="footer-brand">
          <Link to="/">
            <Logo />
          </Link>
          <p>Your City. Your Ride. Your Territory.</p>
          <span>Built for a city that never stands still.</span>
        </div>
        <div>
          <b>Explore</b>
          <Link to="/explore">City map</Link>
          <Link to="/challenges">Challenges</Link>
          <Link to="/leaderboard">Leaderboard</Link>
        </div>
        <div>
          <b>VELOCITY</b>
          <Link to="/about">Our story</Link>
          <Link to="/business">For business</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <b>The details</b>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/how-it-works">How it works</Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} VELOCITY · Tashkent pilot</span>
          <span className="muted">Demo operations. Real possibilities.</span>
        </div>
      </footer>
    </div>
  );
}
export function AppLayout() {
  const { data } = useSession();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearch((value) => !value);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  const [term, setTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAction('/auth/logout', t('logout'));
  const user = data!.user!;
  const isAdmin = location.pathname.startsWith('/admin');
  const isBusiness = location.pathname.startsWith('/business/');
  const title = isAdmin
    ? 'Operations workspace'
    : isBusiness
      ? 'Business workspace'
      : t(location.pathname.split('/')[1] || 'dashboard');
  const items = isAdmin
    ? [
        ['admin', 'Overview', LayoutDashboard],
        ['admin/bikes', 'Fleet management', Bike],
        ['admin/stations', 'Stations', Map],
        ['admin/missions', 'Mission studio', Flag],
        ['admin/territories', 'Territory control', Hexagon],
        ['admin/challenges', 'Competitions', Swords],
        ['admin/teams', 'Communities', Users],
        ['admin/seasons', 'Seasons', Flag],
        ['admin/rewards', 'Reward catalog', Gift],
        ['admin/plans', 'Ride passes', Wallet],
        ['admin/sponsors', 'Sponsor approvals', Building2],
        ['admin/feedback', 'Feedback inbox', Bell],
        ['admin/users', 'Users', Users],
        ['admin/analytics', 'Analytics', ChartNoAxesCombined],
        ['admin/intelligence', 'Demand intelligence', ChartNoAxesCombined],
        ['admin/maintenance', 'Maintenance', Settings],
        ['admin/reports', 'Reports', Clock],
        ['admin/audit-logs', 'Audit trail', ShieldCheck],
        ['admin/investor-overview', 'Investor overview', Building2],
        ['admin/settings', 'Pricing and scoring', Settings],
      ]
    : isBusiness
      ? [
          ['business/dashboard', 'Overview', LayoutDashboard],
          ['business/challenges', 'Challenges', Flag],
          ['business/analytics', 'Impact analytics', ChartNoAxesCombined],
          ['business/employees', 'Members', Users],
          ['business/billing', 'Demo ride passes', Wallet],
          ['business/sponsors', 'Sponsors and missions', Flag],
        ]
      : null;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <Link to="/" className="sidebar-brand">
          <Logo />
        </Link>
        <button className="workspace-selector" onClick={() => navigate('/map')}>
          <span className="city-symbol">
            <Building2 size={17} />
          </span>
          <span>
            <b>Tashkent</b>
            <small>Your city, reimagined</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <nav>
          {items ? (
            <div className="nav-group">
              <span className="nav-heading">{isAdmin ? 'OPERATIONS' : 'ORGANIZATION'}</span>
              {items.map(([path, label, Icon]) => (
                <NavLink key={String(path)} end to={`/${path}`} onClick={() => setOpen(false)}>
                  <Icon size={18} />
                  {String(label)}
                </NavLink>
              ))}
              <Link to="/dashboard">
                <ArrowUpRight size={18} />
                Rider workspace
              </Link>
            </div>
          ) : (
            navigation.map((group) => (
              <div className="nav-group" key={group.label}>
                <span className="nav-heading">{t(group.label)}</span>
                {group.items.map(([path, Icon]) => (
                  <NavLink key={path} end to={`/${path}`} onClick={() => setOpen(false)}>
                    <Icon size={18} />
                    {t(path)}
                    {path === 'missions' && <span className="nav-new">NEW</span>}
                  </NavLink>
                ))}
              </div>
            ))
          )}
        </nav>
        <div className="sidebar-bottom">
          {['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
            <Link to="/admin" className="portal-link">
              <ShieldCheck size={16} />
              Operations workspace
              <ArrowUpRight size={14} />
            </Link>
          )}
          {user.role === 'BUSINESS_ADMIN' && (
            <Link to="/business/dashboard" className="portal-link">
              <Building2 size={16} />
              Business portal
              <ArrowUpRight size={14} />
            </Link>
          )}
          <div className="season-card">
            <span className="eyebrow">SEASON 01</span>
            <b>{t('season')}</b>
            <Link to="/seasons">
              Make your mark <ArrowUpRight size={14} />
            </Link>
            <div className="season-orbit">
              <Hexagon size={45} />
            </div>
          </div>
          <div className="sidebar-user">
            <Link to="/profile" className="user-link">
              <span className="avatar">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span>
                <b>{user.name}</b>
                <small>Level {Math.floor(user.xp / 1000) + 1} · City explorer</small>
              </span>
            </Link>
            <button
              className="icon-button"
              aria-label={t('logout')}
              onClick={() =>
                logout
                  .mutateAsync({})
                  .then(() => navigate('/'))
                  .catch(() => {})
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="app-header">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={21} />
            </button>
            <span>Your workspace</span>
            <span>/</span>
            <b>{title}</b>
          </div>
          <div className="app-header-actions">
            <button className="search-button" onClick={() => setSearch(true)}>
              <Search size={16} />
              <span>Search anything</span>
              <kbd>
                <Command size={11} /> K
              </kbd>
            </button>
            <span className="demo-indicator">
              <i />
              {t('demo')}
            </span>
            <Preferences />
            <Link
              to="/notifications"
              className="icon-button notification-link"
              aria-label={t('notifications')}
            >
              <Bell size={19} />
            </Link>
            <Link to="/profile" className="avatar small">
              {user.name.slice(0, 1)}
            </Link>
          </div>
        </header>
        <main className="workspace" key={location.pathname}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>
            <i className="live-dot" /> {t('operational')}
          </span>
          <span>{t('demoNote')}</span>
          <Link to="/privacy">
            Privacy & trust
            <ArrowUpRight size={12} />
          </Link>
        </footer>
      </div>
      <nav className="mobile-bottom-nav">
        <NavLink to="/dashboard">
          <LayoutDashboard size={20} />
          <span>{t('dashboard')}</span>
        </NavLink>
        <NavLink to="/map">
          <Map size={20} />
          <span>Map</span>
        </NavLink>
        <NavLink to="/ride/active" className="ride-nav">
          <Bike size={22} />
          <span>Ride</span>
        </NavLink>
        <NavLink to="/missions">
          <Flag size={20} />
          <span>Missions</span>
        </NavLink>
        <NavLink to="/profile">
          <Users size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>
      {search && (
        <Modal title="Find your next destination" close={() => setSearch(false)}>
          <div className="search-dialog">
            <Search size={18} />
            <input
              autoFocus
              placeholder="Search pages, places, and activities"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="command-results">
            {navigation
              .flatMap((g) => g.items)
              .filter(([path]) => t(path).toLowerCase().includes(term.toLowerCase()))
              .map(([path, Icon]) => (
                <Link key={path} to={`/${path}`} onClick={() => setSearch(false)}>
                  <Icon size={19} />
                  {t(path)}
                  <ArrowUpRight size={16} />
                </Link>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
