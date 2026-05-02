import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama AppRegistry.registerComponent('main', () => App);
// y se asegura de que el ambiente sea el correcto tanto si la app
// se carga en Expo Go como si se ejecuta en una build nativa.
registerRootComponent(App);
