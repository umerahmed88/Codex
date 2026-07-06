// react-native's Platform can't load under the node test env; we only assert
// the version constant, so stub the module out.
import { APP_VERSION } from '../lib/appInfo';
import appJson from '../../app.json';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('APP_VERSION', () => {
  it('stays in sync with app.json (bump both together)', () => {
    expect(APP_VERSION).toBe((appJson as { expo: { version: string } }).expo.version);
  });
});
