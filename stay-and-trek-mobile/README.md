# Stay & Trek Mobile

This folder contains the Expo / React Native mobile client for Stay & Trek. It connects to the same Django backend used by the web application.

## What The Mobile App Does

- browse trails
- view trail details
- view nearby accommodation
- view route-related trail and stay information
- check weather data
- submit trail descriptions for moderation

## Dependencies

- Node.js
- npm
- Expo CLI / Expo Go

## Run Locally

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

If you need to point the app at a specific backend:

```bash
EXPO_PUBLIC_API_BASE_URL=<backend-url> npx expo start
```

For local development, use the local Django backend started from the project root.

## Moderation workflow

When a signed-in user submits a trail description from the app:

1. the suggestion is sent to the backend API
2. the trail status is set to `Pending`
3. a moderator reviews the submission in Django admin
4. approved updates are moved to `Verified`

The admin approval step is manual.

## Main Folders

- `app/` app screens and routing
- `components/` reusable UI components
- `context/` shared app context such as accessibility settings
- `services/apiClient.js` API helper functions
- `config/apiConfig.js` API base URL configuration

## Repository Notes

This folder contains:

- mobile app source code
- configuration files
- assets required by the app

The following local artefacts are not needed in an exported project bundle:

- `node_modules/`
- `.expo/`
- `dist/`
- local `.env` files
- editor-specific settings
