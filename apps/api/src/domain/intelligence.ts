import { db } from '../db';
export interface DemandProvider {
  forecast(): Promise<Awaited<ReturnType<typeof baselineForecast>>>;
}
export async function baselineForecast() {
  const windowDays = 28;
  const since = new Date(Date.now() - windowDays * 86400000);
  const [stations, rentals] = await Promise.all([
    db.station.findMany({
      where: { enabled: true },
      include: { bikes: { select: { status: true } } },
    }),
    db.rental.findMany({
      where: { state: 'COMPLETED', endedAt: { gte: since } },
      select: { stationId: true, endedAt: true, durationSec: true },
      take: 100000,
    }),
  ]);
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, rides: 0 }));
  for (const rental of rentals)
    if (rental.endedAt) hourly[(rental.endedAt.getUTCHours() + 5) % 24].rides++;
  return {
    method: '28-day mean of completed demo rides by return station; indicative only',
    windowDays,
    sampleSize: rentals.length,
    generatedAt: new Date().toISOString(),
    hourly,
    stations: stations
      .map((station) => {
        const own = rentals.filter((rental) => rental.stationId === station.id);
        const expectedDaily = +(own.length / windowDays).toFixed(1);
        const available = station.bikes.filter((bike) => bike.status === 'AVAILABLE').length;
        return {
          id: station.id,
          name: station.name,
          district: station.district,
          lat: station.lat,
          lng: station.lng,
          rides: own.length,
          expectedDaily,
          available,
          capacity: station.capacity,
          occupancy: station.bikes.filter((bike) => bike.status !== 'IN_USE').length,
          suggestedAdditional: Math.max(0, Math.ceil(expectedDaily) - available),
          averageMinutes: own.length
            ? Math.round(own.reduce((sum, ride) => sum + ride.durationSec, 0) / own.length / 60)
            : 0,
        };
      })
      .sort((a, b) => b.expectedDaily - a.expectedDaily),
  };
}
export class StatisticalDemandProvider implements DemandProvider {
  forecast() {
    return baselineForecast();
  }
}
