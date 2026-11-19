import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  // Match files are provisioned from a private Render Secret File at runtime.
  outputFileTracingExcludes: {
    '/*': ['./data/**/*', './.render-data/**/*', './.render-secrets/**/*', './match-data.b64'],
  },
};
export default config;
