import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bike,
  Search,
  ArrowUpRight,
  MapPin,
  Battery,
  ShieldCheck,
  ScanLine,
  Play,
  Pause,
  Flag,
  Clock,
  Route,
  Zap,
  Check,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import { useAction, useCatalog, useDashboard, useSession } from '../../lib/hooks';
import { money, number, type Catalog } from '../../lib/api';
import { DEMO_ROUTE, PRICING } from '../../../../../packages/shared/schemas';
import { Badge, Button, Panel, State, Modal, Progress } from '../../../../../packages/ui';
const CityMap = lazy(() => import('../map/CityMap'));
type BikeData = Catalog['bikes'][number];
function ReserveButton({ bike }: { bike: BikeData }) {
  const { data } = useSession();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const action = useAction('/rentals/reserve', 'Your demo bike is reserved for 10 minutes.');
  return (
    <Button
      busy={action.isPending}
      disabled={bike.status !== 'AVAILABLE'}
      onClick={() => {
        if (!data?.user) {
          navigate('/login?next=/bikes');
          return;
        }
        action
          .mutateAsync({ bikeId: bike.id })
          .then(() => navigate('/ride/active'))
          .catch(() => {});
      }}
    >
      {t('reserve')}
      <ArrowUpRight size={16} />
    </Button>
  );
}
export function BikeCard({ bike }: { bike: BikeData }) {
  const catalog = useCatalog();
  const pricing = catalog.data?.pricing;
  const [reporting, setReporting] = useState(false);
  const [description, setDescription] = useState('');
  const report = useAction(
    `/bikes/${bike.id}/report`,
    'Thanks. Operations has received your report.',
  );
  return (
    <Panel className="bike-card">
      <div className="bike-card-head">
        <Badge tone={bike.status === 'AVAILABLE' ? '' : 'neutral'}>
          {bike.status.replace('_', ' ')}
        </Badge>
        <span>
          {bike.type === 'ELECTRIC' ? <Zap size={17} /> : <Bike size={18} />}{' '}
          {bike.type === 'ELECTRIC' ? 'Electric' : 'City'}
        </span>
      </div>
      <div className="bike-illustration">
        <svg viewBox="0 0 300 150" aria-hidden="true">
          <g stroke="currentColor" fill="none" strokeWidth="3">
            <circle cx="64" cy="102" r="38" />
            <circle cx="239" cy="102" r="38" />
            <path d="m64 102 47-76 53 76H64l58-99h43l74 99m-138-99h33m27 12 33-5h17" />
            <path d="M86 9h-39v14h48M143 42h48v15h-56" strokeWidth="2" />
            <path d="M64 102v-38m175 38-19-52" />
          </g>
        </svg>
      </div>
      <div className="bike-card-title">
        <div>
          <h3>VELOCITY {bike.code}</h3>
          <span>
            {bike.type === 'ELECTRIC' ? 'A little extra momentum.' : 'Your everyday escape.'}
          </span>
        </div>
        <span className="bike-battery">
          <Battery size={16} />
          {bike.battery}%
        </span>
      </div>
      <p className="bike-location">
        <MapPin size={14} />
        {bike.station.name}
      </p>
      <div className="bike-card-bottom">
        <div>
          <b>{money(pricing?.perMinute ?? PRICING.perMinute)}</b>
          <small>per minute · {money(pricing?.unlockFee ?? PRICING.unlock)} unlock</small>
        </div>
        <ReserveButton bike={bike} />
      </div>
      {bike.stationId !== 'station-0' && (
        <small className="demo-bike-location">
          Discovery only here. Simulated rides start at Amir Temur Square.
        </small>
      )}
      <Button tone="ghost" onClick={() => setReporting(true)}>
        <AlertTriangle size={15} />
        Report a problem
      </Button>
      {reporting && (
        <Modal title={`Report ${bike.code}`} close={() => setReporting(false)}>
          <p className="muted">
            Tell operations what you noticed. For urgent safety concerns, do not use the bicycle.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              report
                .mutateAsync({ description })
                .then(() => {
                  setDescription('');
                  setReporting(false);
                })
                .catch(() => {});
            }}
          >
            <label>
              What is wrong?
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={10}
                maxLength={500}
                placeholder="For example: the rear brake feels loose."
                required
              />
            </label>
            <Button type="submit" busy={report.isPending}>
              Send report
              <AlertTriangle size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
export function BikesPage() {
  const query = useCatalog();
  const { id } = useParams();
  const [term, setTerm] = useState('');
  const [type, setType] = useState('ALL');
  const [available, setAvailable] = useState(true);
  if (!query.data)
    return (
      <State error={query.error?.message} retry={query.error ? () => query.refetch() : undefined} />
    );
  const data = query.data;
  const bikes = data.bikes.filter(
    (b) =>
      (!id || b.id === id) &&
      (type === 'ALL' || b.type === type) &&
      (!available || b.status === 'AVAILABLE') &&
      `${b.code} ${b.station.name}`.toLowerCase().includes(term.toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">TWO WHEELS. ENDLESS POSSIBILITIES.</span>
          <h1>Find your next ride.</h1>
          <p>Pick a starting point. Let the city do the rest.</p>
        </div>
        <Link to="/map" className="button secondary">
          <MapPin size={17} />
          See the city map
        </Link>
      </div>
      <div className="notice">
        <ShieldCheck size={18} />
        <span>
          Demo fleet · reservations expire after 10 minutes. The simulated loop begins at Amir Temur
          Square.
        </span>
      </div>
      <div className="filter-bar">
        <div className="search-input">
          <Search size={17} />
          <input
            placeholder="Search bike ID or station"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="tabs">
          {['ALL', 'CITY', 'ELECTRIC'].map((option) => (
            <button
              className={type === option ? 'active' : ''}
              onClick={() => setType(option)}
              key={option}
            >
              {option === 'ALL' ? 'All bikes' : option === 'CITY' ? 'City bikes' : 'Electric'}
            </button>
          ))}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          Available only
        </label>
        <span className="muted">{bikes.length} bikes</span>
      </div>
      <div className="bike-grid">
        {bikes.slice(0, 30).map((bike) => (
          <BikeCard key={bike.id} bike={bike} />
        ))}
      </div>
      {!bikes.length && <State empty="No bikes match your search." />}
      {bikes.length > 30 && (
        <p className="muted">
          Showing the first 30 bikes. Search by bike ID or station to narrow your results.
        </p>
      )}
    </>
  );
}
export function MapPage() {
  const query = useCatalog();
  const [stationId, setStation] = useState('station-0');
  const [term, setTerm] = useState('');
  const [district, setDistrict] = useState('ALL');
  const { t } = useTranslation();
  if (!query.data) return <State error={query.error?.message} />;
  const data = query.data;
  const station = data.stations.find((s) => s.id === stationId);
  return (
    <div className="map-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">GO WHERE YOUR CURIOSITY TAKES YOU</span>
          <h1>{t('explore')}</h1>
          <p>{t('exploreDescription')}</p>
        </div>
        <Badge>DEMO FLEET · TASHKENT</Badge>
      </div>
      <div className="map-workspace">
        <div className="map-side-panel">
          <div className="search-input">
            <Search size={17} />
            <input
              placeholder="Find a station"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <select
            aria-label="District filter"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="ALL">All districts</option>
            {[...new Set(data.stations.map((s) => s.district))].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <div className="station-list">
            {data.stations
              .filter(
                (s) =>
                  s.name.toLowerCase().includes(term.toLowerCase()) &&
                  (district === 'ALL' || s.district === district),
              )
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStation(s.id)}
                  className={`station-item ${s.id === stationId ? 'selected' : ''}`}
                >
                  <span className="station-icon">
                    <Bike size={20} />
                  </span>
                  <div>
                    <b>{s.name}</b>
                    <small>{s.district}</small>
                  </div>
                  <span className="station-count">
                    {
                      data.bikes.filter((b) => b.stationId === s.id && b.status === 'AVAILABLE')
                        .length
                    }
                    <small>bikes</small>
                  </span>
                </button>
              ))}
          </div>
        </div>
        <Suspense fallback={<State />}>
          <CityMap data={data} onStation={setStation} />
        </Suspense>
      </div>
      {station && (
        <Panel className="selected-station">
          <div>
            <Badge>YOUR STARTING POINT</Badge>
            <h2>{station.name}</h2>
            <p>
              {station.district} · {station.capacity} docking spaces · Park only at a marked
              station.
            </p>
          </div>
          <div className="station-bike-row">
            {data.bikes
              .filter((b) => b.stationId === station.id && b.status === 'AVAILABLE')
              .slice(0, 3)
              .map((b) => (
                <div key={b.id}>
                  <Bike size={24} />
                  <b>{b.code}</b>
                  <span>{b.type === 'CITY' ? 'City bike' : 'Electric'}</span>
                  <ReserveButton bike={b} />
                </div>
              ))}
          </div>
          {!data.bikes.some((b) => b.stationId === station.id && b.status === 'AVAILABLE') && (
            <p>No demo bicycles are available at this station.</p>
          )}
        </Panel>
      )}
    </div>
  );
}
function CameraScanner({ onCode }: { onCode: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stream: MediaStream | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    async function start() {
      try {
        if (!('BarcodeDetector' in window))
          throw new Error(
            'QR recognition is unavailable in this browser. Use manual bike ID entry.',
          );
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        const Detector = (
          window as unknown as {
            BarcodeDetector: new (options: object) => {
              detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
            };
          }
        ).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });
        interval = setInterval(async () => {
          if (video.current) {
            const codes = await detector.detect(video.current).catch(() => []);
            if (codes[0]) {
              onCode(codes[0].rawValue);
              if (interval) clearInterval(interval);
              stream?.getTracks().forEach((t) => t.stop());
            }
          }
        }, 500);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    start();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);
  return (
    <div className="camera-preview">
      {error ? <p>{error}</p> : <video ref={video} playsInline muted />}
    </div>
  );
}
export function ActiveRidePage() {
  const query = useDashboard();
  const catalog = useCatalog();
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [summary, setSummary] = useState<{
    distanceM: number;
    durationSec: number;
    xp: number;
    price: number;
    influence: number;
  } | null>(null);
  const [finish, setFinish] = useState(false);
  const ride = query.data?.active;
  const id = ride?.id || 'none';
  const unlock = useAction(
    `/rentals/${id}/unlock`,
    'Demo lock released. No physical hardware was unlocked.',
  );
  const advance = useAction(`/rentals/${id}/advance`, 'Simulation advanced by 90 seconds.');
  const pause = useAction(`/rentals/${id}/pause`, 'Simulation state saved.');
  const cancel = useAction(`/rentals/${id}/cancel`, 'Reservation cancelled.');
  const end = useAction<{
    distanceM: number;
    durationSec: number;
    xp: number;
    price: number;
    influence: number;
  }>(`/rentals/${id}/finish`, 'Journey complete. Your progress has been saved.');
  if (!query.data || !catalog.data)
    return <State error={query.error?.message || catalog.error?.message} />;
  if (summary)
    return (
      <div className="ride-summary">
        <span className="summary-check">
          <Check size={37} />
        </span>
        <Badge>A LITTLE MOVEMENT. A NEW CHAPTER.</Badge>
        <h1>Your city looks good on you.</h1>
        <p>Your simulated ride is complete. All progress is saved to your account.</p>
        <div className="summary-grid">
          <div>
            <b>{number(summary.distanceM / 1000, 1)}</b>
            <span>km explored</span>
          </div>
          <div>
            <b>{Math.ceil(summary.durationSec / 60)}</b>
            <span>minutes in motion</span>
          </div>
          <div>
            <b>+{summary.xp}</b>
            <span>ride XP earned</span>
          </div>
          <div>
            <b>+{summary.influence}</b>
            <span>influence pool</span>
          </div>
        </div>
        <p>
          Demo wallet charge: <b>{money(summary.price)}</b>
        </p>
        <div className="hero-actions">
          <Link to="/dashboard" className="button">
            See your progress
            <ArrowUpRight size={16} />
          </Link>
          <Link to="/missions" className="button secondary">
            Mission updates
            <Flag size={16} />
          </Link>
        </div>
      </div>
    );
  if (!ride)
    return (
      <State empty="Your next journey is waiting." retry={() => window.location.assign('/bikes')} />
    );
  const routeDone = ride.step === DEMO_ROUTE.length - 1;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">YOUR JOURNEY IN MOTION</span>
          <h1>
            {ride.state === 'RESERVED'
              ? 'Ready when you are.'
              : 'A little further, a little freer.'}
          </h1>
          <p>
            {ride.bike.code} · {ride.bike.type === 'ELECTRIC' ? 'Electric' : 'City'} bike · Amir
            Temur city loop
          </p>
        </div>
        <Badge>{ride.state === 'RESERVED' ? 'RESERVED FOR YOU' : 'SIMULATED RIDE'}</Badge>
      </div>
      <div className="notice">
        <ShieldCheck size={18} />
        <span>
          Demo Mode · location and elapsed time are server-generated. No physical lock, real GPS
          tracking, or real charge.
        </span>
      </div>
      {ride.state === 'RESERVED' ? (
        <div className="unlock-layout">
          <BikeCard bike={{ ...ride.bike, status: 'RESERVED' }} />
          <Panel className="unlock-panel">
            <ScanLine size={33} />
            <h2>A new adventure, unlocked.</h2>
            <p>
              Your bike is reserved until{' '}
              {new Date(ride.expiresAt).toLocaleTimeString('en', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Enter the bike ID from the label to simulate the unlock.
            </p>
            <label>
              Bike ID
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={ride.bike.code}
              />
            </label>
            <Button busy={unlock.isPending} onClick={() => unlock.mutate({ code })}>
              <ScanLine size={18} />
              Simulate unlock
            </Button>
            <Button tone="secondary" onClick={() => setCamera(!camera)}>
              Use camera scanner
            </Button>
            {camera && <CameraScanner onCode={setCode} />}
            <Button tone="ghost" onClick={() => cancel.mutate({})} busy={cancel.isPending}>
              Cancel reservation
            </Button>
          </Panel>
        </div>
      ) : (
        <>
          <div className="metrics-grid ride-metrics">
            <div className="panel ride-stat">
              <Clock size={21} />
              <span>SIMULATED TIME</span>
              <b>
                {String(Math.floor(ride.durationSec / 60)).padStart(2, '0')}
                <small>:{String(ride.durationSec % 60).padStart(2, '0')}</small>
              </b>
            </div>
            <div className="panel ride-stat">
              <Route size={21} />
              <span>DISTANCE EXPLORED</span>
              <b>
                {number(ride.distanceM / 1000, 2)}
                <small> km</small>
              </b>
            </div>
            <div className="panel ride-stat">
              <Zap size={21} />
              <span>BASE XP PREVIEW</span>
              <b>
                {Math.floor(ride.distanceM / 100) * 10}
                <small> XP</small>
              </b>
            </div>
            <div className="panel ride-stat">
              <WalletIcon />
              <span>ESTIMATED DEMO CHARGE</span>
              <b>
                {number(ride.unlockFee + Math.ceil(ride.durationSec / 60) * ride.perMinute)}
                <small> UZS</small>
              </b>
            </div>
          </div>
          <div className="active-map">
            <Suspense fallback={<State />}>
              <CityMap data={catalog.data} routeStep={ride.step} />
            </Suspense>
            <div className="active-map-card">
              <Navigation size={21} />
              <div>
                <b>Amir Temur city loop</b>
                <small>Curated demonstration route · not navigation guidance</small>
              </div>
              <Badge>{ride.step} / 18 steps</Badge>
            </div>
          </div>
          <Panel className="ride-controls">
            <div>
              <h3>
                {routeDone
                  ? 'Back where you started. A little more you.'
                  : ride.simulationPaused
                    ? 'Take a little breather.'
                    : 'The next corner is waiting.'}
              </h3>
              <p>Each step adds 90 simulated seconds. Return to the starting station to park.</p>
              <Progress value={(ride.step / 18) * 100} />
            </div>
            <Button
              tone="secondary"
              busy={pause.isPending}
              onClick={() => pause.mutate({ paused: !ride.simulationPaused })}
            >
              {ride.simulationPaused ? <Play size={17} /> : <Pause size={17} />}{' '}
              {ride.simulationPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              disabled={ride.simulationPaused || routeDone}
              busy={advance.isPending}
              onClick={() => advance.mutate({ step: ride.step })}
            >
              <Play size={17} />
              Next simulation step
            </Button>
            <Button tone="danger" onClick={() => setFinish(true)}>
              End ride
              <Flag size={16} />
            </Button>
          </Panel>
          {finish && (
            <Modal title="Park and finish your journey" close={() => setFinish(false)}>
              <p className="muted">
                Parking is checked against the simulated route position. The loop returns to Amir
                Temur Square.
              </p>
              <p>
                Demo charge:{' '}
                <b>{money(ride.unlockFee + Math.ceil(ride.durationSec / 60) * ride.perMinute)}</b>
              </p>
              <Button
                busy={end.isPending}
                onClick={() =>
                  end
                    .mutateAsync({ stationId: 'station-0' })
                    .then((result) => {
                      setSummary(result);
                      setFinish(false);
                    })
                    .catch(() => {})
                }
              >
                <MapPin size={17} />
                Park at Amir Temur Square
              </Button>
              <Button tone="ghost" onClick={() => setFinish(false)}>
                Keep exploring
              </Button>
            </Modal>
          )}
        </>
      )}
    </>
  );
}
function WalletIcon() {
  return <span className="currency-icon">₴</span>;
}
export function RentalsPage() {
  const query = useDashboard();
  if (!query.data) return <State error={query.error?.message} />;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">EVERY JOURNEY HAS A STORY</span>
          <h1>Your road, so far.</h1>
          <p>Completed rides, saved by the backend. Showing the 20 most recent.</p>
        </div>
        <Link to="/bikes" className="button">
          Start another chapter
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Bike & station</th>
                <th>Completed</th>
                <th>Distance</th>
                <th>Time</th>
                <th>XP</th>
                <th>Demo charge</th>
              </tr>
            </thead>
            <tbody>
              {query.data.rides.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.bike.code}</b>
                    <small className="table-subtext">{r.station?.name}</small>
                  </td>
                  <td>{r.endedAt ? new Date(r.endedAt).toLocaleDateString() : ''}</td>
                  <td>{number(r.distanceM / 1000, 1)} km</td>
                  <td>{Math.ceil(r.durationSec / 60)} min</td>
                  <td>+{r.xp}</td>
                  <td>{money(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!query.data.rides.length && <State empty="Your story starts with a ride." />}
        </div>
      </Panel>
    </>
  );
}
