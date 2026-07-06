// ============================================================================
// Component render tests (jest-expo project). These verify the presentational
// components actually mount and show what their props say — the layer the
// pure-logic tests can't see.
// ============================================================================
import { render, screen } from '@testing-library/react-native';
import { StreakBadge } from '../components/StreakBadge';
import { Button } from '../components/Button';

describe('StreakBadge', () => {
  it('shows the streak count and a flame when active', async () => {
    await render(<StreakBadge count={7} active />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('🔥')).toBeTruthy();
  });

  it('goes cold (🧊) when the streak is broken', async () => {
    await render(<StreakBadge count={3} active={false} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('🧊')).toBeTruthy();
  });
});

describe('Button', () => {
  it('renders its title', async () => {
    await render(<Button title="ابدأ" onPress={() => {}} />);
    expect(screen.getByText('ابدأ')).toBeTruthy();
  });

  it('shows a spinner instead of the title while loading', async () => {
    await render(<Button title="إرسال" loading onPress={() => {}} />);
    expect(screen.queryByText('إرسال')).toBeNull(); // replaced by ActivityIndicator
  });
});
