import { createElement } from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/lib/theme';

function Root() {
  return createElement(ThemeProvider, null, createElement(ErrorBoundary, null, createElement(App)));
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
