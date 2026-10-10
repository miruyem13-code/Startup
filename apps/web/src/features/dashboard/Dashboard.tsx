import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowRight,
  Bike,
  Clock,
  Hexagon,
  Leaf,
  Flag,
  MapPin,
  ChevronRight,
  Compass,
  Trophy,
  Route,
} from 'lucide-react';
import { useCatalog, useDashboard } from '../../lib/hooks';
import { money, number } from '../../lib/api';
import { missionTarget } from '../../../../../packages/shared/schemas';
import { Badge, Metric, Panel, SectionHead, Progress, State } from '../../../../../packages/ui';
const CityMap = lazy(() => import('../map/CityMap'));
export function ActivityChart({
  data,
  dataKey = 'distance',
  unit = 'km',
}: {
  data: object[];
  dataKey?: string;
  unit?: string;
}) {
  return (
    <div className="activity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 10, bottom: 0, left: -28 }}>
          <defs>
            <linearGradient id={`chart-fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#73a186" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#73a186" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey={dataKey === 'distance' ? 'day' : 'date'}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickMargin={12}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${number(Number(value), 1)} ${unit}`, dataKey]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#347153"
            strokeWidth={2.5}
            fill={`url(#chart-fill-${dataKey})`}
            activeDot={{ r: 5, stroke: 'white', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export default function DashboardPage() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const query = useDashboard();
  const catalog = useCatalog();
  if (!query.data)
    return (
      <State error={query.error?.message} retry={query.error ? () => query.refetch() : undefined} />
    );
  const { user, stats, chart, rides, missions } = query.data;
  const level = Math.floor(user.xp / 1000) + 1;
  return (
    <>
      <div className="page-intro">
        <div className="page-intro-copy">
          <div className="eyebrow">YOUR CITY. YOUR POSSIBILITY.</div>
          <h1>{t('overview')}</h1>
          <p>
            {t('overviewDescription')}{' '}
            <span className="greeting-name">{user.name.split(' ')[0]}.</span>
          </p>
        </div>
        <Link className="button" to={query.data.active ? '/ride/active' : '/map'}>
          <Bike size={18} />
          {t('rideNow')}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <motion.section
        className="dashboard-hero"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      >
        <div className="dashboard-hero-copy">
          <span className="hero-date">
            <i /> TASHKENT · {catalog.data?.season?.name || 'BETWEEN SEASONS'}
          </span>
          <h2>
            The city is yours.
            <br />
            Go make a little history.
          </h2>
          <p>New streets. New stories. Your next chapter starts with a ride.</p>
          <Link to="/map">
            Find your next adventure <ArrowRight size={17} />
          </Link>
        </div>
        <div className="dashboard-hero-art">
          <svg viewBox="0 0 490 220" aria-hidden="true">
            <path
              d="M-20 215 70 120 153 163 239 65 305 100 366 45 507 85"
              fill="none"
              stroke="#d6e4c9"
              opacity=".35"
              strokeWidth="1.5"
              strokeDasharray="5 6"
            />
            <path
              d="M45 220 45 123h32v97m26 0V94h30v126m35 0V55h54v165m28 0V93h38v127m34 0V74h30v146m37 0V34h62v186"
              stroke="#b8c8b3"
              fill="none"
              opacity=".15"
              strokeWidth="1"
            />
            <path d="M392 34v-16m-37 202h150" stroke="#b8c8b3" opacity=".2" />
            <g transform="translate(210 71)" stroke="#e0ebd7" strokeWidth="2" fill="none">
              <circle cx="35" cy="105" r="36" />
              <circle cx="153" cy="105" r="36" />
              <path d="m35 105 40-64 42 64H35l47-86h25l46 86M69 19h22m34 7 14-7h17" />
              <path d="m96 4-15-20 15-13 34 29 1 30-39 35-5 25m29-39-30-7" strokeWidth="4" />
              <circle cx="78" cy="-35" r="10" strokeWidth="3" />
            </g>
            <circle cx="115" cy="55" r="5" fill="#b6cf95" />
            <circle cx="412" cy="109" r="4" fill="#b6cf95" />
          </svg>
          <div className="hero-level">
            <span className="level-icon">
              <Compass size={20} />
            </span>
            <div>
              <small>YOUR EXPLORER LEVEL</small>
              <b>
                Level {level} <span>· {number(user.xp)} XP</span>
              </b>
            </div>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </motion.section>
      <div className="metrics-grid">
        <Metric
          icon={<Route size={19} />}
          label={t('distance')}
          value={number(stats.distanceKm, 1)}
          unit="km"
          note={`${stats.rides} completed demo rides`}
        />
        <Metric
          icon={<Clock size={19} />}
          label={t('ridingTime')}
          value={number(stats.durationHours, 1)}
          unit="hrs"
          note="A little time for yourself"
        />
        <Metric
          icon={<Hexagon size={19} />}
          label={t('influence')}
          value={number(stats.influence)}
          unit="pts"
          note="Virtual · current season"
        />
        <Metric
          icon={<Leaf size={19} />}
          label={t('co2')}
          value={number(stats.co2EstimateKg, 1)}
          unit="kg"
          note="Estimate · 0.16 kg per km"
        />
      </div>
      <div className="dashboard-grid">
        <Panel className="weekly-panel">
          <SectionHead title={t('weeklyActivity')}>
            <Badge>LAST 7 DAYS</Badge>
          </SectionHead>
          <div className="weekly-summary">
            <b>
              {number(stats.weeklyKm, 1)}
              <span> km</span>
            </b>
            <span className="legend-line" />
            Distance explored{' '}
            <span className="weekly-goal">
              {number(stats.weeklyKm, 1)} / {user.weeklyGoal} km goal
            </span>
          </div>
          <ActivityChart data={chart} />
          <div className="chart-footer">
            <span>
              <span className="green-dot" />
              {stats.activeDays} active days · {query.data.streaks.activity.current} week activity
              streak
            </span>
            <Link to="/fitness">
              Activity insights
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </Panel>
        <Panel className="goal-panel">
          <SectionHead title={t('weeklyGoal')}>
            <Compass size={20} className="muted" />
          </SectionHead>
          <div
            className="goal-ring"
            style={
              {
                '--progress': `${Math.min(100, (stats.weeklyKm / user.weeklyGoal) * 100)}%`,
              } as React.CSSProperties
            }
          >
            <div>
              <b>
                {Math.round((stats.weeklyKm / user.weeklyGoal) * 100)}
                <small>%</small>
              </b>
              <span>of your weekly goal</span>
            </div>
          </div>
          <h3>{t('keepGoing')}</h3>
          <div className="goal-data">
            <span>{number(stats.weeklyKm, 1)} km explored</span>
            <span>{user.weeklyGoal} km goal</span>
          </div>
          <Progress value={(stats.weeklyKm / user.weeklyGoal) * 100} />
          <Link to="/settings" className="goal-adjust">
            Make it your own <ArrowUpRight size={14} />
          </Link>
        </Panel>
        <Panel className="mission-panel">
          <SectionHead title={t('activeMissions')}>
            <Link to="/missions" className="text-link">
              {t('allMissions')}
              <ArrowUpRight size={15} />
            </Link>
          </SectionHead>
          <div className="dashboard-missions">
            {missions
              .filter((m) => !m.completedAt)
              .slice(0, 3)
              .map((entry, i) => (
                <Link to={`/missions/${entry.missionId}`} className="mini-mission" key={entry.id}>
                  <span className={`mission-symbol color-${i}`}>
                    <Flag size={19} />
                  </span>
                  <div>
                    <b>{entry.mission.name}</b>
                    <small>
                      {missionTarget(entry.mission.category, entry.progress)} /{' '}
                      {missionTarget(entry.mission.category, entry.mission.target)}
                    </small>
                    <Progress value={(entry.progress / entry.mission.target) * 100} />
                  </div>
                  <span className="xp-pill">+{entry.mission.xp} XP</span>
                </Link>
              ))}
            {!missions.some((m) => !m.completedAt) && (
              <div className="empty-inline">
                New adventures are waiting. <Link to="/missions">Find a mission →</Link>
              </div>
            )}
          </div>
        </Panel>
        <Panel className="nearby-panel">
          <SectionHead title={t('nearbyBikes')}>
            <Link to="/map" className="text-link">
              {t('viewMap')}
              <ArrowUpRight size={15} />
            </Link>
          </SectionHead>
          {catalog.data ? (
            <Suspense fallback={<State />}>
              <CityMap
                data={catalog.data}
                compact
                onStation={() => window.location.assign('/map')}
              />
            </Suspense>
          ) : (
            <State error={catalog.error?.message} />
          )}
          <div className="nearby-footer">
            <MapPin size={16} />
            <div>
              <b>Amir Temur Square</b>
              <small>
                {catalog.data?.bikes.filter(
                  (b) => b.stationId === 'station-0' && b.status === 'AVAILABLE',
                ).length || 0}{' '}
                demo bikes available · central Tashkent
              </small>
            </div>
            <Link to="/bikes" className="arrow-circle">
              <ArrowUpRight size={19} />
            </Link>
          </div>
        </Panel>
        <Panel className="recent-panel">
          <SectionHead title={t('recentRides')}>
            <Link to="/rentals" className="text-link">
              {t('viewAll')}
              <ArrowUpRight size={15} />
            </Link>
          </SectionHead>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Journey</th>
                  <th>Distance</th>
                  <th>Time</th>
                  <th>Earned</th>
                  <th>Demo charge</th>
                </tr>
              </thead>
              <tbody>
                {rides.slice(0, 4).map((ride) => (
                  <tr key={ride.id}>
                    <td>
                      <div className="ride-cell">
                        <span>
                          <Bike size={17} />
                        </span>
                        <div>
                          <b>{ride.station?.name || 'City ride'}</b>
                          <small>
                            {ride.endedAt
                              ? new Date(ride.endedAt).toLocaleDateString('en', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : ''}{' '}
                            · {ride.bike.code}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{number(ride.distanceM / 1000, 1)} km</td>
                    <td>{Math.ceil(ride.durationSec / 60)} min</td>
                    <td>
                      <span className="table-xp">+{ride.xp} XP</span>
                    </td>
                    <td>{money(ride.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="season-promo">
          <span className="season-ornament">
            <Trophy size={48} strokeWidth={1.3} />
          </span>
          <span className="eyebrow">SEASON 01 · TASHKENT RISING</span>
          <h3>
            Your city.
            <br />
            Your moment.
          </h3>
          <p>Explore new territories. Make your mark. Build something together.</p>
          <div>
            <span>YOUR CITY RANK</span>
            <b>#{stats.rank}</b>
          </div>
          <Link to="/leaderboard">
            Meet the explorers <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </>
  );
}
