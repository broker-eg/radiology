import fallbackCover from '@/assets/branding/fallback-cover.jpg';
import type { SuiteApp } from '@/types/domain';

export function coverOf(app: SuiteApp): string {
  return app.coverUrl ?? fallbackCover;
}
