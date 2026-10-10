import { z } from 'zod/v4';
export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(60),
  password: z.string().min(12).max(128),
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  weeklyGoal: z.number().int().min(5).max(500),
  publicProfile: z.boolean(),
});
export const bikeSchema = z.object({
  code: z.string().regex(/^V-\d{3,5}$/),
  type: z.enum(['CITY', 'ELECTRIC']),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OFFLINE']),
  stationId: z.string().min(1),
  battery: z.number().int().min(0).max(100),
});
export const stationSchema = z.object({
  name: z.string().min(3).max(80),
  district: z.string().min(2).max(80),
  lat: z.number().min(41.15).max(41.5),
  lng: z.number().min(69.1).max(69.5),
  capacity: z.number().int().min(1).max(200),
});
export const missionEligibilitySchema = z.object({
  minXp: z.number().int().min(0).max(10000000).default(0),
  maxXp: z.number().int().min(0).max(10000000).nullable().default(null),
  teamRequired: z.boolean().default(false),
  district: z.string().max(80).nullable().default(null),
  hourStart: z.number().int().min(0).max(23).nullable().default(null),
  hourEnd: z.number().int().min(1).max(24).nullable().default(null),
});
export const missionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  category: z.enum([
    'DISTANCE',
    'RIDES',
    'EXPLORATION',
    'DURATION',
    'INFLUENCE',
    'ROUTE',
    'DISTRICTS',
    'ACTIVE_DAYS',
    'MISSIONS',
  ]),
  target: z.number().int().min(1).max(100000),
  xp: z.number().int().min(10).max(2000),
  points: z.number().int().min(0).max(1000),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED']),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  eligibility: missionEligibilitySchema.default({
    minXp: 0,
    maxXp: null,
    teamRequired: false,
    district: null,
    hourStart: null,
    hourEnd: null,
  }),
  sponsorId: z.string().max(100).nullable().default(null),
});
export const missionTarget = (category: string, target: number) =>
  category === 'DISTANCE'
    ? `${target / 1000} km`
    : category === 'DURATION'
      ? `${Math.round(target / 60)} minutes`
      : `${target} ${category === 'RIDES' ? 'rides' : category === 'INFLUENCE' ? 'influence' : category === 'ROUTE' ? 'city loops' : category === 'DISTRICTS' ? 'districts' : category === 'ACTIVE_DAYS' ? 'active days' : category === 'MISSIONS' ? 'completed missions' : 'distinct territories'}`;
export const idSchema = z.object({ id: z.string().min(1).max(100) });
export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'BUSINESS_ADMIN';
export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
  xp: number;
  points: number;
  wallet: number;
  weeklyGoal: number;
  publicProfile: boolean;
  avatar: string | null;
  emailVerified: boolean;
  notificationPreferences: unknown;
  teamId: string | null;
  organizationId: string | null;
}
export const PRICING = { unlock: 2000, perMinute: 400 } as const;
export const DEMO_ROUTE: [number, number][] = [
  [69.2702, 41.3118],
  [69.2728, 41.3128],
  [69.276, 41.3134],
  [69.2798, 41.3144],
  [69.283, 41.3156],
  [69.2852, 41.317],
  [69.288, 41.3181],
  [69.291, 41.319],
  [69.293, 41.3204],
  [69.292, 41.3225],
  [69.289, 41.324],
  [69.2856, 41.3248],
  [69.282, 41.3242],
  [69.2785, 41.3232],
  [69.2752, 41.3215],
  [69.272, 41.3198],
  [69.27, 41.3174],
  [69.2688, 41.3144],
  [69.2702, 41.3118],
];
