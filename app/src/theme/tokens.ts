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
  ink: '#ecfdf5',           // Crisp mint white text for high contrast readability
  paper: '#031e17',         // Deep dark emerald green background
  surface: '#073327',       // Elevated dark emerald container
  surfaceSubtle: '#0c4233', // Subtle emerald card / chip surface
  line: '#155e4b',          // Emerald divider / border
  muted: '#84c4ad',         // Sage mint secondary text
  signal: '#10b981',        // Vibrant emerald action & active indicator
  signalSubtle: '#064e3b',  // Dark emerald pill background
  safe: '#22c55e',          // Bright safe green
  safeSubtle: '#093a2b',
  caution: '#f59e0b',       // Warm caution amber
  cautionSubtle: '#382506',
  danger: '#ef4444',        // High-contrast danger red
  dangerSubtle: '#421715',
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
