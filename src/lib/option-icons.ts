import type { IconName } from '@/components/ui';

/** Icons for onboarding / plan options, keyed by slug. */
export const GOAL_ICONS: Record<string, IconName> = {
  'build-muscle': 'barbell',
  'gain-strength': 'trophy',
  'lose-weight': 'flame',
  'fundamental-conditioning': 'heart',
  'sports-performance': 'speedometer',
};

export const FOCUS_ICONS: Record<string, IconName> = {
  chest: 'shield',
  back: 'git-merge',
  arms: 'hand-left',
  shoulders: 'triangle',
  abs: 'grid',
  legs: 'walk',
  glutes: 'ellipse',
  'full-body': 'body',
};
