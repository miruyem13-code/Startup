import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Check, ShieldCheck, Upload } from 'lucide-react';
import { Badge, Button, Modal, Panel, SectionHead, State } from '../../../../../packages/ui';
import { api, money } from '../../lib/api';
import { useAction, useDashboard, useSession } from '../../lib/hooks';
import { useUi } from '../../lib/state';

type Plan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  discountPercent: number;
};
type Pass = {
  id: string;
  plan: Plan;
  price: number;
  discountPercent: number;
  endsAt: string;
  cancelledAt: string | null;
};
export function BillingPage() {
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api<Plan[]>('/plans') });
  const passes = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api<Pass[]>('/subscriptions'),
  });
  const dashboard = useDashboard();
  const [selected, setSelected] = useState<Plan | null>(null);
  const [key, setKey] = useState('');
  const [cancelling, setCancelling] = useState<Pass | null>(null);
  const buy = useAction('/subscriptions', 'Your demo ride pass is active.');
  const cancel = useAction('/subscriptions/:id/cancel', 'Your pass has ended.');
  if (!plans.data || !passes.data || !dashboard.data)
    return (
      <State error={plans.error?.message || passes.error?.message || dashboard.error?.message} />
    );
  const active = passes.data.find(
    (pass) => new Date(pass.endsAt) > new Date() && !pass.cancelledAt,
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">MORE CITY, MORE OFTEN</span>
          <h1>A pass for your own rhythm.</h1>
          <p>
            Prepaid demonstration passes use wallet credits. No card is charged and nothing renews
            automatically.
          </p>
        </div>
        <Badge>SIMULATED PAYMENTS</Badge>
      </div>
      <div className="notice">
        <CreditCard size={18} />
        Available demo wallet: {money(dashboard.data.user.wallet)}. Discounts apply to minute
        pricing; XP and influence rules stay equal.
      </div>
      {active && (
        <Panel>
          <SectionHead
            title={`${active.plan.name} · Active until ${new Date(active.endsAt).toLocaleDateString()}`}
          />
          <p>{active.discountPercent}% minute discount on new reservations.</p>
          <Button tone="ghost" onClick={() => setCancelling(active)}>
            End pass
          </Button>
        </Panel>
      )}
      <div className="team-grid">
        {plans.data.map((plan) => (
          <Panel className="team-card" key={plan.id}>
            <CreditCard size={28} />
            <h2>{plan.name}</h2>
            <Badge>
              {plan.durationDays} DAY{plan.durationDays === 1 ? '' : 'S'}
            </Badge>
            <p>{plan.discountPercent}% off minute pricing for your everyday journeys.</p>
            <h3>{money(plan.price)}</h3>
            <Button
              disabled={!!active}
              onClick={() => {
                setSelected(plan);
                setKey(crypto.randomUUID());
              }}
            >
              Choose pass
            </Button>
          </Panel>
        ))}
      </div>
      <Panel>
        <SectionHead title="Your pass history" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pass</th>
                <th>Paid demo credit</th>
                <th>Valid through</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passes.data.map((pass) => (
                <tr key={pass.id}>
                  <td>{pass.plan.name}</td>
                  <td>{money(pass.price)}</td>
                  <td>{new Date(pass.endsAt).toLocaleString()}</td>
                  <td>
                    {pass.cancelledAt
                      ? 'CANCELLED'
                      : new Date(pass.endsAt) > new Date()
                        ? 'ACTIVE'
                        : 'EXPIRED'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!passes.data.length && <p className="muted">Your first pass is waiting.</p>}
        </div>
      </Panel>
      {selected && (
        <Modal title={`Activate ${selected.name}?`} close={() => setSelected(null)}>
          <p>
            {money(selected.price)} will be deducted from your demo wallet. The pass starts
            immediately and lasts {selected.durationDays} days.
          </p>
          <Button
            busy={buy.isPending}
            onClick={() =>
              buy
                .mutateAsync({ planId: selected.id, key })
                .then(() => setSelected(null))
                .catch(() => {})
            }
          >
            <Check size={16} />
            Confirm demo purchase
          </Button>
        </Modal>
      )}
      {cancelling && (
        <Modal title="End this pass now?" close={() => setCancelling(null)}>
          <p>
            The unused period is not refunded. Already reserved rides keep their original pricing.
          </p>
          <Button
            tone="danger"
            busy={cancel.isPending}
            onClick={() =>
              cancel
                .mutateAsync({ id: cancelling.id })
                .then(() => setCancelling(null))
                .catch(() => {})
            }
          >
            End pass now
          </Button>
        </Modal>
      )}
    </>
  );
}

export function IdentitySettings() {
  const session = useSession();
  const notify = useUi((state) => state.notify);
  const upload = useAction('/profile/avatar', 'Profile image saved.', 'PATCH');
  const request = useAction<{ devToken: string }>(
    '/auth/verification/request',
    'Local verification link prepared.',
  );
  const confirm = useAction('/auth/verification/confirm', 'Email verified in the local demo.');
  const preferences = useAction(
    '/notifications/preferences',
    'Notification preferences saved.',
    'PATCH',
  );
  const [verification, setVerification] = useState('');
  const [pending, setPending] = useState(false);
  const [settings, setSettings] = useState<{ community: boolean; marketing: boolean } | null>(null);
  const user = session.data?.user;
  if (!user) return null;
  const stored = user.notificationPreferences as {
    community?: boolean;
    marketing?: boolean;
  } | null;
  const current = settings || {
    community: stored?.community !== false,
    marketing: stored?.marketing === true,
  };
  async function selectAvatar(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5000000) {
      notify('Choose a PNG, JPEG or WebP under 5 MB.');
      return;
    }
    setPending(true);
    let url = '';
    try {
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is unavailable.');
      const size = Math.min(image.width, image.height);
      context.drawImage(
        image,
        (image.width - size) / 2,
        (image.height - size) / 2,
        size,
        size,
        0,
        0,
        128,
        128,
      );
      await upload.mutateAsync({ avatar: canvas.toDataURL('image/jpeg', 0.8) });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to read this image.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      setPending(false);
    }
  }
  return (
    <div className="recommendation-grid">
      <Panel className="settings-panel">
        <SectionHead title="Your profile image" />
        {user.avatar && (
          <img
            src={user.avatar}
            alt="Your profile"
            width={96}
            height={96}
            className="profile-photo"
          />
        )}
        <label>
          <Upload size={18} />
          Choose an image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={pending}
            onChange={(event) => {
              void selectAvatar(event.target.files?.[0]);
            }}
          />
        </label>
        {user.avatar && (
          <Button
            tone="ghost"
            busy={upload.isPending}
            onClick={() => upload.mutate({ avatar: null })}
          >
            Remove image
          </Button>
        )}
        <SectionHead title="Email verification" />
        <Badge tone={user.emailVerified ? '' : 'neutral'}>
          {user.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
        </Badge>
        <p className="muted">
          External delivery is unconnected. The local adapter verifies a single-use token for
          demonstrations.
        </p>
        {session.data?.demo && !user.emailVerified && (
          <>
            <Button
              tone="secondary"
              busy={request.isPending}
              onClick={() =>
                request
                  .mutateAsync({})
                  .then((result) => setVerification(result.devToken))
                  .catch(() => {})
              }
            >
              Prepare local verification
            </Button>
            {verification && (
              <Button
                busy={confirm.isPending}
                onClick={() =>
                  confirm
                    .mutateAsync({ token: verification })
                    .then(() => setVerification(''))
                    .catch(() => {})
                }
              >
                <ShieldCheck size={16} />
                Confirm local verification
              </Button>
            )}
          </>
        )}
      </Panel>
      <Panel className="settings-panel">
        <SectionHead title="What reaches your feed" />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            preferences.mutate(current);
          }}
        >
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={current.community}
              onChange={(event) => setSettings({ ...current, community: event.target.checked })}
            />
            Community and competition news
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={current.marketing}
              onChange={(event) => setSettings({ ...current, marketing: event.target.checked })}
            />
            Marketing announcements
          </label>
          <p className="muted">
            Ride, wallet and security updates remain visible. Preferences affect the notification
            feed.
          </p>
          <Button type="submit" busy={preferences.isPending}>
            Save notification preferences
          </Button>
        </form>
      </Panel>
    </div>
  );
}
