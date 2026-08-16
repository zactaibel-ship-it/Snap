export const colours = {
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  accent: '#52B788',
  background: '#FAFAF7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#22C55E',
  error: '#EF4444',
} as const;

export type ColourName = keyof typeof colours;
