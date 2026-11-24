import type { CarSpec, CarUpgradeState, EffectiveCarStats, UpgradeStat } from './types';

export const MAX_UPGRADE_LEVEL = 5;

export const CARS: CarSpec[] = [
  {
    id: 'crimson_gt',
    nameAr: 'النسر الأحمر',
    categoryAr: 'رياضية قياسية',
    descriptionAr: 'سيارة حمراء رياضية متوازنة تمنحك انطلاقة قوية وتحكماً ثابتاً على الطرق السريعة.',
    price: 0,
    primaryColor: '#E11D48',
    secondaryColor: '#9F1239',
    accentColor: '#FDA4AF',
    bodyStyle: 'coupe',
    baseTopSpeed: 56,
    baseAcceleration: 58,
    baseHandling: 62,
    baseNitroCapacity: 55,
  },
  {
    id: 'azure_bolt',
    nameAr: 'السهم الأزرق',
    categoryAr: 'انسيابية سريعة',
    descriptionAr: 'سيارة زرقاء سريعة مصممة للمناورات الخاطفة بين المسارات وتخزين النيترو.',
    price: 450,
    primaryColor: '#0284C7',
    secondaryColor: '#075985',
    accentColor: '#7DD3FC',
    bodyStyle: 'gt',
    baseTopSpeed: 64,
    baseAcceleration: 62,
    baseHandling: 70,
    baseNitroCapacity: 66,
  },
  {
    id: 'obsidian_vip',
    nameAr: 'الشبح الأسود',
    categoryAr: 'كوبيه فاخرة',
    descriptionAr: 'سيارة سوداء فاخرة بهيكل ثقيل وثبات عالٍ وسرعة قصوى مهيبة ليلاً.',
    price: 900,
    primaryColor: '#1E293B',
    secondaryColor: '#0F172A',
    accentColor: '#F43F5E',
    bodyStyle: 'muscle',
    baseTopSpeed: 71,
    baseAcceleration: 66,
    baseHandling: 64,
    baseNitroCapacity: 68,
  },
  {
    id: 'solar_rally',
    nameAr: 'البرق الأصفر',
    categoryAr: 'سباقات الشوارع',
    descriptionAr: 'سيارة صفراء للسباقات تتميز بتسارع شرس واستجابة فورية للمقود.',
    price: 1400,
    primaryColor: '#EAB308',
    secondaryColor: '#A16207',
    accentColor: '#FEF08A',
    bodyStyle: 'gt',
    baseTopSpeed: 74,
    baseAcceleration: 78,
    baseHandling: 76,
    baseNitroCapacity: 70,
  },
  {
    id: 'venom_emerald',
    nameAr: 'الأفعى الخضراء',
    categoryAr: 'رياضية معدلة',
    descriptionAr: 'سيارة خضراء رياضية بتجهيز سباقات احترافي وتوازن ممتاز في الزحام.',
    price: 2100,
    primaryColor: '#059669',
    secondaryColor: '#065F46',
    accentColor: '#6EE7B7',
    bodyStyle: 'coupe',
    baseTopSpeed: 79,
    baseAcceleration: 77,
    baseHandling: 82,
    baseNitroCapacity: 76,
  },
  {
    id: 'nebula_x',
    nameAr: 'نجم المستقبل',
    categoryAr: 'نموذج مستقبلي',
    descriptionAr: 'سيارة بنفسجية مستقبلية مزودة بمكثفات نيترو فائقة الشحن.',
    price: 3000,
    primaryColor: '#7C3AED',
    secondaryColor: '#4C1D95',
    accentColor: '#38BDF8',
    bodyStyle: 'cyber',
    baseTopSpeed: 84,
    baseAcceleration: 83,
    baseHandling: 84,
    baseNitroCapacity: 90,
  },
  {
    id: 'arctic_apex',
    nameAr: 'القمة البيضاء',
    categoryAr: 'أداء فائق',
    descriptionAr: 'سيارة بيضاء عالية الأداء تخترق الهواء بديناميكية حلبات السباق.',
    price: 4200,
    primaryColor: '#F8FAFC',
    secondaryColor: '#94A3B8',
    accentColor: '#EF4444',
    bodyStyle: 'hyper',
    baseTopSpeed: 90,
    baseAcceleration: 88,
    baseHandling: 89,
    baseNitroCapacity: 86,
  },
  {
    id: 'hyper_falcon',
    nameAr: 'الصقر الخارق',
    categoryAr: 'خارقة محدودة',
    descriptionAr: 'سيارة خارقة مميزة تتصدر فئة النخبة بأعلى سرعة قصوى وأقوى دفعة نيترو.',
    price: 6000,
    primaryColor: '#DC2626',
    secondaryColor: '#111827',
    accentColor: '#F59E0B',
    bodyStyle: 'prototype',
    baseTopSpeed: 96,
    baseAcceleration: 95,
    baseHandling: 94,
    baseNitroCapacity: 96,
  },
];

export const DEFAULT_UPGRADES: CarUpgradeState = {
  speedLevel: 0,
  accelLevel: 0,
  handlingLevel: 0,
  nitroLevel: 0,
};

export function getCarById(carId: string): CarSpec {
  return CARS.find((c) => c.id === carId) ?? CARS[0];
}

export function getCarUpgrades(
  upgradesMap: Record<string, CarUpgradeState> | undefined,
  carId: string
): CarUpgradeState {
  const raw = upgradesMap?.[carId];
  if (!raw) return { ...DEFAULT_UPGRADES };
  return {
    speedLevel: Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(raw.speedLevel || 0))),
    accelLevel: Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(raw.accelLevel || 0))),
    handlingLevel: Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(raw.handlingLevel || 0))),
    nitroLevel: Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(raw.nitroLevel || 0))),
  };
}

export function getUpgradeCost(car: CarSpec, stat: UpgradeStat, currentLevel: number): number {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return 0;
  const carIndex = Math.max(0, CARS.findIndex((c) => c.id === car.id));
  const tierFactor = 1 + carIndex * 0.18;
  const statMultiplier = stat === 'speedLevel' ? 1.1 : stat === 'nitroLevel' ? 1.05 : 1.0;
  return Math.round(140 * (currentLevel + 1) * tierFactor * statMultiplier / 10) * 10;
}

export function getEffectiveCarStats(
  car: CarSpec,
  upgrades: CarUpgradeState
): EffectiveCarStats {
  const displaySpeed = Math.min(100, car.baseTopSpeed + upgrades.speedLevel * 4);
  const displayAccel = Math.min(100, car.baseAcceleration + upgrades.accelLevel * 4);
  const displayHandling = Math.min(100, car.baseHandling + upgrades.handlingLevel * 4);
  const displayNitro = Math.min(100, car.baseNitroCapacity + upgrades.nitroLevel * 4);

  // Physics mapping: directly drives canvas simulation behavior
  const topSpeedPx = 460 + displaySpeed * 4.4; // ~706 to ~900 logical px/s
  const accelRate = 170 + displayAccel * 3.1; // ~350 to ~480 logical px/s^2
  const handlingSpeed = 270 + displayHandling * 3.5; // ~487 to ~620 logical px/s
  const nitroMax = 85 + displayNitro * 0.75; // ~126 to ~160 units
  const nitroRegenPerSec = 7.5 + upgrades.nitroLevel * 1.8;

  return {
    topSpeedPx,
    accelRate,
    handlingSpeed,
    nitroMax,
    nitroRegenPerSec,
    displaySpeed,
    displayAccel,
    displayHandling,
    displayNitro,
  };
}
