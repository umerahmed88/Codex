// Sentry pulls in a native module that can't load under the node test env, so
// we mock it — we only care that track() shapes events and doesn't throw.
jest.mock('../lib/sentry', () => ({
  Sentry: { addBreadcrumb: jest.fn(), captureException: jest.fn() },
}));

import { buildBreadcrumb, track } from '../lib/analytics';
import { Sentry } from '../lib/sentry';

describe('buildBreadcrumb', () => {
  it('shapes an event into an analytics breadcrumb', () => {
    expect(buildBreadcrumb('lesson_completed', { day: 3 })).toEqual({
      category: 'analytics',
      message: 'lesson_completed',
      level: 'info',
      data: { day: 3 },
    });
  });

  it('defaults props to an empty object', () => {
    expect(buildBreadcrumb('app_opened').data).toEqual({});
  });
});

describe('track', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards the breadcrumb to Sentry', () => {
    track('paywall_viewed', { source: 'lesson' });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      buildBreadcrumb('paywall_viewed', { source: 'lesson' })
    );
  });

  it('never throws when the sink fails', () => {
    (Sentry.addBreadcrumb as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => track('app_opened')).not.toThrow();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
