import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Route,
  Clock,
  Wallet,
  ArrowUpRight,
  Bell,
  Check,
  Settings,
  Compass,
  Heart,
  Target,
} from 'lucide-react';
import {
  Panel,
  Badge,
  Button,
  Metric,
  Progress,
  SectionHead,
  State,
} from '../../../../../packages/ui';
import { useAction, useDashboard } from '../../lib/hooks';
import { api, money, number } from '../../lib/api';
import { ActivityChart } from '../dashboard/Dashboard';
import { IdentitySettings } from './Extras';
export function FitnessPage() {
  const recovery = useAction('/profile/recovery-week', 'Your recovery preference is saved.');
  const [days, setDays] = useState(7);
  const query = useDashboard(days);
  if (!query.data) return <State error={query.error?.message} />;
  const { stats, chart, user, streaks } = query.data;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">FEEL-GOOD PROGRESS</span>
          <h1>Your own kind of momentum.</h1>
          <p>Go at your pace. Build a habit that feels good.</p>
        </div>
        <div className="tabs">
          <button onClick={() => setDays(7)} className={days === 7 ? 'active' : ''}>
            7 days
          </button>
          <button onClick={() => setDays(30)} className={days === 30 ? 'active' : ''}>
            30 days
          </button>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          icon={<Route size={19} />}
          label="All-time distance"
          value={number(stats.distanceKm, 1)}
          unit="km"
          note={`${stats.rides} completed rides`}
        />
        <Metric
          icon={<Clock size={19} />}
          label="All-time riding time"
          value={number(stats.durationHours, 1)}
          unit="hrs"
          note="From completed backend rides"
        />
        <Metric
          icon={<Heart size={19} />}
          label="Estimated energy"
          value={number(stats.caloriesEstimate)}
          unit="kcal"
          note="Simple estimate: 30 kcal/km"
        />
        <Metric
          icon={<Leaf size={19} />}
          label="Estimated CO₂ savings"
          value={number(stats.co2EstimateKg, 1)}
          unit="kg"
          note="Assumes displaced car trips"
        />
      </div>
      <Panel className="fitness-chart">
        <SectionHead title="Every little ride adds up.">
          <Badge>LAST {days} DAYS</Badge>
        </SectionHead>
        <ActivityChart data={chart} />
      </Panel>
      <div className="recommendation-grid">
        <Panel>
          <SectionHead title="A habit with room for rest" />
          <Badge>{streaks.activity.current} WEEK ACTIVITY STREAK</Badge>
          <h3>Best run: {streaks.activity.best} weeks</h3>
          <p>
            One completed ride in a calendar week keeps your activity streak going. Daily riding is
            never required; an unfinished week does not erase last week’s progress.
          </p>
          <p>
            Recovery weeks preserve your previous run and add no activity credit. You never need to
            give a medical reason.
          </p>
          <Button
            tone="secondary"
            busy={recovery.isPending}
            onClick={() => recovery.mutate({ resting: !streaks.recoveryThisWeek })}
          >
            {streaks.recoveryThisWeek ? 'Resume this week' : 'Take a recovery week'}
          </Button>
        </Panel>
        <Panel>
          <SectionHead title="Your weekly goal rhythm" />
          <Badge>{streaks.goal.current} WEEK GOAL STREAK</Badge>
          <h3>
            {number(streaks.weekKm, 1)} / {streaks.goalKm} km this calendar week
          </h3>
          <p>
            Best run: {streaks.goal.best} weeks. {streaks.goalBasis} Weeks start Monday in Tashkent.
            Missed weeks do not remove earned achievements.
          </p>
        </Panel>
      </div>
      <div className="recommendation-grid">
        <Panel>
          <Compass size={28} />
          <Badge>SMART RECOMMENDATIONS · RULE BASED</Badge>
          <h3>
            {stats.weeklyKm >= user.weeklyGoal
              ? 'Make room for recovery.'
              : 'A little consistency goes a long way.'}
          </h3>
          <p>
            {stats.weeklyKm >= user.weeklyGoal
              ? 'You’ve reached your weekly distance goal. A rest day or a gentle ride could be a good next step.'
              : `Try a manageable city loop this week. You have ${number(Math.max(0, user.weeklyGoal - stats.weeklyKm), 1)} km left toward your personal goal.`}
          </p>
          <Link to="/routes" className="text-link">
            Choose a demo route
            <ArrowUpRight size={16} />
          </Link>
        </Panel>
        <Panel>
          <Leaf size={28} />
          <h3>Transparent by design.</h3>
          <p>
            Calories use a rough 30 kcal/km estimate; individual needs vary. CO₂ uses 0.16 kg/km
            assuming the bicycle replaces a car trip. Neither figure is measured health or
            environmental impact.
          </p>
          <Link to="/settings" className="text-link">
            Make your goal fit your life
            <ArrowUpRight size={16} />
          </Link>
        </Panel>
      </div>
    </>
  );
}
export function GoalsPage() {
  const query = useDashboard();
  const save = useAction('/profile', 'Your weekly goal is saved.', 'PATCH');
  const [goal, setGoal] = useState<number | null>(null);
  if (!query.data) return <State error={query.error?.message} />;
  const value = goal ?? query.data.user.weeklyGoal;
  const completed = query.data.stats.weeklyKm;
  const progress = Math.min(100, (completed / value) * 100);
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">YOUR PACE, YOUR PROMISE</span>
          <h1>A goal that moves with you.</h1>
          <p>Choose a weekly distance and watch verified rides move it forward.</p>
        </div>
        <Badge>{progress >= 100 ? 'GOAL REACHED' : 'THIS WEEK'}</Badge>
      </div>
      <div className="recommendation-grid">
        <Panel>
          <Target size={30} />
          <h2>
            {number(completed, 1)} of {number(value)} km
          </h2>
          <Progress value={progress} />
          <p>
            {progress >= 100
              ? 'You made it. Recovery counts too—set the next goal when it feels right.'
              : `${number(Math.max(0, value - completed), 1)} km left this week.`}
          </p>
          <Link to="/bikes" className="text-link">
            Find your next ride <ArrowUpRight size={16} />
          </Link>
        </Panel>
        <Panel className="settings-panel">
          <SectionHead title="Set your weekly distance." />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate({
                name: query.data!.user.name,
                weeklyGoal: value,
                publicProfile: query.data!.user.publicProfile,
              });
            }}
          >
            <label>
              Weekly goal (km)
              <input
                type="number"
                min={5}
                max={500}
                value={value}
                onChange={(event) => setGoal(Number(event.target.value))}
                required
              />
              <small>Use a sustainable target. You can change it at any time.</small>
            </label>
            <Button type="submit" busy={save.isPending}>
              Save goal <Check size={16} />
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
export function WalletPage() {
  const query = useDashboard();
  const [amount, setAmount] = useState(50000);
  const topup = useAction('/wallet/topup', 'Demo credit added. No real payment was taken.');
  if (!query.data) return <State error={query.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">KEEP A LITTLE ADVENTURE IN RESERVE</span>
          <h1>Your next ride, covered.</h1>
          <p>
            A demonstration wallet. Every transaction is persisted, and every amount uses integer
            UZS.
          </p>
        </div>
        <Badge>SIMULATED PAYMENTS</Badge>
      </div>
      <div className="wallet-layout">
        <div className="wallet-card">
          <Wallet size={30} />
          <span>DEMO AVAILABLE BALANCE</span>
          <h2>{money(query.data.user.wallet)}</h2>
          <p>Ready for your next everyday escape.</p>
          <span>VELOCITY · TASHKENT PILOT</span>
        </div>
        <Panel className="wallet-topup">
          <h2>A little more room to explore.</h2>
          <p>No card needed. Demo credits have no monetary value.</p>
          <label>
            Demo credit amount
            <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
              <option value={10000}>10,000 UZS</option>
              <option value={50000}>50,000 UZS</option>
              <option value={100000}>100,000 UZS</option>
            </select>
          </label>
          <Button
            busy={topup.isPending}
            onClick={() => topup.mutate({ amount, key: crypto.randomUUID() })}
          >
            Add demo credit
            <ArrowUpRight size={16} />
          </Button>
          <small>Pricing: 2,000 UZS unlock + 400 UZS per started minute.</small>
        </Panel>
      </div>
      <Panel>
        <SectionHead title="The details, all in one place." />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Date</th>
                <th>Demo amount</th>
              </tr>
            </thead>
            <tbody>
              {query.data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.kind.replaceAll('_', ' ')}</td>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className={tx.amount > 0 ? 'table-xp' : ''}>
                    {tx.amount > 0 ? '+' : ''}
                    {money(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function SettingsPage() {
  const query = useDashboard();
  const save = useAction('/profile', 'Your preferences are saved.', 'PATCH');
  const [form, setForm] = useState<{
    name: string;
    weeklyGoal: number;
    publicProfile: boolean;
  } | null>(null);
  if (!query.data) return <State error={query.error?.message} />;
  const current = form || {
    name: query.data.user.name,
    weeklyGoal: query.data.user.weeklyGoal,
    publicProfile: query.data.user.publicProfile,
  };
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">MAKE IT YOUR OWN</span>
          <h1>Your space. Your pace.</h1>
          <p>Set a goal that fits your life. Decide how you appear to your city.</p>
        </div>
      </div>
      <Panel className="settings-panel">
        <SectionHead title="A little about you." />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(current);
          }}
        >
          <label>
            Display name
            <input
              value={current.name}
              onChange={(e) => setForm({ ...current, name: e.target.value })}
              minLength={2}
              maxLength={60}
              required
            />
          </label>
          <label>
            Weekly distance goal (km)
            <input
              type="number"
              value={current.weeklyGoal}
              min={5}
              max={500}
              required
              onChange={(e) => setForm({ ...current, weeklyGoal: Number(e.target.value) })}
            />
            <small>Rest days are part of a healthy routine. Adjust your goal at any time.</small>
          </label>
          <div className="privacy-setting">
            <div>
              <b>Public explorer profile</b>
              <p>
                Show your name and XP in the leaderboard. Routes and live location stay private.
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                aria-label="Public explorer profile"
                checked={current.publicProfile}
                onChange={(e) => setForm({ ...current, publicProfile: e.target.checked })}
              />
              <span />
            </label>
          </div>
          <div className="notice">
            <Settings size={18} />
            Language and theme preferences are saved on this device using the controls in the
            header.
          </div>
          <Button type="submit" busy={save.isPending}>
            Save preferences
            <Check size={16} />
          </Button>
        </form>
      </Panel>
      <IdentitySettings />
    </>
  );
}
export function NotificationsPage() {
  const query = useDashboard();
  const read = useAction('/notifications/read', 'Notifications marked as read.');
  const invitations = useQuery({
    queryKey: ['invitations'],
    queryFn: () =>
      api<
        {
          id: string;
          sender: { name: string };
          team: { name: string } | null;
          organization: { name: string } | null;
        }[]
      >('/invitations'),
  });
  const respond = useAction('/invitations/:id/respond', 'Invitation updated.');
  if (!query.data) return <State error={query.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GOOD THINGS, WORTH SHARING</span>
          <h1>A little news from your city.</h1>
          <p>Ride updates, completed missions, and the next chapter.</p>
        </div>
        <Button tone="secondary" busy={read.isPending} onClick={() => read.mutate({})}>
          <Check size={16} />
          Mark all read
        </Button>
      </div>
      {!!invitations.data?.length && (
        <Panel>
          <SectionHead title="Your invitations" />
          <div className="social-list">
            {invitations.data.map((invitation) => (
              <div className="social-row" key={invitation.id}>
                <div>
                  <b>{invitation.team?.name || invitation.organization?.name}</b>
                  <small>Invited by {invitation.sender.name}</small>
                </div>
                <div>
                  <Button
                    busy={respond.isPending}
                    onClick={() => respond.mutate({ id: invitation.id, accept: true })}
                  >
                    Accept
                  </Button>
                  <Button
                    tone="ghost"
                    busy={respond.isPending}
                    onClick={() => respond.mutate({ id: invitation.id, accept: false })}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="notification-list">
        {query.data.notifications.map((n) => (
          <Panel className={`notification-card ${n.read ? 'read' : ''}`} key={n.id}>
            <span>
              <Bell size={22} />
            </span>
            <div>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            {!n.read && <i className="green-dot" />}
          </Panel>
        ))}
      </div>
      {!query.data.notifications.length && <State empty="All quiet. A good day to ride." />}
    </>
  );
}
export function ProfilePage() {
  const query = useDashboard();
  if (!query.data) return <State error={query.error?.message} />;
  const { user, stats } = query.data;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">YOUR OWN LITTLE CITY STORY</span>
          <h1>{user.name}</h1>
          <p>Everyday explorer · Tashkent, Uzbekistan</p>
        </div>
        <Link to="/settings" className="button secondary">
          Edit profile
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <Panel className="profile-overview">
        <span className="profile-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="profile-photo" />
          ) : (
            user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
          )}
        </span>
        <div>
          <Badge>LEVEL {Math.floor(user.xp / 1000) + 1} · CITY EXPLORER</Badge>
          <h2>Your journey is just getting interesting.</h2>
          <p>
            {number(user.xp)} XP · {number(user.points)} loyalty points · #{stats.rank} all-user XP
            rank
          </p>
        </div>
        <Compass size={70} strokeWidth={1} />
      </Panel>
      <div className="metrics-grid">
        <Metric
          icon={<Route size={19} />}
          label="Distance"
          value={number(stats.distanceKm, 1)}
          unit="km"
          note="A city, one ride at a time"
        />
        <Metric
          icon={<Clock size={19} />}
          label="Journeys"
          value={number(stats.rides)}
          note="Saved to your account"
        />
        <Metric
          icon={<Compass size={19} />}
          label="Passport stamps"
          value={String(query.data.stamps.length)}
          note="Places worth remembering"
        />
        <Metric
          icon={<Leaf size={19} />}
          label="Achievements"
          value={String(query.data.achievements.length)}
          note="Little milestones, earned"
        />
      </div>
    </>
  );
}
