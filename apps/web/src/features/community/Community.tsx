import { useState, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Flag,
  Hexagon,
  ArrowUpRight,
  Clock,
  Trophy,
  Compass,
  Check,
  Gift,
  Users,
  Leaf,
  MapPin,
  Bike,
  Sparkles,
  Route,
  Swords,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import {
  Panel,
  Badge,
  Button,
  Progress,
  State,
  SectionHead,
  Modal,
} from '../../../../../packages/ui';
import { useCatalog, useDashboard, useSession, useAction } from '../../lib/hooks';
import { api, number } from '../../lib/api';
import { missionTarget, missionEligibilitySchema } from '../../../../../packages/shared/schemas';
const CityMap = lazy(() => import('../map/CityMap'));
export function MissionsPage() {
  const catalog = useCatalog();
  const { data: session } = useSession();
  const dashboard = useDashboard();
  const { id } = useParams();
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<string | null>(null);
  const join = useAction(
    `/missions/${selected || 'none'}/join`,
    'Mission joined. Progress comes from completed rides.',
  );
  if (!catalog.data) return <State error={catalog.error?.message} />;
  const missions = catalog.data.missions.filter(
    (m) => (!id || m.id === id) && (filter === 'ALL' || m.category === filter),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A REASON TO GO A LITTLE FURTHER</span>
          <h1>Small challenges. Big possibilities.</h1>
          <p>Choose your adventure. The journey earns the progress.</p>
        </div>
        <Badge>{catalog.data.season?.name || 'BETWEEN SEASONS'}</Badge>
      </div>
      <div className="mission-banner">
        <div>
          <Flag size={26} />
          <span>THIS WEEK, MAKE ROOM FOR MOVEMENT</span>
          <h2>Find your everyday adventure.</h2>
          <p>Distance, discovery, and little victories. All at your own pace.</p>
        </div>
        <span className="banner-outline">
          <Flag size={110} strokeWidth={0.8} />
        </span>
      </div>
      <div className="filter-bar">
        <div className="tabs">
          {[
            'ALL',
            'DISTANCE',
            'RIDES',
            'EXPLORATION',
            'DURATION',
            'INFLUENCE',
            'ROUTE',
            'DISTRICTS',
            'ACTIVE_DAYS',
            'MISSIONS',
          ].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'active' : ''}>
              {f === 'ALL'
                ? 'All missions'
                : f === 'DISTANCE'
                  ? 'Distance'
                  : f === 'RIDES'
                    ? 'Consistency'
                    : f === 'EXPLORATION'
                      ? 'Exploration'
                      : f === 'DURATION'
                        ? 'Riding time'
                        : f === 'INFLUENCE'
                          ? 'Influence'
                          : f === 'ROUTE'
                            ? 'City loops'
                            : f === 'DISTRICTS'
                              ? 'Districts'
                              : f === 'ACTIVE_DAYS'
                                ? 'Active days'
                                : 'Mission milestones'}
            </button>
          ))}
        </div>
        <span className="muted">{missions.length} ways to go further</span>
      </div>
      <div className="mission-grid">
        {missions.map((mission, i) => {
          const entry = dashboard.data?.missions.find((m) => m.missionId === mission.id);
          const criteria = missionEligibilitySchema.parse(mission.eligibility);
          return (
            <Panel className="mission-card" key={mission.id}>
              <div className="mission-card-top">
                <span className={`mission-symbol color-${i % 3}`}>
                  {mission.category === 'DISTANCE' ? (
                    <Route size={22} />
                  ) : mission.category === 'RIDES' ? (
                    <Bike size={22} />
                  ) : (
                    <Compass size={22} />
                  )}
                </span>
                <Badge tone="neutral">
                  {mission.sponsored ? 'DEMO SPONSORED' : mission.category}
                </Badge>
              </div>
              <h3>{mission.name}</h3>
              <p>{mission.description}</p>
              <p className="muted">
                {mission.difficulty}
                {mission.sponsor ? ` · ${mission.sponsor.name} · illustrative sponsor` : ''}
                {criteria.minXp ? ` · ${criteria.minXp}+ XP` : ''}
                {criteria.maxXp !== null ? ` · up to ${criteria.maxXp} XP` : ''}
                {criteria.teamRequired ? ' · team members' : ''}
                {criteria.district ? ` · ${criteria.district}` : ''}
                {criteria.hourStart !== null && criteria.hourEnd !== null
                  ? ` · starts ${criteria.hourStart}:00–${criteria.hourEnd}:00 Tashkent`
                  : ''}
              </p>
              <div className="mission-target">
                <span>{missionTarget(mission.category, mission.target)}</span>
                <span>
                  <Clock size={13} />
                  {Math.max(
                    0,
                    Math.ceil((new Date(mission.endsAt).getTime() - Date.now()) / 86400000),
                  )}{' '}
                  days left
                </span>
              </div>
              <Progress value={entry ? (entry.progress / mission.target) * 100 : 0} />
              <div className="mission-reward-row">
                <span>
                  +{mission.xp} XP <small>· {mission.points} points</small>
                </span>
                {entry?.completedAt ? (
                  <Badge>
                    <Check size={12} />
                    Completed
                  </Badge>
                ) : entry ? (
                  <Badge>In progress</Badge>
                ) : (
                  <Button tone="secondary" onClick={() => setSelected(mission.id)}>
                    Join
                    <ArrowUpRight size={14} />
                  </Button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
      {!!dashboard.data?.missions.some((entry) => entry.completedAt) && (
        <Panel>
          <SectionHead title="Your completed chapters" />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Progress</th>
                  <th>Completed</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.data.missions
                  .filter((entry) => entry.completedAt && (!id || entry.missionId === id))
                  .map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.mission.name}</td>
                      <td>{missionTarget(entry.mission.category, entry.progress)}</td>
                      <td>{new Date(entry.completedAt!).toLocaleDateString()}</td>
                      <td>
                        +{entry.mission.xp} XP · {entry.mission.points} points
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {selected && (
        <Modal title="Your next little challenge" close={() => setSelected(null)}>
          <p>{catalog.data.missions.find((m) => m.id === selected)?.description}</p>
          <p className="muted">
            Progress begins when you join. Only future completed backend rides count. Demo GPS is
            simulated.
          </p>
          {session?.user ? (
            <Button
              busy={join.isPending}
              onClick={() =>
                join
                  .mutateAsync({})
                  .then(() => setSelected(null))
                  .catch(() => {})
              }
            >
              Join mission
              <Flag size={16} />
            </Button>
          ) : (
            <Link to="/login?next=/missions" className="button">
              Sign in to join
              <ArrowUpRight size={16} />
            </Link>
          )}
        </Modal>
      )}
    </>
  );
}
type Leader = {
  id: string;
  name: string;
  xp: number;
  score: number;
  rank: number;
  team: { name: string } | null;
};
export function LeaderboardPage() {
  const [metric, setMetric] = useState('XP');
  const [period, setPeriod] = useState('ALL');
  const [scope, setScope] = useState('GLOBAL');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const catalog = useCatalog();
  const unit =
    metric === 'DISTANCE'
      ? 'km'
      : metric === 'MISSIONS'
        ? 'missions'
        : metric === 'INFLUENCE'
          ? 'influence'
          : 'XP';
  const score = (value: number) =>
    number(metric === 'DISTANCE' ? value / 1000 : value, metric === 'DISTANCE' ? 1 : 0);
  const query = useQuery({
    queryKey: ['leaderboard', metric, period, scope, district, page],
    queryFn: () =>
      api<{ entries: Leader[]; total: number; pageSize: number; basis: string }>(
        `/leaderboard?${new URLSearchParams({ format: 'paged', metric, period, scope, district, page: String(page) })}`,
      ),
  });
  const { data: session } = useSession();
  if (!query.data) return <State error={query.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">PROGRESS LOOKS GOOD ON EVERYONE</span>
          <h1>A city of everyday explorers.</h1>
          <p>Choose your own measure of progress. Speed earns no extra points.</p>
        </div>
        <Badge>DEMO STANDINGS</Badge>
      </div>
      <div className="filter-bar leaderboard-filters">
        <label>
          Ranking
          <select
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value);
              setPage(1);
            }}
          >
            <option value="XP">Experience</option>
            <option value="DISTANCE">Distance</option>
            <option value="INFLUENCE">Territory influence</option>
            <option value="MISSIONS">Completed missions</option>
            <option value="TEAMS">Team experience</option>
          </select>
        </label>
        <label>
          Period
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All time / current season</option>
            <option value="WEEK">This week</option>
            <option value="MONTH">This month</option>
          </select>
        </label>
        <label>
          District
          <select
            value={district}
            disabled={metric === 'MISSIONS'}
            onChange={(event) => {
              setDistrict(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Every district</option>
            {[...new Set(catalog.data?.stations.map((station) => station.district))]
              .sort()
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
        </label>
        {session?.user && (
          <label>
            Community
            <select
              value={scope}
              onChange={(event) => {
                setScope(event.target.value);
                setPage(1);
              }}
            >
              <option value="GLOBAL">Everyone</option>
              <option value="FRIENDS">Friends and me</option>
            </select>
          </label>
        )}
      </div>
      <p className="muted">{query.data.basis}</p>
      {page === 1 && (
        <div className="podium-grid">
          {query.data.entries.slice(0, 3).map((r, i) => (
            <Panel key={r.id} className={`podium rank-${i + 1}`}>
              <span className="podium-rank">0{i + 1}</span>
              <span className="podium-avatar">
                {r.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
              <Trophy size={23} />
              <h3>{r.name}</h3>
              <p>{r.team?.name || 'Independent explorer'}</p>
              <b>
                {score(r.score)}
                <small> {unit}</small>
              </b>
            </Panel>
          ))}
        </div>
      )}
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Explorer</th>
                <th>Community</th>
                <th>Level</th>
                <th>{unit}</th>
              </tr>
            </thead>
            <tbody>
              {query.data.entries.map((r) => (
                <tr className={r.id === session?.user?.id ? 'your-rank' : ''} key={r.id}>
                  <td className="rank-cell">
                    {r.rank < 4 ? <Trophy size={17} /> : null}#{r.rank}
                  </td>
                  <td>
                    <div className="rider-cell">
                      <span className="avatar small">{r.name.slice(0, 1)}</span>
                      <Link to={metric === 'TEAMS' ? `/teams/${r.id}` : `/profiles/${r.id}`}>
                        <b>{r.name}</b>
                      </Link>
                      {r.id === session?.user?.id && <Badge>You</Badge>}
                    </div>
                  </td>
                  <td>{r.team?.name || 'Independent'}</td>
                  <td>Level {Math.floor(r.xp / 1000) + 1}</td>
                  <td className="table-xp">
                    {score(r.score)} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!query.data.entries.length && (
            <State empty="No public explorers match these filters yet." />
          )}
        </div>
        <div className="chart-footer">
          <Button tone="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} · {query.data.total} entries
          </span>
          <Button
            tone="ghost"
            disabled={page * query.data.pageSize >= query.data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </Panel>
    </>
  );
}
export function TerritoriesPage() {
  const query = useCatalog();
  const dashboard = useDashboard();
  const { id } = useParams();
  const [selected, setSelected] = useState<string | null>(id || null);
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ['territory-history', selected],
    enabled: !!selected,
    queryFn: () =>
      api<{
        leaders: { name: string; score: number }[];
        contributions: { name: string; score: number; createdAt: string; season: string }[];
        ownership: { createdAt: string; season: { name: string } }[];
      }>(`/territories/${selected}/history`),
  });
  if (!query.data) return <State error={query.error?.message} />;
  const territory = query.data.territories.find((t) => t.id === selected);
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">YOUR CITY. YOUR VIRTUAL TERRITORY.</span>
          <h1>A little more ground to call yours.</h1>
          <p>
            Earn influence through rides. Ownership is virtual, seasonal, and never legal property.
          </p>
        </div>
        <Badge>{query.data.season?.name || 'BETWEEN SEASONS'}</Badge>
      </div>
      <div className="territory-summary">
        <Panel>
          <Hexagon size={25} />
          <b>{dashboard.data?.influence.length || 0}</b>
          <span>
            Territories influenced · {dashboard.data?.stats.controlledTerritories || 0} controlled
          </span>
        </Panel>
        <Panel>
          <Flag size={25} />
          <b>{number(dashboard.data?.stats.influence || 0)}</b>
          <span>Seasonal influence</span>
        </Panel>
        <Panel>
          <Compass size={25} />
          <b>{query.data.territories.length}</b>
          <span>Places to discover</span>
        </Panel>
      </div>
      <div className="territory-map">
        <Suspense fallback={<State />}>
          <CityMap data={query.data} onTerritory={setSelected} />
        </Suspense>
      </div>
      <SectionHead title="Every corner has a story." />
      <div className="filter-bar">
        <label>
          District
          <select
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Every district</option>
            {[...new Set(query.data.territories.map((entry) => entry.district))]
              .sort()
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
        </label>
        <Badge>
          {
            query.data.territories.filter((entry) => !district || entry.district === district)
              .length
          }{' '}
          TERRITORIES
        </Badge>
      </div>
      <div className="territory-grid">
        {query.data.territories
          .filter((entry) => !district || entry.district === district)
          .slice((page - 1) * 24, page * 24)
          .map((t, i) => (
            <button className="panel territory-card" key={t.id} onClick={() => setSelected(t.id)}>
              <span className={`territory-tile color-${i % 3}`}>
                <Hexagon size={42} strokeWidth={1.2} />
              </span>
              <div>
                <h3>{t.name}</h3>
                <p>{t.district}</p>
                <small>{t.controller || 'Unclaimed · a blank canvas'}</small>
              </div>
              <span>
                {number(t.score)}
                <small> influence</small>
              </span>
            </button>
          ))}
      </div>
      <div className="chart-footer">
        <Button tone="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          tone="ghost"
          disabled={
            page * 24 >=
            query.data.territories.filter((entry) => !district || entry.district === district)
              .length
          }
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      {territory && (
        <Modal title={territory.name} close={() => setSelected(null)}>
          <div className="territory-detail">
            <Hexagon size={52} />
            <Badge>VIRTUAL · SEASONAL</Badge>
            <h3>{territory.controller || 'A blank canvas, waiting for you.'}</h3>
            <p>
              {territory.district} · {number(territory.score)} total influence
            </p>
            <p className="muted">
              Earn influence by completing the demonstration loop. The server validates route
              points, applies a daily {query.data.pricing.dailyInfluenceCap}-point pool cap, and
              divides it across eligible polygons. Repeated territory contributions have a{' '}
              {query.data.pricing.territoryCooldownMinutes}-minute cooldown.
            </p>
            <h3>Territory level {Math.floor(territory.score / 250) + 1}</h3>
            <p className="muted">
              Next cosmetic level at {(Math.floor(territory.score / 250) + 1) * 250} total
              influence.
            </p>
            <Progress value={((territory.score % 250) / 250) * 100} />
            {history.data ? (
              <>
                <SectionHead title="Current season leaders" />
                {history.data.leaders.map((entry, index) => (
                  <p key={index}>
                    #{index + 1} {entry.name} · {entry.score} influence
                  </p>
                ))}
                <SectionHead title="Recent trusted contributions" />
                {history.data.contributions.map((entry, index) => (
                  <p key={index}>
                    {entry.name} · +{entry.score} · {entry.season} ·{' '}
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                ))}
                {!history.data.contributions.length && (
                  <p className="muted">
                    No trusted contribution events yet. Seeded historical influence is shown in
                    standings.
                  </p>
                )}
                <p className="muted">
                  {history.data.ownership.length} recent ownership changes recorded.
                </p>
              </>
            ) : (
              <State error={history.error?.message} />
            )}
            <Link className="button" to="/bikes">
              Go explore
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
export function TeamsPage() {
  const query = useCatalog();
  const dash = useDashboard();
  const { id } = useParams();
  const [selected, setSelected] = useState<string | null>(null);
  const join = useAction(`/teams/${selected || 'none'}/join`, 'Welcome to your new community.');
  const leave = useAction('/teams/leave', 'You have left your team.');
  if (!query.data || !dash.data)
    return <State error={query.error?.message || dash.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A SHARED ROAD IS A BETTER ROAD</span>
          <h1>Find your people.</h1>
          <p>One membership at a time. Join a community of curious city explorers.</p>
        </div>
      </div>
      <div className="team-grid">
        {query.data.teams
          .filter((t) => !id || t.id === id)
          .map((team, i) => (
            <Panel className="team-card" key={team.id}>
              <span className={`team-icon color-${i % 3}`}>
                <Users size={29} />
              </span>
              <Badge tone="neutral">{team._count.users} MEMBERS</Badge>
              <h2>{team.name}</h2>
              <p>{team.description}</p>
              <div className="team-total">
                <Trophy size={16} /> {number(team.xp)} combined XP
              </div>
              {dash.data!.user.teamId === team.id ? (
                <Button tone="secondary" busy={leave.isPending} onClick={() => leave.mutate({})}>
                  Your community · Leave
                </Button>
              ) : (
                <Button onClick={() => setSelected(team.id)}>
                  Join the journey
                  <ArrowUpRight size={16} />
                </Button>
              )}
            </Panel>
          ))}
      </div>
      {selected && (
        <Modal title="Make room for a new community" close={() => setSelected(null)}>
          <p>
            Join {query.data.teams.find((t) => t.id === selected)?.name}? Your previous team
            membership will be replaced.
          </p>
          <Button
            busy={join.isPending}
            onClick={() =>
              join
                .mutateAsync({})
                .then(() => setSelected(null))
                .catch(() => {})
            }
          >
            Join team
            <Users size={16} />
          </Button>
        </Modal>
      )}
    </>
  );
}
export function BattlesPage() {
  const query = useCatalog();
  const events = useQuery({
    queryKey: ['battles'],
    queryFn: () =>
      api<
        {
          id: string;
          name: string;
          description: string;
          status: string;
          startsAt: string;
          endsAt: string;
          metric: string;
          rewardPoints: number;
          participants: {
            id: string;
            score: number;
            rank: number | null;
            team: { name: string };
          }[];
        }[]
      >('/battles'),
  });
  if (!query.data) return <State error={query.error?.message} />;
  const standings = query.data.teams
    .map((team) => ({
      ...team,
      territories: query.data!.territories.filter((territory) => territory.teamId === team.id)
        .length,
    }))
    .sort((a, b) => b.xp - a.xp || b.territories - a.territories);
  const leader = standings[0];
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">SEASONAL TEAM COMPETITION</span>
          <h1>The city is in play.</h1>
          <p>
            Scheduled competitions count trusted rides within their event windows. Community XP
            below is lifetime activity.
          </p>
        </div>
        <Badge>{query.data.season?.name || 'BETWEEN SEASONS'}</Badge>
      </div>
      {events.error && <State error={events.error.message} retry={() => events.refetch()} />}
      <div className="team-grid">
        {events.data?.map((battle) => (
          <Panel className="team-card" key={battle.id}>
            <Badge>
              {battle.status === 'ACTIVE' && new Date(battle.startsAt) > new Date()
                ? 'SCHEDULED'
                : battle.status}
            </Badge>
            <Swords size={28} />
            <h2>{battle.name}</h2>
            <p>{battle.description}</p>
            <small>
              {new Date(battle.startsAt).toLocaleDateString()} –{' '}
              {new Date(battle.endsAt).toLocaleDateString()} · {battle.rewardPoints} winning
              contributor points
            </small>
            <div className="social-list">
              {battle.participants.map((entry, index) => (
                <div className="social-row" key={entry.id}>
                  <b>
                    #{entry.rank || index + 1} {entry.team.name}
                  </b>
                  <span>
                    {battle.metric === 'DISTANCE'
                      ? `${number(entry.score / 1000, 1)} km`
                      : `${number(entry.score)} influence`}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      {leader && (
        <Panel className="passport-banner">
          <Swords size={46} />
          <div>
            <Badge>LEADING COMMUNITY</Badge>
            <h2>{leader.name}</h2>
            <p>
              {number(leader.xp)} combined XP · {leader.territories} territories led
            </p>
          </div>
          <span>
            #1<small>CURRENT RANK</small>
          </span>
        </Panel>
      )}
      <Panel>
        <SectionHead title="Live season standings" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Community</th>
                <th>Members</th>
                <th>Territories led</th>
                <th>Combined XP</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr key={team.id}>
                  <td>#{index + 1}</td>
                  <td>
                    <b>{team.name}</b>
                  </td>
                  <td>{team._count.users}</td>
                  <td>{team.territories}</td>
                  <td>{number(team.xp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
type SocialUser = { id: string; name: string; xp: number; team: { name: string } | null };
type FriendConnection = { id: string; user: SocialUser };
type FriendsData = {
  friends: FriendConnection[];
  incoming: FriendConnection[];
  outgoing: FriendConnection[];
  suggestions: SocialUser[];
};
export function FriendsPage() {
  const query = useQuery({ queryKey: ['friends'], queryFn: () => api<FriendsData>('/friends') });
  const send = useAction('/friends/requests', 'Friend request sent.');
  const respond = useAction('/friends/requests/:id', 'Friend request updated.', 'PATCH');
  const remove = useAction('/friends/:id', 'Connection removed.', 'DELETE');
  const session = useSession();
  const invite = useAction(
    `/teams/${session.data?.user?.teamId || 'none'}/invite`,
    'Team invitation sent.',
  );
  if (!query.data) return <State error={query.error?.message} retry={() => query.refetch()} />;
  const Person = ({ user }: { user: SocialUser }) => (
    <div>
      <Link to={`/profiles/${user.id}`}>
        <b>{user.name}</b>
      </Link>
      <small>
        {number(user.xp)} XP · {user.team?.name || 'Independent explorer'}
      </small>
    </div>
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A CITY IS BETTER IN GOOD COMPANY</span>
          <h1>Your city circle.</h1>
          <p>Connect with public explorers. Ride routes and live locations remain private.</p>
          <Link className="text-link" to="/leaderboard">
            Compare friends standings <ArrowUpRight size={14} />
          </Link>
        </div>
        <Badge>{query.data.friends.length} CONNECTIONS</Badge>
      </div>
      {!!query.data.incoming.length && (
        <Panel>
          <SectionHead title="Waiting for you" />
          <div className="social-list">
            {query.data.incoming.map((connection) => (
              <div className="social-row" key={connection.id}>
                <Person user={connection.user} />
                <div>
                  <Button
                    busy={respond.isPending}
                    onClick={() => {
                      respond.mutate({ id: connection.id, status: 'ACCEPTED' });
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    tone="ghost"
                    onClick={() => {
                      respond.mutate({ id: connection.id, status: 'DECLINED' });
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="recommendation-grid">
        <Panel>
          <SectionHead title="Your connections" />
          <div className="social-list">
            {query.data.friends.map((connection) => (
              <div className="social-row" key={connection.id}>
                <Person user={connection.user} />
                {session.data?.user?.teamId && (
                  <Button
                    tone="secondary"
                    busy={invite.isPending}
                    onClick={() => invite.mutate({ userId: connection.user.id })}
                  >
                    Invite to team
                  </Button>
                )}
                <Button
                  tone="ghost"
                  aria-label={`Remove ${connection.user.name}`}
                  onClick={() => {
                    remove.mutate({ id: connection.id });
                  }}
                >
                  <UserMinus size={16} />
                </Button>
              </div>
            ))}
            {!query.data.friends.length && (
              <p className="muted">Your first connection is a hello away.</p>
            )}
          </div>
        </Panel>
        <Panel>
          <SectionHead title="Meet public explorers" />
          <div className="social-list">
            {query.data.suggestions.map((user) => (
              <div className="social-row" key={user.id}>
                <Person user={user} />
                <Button
                  tone="secondary"
                  aria-label={`Add ${user.name}`}
                  busy={send.isPending}
                  onClick={() => send.mutate({ userId: user.id })}
                >
                  <UserPlus size={16} /> Add
                </Button>
              </div>
            ))}
            {!query.data.suggestions.length && (
              <p className="muted">You have met everyone available right now.</p>
            )}
          </div>
          {!!query.data.outgoing.length && (
            <p className="muted">{query.data.outgoing.length} request(s) waiting for a response.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
export function PassportPage({ achievements = false }: { achievements?: boolean }) {
  const catalog = useCatalog();
  const dash = useDashboard();
  if (!catalog.data || !dash.data)
    return <State error={catalog.error?.message || dash.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">COLLECT PLACES, NOT JUST KILOMETERS</span>
          <h1>
            {achievements ? 'The little things you’ve earned.' : 'Your city, chapter by chapter.'}
          </h1>
          <p>
            {achievements
              ? 'Achievements unlock from completed rides.'
              : 'Landmark stamps are awarded when a completed simulated route passes within 250 meters.'}
          </p>
        </div>
        <Badge>
          {achievements
            ? dash.data.achievements.length
            : `${dash.data.stamps.length} / ${catalog.data.landmarks.length}`}{' '}
          COLLECTED
        </Badge>
      </div>
      {achievements ? (
        <div className="passport-grid">
          {catalog.data.achievements.map((a) => (
            <Panel className="passport-card" key={a.id}>
              <span className="stamp-icon">
                <Trophy size={50} strokeWidth={1} />
              </span>
              <h2>{a.name}</h2>
              <p>{a.description}</p>
              <Badge>
                {dash.data!.achievements.some((e) => e.achievementId === a.id)
                  ? 'UNLOCKED'
                  : 'YOUR NEXT MILESTONE'}
              </Badge>
            </Panel>
          ))}
        </div>
      ) : (
        <>
          <div className="passport-banner">
            <Compass size={65} strokeWidth={1} />
            <div>
              <span className="eyebrow">TASHKENT CITY PASSPORT</span>
              <h2>Some places stay with you.</h2>
              <p>A collection of your city adventures, one stamp at a time.</p>
            </div>
            <span>
              01
              <br />
              <small>UZBEKISTAN</small>
            </span>
          </div>
          <div className="passport-grid">
            {catalog.data.landmarks.map((l, i) => {
              const stamp = dash.data!.stamps.find((s) => s.landmarkId === l.id);
              return (
                <Panel className={`passport-card ${stamp ? 'stamped' : ''}`} key={l.id}>
                  <span className={`stamp-icon color-${i % 3}`}>
                    {i % 3 === 0 ? (
                      <Compass size={52} strokeWidth={1} />
                    ) : i % 3 === 1 ? (
                      <Leaf size={52} strokeWidth={1} />
                    ) : (
                      <MapPin size={52} strokeWidth={1} />
                    )}
                  </span>
                  <span className="eyebrow">TASHKENT · {l.district.toUpperCase()}</span>
                  <h3>{l.name}</h3>
                  <Badge tone={stamp ? '' : 'neutral'}>
                    {stamp ? 'STAMP COLLECTED' : 'WAITING TO BE DISCOVERED'}
                  </Badge>
                  {stamp && <small>{new Date(stamp.earnedAt).toLocaleDateString()}</small>}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
export function RewardsPage() {
  const catalog = useCatalog();
  const dash = useDashboard();
  const [selected, setSelected] = useState<string | null>(null);
  const redeem = useAction<{ code: string }>(
    `/rewards/${selected || 'none'}/redeem`,
    'Reward saved to your account.',
  );
  if (!catalog.data || !dash.data)
    return <State error={catalog.error?.message || dash.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GOOD THINGS COME TO THOSE WHO RIDE</span>
          <h1>A little thank you for going further.</h1>
          <p>Loyalty points are redeemable. XP is your progress. Keep the two separate.</p>
        </div>
        <div className="points-wallet">
          <Gift size={24} />
          <div>
            <b>{number(dash.data.user.points)}</b>
            <span>loyalty points</span>
          </div>
        </div>
      </div>
      <div className="reward-grid">
        {catalog.data.rewards.map((reward, i) => (
          <Panel className="reward-card" key={reward.id}>
            <div className={`reward-art color-${i}`}>
              <Gift size={68} strokeWidth={1} />
              <Sparkles size={20} />
            </div>
            <Badge tone="neutral">
              {reward.kind === 'CREDIT'
                ? 'DEMO RIDE CREDIT'
                : reward.kind === 'VOUCHER'
                  ? 'ILLUSTRATIVE PARTNER'
                  : 'DEMO COSMETIC'}
            </Badge>
            <h3>{reward.name}</h3>
            <p>{reward.description}</p>
            <span className="reward-stock">{reward.stock} available</span>
            <div>
              <b>
                {reward.cost}
                <small> points</small>
              </b>
              <Button onClick={() => setSelected(reward.id)} disabled={!reward.stock}>
                Redeem
                <ArrowUpRight size={16} />
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      <Panel className="redemption-history">
        <SectionHead title="Good things, collected." />
        {dash.data.redemptions.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reward</th>
                  <th>Demo voucher</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {dash.data.redemptions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.reward.name}</td>
                    <td>
                      <code>{r.code}</code>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Your first reward is waiting. Collect points by riding and completing missions.
          </p>
        )}
      </Panel>
      {selected && (
        <Modal title="A little reward, earned." close={() => setSelected(null)}>
          <p>{catalog.data.rewards.find((r) => r.id === selected)?.name}</p>
          <p className="muted">
            This uses your loyalty points and demo reward inventory. Vouchers have no real
            commercial value.
          </p>
          <Button
            busy={redeem.isPending}
            onClick={() =>
              redeem
                .mutateAsync({ key: crypto.randomUUID() })
                .then(() => setSelected(null))
                .catch(() => {})
            }
          >
            Confirm redemption
            <Gift size={16} />
          </Button>
        </Modal>
      )}
    </>
  );
}
export function SeasonsPage() {
  const query = useCatalog();
  const history = useQuery({
    queryKey: ['seasons'],
    queryFn: () =>
      api<
        {
          id: string;
          name: string;
          status: string;
          startsAt: string;
          endsAt: string;
          standings: { id: string; name: string; rank: number; score: number }[];
        }[]
      >('/seasons'),
  });
  if (!query.data) return <State error={query.error?.message} />;
  const season = query.data.season;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">EVERY SEASON, A NEW STORY</span>
          <h1>{season?.name || 'Between seasons.'}</h1>
          <p>
            Seasonal influence starts fresh each chapter. Your lifetime XP and saved results remain.
          </p>
        </div>
        <Badge>SEASON 01</Badge>
      </div>
      <Panel className="season-detail">
        <Trophy size={60} strokeWidth={1} />
        <h2>A city made by the people who explore it.</h2>
        <p>
          Earn XP through valid ride distance and mission completions. Territory influence belongs
          to a season and never provides real property rights.
        </p>
        {season && (
          <p>
            {new Date(season.startsAt).toLocaleDateString()} —{' '}
            {new Date(season.endsAt).toLocaleDateString()}
          </p>
        )}
        <div className="notice">
          No speed bonuses. No paid competitive advantages. Daily caps apply to ride XP and
          influence.
        </div>
        <Link to="/leaderboard" className="button">
          Meet the explorers
          <ArrowUpRight size={16} />
        </Link>
      </Panel>
      {history.error && <State error={history.error.message} retry={() => history.refetch()} />}
      {history.data
        ?.filter((entry) => entry.status === 'CLOSED')
        .map((entry) => (
          <Panel key={entry.id}>
            <SectionHead title={`${entry.name} · Final results`} />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Explorer</th>
                    <th>Influence</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.standings.map((standing) => (
                    <tr key={standing.id}>
                      <td>#{standing.rank}</td>
                      <td>{standing.name}</td>
                      <td>{number(standing.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!entry.standings.length && (
                <p className="muted">No contributions were recorded in this season.</p>
              )}
            </div>
          </Panel>
        ))}
    </>
  );
}
export function RoutesPage() {
  const catalog = useCatalog();
  if (!catalog.data) return <State error={catalog.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">TAKE THE INTERESTING TURN</span>
          <h1>A different side of your city.</h1>
          <p>
            Curated demo routes. Conditions and cycle infrastructure require local review before
            real rides.
          </p>
        </div>
      </div>
      <div className="route-detail">
        <Suspense fallback={<State />}>
          <CityMap data={catalog.data} />
        </Suspense>
        <Panel>
          <Badge>BEGINNER · CITY DISCOVERY</Badge>
          <h2>Amir Temur & Anhor Loop</h2>
          <p>
            A central city demonstration loop, from Amir Temur Square toward the Anhor canal and
            back.
          </p>
          <div className="route-facts">
            <span>
              <Route size={19} />
              About 5 km
            </span>
            <span>
              <Clock size={19} />
              27 demo minutes
            </span>
            <span>
              <Bike size={19} />
              City & electric
            </span>
          </div>
          <div className="notice">
            Demonstration geometry only. This is not verified turn-by-turn cycling guidance. Follow
            local road conditions and park at marked stations.
          </div>
          <Link to="/bikes" className="button">
            Find a bike at Amir Temur
            <ArrowUpRight size={16} />
          </Link>
        </Panel>
      </div>
    </>
  );
}
