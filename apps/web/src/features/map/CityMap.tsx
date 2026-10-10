import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type GeoJSONSource, type Map as LibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { LocateFixed, Layers, Bike, Minus, Plus, Globe } from 'lucide-react';
import type { Catalog } from '../../lib/api';
import { DEMO_ROUTE } from '../../../../../packages/shared/schemas';
import { useUi } from '../../lib/state';
maplibregl.setWorkerUrl(workerUrl);
type Props = {
  data: Catalog;
  onStation?: (id: string) => void;
  onTerritory?: (id: string) => void;
  compact?: boolean;
  routeStep?: number;
};
const route = {
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: DEMO_ROUTE },
};
function bikeData(data: Catalog) {
  return {
    type: 'FeatureCollection' as const,
    features: data.stations.map((s) => ({
      type: 'Feature' as const,
      properties: {
        id: s.id,
        name: s.name,
        count: data.bikes.filter((b) => b.stationId === s.id && b.status === 'AVAILABLE').length,
      },
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    })),
  };
}
export default function CityMap({
  data,
  onStation,
  onTerritory,
  compact = false,
  routeStep,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<LibreMap | null>(null);
  const current = useRef({ data, onStation, onTerritory });
  current.current = { data, onStation, onTerritory };
  const [territories, setTerritories] = useState(true);
  const [streetTiles, setStreetTiles] = useState(true);
  const [offline, setOffline] = useState(false);
  const [failure, setFailure] = useState(false);
  const notify = useUi((s) => s.notify);
  useEffect(() => {
    if (!ref.current) return;
    let map: LibreMap;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        center: [69.274, 41.32],
        zoom: compact ? 13 : 13.2,
        minZoom: 10,
        maxZoom: 18,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
            },
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#e9ede6' } },
            {
              id: 'streets',
              type: 'raster',
              source: 'osm',
              paint: {
                'raster-saturation': -0.85,
                'raster-contrast': -0.18,
                'raster-opacity': 0.6,
              },
            },
          ],
        },
      });
    } catch {
      setFailure(true);
      return;
    }
    instance.current = map;
    map.on('error', (e) => {
      if (
        e.error.message.includes('tile') ||
        e.error.message.includes('Failed to fetch') ||
        e.error.message.includes('AJAXError')
      )
        setOffline(true);
    });
    map.on('style.load', () => {
      const roads: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      for (let i = 0; i < 18; i++) {
        const lng = 69.235 + i * 0.005;
        roads.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [lng, 41.28],
              [lng + 0.003, 41.305],
              [lng - 0.002, 41.327],
              [lng + 0.001, 41.365],
            ],
          },
        });
      }
      for (let i = 0; i < 18; i++) {
        const lat = 41.28 + i * 0.005;
        roads.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [69.23, lat],
              [69.26, lat + 0.002],
              [69.285, lat - 0.001],
              [69.335, lat + 0.003],
            ],
          },
        });
      }
      map.addSource('schematic', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: roads },
      });
      map.addLayer(
        {
          id: 'schematic-streets-border',
          type: 'line',
          source: 'schematic',
          paint: { 'line-color': '#d6dfce', 'line-width': 7 },
        },
        'streets',
      );
      map.addLayer(
        {
          id: 'schematic-streets',
          type: 'line',
          source: 'schematic',
          paint: { 'line-color': '#fafcf6', 'line-width': 5 },
        },
        'streets',
      );
      // Coordinate-correct demo overlays; street tiles remain an external service.
      map.addSource('territories', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: current.current.data.territories.map((t) => ({
            type: 'Feature',
            properties: {
              id: t.id,
              name: t.name,
              color: t.controllerId
                ? ['#658a71', '#8c94b0', '#c2a07a'][Number(t.id.split('-')[1]) % 3]
                : '#95aa9a',
            },
            geometry: t.geometry as unknown as GeoJSON.Polygon,
          })),
        },
      });
      map.addLayer({
        id: 'territory-fill',
        type: 'fill',
        source: 'territories',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'territory-line',
        type: 'line',
        source: 'territories',
        paint: { 'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.35 },
      });
      map.addSource('route', { type: 'geojson', data: route });
      map.addLayer({
        id: 'route-shadow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 7 },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#276749', 'line-width': 3, 'line-dasharray': [2, 1] },
      });
      map.addSource('bikes', {
        type: 'geojson',
        data: bikeData(current.current.data),
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 35,
      });
      map.addLayer({
        id: 'bike-clusters',
        type: 'circle',
        source: 'bikes',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#276749',
          'circle-radius': 21,
          'circle-stroke-width': 4,
          'circle-stroke-color': '#ffffff',
        },
      });
      for (const station of current.current.data.stations) {
        const el = document.createElement('button');
        el.className = 'bike-marker';
        el.ariaLabel = station.name;
        el.innerHTML =
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9H5l6-11h4l4 11M9 5h3"/></svg>';
        const span = document.createElement('span');
        span.textContent = String(
          current.current.data.bikes.filter(
            (b) => b.stationId === station.id && b.status === 'AVAILABLE',
          ).length,
        );
        el.appendChild(span);
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          current.current.onStation?.(station.id);
          map.flyTo({ center: [station.lng, station.lat], zoom: 14.2, duration: 600 });
        });
        new maplibregl.Marker({ element: el }).setLngLat([station.lng, station.lat]).addTo(map);
      }
      map.on('click', 'territory-fill', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) current.current.onTerritory?.(id);
      });
      map.on('click', 'bike-clusters', async (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const source = map.getSource('bikes') as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(feature.properties!.cluster_id);
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
        });
      });
      map.on('mouseenter', 'territory-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'territory-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      map.remove();
      instance.current = null;
    };
  }, [compact]);
  useEffect(() => {
    const map = instance.current;
    if (!map?.getSource('bikes')) return;
    (map.getSource('bikes') as GeoJSONSource).setData(bikeData(data));
    ref.current?.querySelectorAll('.bike-marker').forEach((el) => {
      const name = el.getAttribute('aria-label');
      const station = data.stations.find((s) => s.name === name);
      if (station) {
        const span = el.querySelector('span');
        if (span)
          span.textContent = String(
            data.bikes.filter((b) => b.stationId === station.id && b.status === 'AVAILABLE').length,
          );
      }
    });
  }, [data]);
  useEffect(() => {
    const map = instance.current;
    if (!map?.getSource('route') || routeStep === undefined) return;
    (map.getSource('route') as GeoJSONSource).setData({
      ...route,
      geometry: {
        type: 'LineString',
        coordinates: DEMO_ROUTE.slice(0, Math.max(2, routeStep + 1)),
      },
    });
    map.easeTo({ center: DEMO_ROUTE[routeStep], duration: 500 });
  }, [routeStep]);
  function toggle() {
    setTerritories(!territories);
    for (const id of ['territory-fill', 'territory-line'])
      if (instance.current?.getLayer(id))
        instance.current.setLayoutProperty(id, 'visibility', territories ? 'none' : 'visible');
  }
  function changeStyle() {
    const next = !streetTiles;
    setStreetTiles(next);
    if (instance.current?.getLayer('streets'))
      instance.current.setLayoutProperty('streets', 'visibility', next ? 'visible' : 'none');
  }
  function locate() {
    if (!navigator.geolocation) {
      notify('Location is unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => instance.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14 }),
      () => notify('Location permission was denied or your location is unavailable.'),
    );
  }
  return (
    <div className={`city-map ${compact ? 'compact' : ''}`}>
      <div ref={ref} className="map-canvas" />
      {failure && (
        <div className="map-error">
          <Bike size={36} />
          <p>This browser could not initialize the map.</p>
          <small>Use the station list to find a demo bike.</small>
        </div>
      )}
      <div className="map-label">
        <span className="live-dot" />
        TASHKENT, UZBEKISTAN <span className="map-live">DEMO</span>
      </div>
      <div className="map-controls">
        <button aria-label="Zoom in" onClick={() => instance.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button aria-label="Zoom out" onClick={() => instance.current?.zoomOut()}>
          <Minus size={18} />
        </button>
        <button aria-label="Use my location" onClick={locate}>
          <LocateFixed size={18} />
        </button>
        <button aria-label="Switch map style" aria-pressed={streetTiles} onClick={changeStyle}>
          <Globe size={18} />
        </button>
        <button aria-label="Toggle territories" aria-pressed={territories} onClick={toggle}>
          <Layers size={18} />
        </button>
      </div>
      <div className="map-legend">
        <i />
        Virtual territories <span>•</span>
        <Bike size={14} /> Demo stations
      </div>
      {offline && (
        <span className="offline-map">
          Offline schematic · demonstration streets, stations & territories
        </span>
      )}
    </div>
  );
}
