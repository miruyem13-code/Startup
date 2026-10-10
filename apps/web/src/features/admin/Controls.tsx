import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Search, ShieldCheck, Flag, Settings } from 'lucide-react';
import { Badge, Button, Modal, Panel, State } from '../../../../../packages/ui';
import { api } from '../../lib/api';
import { useAction, useCatalog, useSession } from '../../lib/hooks';
import { dateTimeLocal } from '../../lib/dates';

type Value = string | number | boolean | string[];
type RecordData = { id: string; name?: string; status?: string; [key: string]: unknown };
type Field = {
  key: string;
  label: string;
  type?: 'number' | 'date' | 'boolean' | 'textarea' | 'teams' | 'select';
  min?: number;
  max?: number;
  options?: string[];
};
type Config = {
  title: string;
  description: string;
  fields: Field[];
  defaults: Record<string, Value>;
  create?: boolean;
};
const tomorrow = () => dateTimeLocal(new Date(Date.now() + 86400000));
const configs: Record<string, Config> = {
  sponsors: {
    title: 'Partnerships with clear approval.',
    description:
      'Review demonstration sponsors before any linked mission is published. Paused or rejected sponsorships stop mission availability and scoring.',
    fields: [
      {
        key: 'status',
        label: 'Approval status',
        type: 'select',
        options: ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED'],
      },
    ],
    defaults: { status: 'PENDING' },
  },
  feedback: {
    title: 'Listen to the people who ride.',
    description:
      'Review pilot questions, safety feedback and product suggestions from the contact form.',
    fields: [
      { key: 'status', label: 'Review status', type: 'select', options: ['OPEN', 'CLOSED'] },
    ],
    defaults: { status: 'OPEN' },
  },
  plans: {
    title: 'Passes for everyday momentum.',
    description:
      'Configure demo pass pricing and discounts. Existing purchases preserve their captured terms.',
    fields: [
      { key: 'name', label: 'Pass name' },
      { key: 'price', label: 'Price (demo UZS)', type: 'number', min: 0, max: 1000000 },
      { key: 'durationDays', label: 'Validity (days)', type: 'number', min: 1, max: 365 },
      {
        key: 'discountPercent',
        label: 'Minute pricing discount (%)',
        type: 'number',
        min: 0,
        max: 75,
      },
      { key: 'enabled', label: 'Available for purchase', type: 'boolean' },
    ],
    defaults: { name: '', price: 10000, durationDays: 1, discountPercent: 15, enabled: true },
  },
  teams: {
    title: 'Communities, with room to grow.',
    description: 'Manage team identity while preserving membership and competition history.',
    create: true,
    fields: [
      { key: 'name', label: 'Team name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'color', label: 'Brand color (#RRGGBB)' },
    ],
    defaults: { name: '', description: '', color: '#276749' },
  },
  rewards: {
    title: 'Good progress deserves good rewards.',
    description:
      'Configure loyalty costs, inventory and demo credit values. Existing redemptions remain saved.',
    create: true,
    fields: [
      { key: 'name', label: 'Reward name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'cost', label: 'Loyalty point cost', type: 'number', min: 1, max: 100000 },
      { key: 'stock', label: 'Available inventory', type: 'number', min: 0, max: 100000 },
      {
        key: 'kind',
        label: 'Reward type',
        type: 'select',
        options: ['CREDIT', 'VOUCHER', 'COSMETIC'],
      },
      { key: 'value', label: 'Demo credit value (UZS)', type: 'number', min: 0, max: 1000000 },
    ],
    defaults: { name: '', description: '', cost: 100, stock: 20, kind: 'CREDIT', value: 10000 },
  },
  territories: {
    title: 'The city, carefully managed.',
    description:
      'Control territory availability and metadata. Contributions and ownership changes remain auditable.',
    fields: [
      { key: 'name', label: 'Territory name' },
      { key: 'district', label: 'District' },
      { key: 'enabled', label: 'Enabled for scoring', type: 'boolean' },
    ],
    defaults: { name: '', district: '', enabled: true },
  },
  seasons: {
    title: 'A fresh chapter for every explorer.',
    description:
      'Schedule non-overlapping seasons. Closing freezes standings and preserves historical influence.',
    create: true,
    fields: [
      { key: 'name', label: 'Season name' },
      { key: 'startsAt', label: 'Start (local time)', type: 'date' },
      { key: 'endsAt', label: 'End (local time)', type: 'date' },
    ],
    defaults: {
      name: '',
      startsAt: tomorrow(),
      endsAt: dateTimeLocal(new Date(Date.now() + 30 * 86400000)),
    },
  },
  challenges: {
    title: 'Competition with a clear finish line.',
    description:
      'Schedule team battles, select eligible teams and reward trusted contributions. Timing is enforced by the server.',
    create: true,
    fields: [
      { key: 'name', label: 'Competition name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'startsAt', label: 'Start (local time)', type: 'date' },
      { key: 'endsAt', label: 'End (local time)', type: 'date' },
      {
        key: 'metric',
        label: 'Scoring metric',
        type: 'select',
        options: ['DISTANCE', 'INFLUENCE'],
      },
      {
        key: 'rewardPoints',
        label: 'Winning contributor loyalty points',
        type: 'number',
        min: 0,
        max: 1000,
      },
      { key: 'teamIds', label: 'Eligible teams (at least two)', type: 'teams' },
    ],
    defaults: {
      name: '',
      description: '',
      startsAt: tomorrow(),
      endsAt: dateTimeLocal(new Date(Date.now() + 7 * 86400000)),
      metric: 'DISTANCE',
      rewardPoints: 50,
      teamIds: [],
    },
  },
  users: {
    title: 'People, permissions and trust.',
    description:
      'Suspend rider access or restore it. Privileged role changes require a super administrator.',
    fields: [
      { key: 'status', label: 'Account status', type: 'select', options: ['ACTIVE', 'SUSPENDED'] },
      {
        key: 'role',
        label: 'Account role',
        type: 'select',
        options: ['USER', 'ADMIN', 'SUPER_ADMIN', 'BUSINESS_ADMIN'],
      },
    ],
    defaults: { status: 'ACTIVE', role: 'USER' },
  },
  settings: {
    title: 'Rules for a fairer city.',
    description:
      'Pricing is captured when a bicycle is reserved. Changed scoring limits apply to future completions.',
    fields: [
      { key: 'unlockFee', label: 'Unlock fee (UZS)', type: 'number', min: 0, max: 100000 },
      {
        key: 'perMinute',
        label: 'Price per started minute (UZS)',
        type: 'number',
        min: 0,
        max: 10000,
      },
      { key: 'dailyXpCap', label: 'Daily base ride XP cap', type: 'number', min: 10, max: 10000 },
      { key: 'dailyInfluenceCap', label: 'Daily influence cap', type: 'number', min: 1, max: 1000 },
      {
        key: 'territoryCooldownMinutes',
        label: 'Repeated territory cooldown (minutes)',
        type: 'number',
        min: 0,
        max: 1440,
      },
    ],
    defaults: {
      unlockFee: 2000,
      perMinute: 400,
      dailyXpCap: 1000,
      dailyInfluenceCap: 100,
      territoryCooldownMinutes: 30,
    },
  },
};
function display(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '—';
}
export default function AdminControl() {
  const location = useLocation();
  const type = location.pathname.split('/').pop() || 'teams';
  const [search, setSearch] = useState('');
  const config = configs[type];
  const query = useQuery({
    queryKey: ['admin-control', type, type === 'users' ? search : ''],
    queryFn: () =>
      api<RecordData[] | Record<string, Value>>(
        `/admin/${type}${type === 'users' ? `?q=${encodeURIComponent(search)}` : ''}`,
      ),
  });
  const catalog = useCatalog();
  const session = useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, Value>>({});
  const [confirming, setConfirming] = useState<{ id: string; name: string; action: string } | null>(
    null,
  );
  const isSettings = type === 'settings';
  const save = useAction(
    isSettings
      ? '/admin/settings'
      : selected === 'new'
        ? `/admin/${type}`
        : `/admin/${type}/${selected}`,
    'Changes saved and audited.',
    selected === 'new' ? 'POST' : 'PATCH',
  );
  const activate = useAction(`/admin/${type}/:id/activate`, 'Competition activated.');
  const close = useAction(`/admin/${type}/:id/close`, 'Results finalized and retained.');
  if (!query.data || !config)
    return <State error={query.error?.message} retry={() => query.refetch()} />;
  const fields = config.fields.filter(
    (field) =>
      type !== 'users' || field.key !== 'role' || session.data?.user?.role === 'SUPER_ADMIN',
  );
  const current = isSettings ? { ...(query.data as Record<string, Value>), ...form } : form;
  const records = Array.isArray(query.data) ? query.data : [];
  function editor() {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const payload = Object.fromEntries(
            fields.map((field) => [
              field.key,
              field.type === 'date'
                ? new Date(String(current[field.key])).toISOString()
                : current[field.key],
            ]),
          );
          save
            .mutateAsync(payload)
            .then(() => {
              setSelected(null);
              setForm({});
            })
            .catch(() => {});
        }}
      >
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.type === 'textarea' ? (
              <textarea
                required
                minLength={10}
                maxLength={500}
                value={String(current[field.key] ?? '')}
                onChange={(event) => setForm({ ...current, [field.key]: event.target.value })}
              />
            ) : field.type === 'select' ? (
              <select
                value={String(current[field.key])}
                onChange={(event) => setForm({ ...current, [field.key]: event.target.value })}
              >
                {field.options?.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <input
                type="checkbox"
                checked={Boolean(current[field.key])}
                onChange={(event) => setForm({ ...current, [field.key]: event.target.checked })}
              />
            ) : field.type === 'teams' ? (
              <div className="control-team-picker">
                {catalog.data?.teams.map((team) => (
                  <label className="checkbox-label" key={team.id}>
                    <input
                      type="checkbox"
                      checked={((current.teamIds as string[]) || []).includes(team.id)}
                      onChange={(event) => {
                        const ids = (current.teamIds as string[]) || [];
                        setForm({
                          ...current,
                          teamIds: event.target.checked
                            ? [...ids, team.id]
                            : ids.filter((id) => id !== team.id),
                        });
                      }}
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            ) : (
              <input
                required
                type={
                  field.type === 'date'
                    ? 'datetime-local'
                    : field.type === 'number'
                      ? 'number'
                      : 'text'
                }
                min={field.min}
                max={field.max}
                maxLength={100}
                value={String(current[field.key] ?? '')}
                onChange={(event) =>
                  setForm({
                    ...current,
                    [field.key]:
                      field.type === 'number' ? Number(event.target.value) : event.target.value,
                  })
                }
              />
            )}
          </label>
        ))}
        <Button type="submit" busy={save.isPending}>
          <ShieldCheck size={16} />
          Save changes
        </Button>
      </form>
    );
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">VELOCITY OPERATIONS</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {config.create && (
          <Button
            onClick={() => {
              setForm(config.defaults);
              setSelected('new');
            }}
          >
            <Plus size={16} />
            Create {type === 'challenges' ? 'competition' : type.slice(0, -1)}
          </Button>
        )}
      </div>
      {isSettings ? (
        <Panel className="settings-panel">
          <Settings size={26} />
          {editor()}
        </Panel>
      ) : (
        <>
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} />
              <input
                aria-label="Search records"
                placeholder="Search name, role or district"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Badge>{records.length} RECORDS</Badge>
          </div>
          <Panel>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status / type</th>
                    <th>Details</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter((record) =>
                      `${record.name} ${record.role || ''} ${record.district || ''}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((record) => (
                      <tr key={record.id}>
                        <td>
                          <b>{record.name || record.id}</b>
                        </td>
                        <td>
                          <Badge tone="neutral">
                            {display(record.status ?? record.kind ?? record.enabled ?? record.role)}
                          </Badge>
                        </td>
                        <td>
                          {type === 'seasons' || type === 'challenges'
                            ? `${new Date(String(record.startsAt)).toLocaleDateString()} – ${new Date(String(record.endsAt)).toLocaleDateString()}`
                            : type === 'rewards'
                              ? `${record.cost} points · ${record.stock} available`
                              : type === 'territories'
                                ? `${record.district} · ${(record._count as { contributions?: number })?.contributions || 0} contributions`
                                : type === 'users'
                                  ? String(record.role)
                                  : type === 'feedback'
                                    ? `${record.email}: ${record.message}`
                                    : type === 'plans'
                                      ? `${record.price} UZS · ${record.discountPercent}% discount`
                                      : String(record.description || '')}
                        </td>
                        <td>
                          {type === 'seasons' || type === 'challenges' ? (
                            <>
                              {type === 'challenges' && record.status === 'DRAFT' && (
                                <Button
                                  tone="secondary"
                                  busy={activate.isPending}
                                  onClick={() => activate.mutate({ id: record.id })}
                                >
                                  <Flag size={14} />
                                  Activate
                                </Button>
                              )}
                              {record.status === 'ACTIVE' && (
                                <Button
                                  tone="ghost"
                                  onClick={() =>
                                    setConfirming({
                                      id: record.id,
                                      name: record.name || '',
                                      action: 'close',
                                    })
                                  }
                                >
                                  Close and publish results
                                </Button>
                              )}
                              {['CLOSED', 'COMPLETED'].includes(String(record.status)) && (
                                <span className="muted">Results preserved</span>
                              )}
                            </>
                          ) : (
                            <Button
                              tone="ghost"
                              onClick={() => {
                                setForm(
                                  Object.fromEntries(
                                    config.fields.map((field) => [
                                      field.key,
                                      (record[field.key] as Value) ?? config.defaults[field.key],
                                    ]),
                                  ),
                                );
                                setSelected(record.id);
                              }}
                            >
                              <Pencil size={14} />
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!records.length && <State empty="No records yet. Create the first chapter." />}
            </div>
          </Panel>
        </>
      )}
      {selected && (
        <Modal
          title={selected === 'new' ? 'Create a new record' : 'Edit record'}
          close={() => setSelected(null)}
        >
          {editor()}
        </Modal>
      )}
      {confirming && (
        <Modal title="Finalize and publish results?" close={() => setConfirming(null)}>
          <p>{confirming.name}</p>
          <p className="muted">
            The current standings will be frozen. Existing history is preserved.
          </p>
          <Button
            tone="danger"
            busy={close.isPending}
            onClick={() =>
              close
                .mutateAsync({ id: confirming.id })
                .then(() => setConfirming(null))
                .catch(() => {})
            }
          >
            Confirm finalization
          </Button>
        </Modal>
      )}
    </>
  );
}
