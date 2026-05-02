# App móvil — Letras y Acordes

App React Native con Expo. Funciona en iOS y Android.

## Requisitos

- Node.js 20+
- npm 10+
- Expo Go en tu celular (App Store / Play Store) — para probar sin compilar

## Setup

```bash
cd mobile
npm install
```

### Configurar URL del backend

Editá `app.json`, sección `expo.extra.apiUrl`. Si tu backend corre en localhost:

- **Simulador iOS:** `http://localhost:3000/api/v1`
- **Emulador Android:** `http://10.0.2.2:3000/api/v1`
- **Celular físico (Expo Go):** `http://TU_IP_LOCAL:3000/api/v1` (la IP de tu PC en la misma WiFi)

## Correr

```bash
npm start
```

Te muestra un QR. Escanealo con la app Expo Go en tu celular y la app se abre. Cualquier cambio que hagas en el código se actualiza automáticamente.

## Estructura

```
src/
├── components/         # Componentes reutilizables
│   ├── SongRenderer.tsx       # Renderiza letra + acordes alineados
│   ├── ChordDiagram.tsx       # Diagrama de acorde en SVG
│   ├── TransposeControls.tsx  # Botones +/- de tonalidad
│   ├── SearchBar.tsx
│   └── TabBarIcon.tsx
├── screens/
│   ├── HomeScreen.tsx           # Buscador + populares + géneros
│   ├── SearchResultsScreen.tsx  # Listado de resultados
│   ├── SongDetailScreen.tsx     # Detalle con letra+acordes+transposición
│   ├── ChordsScreen.tsx         # Catálogo de acordes
│   └── SettingsScreen.tsx
├── navigation/
│   └── RootNavigator.tsx        # Bottom tabs + stack
├── services/
│   ├── api.ts                   # Cliente axios + interceptors
│   ├── songs.api.ts
│   └── chords.api.ts
├── store/
│   └── preferences.ts           # Zustand: tamaño de letra, transposiciones
├── theme/
│   ├── colors.ts
│   └── ThemeProvider.tsx
├── types/
│   ├── song.ts
│   └── chord.ts
└── utils/
    └── transposer.ts            # Transposición client-side
```

## Flujo de la app

```
HomeScreen
   │
   ├─ Tap canción popular ──▶ SongDetailScreen
   ├─ Tap género chip ─────▶ SearchResultsScreen
   └─ Submit búsqueda ─────▶ SearchResultsScreen
                                │
                                └─ Tap resultado ──▶ SongDetailScreen
                                                       │
                                                       ├─ Tap acorde ──▶ Modal con diagrama
                                                       ├─ Tap (+) ─────▶ Sube semitono
                                                       └─ Tap (−) ─────▶ Baja semitono
```

## Build para tiendas (post-MVP)

Cuando esté listo para publicar:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo (crear cuenta gratis)
eas login

# Configurar el proyecto
eas build:configure

# Build de iOS
eas build --platform ios --profile production

# Build de Android
eas build --platform android --profile production

# Submit automático a las tiendas
eas submit --platform ios
eas submit --platform android
```

Requisitos para publicar:
- Cuenta Apple Developer (USD 99/año)
- Cuenta Google Play Console (USD 25 una sola vez)
- Íconos y splash screens (`assets/`)
- Descripción y capturas de pantalla
- Política de privacidad (URL pública)
