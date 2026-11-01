export const lightColors = {
  ink: '#1b1f3b',
  paper: '#fbfaf7',
  surface: '#ffffff',
  surfaceSubtle: '#f4f3ef',
  line: '#e3e0d8',
  muted: '#6b6e85',
  signal: '#3b4cca',
  signalSubtle: '#eef0fa',
  safe: '#1f9d6b',
  safeSubtle: '#e8f7f0',
  caution: '#e0a21b',
  cautionSubtle: '#fcf5e5',
  danger: '#d9453d',
  dangerSubtle: '#fdeeed',
};

export const darkColors = {
  ink: '#fbfaf7',
  paper: '#0f1222',
  surface: '#1a1e38',
  surfaceSubtle: '#24294d',
  line: '#2c325c',
  muted: '#9da0b5',
  signal: '#5d6ef2',
  signalSubtle: '#1f254e',
  safe: '#27ae60',
  safeSubtle: '#132f22',
  caution: '#f39c12',
  cautionSubtle: '#33280e',
  danger: '#e74c3c',
  dangerSubtle: '#3b1a19',
};

export const themeTokens = {
  radii: {
    sheet: 24,
    card: 16,
    button: 12,
    input: 10,
    pill: 20,
    circle: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    screen: 20,
  },
  typography: {
    headingFont: 'BricolageGrotesque_700Bold',
    subheadingFont: 'BricolageGrotesque_600SemiBold',
    bodyFont: 'InstrumentSans_400Regular',
    bodyMedium: 'InstrumentSans_500Medium',
    bodySemiBold: 'InstrumentSans_600SemiBold',
  },
  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },
};

export type ThemeColors = typeof lightColors;
