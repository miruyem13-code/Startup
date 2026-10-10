import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Compass, Bike, ScanLine, Flag, Leaf, Mail, MapPin } from 'lucide-react';
import { Panel, Badge } from '../../../../../packages/ui';
export function InformationPage() {
  const location = useLocation();
  const path = location.pathname;
  const privacy = path === '/privacy';
  const terms = path === '/terms';
  const contact = path === '/contact';
  const how = path === '/how-it-works';
  return (
    <div className="information-page">
      <div className="public-page-intro">
        <Badge>
          {privacy
            ? 'PRIVACY & TRUST'
            : terms
              ? 'PILOT TERMS'
              : contact
                ? 'START A CONVERSATION'
                : how
                  ? 'FOUR SMALL STEPS'
                  : 'A CITY IN MOTION'}
        </Badge>
        <h1>
          {privacy
            ? 'Your city story belongs to you.'
            : terms
              ? 'A little clarity for the journey.'
              : contact
                ? 'Let’s make a little movement happen.'
                : how
                  ? 'Less planning. More pedaling.'
                  : 'Built for everyday possibility.'}
        </h1>
        <p>
          {privacy
            ? 'You decide how you appear in the city. Your routes and live location are never part of a public leaderboard.'
            : terms
              ? 'This is a local demonstration platform. Every bicycle, ride, payment, and reward is simulated.'
              : contact
                ? 'Interested in an urban mobility pilot, a workplace challenge, or a better way to explore Tashkent?'
                : how
                  ? 'Find a bicycle, unlock the demo, explore, and earn progress. Everything is connected to the backend.'
                  : 'VELOCITY brings bicycle sharing, city exploration, and a little healthy competition together.'}
        </p>
      </div>
      <div className="information-content">
        {privacy ? (
          <>
            <h2>What the pilot stores</h2>
            <p>
              Account details, hashed passwords, session records, reservations, simulated route
              points, ride totals, mission progress, virtual influence, rewards, and demo wallet
              transactions are stored in the local database.
            </p>
            <h2>Your public identity</h2>
            <p>
              Public profiles appear in the XP leaderboard. You can hide yours in Settings.
              Employers receive organization totals, not individual routes or health estimates.
              Administrators see operational summaries for running the demo.
            </p>
            <h2>Location permission</h2>
            <p>
              Your browser only requests location when you press the map’s location button. This
              recenters the map. Background GPS tracking and push notifications are not implemented.
            </p>
            <h2>Device preferences</h2>
            <p>
              Theme and language use browser local storage. Authentication uses an HTTP-only session
              cookie. This draft pilot notice requires review before real customer onboarding.
            </p>
          </>
        ) : terms ? (
          <>
            <h2>A demonstration, clearly labeled</h2>
            <p>
              No physical locks are connected. Wallet credits and reward vouchers have no real
              monetary value. Demo partners and organizations are fictional. Territorial ownership
              is virtual and provides no legal rights.
            </p>
            <h2>Routes and estimates</h2>
            <p>
              Routes demonstrate geospatial behavior and do not establish safe cycling
              infrastructure. Check real conditions and local rules before riding. Calories and CO₂
              are rough estimates with transparent formulas.
            </p>
            <h2>Before a public pilot</h2>
            <p>
              Operating permissions, insurance, pricing, terms, privacy handling, safety checks, and
              provider integrations need local review. This draft is not a finalized commercial
              contract.
            </p>
          </>
        ) : contact ? (
          <>
            <Panel>
              <Mail size={30} />
              <h2>Start with a pilot.</h2>
              <p>
                This demo has no connected inbox. Copy the local project’s requirements and contact
                your chosen operating team directly. No message will be sent from this page.
              </p>
              <Link to="/business" className="button">
                Explore the business experience
                <ArrowUpRight size={16} />
              </Link>
            </Panel>
            <Panel>
              <MapPin size={30} />
              <h2>Our first city: Tashkent.</h2>
              <p>
                The initial data explores central Tashkent. The architecture is organized for future
                city expansion.
              </p>
              <Link to="/explore" className="text-link">
                Take a look around
                <ArrowUpRight size={16} />
              </Link>
            </Panel>
          </>
        ) : how ? (
          <div className="how-detail-grid">
            {[
              {
                icon: MapPin,
                title: '01 · Discover',
                text: 'Open the real interactive city map. Find an available demo bicycle at Amir Temur Square.',
              },
              {
                icon: ScanLine,
                title: '02 · Reserve & unlock',
                text: 'Sign in, reserve a bike for 10 minutes, and enter its bike ID. Camera QR recognition is available only in supported browsers.',
              },
              {
                icon: Bike,
                title: '03 · Explore',
                text: 'Use the deterministic simulation controls. Each step adds 90 seconds and server-calculated route distance.',
              },
              {
                icon: Flag,
                title: '04 · Earn your progress',
                text: 'Return to the station to complete the ride. XP, joined missions, passport stamps, and rewards are persisted.',
              },
            ].map((s) => (
              <Panel key={s.title}>
                <s.icon size={30} />
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </Panel>
            ))}
          </div>
        ) : (
          <>
            <h2>Your City. Your Ride. Your Territory.</h2>
            <p>
              Urban transportation can be healthy, engaging, social, and rewarding. We’re building a
              platform where every ride connects you with a little more of your city.
            </p>
            <div className="about-feature-grid">
              {[
                {
                  icon: Bike,
                  title: 'Smart bike sharing',
                  text: 'A clear, connected reservation and rental experience.',
                },
                {
                  icon: Compass,
                  title: 'City exploration',
                  text: 'Collect landmark stamps and choose a new route.',
                },
                {
                  icon: Flag,
                  title: 'A little purpose',
                  text: 'Missions and virtual territory influence give you a reason to go.',
                },
                {
                  icon: Leaf,
                  title: 'Shared progress',
                  text: 'Team communities, rewards, and transparent activity estimates.',
                },
              ].map((s) => (
                <Panel key={s.title}>
                  <s.icon size={27} />
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </Panel>
              ))}
            </div>
            <h2>Built as a working pilot.</h2>
            <p>
              The demo uses a real persistent database and backend-controlled scoring. Hardware,
              payment, and GPS adapters are simulated. Advanced battles, subscriptions, and
              forecasting are still on the roadmap.
            </p>
          </>
        )}
        <Link to="/explore" className="button large">
          Explore your city
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </div>
  );
}
export function PlannedPage() {
  const path = useLocation().pathname;
  return (
    <div className="planned-page">
      <Compass size={45} strokeWidth={1.1} />
      <Badge tone="warning">PLANNED · NOT IMPLEMENTED</Badge>
      <h1>The next chapter is still being built.</h1>
      <p>
        {path} belongs to the target platform. This release focuses on the complete rental, ride,
        mission, and reward flow. This feature is not active in the current pilot.
      </p>
      <div className="hero-actions">
        <Link to="/dashboard" className="button">
          Return to your workspace
          <ArrowUpRight size={16} />
        </Link>
        <Link to="/map" className="button secondary">
          Explore the city
        </Link>
      </div>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="planned-page">
      <Badge>404 · AN UNEXPECTED TURN</Badge>
      <h1>A little off the beaten path.</h1>
      <p>That page doesn’t exist. Your next adventure is still around the corner.</p>
      <Link to="/" className="button">
        Find your way home
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
