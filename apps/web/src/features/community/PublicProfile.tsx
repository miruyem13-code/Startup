import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Compass } from 'lucide-react';
import { Badge, Panel, SectionHead, State } from '../../../../../packages/ui';
import { api, number } from '../../lib/api';
type PublicRider = {
  name: string;
  xp: number;
  team: { name: string } | null;
  achievements: { earnedAt: string; achievement: { name: string; description: string } }[];
};
export default function PublicProfile() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['public-profile', id],
    queryFn: () => api<PublicRider>(`/profiles/${encodeURIComponent(id || '')}`),
  });
  if (!query.data) return <State error={query.error?.message} />;
  const user = query.data;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">YOUR CITY COMMUNITY</span>
          <h1>{user.name}</h1>
          <p>
            {user.team?.name || 'Independent explorer'} · Level {Math.floor(user.xp / 1000) + 1} ·{' '}
            {number(user.xp)} XP
          </p>
        </div>
        <Badge>PUBLIC PROFILE</Badge>
      </div>
      <Panel>
        <SectionHead title="A little progress worth sharing" />
        <p>
          These achievements are shared by this rider’s public-profile preference. Ride routes and
          current locations remain private.
        </p>
      </Panel>
      <div className="passport-grid">
        {user.achievements.map((entry) => (
          <Panel className="passport-card stamped" key={entry.achievement.name}>
            <Trophy size={40} />
            <h2>{entry.achievement.name}</h2>
            <p>{entry.achievement.description}</p>
            <small>{new Date(entry.earnedAt).toLocaleDateString()}</small>
          </Panel>
        ))}
      </div>
      {!user.achievements.length && (
        <Panel>
          <Compass size={28} />
          <p>The next adventure may bring their first milestone.</p>
        </Panel>
      )}
    </>
  );
}
