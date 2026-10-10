import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, Route, TrendingUp } from 'lucide-react';
import { Badge, Metric, Panel, SectionHead, State } from '../../../../../packages/ui';
import { api, number } from '../../lib/api';
import type { baselineForecast } from '../../../../api/src/domain/intelligence';
import { ActivityChart } from '../dashboard/Dashboard';
export default function Intelligence() {
  const query = useQuery({
    queryKey: ['intelligence'],
    queryFn: () => api<Awaited<ReturnType<typeof baselineForecast>>>('/admin/intelligence'),
  });
  if (!query.data) return <State error={query.error?.message} retry={() => query.refetch()} />;
  const data = query.data;
  const peak = [...data.hourly].sort((a, b) => b.rides - a.rides)[0];
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">SMART CITY INTELLIGENCE</span>
          <h1>A clearer view of tomorrow.</h1>
          <p>
            Transparent statistical estimates from {data.windowDays} days of historical
            demonstration activity.
          </p>
        </div>
        <Badge>STATISTICAL BASELINE · DEMO</Badge>
      </div>
      <div className="metrics-grid">
        <Metric
          icon={<Route size={19} />}
          label="Completed sample rides"
          value={number(data.sampleSize)}
          note="Returns recorded within the window"
        />
        <Metric
          icon={<Bike size={19} />}
          label="Potential inventory gaps"
          value={number(data.stations.filter((station) => station.suggestedAdditional > 0).length)}
          note="Daily mean compared with current availability"
        />
        <Metric
          icon={<Clock size={19} />}
          label="Busiest return hour"
          value={`${String(peak.hour).padStart(2, '0')}:00`}
          note="Tashkent time (UTC+5)"
        />
        <Metric
          icon={<TrendingUp size={19} />}
          label="Observed stations"
          value={String(data.stations.length)}
          note="Enabled fleet locations"
        />
      </div>
      <Panel>
        <SectionHead title="Historical returns by hour" />
        <ActivityChart
          data={data.hourly.map((entry) => ({ day: `${entry.hour}:00`, distance: entry.rides }))}
          unit="rides"
        />
      </Panel>
      <Panel>
        <SectionHead title="Station availability and indicative demand" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Station / district</th>
                <th>Historical returns</th>
                <th>Estimated daily returns</th>
                <th>Available / capacity</th>
                <th>Suggested inventory buffer</th>
              </tr>
            </thead>
            <tbody>
              {data.stations.map((station) => (
                <tr key={station.id}>
                  <td>
                    <b>{station.name}</b>
                    <small className="table-subtext">{station.district}</small>
                  </td>
                  <td>{station.rides}</td>
                  <td>{station.expectedDaily}</td>
                  <td>
                    {station.available} / {station.capacity}
                  </td>
                  <td>
                    {station.suggestedAdditional
                      ? `+${station.suggestedAdditional} bikes`
                      : 'Within baseline'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="notice">
        {data.method}. Return history is a proxy for station activity, not a dispatch prediction.
        Weather, events and future demand are not modeled.
      </div>
    </>
  );
}
