import type { Config } from 'tailwindcss';
import sharedPreset from '@crucible/config/tailwind';

const config: Config = {
  presets: [sharedPreset as unknown as Config],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'],
};

export default config;
