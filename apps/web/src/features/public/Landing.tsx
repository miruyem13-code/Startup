import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  ArrowRight,
  Bike,
  ScanLine,
  MapPin,
  Hexagon,
  Leaf,
  Compass,
  Flag,
  Sparkles,
  MoveUpRight,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { useCatalog } from '../../lib/hooks';
import { number } from '../../lib/api';
import { Badge, SectionHead, State } from '../../../../../packages/ui';
const CityMap = lazy(() => import('../map/CityMap'));
export default function Landing() {
  const { t } = useTranslation();
  const { data, error, refetch } = useCatalog();
  return (
    <>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="launch-pill">
            <span className="live-dot" /> NOW EXPLORING TASHKENT <span>↗</span>
          </div>
          <h1>
            {t('hero1')}
            <br />
            {t('hero2')}
            <br />
            <span>{t('hero3')}</span>
          </h1>
          <p>{t('heroDescription')}</p>
          <div className="hero-actions">
            <Link to="/explore" className="button large">
              {t('explore')}
              <ArrowUpRight size={19} />
            </Link>
            <Link to="/how-it-works" className="hero-secondary">
              {t('heroCta')}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-social">
            <div className="stacked-avatars">
              <span>AK</span>
              <span>MY</span>
              <span>SR</span>
              <span>DA</span>
            </div>
            <div>
              <b>A city in motion</b>
              <small>Demo riders. Shared adventures.</small>
            </div>
            <span className="social-line" />
            <div className="hero-city">
              <MapPin size={16} />
              <span>Tashkent, UZ</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="map-preview-frame">
            {data ? (
              <Suspense fallback={<State />}>
                <CityMap data={data} compact onStation={() => window.location.assign('/explore')} />
              </Suspense>
            ) : (
              <State error={error?.message} retry={error ? () => refetch() : undefined} />
            )}
            <div className="map-preview-caption">
              <span>
                <i className="live-dot" /> YOUR CITY IS WAITING
              </span>
              <Link to="/explore">
                <MoveUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="hero-map-card">
            <span className="floating-icon">
              <Bike size={23} />
            </span>
            <div>
              <b>Your next ride, nearby.</b>
              <small>
                {data
                  ? `${data.stats.available} demo bikes ready to go`
                  : 'Connecting to the demo fleet'}
              </small>
            </div>
            <span className="arrow-circle">
              <ArrowUpRight size={19} />
            </span>
          </div>
          <div className="hero-territory-card">
            <div className="territory-medallion">
              <Hexagon size={26} />
              <Flag size={12} />
            </div>
            <div>
              <span>EXPLORE. RIDE. CONQUER.</span>
              <b>A new kind of city adventure.</b>
            </div>
            <Sparkles size={16} />
          </div>
          <div className="visual-coordinate">41°18′42.5″N &nbsp; 69°16′12.7″E</div>
        </div>
      </section>
      <section className="landing-metrics">
        <div>
          <span className="eyebrow">A PILOT WITH PURPOSE</span>
          <h3>
            Small journeys.
            <br />
            Bigger possibilities.
          </h3>
        </div>
        <div>
          <b>
            {data ? number(data.stats.totalRides) : '—'}
            <span>+</span>
          </b>
          <span>Simulated journeys</span>
        </div>
        <div>
          <b>
            {data ? number(data.stats.distanceKm) : '—'}
            <small> km</small>
          </b>
          <span>Demo distance explored</span>
        </div>
        <div>
          <b>{data?.stats.stations || '—'}</b>
          <span>Places to start</span>
        </div>
        <div>
          <Leaf size={25} />
          <b>A lighter footprint.</b>
          <span>Every little movement matters.</span>
        </div>
      </section>
      <section className="landing-section how-section" id="how-it-works">
        <SectionHead eyebrow="THE JOURNEY IS THE REWARD" title={t('stepsTitle')}>
          <p>
            Four small steps.
            <br />
            One big change of perspective.
          </p>
        </SectionHead>
        <div className="steps-grid">
          {[
            {
              icon: MapPin,
              title: 'Find your starting point.',
              text: 'Open the map and discover a bike around the corner.',
            },
            {
              icon: ScanLine,
              title: 'Scan. Unlock. Go.',
              text: 'Reserve your bike and enter its ID to try the simulated unlock.',
            },
            {
              icon: Compass,
              title: 'Take the interesting turn.',
              text: 'Explore a new district, a quiet canal, or your favorite city corner.',
            },
            {
              icon: Hexagon,
              title: 'Make the city yours.',
              text: 'Complete missions, collect city stamps, and earn virtual influence.',
            },
          ].map((step, i) => (
            <article className="step-card" key={step.title}>
              <div className="step-top">
                <span className="step-icon">
                  <step.icon size={25} />
                </span>
                <span>0{i + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="city-story">
        <div className="city-story-image">
          <img
            src="/city-bike.jpg"
            alt="A bicycle ready for the next city journey"
            loading="lazy"
          />
          <div className="image-caption">
            <span>MADE FOR THE EVERYDAY EXPLORER</span>
            <ArrowUpRight size={25} />
          </div>
        </div>
        <div className="city-story-copy">
          <Badge>THE CITY IS YOUR PLAYGROUND</Badge>
          <h2>{t('firstStep')}</h2>
          <p>{t('firstDescription')}</p>
          <div className="story-feature">
            <span>
              <Bike size={21} />
            </span>
            <div>
              <b>A ride that fits your day</b>
              <p>Simple reservations. Transparent demo pricing. Room for spontaneity.</p>
            </div>
          </div>
          <div className="story-feature">
            <span>
              <Hexagon size={21} />
            </span>
            <div>
              <b>New ground, new possibilities</b>
              <p>Virtual territories, meaningful missions, and your own city passport.</p>
            </div>
          </div>
          <Link to="/features" className="text-link">
            Explore the VELOCITY experience <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="landing-section possibilities">
        <SectionHead eyebrow="MOVE WITH A LITTLE MORE MEANING" title={t('whyTitle')}>
          <Link className="text-link" to="/features">
            The full experience <ArrowUpRight size={17} />
          </Link>
        </SectionHead>
        <div className="possibility-grid">
          <Link to="/challenges" className="possibility-card">
            <span className="possibility-icon peach">
              <Flag size={24} />
            </span>
            <span className="eyebrow">A REASON TO GO</span>
            <h3>
              Little challenges.
              <br />
              Lasting habits.
            </h3>
            <p>Make room for movement. A mission gives every journey a little more purpose.</p>
            <span className="link-circle">
              <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link to="/leaderboard" className="possibility-card">
            <span className="possibility-icon lavender">
              <Globe size={24} />
            </span>
            <span className="eyebrow">BETTER TOGETHER</span>
            <h3>
              Your people.
              <br />
              Your pace.
            </h3>
            <p>Join a team, celebrate progress, and discover the city in good company.</p>
            <span className="link-circle">
              <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link to="/business" className="possibility-card">
            <span className="possibility-icon green">
              <Leaf size={24} />
            </span>
            <span className="eyebrow">A GREENER WORKDAY</span>
            <h3>
              Good for your team.
              <br />
              Better for your city.
            </h3>
            <p>Bring movement into the workplace with corporate challenges and shared goals.</p>
            <span className="link-circle">
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </div>
      </section>
      <section className="landing-cta">
        <div className="cta-art">
          <Bike size={95} strokeWidth={1} />
          <div className="cta-orbit one" />
          <div className="cta-orbit two" />
        </div>
        <div>
          <span className="eyebrow">RIDE BEYOND LIMITS</span>
          <h2>{t('finalTitle')}</h2>
          <p>{t('finalText')}</p>
        </div>
        <Link to="/register" className="button light large">
          {t('start')}
          <ArrowUpRight size={19} />
        </Link>
      </section>
      <div className="trust-strip">
        <span>
          <ShieldCheck size={17} />
          Privacy comes along for the ride.
        </span>
        <span>
          <Leaf size={17} />
          Environmental estimates, transparently calculated.
        </span>
        <span>
          <Bike size={17} />
          All fleet operations are simulated in this pilot.
        </span>
      </div>
    </>
  );
}
