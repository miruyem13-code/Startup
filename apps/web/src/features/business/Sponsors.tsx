import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flag, Building2 } from 'lucide-react';
import { Badge, Button, Panel, SectionHead, State } from '../../../../../packages/ui';
import { api } from '../../lib/api';
import { useAction } from '../../lib/hooks';
import { dateTimeLocal } from '../../lib/dates';
type Sponsor = {
  id: string;
  name: string;
  description: string;
  status: string;
  startsAt: string;
  endsAt: string;
  missions: {
    id: string;
    name: string;
    status: string;
    participantCount: number;
    completedCount: number;
  }[];
};
export default function Sponsors() {
  const query = useQuery({
    queryKey: ['business-sponsors'],
    queryFn: () => api<Sponsor[]>('/business/sponsors'),
  });
  const [profile, setProfile] = useState({
    name: '',
    description: '',
    color: '#276749',
    startsAt: dateTimeLocal(new Date()),
    endsAt: dateTimeLocal(new Date(Date.now() + 60 * 86400000)),
  });
  const [campaign, setCampaign] = useState({
    name: '',
    description: '',
    sponsorId: '',
    category: 'DISTANCE',
    target: 10000,
    xp: 150,
    points: 30,
    endsAt: dateTimeLocal(new Date(Date.now() + 14 * 86400000)),
  });
  const submit = useAction(
    '/business/sponsors',
    'Sponsor profile submitted for administrator review.',
  );
  const mission = useAction(
    '/business/sponsored-missions',
    'Mission saved as a draft for administrator publication.',
  );
  if (!query.data) return <State error={query.error?.message} />;
  const approved = query.data.filter(
    (sponsor) => sponsor.status === 'APPROVED' && new Date(sponsor.endsAt) > new Date(),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GOOD PARTNERSHIPS START WITH TRUST</span>
          <h1>Give the city a reason to explore.</h1>
          <p>
            Submit demonstration sponsor profiles and challenges. Administrator approval controls
            publication.
          </p>
        </div>
        <Badge>ILLUSTRATIVE PARTNERSHIPS</Badge>
      </div>
      <div className="notice">
        These profiles do not represent signed commercial agreements or real partner vouchers. All
        awards use demo XP and loyalty points.
      </div>
      <div className="recommendation-grid">
        <Panel className="settings-panel">
          <SectionHead title="Submit a sponsor profile" />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit
                .mutateAsync({
                  ...profile,
                  startsAt: new Date(profile.startsAt).toISOString(),
                  endsAt: new Date(profile.endsAt).toISOString(),
                })
                .then(() => setProfile({ ...profile, name: '', description: '' }))
                .catch(() => {});
            }}
          >
            <label>
              Sponsor name
              <input
                required
                minLength={3}
                maxLength={80}
                value={profile.name}
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              />
            </label>
            <label>
              Brand description
              <textarea
                required
                minLength={10}
                maxLength={500}
                value={profile.description}
                onChange={(event) => setProfile({ ...profile, description: event.target.value })}
              />
            </label>
            <label>
              Brand color
              <input
                type="color"
                value={profile.color}
                onChange={(event) => setProfile({ ...profile, color: event.target.value })}
              />
            </label>
            <label>
              Starts
              <input
                type="datetime-local"
                required
                value={profile.startsAt}
                onChange={(event) => setProfile({ ...profile, startsAt: event.target.value })}
              />
            </label>
            <label>
              Ends
              <input
                type="datetime-local"
                required
                value={profile.endsAt}
                onChange={(event) => setProfile({ ...profile, endsAt: event.target.value })}
              />
            </label>
            <Button type="submit" busy={submit.isPending}>
              <Building2 size={16} />
              Submit for review
            </Button>
          </form>
        </Panel>
        <Panel className="settings-panel">
          <SectionHead title="Create a sponsored mission" />
          {approved.length ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                mission
                  .mutateAsync({
                    ...campaign,
                    sponsorId: campaign.sponsorId || approved[0].id,
                    status: 'DRAFT',
                    endsAt: new Date(campaign.endsAt).toISOString(),
                  })
                  .then(() => setCampaign({ ...campaign, name: '', description: '' }))
                  .catch(() => {});
              }}
            >
              <label>
                Approved sponsor
                <select
                  value={campaign.sponsorId || approved[0].id}
                  onChange={(event) => setCampaign({ ...campaign, sponsorId: event.target.value })}
                >
                  {approved.map((sponsor) => (
                    <option value={sponsor.id} key={sponsor.id}>
                      {sponsor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mission name
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={campaign.name}
                  onChange={(event) => setCampaign({ ...campaign, name: event.target.value })}
                />
              </label>
              <label>
                Mission description
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  value={campaign.description}
                  onChange={(event) =>
                    setCampaign({ ...campaign, description: event.target.value })
                  }
                />
              </label>
              <label>
                Requirement
                <select
                  value={campaign.category}
                  onChange={(event) => setCampaign({ ...campaign, category: event.target.value })}
                >
                  <option value="DISTANCE">Distance in meters</option>
                  <option value="RIDES">Completed rides</option>
                  <option value="DURATION">Riding seconds</option>
                  <option value="EXPLORATION">Distinct territories</option>
                </select>
              </label>
              <label>
                Target
                <input
                  type="number"
                  min={1}
                  max={100000}
                  required
                  value={campaign.target}
                  onChange={(event) =>
                    setCampaign({ ...campaign, target: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Deadline
                <input
                  type="datetime-local"
                  required
                  value={campaign.endsAt}
                  onChange={(event) => setCampaign({ ...campaign, endsAt: event.target.value })}
                />
              </label>
              <p className="muted">
                Proposed reward: {campaign.xp} XP + {campaign.points} points. The mission window
                must fit the sponsor’s approved dates.
              </p>
              <Button type="submit" busy={mission.isPending}>
                <Flag size={16} />
                Submit mission draft
              </Button>
            </form>
          ) : (
            <p className="muted">
              Your first profile must be approved before you submit a sponsored mission.
            </p>
          )}
        </Panel>
      </div>
      {query.data.map((sponsor) => (
        <Panel key={sponsor.id}>
          <SectionHead title={sponsor.name}>
            <Badge tone={sponsor.status === 'APPROVED' ? '' : 'neutral'}>{sponsor.status}</Badge>
          </SectionHead>
          <p>{sponsor.description}</p>
          <p className="muted">
            {new Date(sponsor.startsAt).toLocaleDateString()} –{' '}
            {new Date(sponsor.endsAt).toLocaleDateString()}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Publication</th>
                  <th>Participants</th>
                  <th>Completions</th>
                  <th>Completion rate</th>
                </tr>
              </thead>
              <tbody>
                {sponsor.missions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.status}</td>
                    <td>{entry.participantCount}</td>
                    <td>{entry.completedCount}</td>
                    <td>
                      {entry.participantCount
                        ? Math.round((entry.completedCount / entry.participantCount) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </>
  );
}
