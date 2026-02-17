import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'teto-egen',
  web: {
    host: '0.0.0.0',
    port: 8081,
    commands: {
      dev: 'rsbuild dev',
      build: 'rsbuild build',
    },
  },
  permissions: [],
  outdir: 'dist',
  brand: {
    displayName: '넌 테토야 에겐이야',
    icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/teto-egen.png',
    primaryColor: '#007779',
    bridgeColorMode: 'basic',
  },
  webViewProps: {
    type: 'partner',
  },
});
