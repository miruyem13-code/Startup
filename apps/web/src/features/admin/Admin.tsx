import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dateTimeLocal } from '../../lib/dates';
import { missionEligibilitySchema } from '../../../../../packages/shared/schemas';
import {
  Bike,
  Users,
  Clock,
  TrendingUp,
  Plus,
  Search,
  ArrowUpRight,
  Flag,
  Download,
  ShieldCheck,
  MapPin,
  Wrench,
  BarChart3,
  Archive,
} from 'lucide-react';
import {
  Panel,
  Badge,
  Button,
  Metric,
  SectionHead,
  State,
  Modal,
} from '../../../../../packages/ui';
import { useCatalog, useAction } from '../../lib/hooks';
import { api, money, number, type Analytics, type Catalog } from '../../lib/api';
import { ActivityChart } from '../dashboard/Dashboard';
export const useAnalytics = (days = 30) =>
  useQuery({
    queryKey: ['analytics', days],
    queryFn: () => api<Analytics>(`/admin/analytics?days=${days}`),
  });
export function AdminOverview() {
  const [days, setDays] = useState(30);
  const query = useAnalytics(days);
  if (!query.data) return <State error={query.error?.message} />;
  const { stats, chart, stationDemand } = query.data;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">VELOCITY OPERATIONS CENTER</span>
          <h1>A city in motion. A clear view.</h1>
          <p>Database-backed operations · fictional Tashkent pilot · simulated revenue</p>
        </div>
        <select
          aria-label="Analytics period"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <div className="metrics-grid">
        <Metric
          icon={<Bike size={19} />}
          label="Fleet availability"
          value={String(stats.available)}
          unit={`/ ${stats.bikes}`}
          note={`${stats.reserved} reserved · ${stats.active} in use`}
        />
        <Metric
          icon={<Clock size={19} />}
          label="Completed rentals"
          value={number(stats.rides)}
          note={`In selected ${days}-day period`}
        />
        <Metric
          icon={<Users size={19} />}
          label="Active riders"
          value={number(stats.activeUsers)}
          note={`${stats.users} registered accounts`}
        />
        <Metric
          icon={<TrendingUp size={19} />}
          label="Simulated rental revenue"
          value={number(stats.revenue)}
          unit="UZS"
          note="Demo transactions · not verified revenue"
        />
      </div>
      <div className="admin-overview-grid">
        <Panel>
          <SectionHead title="The pilot in motion.">
            <Badge>SIMULATED REVENUE</Badge>
          </SectionHead>
          <ActivityChart data={chart} dataKey="revenue" unit="UZS" />
        </Panel>
        <Panel className="operations-health">
          <SectionHead title="Fleet at a glance." />
          <div>
            <i className="green-dot" />
            Available bikes<b>{stats.available}</b>
          </div>
          <div>
            <i className="amber-dot" />
            Reserved<b>{stats.reserved}</b>
          </div>
          <div>
            <i className="blue-dot" />
            In use<b>{stats.active}</b>
          </div>
          <div>
            <i className="red-dot" />
            Maintenance<b>{stats.maintenance}</b>
          </div>
          <Link to="/admin/bikes" className="text-link">
            Open fleet operations
            <ArrowUpRight size={16} />
          </Link>
        </Panel>
        <Panel>
          <SectionHead title="Where the journeys start." />
          <div className="demand-bars">
            {stationDemand
              .sort((a, b) => b.rides - a.rides)
              .slice(0, 7)
              .map((s) => (
                <div key={s.name}>
                  <span>{s.name}</span>
                  <div>
                    <i style={{ width: `${(s.rides / Math.max(1, stats.rides)) * 600}%` }} />
                  </div>
                  <b>{s.rides}</b>
                </div>
              ))}
          </div>
        </Panel>
        <Panel className="operations-summary">
          <SectionHead title="A little more context." />
          <div>
            <Flag size={20} />
            <span>Completed missions</span>
            <b>{stats.missions}</b>
          </div>
          <div>
            <Clock size={20} />
            <span>Average ride duration</span>
            <b>{stats.averageDuration} min</b>
          </div>
          <div>
            <BarChart3 size={20} />
            <span>Bikes used in period</span>
            <b>{stats.utilization}%</b>
          </div>
          <div>
            <Wrench size={20} />
            <span>Open issue reports</span>
            <b>{query.data.issues.filter((i) => i.status === 'OPEN').length}</b>
          </div>
          <Link to="/admin/investor-overview" className="text-link">
            Explore the business model
            <ArrowUpRight size={16} />
          </Link>
        </Panel>
      </div>
    </>
  );
}
type BikeForm = {
  code: string;
  type: 'CITY' | 'ELECTRIC';
  status: 'AVAILABLE' | 'MAINTENANCE' | 'OFFLINE';
  stationId: string;
  battery: number;
};
export function AdminFleet() {
  const catalog = useCatalog();
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<BikeForm>({
    code: 'V-121',
    type: 'CITY',
    status: 'AVAILABLE',
    stationId: 'station-0',
    battery: 100,
  });
  const save = useAction(
    editing && editing !== 'new' ? `/admin/bikes/${editing}` : '/admin/bikes',
    'Fleet record saved and audited.',
    editing && editing !== 'new' ? 'PATCH' : 'POST',
  );
  const archive = useAction(
    `/admin/bikes/${editing || 'none'}`,
    'Bicycle archived and audited.',
    'DELETE',
  );
  if (!catalog.data) return <State error={catalog.error?.message} />;
  const data = catalog.data;
  function edit(b: Catalog['bikes'][number]) {
    setForm({
      code: b.code,
      type: b.type as BikeForm['type'],
      status: b.status as BikeForm['status'],
      stationId: b.stationId,
      battery: b.battery,
    });
    setEditing(b.id);
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">EVERY BIKE, ACCOUNTED FOR</span>
          <h1>Fleet operations.</h1>
          <p>Live demo inventory. Active rentals are protected from administrative edits.</p>
        </div>
        <Button
          onClick={() => {
            setForm({
              code: `V-${String(data.bikes.length + 1).padStart(3, '0')}`,
              type: 'CITY',
              status: 'AVAILABLE',
              stationId: 'station-0',
              battery: 100,
            });
            setEditing('new');
          }}
        >
          <Plus size={17} />
          Add bicycle
        </Button>
      </div>
      <div className="filter-bar">
        <div className="search-input">
          <Search size={16} />
          <input
            placeholder="Bike ID or station"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <select
          aria-label="Bike status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {['ALL', 'AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'OFFLINE'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Badge>{data.bikes.length} DEMO BIKES</Badge>
      </div>
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Bicycle</th>
                <th>Type</th>
                <th>Station</th>
                <th>Status</th>
                <th>Lock battery</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.bikes
                .filter(
                  (b) =>
                    (status === 'ALL' || b.status === status) &&
                    `${b.code} ${b.station.name}`.toLowerCase().includes(term.toLowerCase()),
                )
                .map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.code}</b>
                    </td>
                    <td>{b.type}</td>
                    <td>{b.station.name}</td>
                    <td>
                      <Badge tone={b.status === 'AVAILABLE' ? '' : 'neutral'}>{b.status}</Badge>
                    </td>
                    <td>{b.battery}%</td>
                    <td>
                      <Button
                        tone="ghost"
                        disabled={['IN_USE', 'RESERVED'].includes(b.status)}
                        onClick={() => edit(b)}
                      >
                        Edit
                        <ArrowUpRight size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {editing && (
        <Modal
          title={editing === 'new' ? 'A new bike for a moving city.' : 'Edit bicycle'}
          close={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save
                .mutateAsync(form)
                .then(() => setEditing(null))
                .catch(() => {});
            }}
          >
            <label>
              Bike code
              <input
                value={form.code}
                pattern="V-[0-9]{3,5}"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as BikeForm['type'] })}
                >
                  <option>CITY</option>
                  <option>ELECTRIC</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as BikeForm['status'] })
                  }
                >
                  <option>AVAILABLE</option>
                  <option>MAINTENANCE</option>
                  <option>OFFLINE</option>
                </select>
              </label>
            </div>
            <label>
              Station
              <select
                value={form.stationId}
                onChange={(e) => setForm({ ...form, stationId: e.target.value })}
              >
                {data.stations.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Demo lock battery (%)
              <input
                type="number"
                min={0}
                max={100}
                value={form.battery}
                onChange={(e) => setForm({ ...form, battery: Number(e.target.value) })}
                required
              />
            </label>
            <Button type="submit" busy={save.isPending}>
              Save bicycle
              <ShieldCheck size={16} />
            </Button>
            {editing !== 'new' && (
              <Button
                type="button"
                tone="danger"
                busy={archive.isPending}
                onClick={() =>
                  archive
                    .mutateAsync({})
                    .then(() => setEditing(null))
                    .catch(() => {})
                }
              >
                Archive bicycle <Archive size={16} />
              </Button>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
type Mission = {
  id: string;
  name: string;
  description: string;
  points: number;
  startsAt: string;
  endsAt: string;
  difficulty: string;
  eligibility: unknown;
  sponsorId: string | null;
  participants: { progress: number; completedAt: string | null }[];
  category: string;
  target: number;
  xp: number;
  status: string;
  _count: { participants: number };
};
export function AdminMissions() {
  const sponsors = useQuery({
    queryKey: ['admin-sponsors'],
    queryFn: () => api<{ id: string; name: string; status: string }[]>('/admin/sponsors'),
  });
  const query = useQuery({
    queryKey: ['admin-missions'],
    queryFn: () => api<Mission[]>('/admin/missions'),
  });
  const [open, setOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [changing, setChanging] = useState<Mission | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'DISTANCE',
    target: 3000,
    xp: 150,
    points: 40,
    status: 'DRAFT',
    difficulty: 'EASY',
    eligibility: missionEligibilitySchema.parse({}),
    sponsorId: null as string | null,
    startsAt: dateTimeLocal(new Date()),
    endsAt: dateTimeLocal(new Date(Date.now() + 14 * 86400000)),
  });
  const save = useAction(
    editingMission ? `/admin/missions/${editingMission.id}` : '/admin/missions',
    'Mission saved and audited.',
    editingMission ? 'PATCH' : 'POST',
  );
  const status = useAction(
    `/admin/missions/${changing?.id || 'none'}/status`,
    'Mission status updated.',
    'PATCH',
  );
  const archive = useAction(
    `/admin/missions/${changing?.id || 'none'}`,
    'Mission archived and audited.',
    'DELETE',
  );
  if (!query.data) return <State error={query.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GIVE THE CITY A REASON TO MOVE</span>
          <h1>Mission studio.</h1>
          <p>
            Published missions become available to riders immediately. Rewards require backend ride
            events.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingMission(null);
            setForm({
              ...form,
              name: '',
              description: '',
              startsAt: dateTimeLocal(new Date()),
              endsAt: dateTimeLocal(new Date(Date.now() + 14 * 86400000)),
            });
            setOpen(true);
          }}
        >
          <Plus size={17} />
          Create mission
        </Button>
      </div>
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mission</th>
                <th>Category</th>
                <th>Target</th>
                <th>XP reward</th>
                <th>Participants</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((m) => (
                <tr key={m.id}>
                  <td>
                    <b>{m.name}</b>
                  </td>
                  <td>{m.category}</td>
                  <td>{m.target}</td>
                  <td>+{m.xp} XP</td>
                  <td>
                    {m._count.participants} joined ·{' '}
                    {m.participants.filter((entry) => entry.completedAt).length} completed
                  </td>
                  <td>
                    <Badge tone={m.status === 'PUBLISHED' ? '' : 'neutral'}>{m.status}</Badge>
                  </td>
                  <td>
                    {m.status !== 'ARCHIVED' && (
                      <Button
                        tone="ghost"
                        onClick={() => {
                          setEditingMission(m);
                          setForm({
                            name: m.name,
                            description: m.description,
                            category: m.category,
                            target: m.target,
                            xp: m.xp,
                            points: m.points,
                            status: m.status,
                            difficulty: m.difficulty,
                            eligibility: missionEligibilitySchema.parse(m.eligibility),
                            sponsorId: m.sponsorId,
                            startsAt: dateTimeLocal(m.startsAt),
                            endsAt: dateTimeLocal(m.endsAt),
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {m.status === 'ARCHIVED' ? (
                      <Badge tone="neutral">RETAINED</Badge>
                    ) : (
                      <Button tone="ghost" onClick={() => setChanging(m)}>
                        {m.status === 'PUBLISHED' ? 'Pause' : 'Publish'}
                        <ArrowUpRight size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {open && (
        <Modal
          title={editingMission ? 'Edit mission' : 'A new reason to ride.'}
          close={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save
                .mutateAsync({
                  ...form,
                  startsAt: editingMission?._count.participants
                    ? editingMission.startsAt
                    : new Date(form.startsAt).toISOString(),
                  endsAt: new Date(form.endsAt).toISOString(),
                })
                .then(() => setOpen(false))
                .catch(() => {});
            }}
          >
            <label>
              Mission name
              <input
                minLength={3}
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                minLength={10}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Requirement
                <select
                  value={form.category}
                  disabled={!!editingMission?._count.participants}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="DISTANCE">Distance (meters)</option>
                  <option value="RIDES">Completed rides</option>
                  <option value="EXPLORATION">Territory visits</option>
                  <option value="DURATION">Riding time (seconds)</option>
                  <option value="INFLUENCE">Earned influence</option>
                  <option value="ROUTE">Completed demo city loops</option>
                  <option value="DISTRICTS">Distinct districts</option>
                  <option value="ACTIVE_DAYS">Separate active days</option>
                  <option value="MISSIONS">Completed missions during this window</option>
                </select>
              </label>
              <label>
                Target
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={form.target}
                  disabled={!!editingMission?._count.participants}
                  onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                XP reward
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={form.xp}
                  disabled={!!editingMission?._count.participants}
                  onChange={(e) => setForm({ ...form, xp: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Loyalty points
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={form.points}
                  disabled={!!editingMission?._count.participants}
                  onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <label>
              Starts (local device time)
              <input
                type="datetime-local"
                disabled={!!editingMission?._count.participants}
                required
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              />
            </label>
            {editingMission?._count.participants ? (
              <p className="muted">Joined missions preserve their requirements and rewards.</p>
            ) : null}
            <label>
              Difficulty
              <select
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
              >
                {['EASY', 'MEDIUM', 'HARD'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Approved sponsor
              <select
                disabled={!!editingMission?._count.participants}
                value={form.sponsorId || ''}
                onChange={(event) => setForm({ ...form, sponsorId: event.target.value || null })}
              >
                <option value="">Community mission</option>
                {sponsors.data
                  ?.filter(
                    (sponsor) => sponsor.status === 'APPROVED' || sponsor.id === form.sponsorId,
                  )
                  .map((sponsor) => (
                    <option value={sponsor.id} key={sponsor.id}>
                      {sponsor.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset disabled={!!editingMission?._count.participants}>
              <legend>Eligibility and ride requirements</legend>
              <div className="form-row">
                <label>
                  Minimum XP
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    value={form.eligibility.minXp}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eligibility: { ...form.eligibility, minXp: Number(event.target.value) },
                      })
                    }
                  />
                </label>
                <label>
                  Maximum XP (optional)
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    value={form.eligibility.maxXp ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eligibility: {
                          ...form.eligibility,
                          maxXp: event.target.value ? Number(event.target.value) : null,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.eligibility.teamRequired}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      eligibility: { ...form.eligibility, teamRequired: event.target.checked },
                    })
                  }
                />
                Require team membership
              </label>
              <label>
                Required district (optional)
                <input
                  maxLength={80}
                  value={form.eligibility.district || ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      eligibility: { ...form.eligibility, district: event.target.value || null },
                    })
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  Earliest start hour (Tashkent)
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={form.eligibility.hourStart ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eligibility: {
                          ...form.eligibility,
                          hourStart: event.target.value ? Number(event.target.value) : null,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Latest start hour (exclusive)
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={form.eligibility.hourEnd ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eligibility: {
                          ...form.eligibility,
                          hourEnd: event.target.value ? Number(event.target.value) : null,
                        },
                      })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <label>
              Deadline (local device time)
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                required
              />
            </label>
            <label>
              Publication
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>DRAFT</option>
                <option>PUBLISHED</option>
                <option>PAUSED</option>
              </select>
            </label>
            <Button type="submit" busy={save.isPending}>
              {editingMission ? 'Save mission' : 'Create mission'}
              <Flag size={16} />
            </Button>
          </form>
        </Modal>
      )}
      {changing && (
        <Modal
          title={changing.status === 'PUBLISHED' ? 'Pause this mission?' : 'Publish this mission?'}
          close={() => setChanging(null)}
        >
          <p>{changing.name}</p>
          <p className="muted">
            This change is audited. Published missions appear in the rider application.
          </p>
          <Button
            busy={status.isPending}
            onClick={() =>
              status
                .mutateAsync({ status: changing.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED' })
                .then(() => setChanging(null))
                .catch(() => {})
            }
          >
            Confirm change
            <ShieldCheck size={16} />
          </Button>
          <Button
            tone="danger"
            busy={archive.isPending}
            onClick={() =>
              archive
                .mutateAsync({})
                .then(() => setChanging(null))
                .catch(() => {})
            }
          >
            Archive mission <Archive size={16} />
          </Button>
        </Modal>
      )}
    </>
  );
}
export function AdminStations() {
  const query = useCatalog();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    district: 'Yunusabad',
    lat: 41.3118,
    lng: 69.2702,
    capacity: 16,
  });
  const save = useAction(
    editing === 'new' ? '/admin/stations' : `/admin/stations/${editing}`,
    'Station saved and audited.',
    editing === 'new' ? 'POST' : 'PATCH',
  );
  const archive = useAction(
    `/admin/stations/${editing || 'none'}`,
    'Station and its idle bicycles were archived.',
    'DELETE',
  );
  if (!query.data) return <State error={query.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A PLACE FOR EVERY JOURNEY</span>
          <h1>The city’s starting points.</h1>
          <p>Manage station geometry and docking capacity.</p>
        </div>
        <Button
          onClick={() => {
            setForm({ name: '', district: 'Yunusabad', lat: 41.3118, lng: 69.2702, capacity: 16 });
            setEditing('new');
          }}
        >
          <Plus size={16} />
          Add station
        </Button>
      </div>
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>District</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Available</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {query.data.stations.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.name}</b>
                  </td>
                  <td>{s.district}</td>
                  <td>
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </td>
                  <td>{s.capacity}</td>
                  <td>
                    {
                      query.data!.bikes.filter(
                        (b) => b.stationId === s.id && b.status === 'AVAILABLE',
                      ).length
                    }
                  </td>
                  <td>
                    <Button
                      tone="ghost"
                      onClick={() => {
                        setForm({
                          name: s.name,
                          district: s.district,
                          lat: s.lat,
                          lng: s.lng,
                          capacity: s.capacity,
                        });
                        setEditing(s.id);
                      }}
                    >
                      Edit
                      <ArrowUpRight size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {editing && (
        <Modal title="Station details" close={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save
                .mutateAsync(form)
                .then(() => setEditing(null))
                .catch(() => {});
            }}
          >
            {(['name', 'district', 'lat', 'lng', 'capacity'] as const).map((key) => (
              <label key={key}>
                {key.toUpperCase()}
                <input
                  type={key === 'name' || key === 'district' ? 'text' : 'number'}
                  step={key === 'lat' || key === 'lng' ? '0.0001' : '1'}
                  value={form[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]:
                        key === 'name' || key === 'district'
                          ? e.target.value
                          : Number(e.target.value),
                    })
                  }
                  required
                />
              </label>
            ))}
            <Button type="submit" busy={save.isPending}>
              Save station
              <MapPin size={16} />
            </Button>
            {editing !== 'new' && (
              <Button
                type="button"
                tone="danger"
                busy={archive.isPending}
                onClick={() =>
                  archive
                    .mutateAsync({})
                    .then(() => setEditing(null))
                    .catch(() => {})
                }
              >
                Archive station <Archive size={16} />
              </Button>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
export function AdminRecords() {
  const location = useLocation();
  const query = useAnalytics();
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      api<
        { id: string; name: string; role: string; createdAt: Date; _count: { rentals: number } }[]
      >('/admin/users'),
    enabled: location.pathname.endsWith('/users'),
  });
  const [issue, setIssue] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState({
    severity: 'NORMAL',
    technician: '',
    notes: '',
    status: 'OPEN',
    takeOffline: false,
  });
  const saveIssue = useAction(
    '/admin/maintenance/:id',
    'Maintenance record saved and audited.',
    'PATCH',
  );
  const resolve = useAction(
    `/admin/maintenance/${issue}/resolve`,
    'Issue marked resolved and audited.',
  );
  if (!query.data) return <State error={query.error?.message} />;
  const type = location.pathname.split('/').pop();
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">VELOCITY · OPERATIONAL RECORDS</span>
          <h1>
            {type === 'audit-logs'
              ? 'A clear record of every change.'
              : type === 'users'
                ? 'The people behind the journeys.'
                : type === 'maintenance'
                  ? 'A little care keeps the city moving.'
                  : 'The pilot, on record.'}
          </h1>
          <p>Authoritative database records. Read access is restricted to administrators.</p>
        </div>
        {type === 'reports' && (
          <div className="hero-actions">
            {[
              'rentals',
              'inventory',
              'stations',
              'missions',
              'territories',
              'rewards',
              'revenue',
              'activity',
            ].map((dataset) => (
              <a
                className="button secondary"
                key={dataset}
                href={`/api/admin/reports/${dataset}.csv`}
              >
                <Download size={16} />
                {dataset} CSV
              </a>
            ))}
          </div>
        )}
      </div>
      <Panel>
        <div className="table-scroll">
          {type === 'audit-logs' ? (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Change summary</th>
                </tr>
              </thead>
              <tbody>
                {query.data.audits.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>{a.actor.name}</td>
                    <td>{a.action}</td>
                    <td>{a.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : type === 'users' ? (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Rides</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>
                      <Badge tone="neutral">{u.role}</Badge>
                    </td>
                    <td>{u._count.rentals}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : type === 'maintenance' ? (
            <table>
              <thead>
                <tr>
                  <th>Bike</th>
                  <th>Reported issue</th>
                  <th>Status</th>
                  <th>Priority / technician</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.issues.map((i) => (
                  <tr key={i.id}>
                    <td>{i.bike.code}</td>
                    <td>{i.description}</td>
                    <td>{i.status}</td>
                    <td>
                      {i.severity} · {i.technician || 'Unassigned'}
                    </td>
                    <td>
                      <Button
                        tone="ghost"
                        onClick={() => {
                          setIssue(i.id);
                          setMaintenance({
                            severity: i.severity,
                            technician: i.technician || '',
                            notes: i.notes,
                            status: i.status,
                            takeOffline: false,
                          });
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Rental</th>
                  <th>Completed</th>
                  <th>Distance</th>
                  <th>Duration</th>
                  <th>Demo revenue</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rentals.map((r) => (
                  <tr key={r.id}>
                    <td>{r.bike.code}</td>
                    <td>{r.endedAt ? new Date(r.endedAt).toLocaleString() : ''}</td>
                    <td>{number(r.distanceM / 1000, 1)} km</td>
                    <td>{Math.ceil(r.durationSec / 60)} min</td>
                    <td>{money(r.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {((type === 'audit-logs' && !query.data.audits.length) ||
          (type === 'maintenance' && !query.data.issues.length)) && (
          <State
            empty={
              type === 'audit-logs'
                ? 'Your audit trail begins with your first change.'
                : 'No reported issues. A good day for a ride.'
            }
          />
        )}
      </Panel>
      {issue && (
        <Modal title="Resolve this maintenance issue?" close={() => setIssue(null)}>
          <p>
            This closes the report. Bicycle operational status remains a separate fleet decision.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveIssue
                .mutateAsync({
                  id: issue,
                  ...maintenance,
                  technician: maintenance.technician || null,
                })
                .then(() => setIssue(null))
                .catch(() => {});
            }}
          >
            <label>
              Priority
              <select
                value={maintenance.severity}
                onChange={(event) =>
                  setMaintenance({ ...maintenance, severity: event.target.value })
                }
              >
                {['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Assigned technician
              <input
                maxLength={80}
                value={maintenance.technician}
                onChange={(event) =>
                  setMaintenance({ ...maintenance, technician: event.target.value })
                }
              />
            </label>
            <label>
              Status
              <select
                value={maintenance.status}
                onChange={(event) => setMaintenance({ ...maintenance, status: event.target.value })}
              >
                {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Service notes
              <textarea
                maxLength={2000}
                value={maintenance.notes}
                onChange={(event) => setMaintenance({ ...maintenance, notes: event.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={maintenance.takeOffline}
                onChange={(event) =>
                  setMaintenance({ ...maintenance, takeOffline: event.target.checked })
                }
              />
              Take idle bicycle out of rental service
            </label>
            <Button type="submit" busy={saveIssue.isPending}>
              Save maintenance record
            </Button>
          </form>
          <Button
            busy={resolve.isPending}
            onClick={() =>
              resolve
                .mutateAsync({})
                .then(() => setIssue(null))
                .catch(() => {})
            }
          >
            Mark resolved
            <Wrench size={16} />
          </Button>
        </Modal>
      )}
    </>
  );
}
export function InvestorOverview() {
  const query = useAnalytics();
  const [assumptions, setAssumptions] = useState({
    bikes: 120,
    acquisition: 4500000,
    rides: 3,
    minutes: 20,
    maintenance: 100000,
    logistics: 12000000,
    fee: 3,
  });
  if (!query.data) return <State error={query.error?.message} />;
  const gross = assumptions.bikes * assumptions.rides * 30 * (2000 + 400 * assumptions.minutes);
  const costs =
    assumptions.bikes * assumptions.maintenance +
    assumptions.logistics +
    Math.round((gross * assumptions.fee) / 100);
  const margin = gross - costs;
  const payback = margin > 0 ? (assumptions.bikes * assumptions.acquisition) / margin : null;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A CLEAR VIEW OF THE OPPORTUNITY</span>
          <h1>Movement, with a business behind it.</h1>
          <p>
            Demo operations and illustrative projections are presented separately. No verified
            commercial results.
          </p>
        </div>
        <Badge>INVESTOR WORKSPACE</Badge>
      </div>
      <div className="metrics-grid">
        <Metric
          icon={<Bike size={19} />}
          label="Demo rides · 30 days"
          value={number(query.data.stats.rides)}
          note="Completed database rentals"
        />
        <Metric
          icon={<Users size={19} />}
          label="Demo active users"
          value={number(query.data.stats.activeUsers)}
          note="Unique users with completed rides"
        />
        <Metric
          icon={<TrendingUp size={19} />}
          label="Demo fleet used"
          value={String(query.data.stats.utilization)}
          unit="%"
          note="Bikes with at least one completed ride"
        />
        <Metric
          icon={<Clock size={19} />}
          label="Average demo duration"
          value={String(query.data.stats.averageDuration)}
          unit="min"
          note="Derived from completed rentals"
        />
      </div>
      <Panel className="projection-panel">
        <SectionHead title="What could a month in motion look like?">
          <Badge tone="warning">ILLUSTRATIVE ASSUMPTIONS</Badge>
        </SectionHead>
        <div className="scenario-buttons">
          {[
            { name: 'Conservative', rides: 1.5 },
            { name: 'Base case', rides: 3 },
            { name: 'Optimistic', rides: 5 },
          ].map((s) => (
            <Button
              key={s.name}
              tone="secondary"
              onClick={() => setAssumptions({ ...assumptions, rides: s.rides })}
            >
              {s.name}
            </Button>
          ))}
        </div>
        <div className="projection-inputs">
          {[
            { key: 'bikes', name: 'Bicycles', min: 1, max: 10000 },
            { key: 'acquisition', name: 'Acquisition per bike (UZS)', min: 100000, max: 100000000 },
            { key: 'rides', name: 'Rides per bike per day', min: 0.1, max: 20 },
            { key: 'minutes', name: 'Average ride (minutes)', min: 1, max: 180 },
            {
              key: 'maintenance',
              name: 'Monthly maintenance per bike (UZS)',
              min: 0,
              max: 10000000,
            },
            { key: 'logistics', name: 'Monthly logistics (UZS)', min: 0, max: 1000000000 },
            { key: 'fee', name: 'Payment processing (%)', min: 0, max: 20 },
          ].map((f) => (
            <label key={f.key}>
              {f.name}
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.key === 'rides' ? '0.1' : '1'}
                value={assumptions[f.key as keyof typeof assumptions]}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value) && value >= f.min && value <= f.max)
                    setAssumptions({ ...assumptions, [f.key]: value });
                }}
              />
            </label>
          ))}
        </div>
        <div className="projection-results">
          <div>
            <span>Projected monthly revenue</span>
            <b>{money(Math.round(gross))}</b>
          </div>
          <div>
            <span>Projected operating costs</span>
            <b>{money(Math.round(costs))}</b>
          </div>
          <div>
            <span>Illustrative contribution</span>
            <b>{money(Math.round(margin))}</b>
          </div>
          <div>
            <span>Indicative acquisition payback</span>
            <b>{payback ? `${number(payback, 1)} months` : 'No positive contribution'}</b>
          </div>
        </div>
        <p className="muted">
          Pricing assumption: 2,000 UZS unlock + 400 UZS/minute. Model excludes tax, financing,
          depreciation, insurance, refunds, and customer acquisition. Scenarios are not forecasts or
          guarantees.
        </p>
      </Panel>
    </>
  );
}
