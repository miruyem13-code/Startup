import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Leaf, Route, Flag, ArrowUpRight, Plus, Building2, UserMinus } from 'lucide-react';
import {
  Panel,
  Button,
  Badge,
  Metric,
  SectionHead,
  State,
  Progress,
  Modal,
} from '../../../../../packages/ui';
import { api, number } from '../../lib/api';
import { useAction } from '../../lib/hooks';
type Overview = {
  organization: {
    name: string;
    challenges: { id: string; name: string; targetKm: number; startsAt: string; endsAt: string; distanceKm: number }[];
  };
  members: number;
  participants: number;
  rides: number;
  distanceKm: number;
  co2EstimateKg: number;
};
export function BusinessDashboard() {
  const query = useQuery({
    queryKey: ['business'],
    queryFn: () => api<Overview>('/business/overview'),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetKm: 1000,
    endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });
  const create = useAction('/business/challenges', 'Organization challenge created.');
  if (!query.data) return <State error={query.error?.message} />;
  const data = query.data;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">{data.organization.name.toUpperCase()}</span>
          <h1>A little movement. A better workday.</h1>
          <p>
            Aggregated demo activity. Employers cannot access individual GPS routes or health
            estimates.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} />
          Create team challenge
        </Button>
      </div>
      <div className="metrics-grid">
        <Metric
          icon={<Users size={19} />}
          label="Demo participation"
          value={String(data.members ? Math.round((data.participants / data.members) * 100) : 0)}
          unit="%"
          note={`${data.participants} of ${data.members} members`}
        />
        <Metric
          icon={<Route size={19} />}
          label="Combined demo distance"
          value={number(data.distanceKm, 1)}
          unit="km"
          note="Completed organization rides"
        />
        <Metric
          icon={<Flag size={19} />}
          label="Collective journeys"
          value={number(data.rides)}
          note="Every little commute adds up"
        />
        <Metric
          icon={<Leaf size={19} />}
          label="Estimated CO₂ savings"
          value={number(data.co2EstimateKg, 1)}
          unit="kg"
          note="Assumed displaced car trips · 0.16 kg/km"
        />
      </div>
      <Panel className="business-message">
        <Building2 size={42} strokeWidth={1.2} />
        <div>
          <span className="eyebrow">MOVEMENT IS BETTER TOGETHER</span>
          <h2>Your team has a city to discover.</h2>
          <p>
            Create an aggregate distance goal. All progress is calculated from your organization’s
            completed demo rides.
          </p>
        </div>
      </Panel>
      <SectionHead title="Shared goals. Collective momentum." />
      <div className="corporate-challenges">
        {data.organization.challenges.map((c) => (
          <Panel key={c.id}>
            <Badge>DEMO ORGANIZATION CHALLENGE</Badge>
            <h2>{c.name}</h2>
            <p>
              {number(c.distanceKm, 1)} of {number(c.targetKm)} collective kilometers · Ends{' '}
              {new Date(c.endsAt).toLocaleDateString()}
            </p>
            <Progress value={(c.distanceKm / c.targetKm) * 100} />
            <small>
              Includes completed rides that started after {new Date(c.startsAt).toLocaleDateString()} and finished within the campaign window.
            </small>
          </Panel>
        ))}
      </div>
      {open && (
        <Modal title="Give your team a reason to move." close={() => setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create
                .mutateAsync({ ...form, endsAt: new Date(form.endsAt).toISOString() })
                .then(() => setOpen(false))
                .catch(() => {});
            }}
          >
            <label>
              Challenge name
              <input
                value={form.name}
                minLength={3}
                maxLength={100}
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Collective distance target (km)
              <input
                type="number"
                min={1}
                max={10000}
                value={form.targetKm}
                required
                onChange={(e) => setForm({ ...form, targetKm: Number(e.target.value) })}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={form.endsAt}
                required
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
            <Button type="submit" busy={create.isPending}>
              Create challenge
              <Flag size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { rentals: number };
};
export function BusinessEmployees() {
  const query = useQuery({
    queryKey: ['business-employees'],
    queryFn: () => api<Employee[]>('/business/employees'),
  });
  const [email, setEmail] = useState('');
  const add = useAction('/business/employees', 'Invitation sent. The rider can accept or decline.');
  const remove = useAction(
    '/business/employees/:id',
    'Member removed from the organization.',
    'DELETE',
  );
  if (!query.data) return <State error={query.error?.message} retry={() => query.refetch()} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">ORGANIZATION MEMBERS</span>
          <h1>Bring the team along.</h1>
          <p>Invite existing riders by email. Membership starts only after they accept.</p>
        </div>
        <Badge>{query.data.length} MEMBERS</Badge>
      </div>
      <Panel className="settings-panel">
        <SectionHead title="Connect an existing rider" />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            add
              .mutateAsync({ email })
              .then(() => setEmail(''))
              .catch(() => {});
          }}
        >
          <label>
            Rider email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <small>The rider must already have a VELOCITY account and no organization.</small>
          </label>
          <Button type="submit" busy={add.isPending}>
            <Plus size={16} /> Invite member
          </Button>
        </form>
      </Panel>
      <Panel>
        <SectionHead title="Current members" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Completed rides</th>
                <th>Joined VELOCITY</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <b>{employee.name}</b>
                    <small className="table-subtext">{employee.email}</small>
                  </td>
                  <td>{employee.role.replaceAll('_', ' ')}</td>
                  <td>{employee._count.rentals}</td>
                  <td>{new Date(employee.createdAt).toLocaleDateString()}</td>
                  <td>
                    {employee.role === 'USER' && (
                      <Button
                        tone="ghost"
                        busy={remove.isPending}
                        onClick={() => {
                          remove.mutate({ id: employee.id });
                        }}
                      >
                        <UserMinus size={15} /> Remove
                      </Button>
                    )}
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
export function BusinessMarketing() {
  return (
    <div className="business-landing">
      <div className="public-page-intro">
        <Badge>VELOCITY FOR BUSINESS</Badge>
        <h1>
          A better workday
          <br />
          starts with <em>a little movement.</em>
        </h1>
        <p>
          Give your team a reason to step outside. Shared city adventures, meaningful activity
          goals, and an aggregate view of your impact.
        </p>
        <div className="hero-actions">
          <Link className="button large" to="/login?next=/business/dashboard">
            Open business portal
            <ArrowUpRight size={18} />
          </Link>
          <Link className="button secondary large" to="/contact">
            Talk about a pilot
          </Link>
        </div>
      </div>
      <div className="business-values">
        {[
          {
            icon: Users,
            title: 'A team that moves together.',
            text: 'Organization challenges turn everyday cycling into a shared experience.',
          },
          {
            icon: Leaf,
            title: 'A little less footprint.',
            text: 'Transparent environmental estimates from completed rides, with clear assumptions.',
          },
          {
            icon: Building2,
            title: 'A view that respects people.',
            text: 'Aggregate participation and distance. Private routes and individual health information stay private.',
          },
        ].map((v) => (
          <Panel key={v.title}>
            <v.icon size={30} />
            <h2>{v.title}</h2>
            <p>{v.text}</p>
          </Panel>
        ))}
      </div>
      <div className="notice">
        Organizations, sponsors, and activity shown in the pilot are fictional demonstration data.
        No commercial partnership is implied.
      </div>
    </div>
  );
}
