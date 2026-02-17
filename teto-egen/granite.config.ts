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
    icon: 'https://jino123413.github.io/appintoss-project/logo.png',
    primaryColor: '#007779',
    bridgeColorMode: 'basic',
  },
  webViewProps: {
    type: 'partner',
  },
});
