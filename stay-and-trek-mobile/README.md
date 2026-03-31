# Stay & Trek Mobile

This folder contains the Expo / React Native mobile app for Stay & Trek.

The mobile app is a client for the main Django backend. It is used to:

- browse trails
- view trail details
- view nearby accommodation
- view route-related trail and stay information
- check weather data
- submit trail descriptions for moderation

## Run the app

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

## API workflow

The mobile app can talk to either:

- the local Docker backend
- the cloud backend

For local testing, use the local backend.

For cloud testing, start Expo with the cloud API URL:

```bash
EXPO_PUBLIC_API_BASE_URL=https://stay-and-trek-service-642845720185.europe-west1.run.app npx expo start
```

This is important because local and cloud use different databases.

## Moderation workflow

When a signed-in user submits a trail description:

1. the submission goes to the backend API
2. the trail status is set to `Pending`
3. the moderator reviews it in Django admin
4. the moderator changes the status to `Verified`

The admin approval step is manual.

## Main files

- `app/` app screens and routing
- `components/` reusable UI components
- `context/` shared app context such as accessibility settings
- `services/apiClient.js` API helper functions
- `config/apiConfig.js` API base URL configuration

## Notes

- do not assume local admin and cloud admin show the same data
- use cloud admin when testing cloud mobile submissions
- use local admin when testing local Docker submissions
