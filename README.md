# Pathfinder

A personal planning dashboard hosted on GitHub Pages.

- `index.html` — sign in / sign up (Firebase Auth)
- `app.html` — the app: Today, Timeline, Goals, Focus (pomodoro), Notes, Settings
- `assets/` — stylesheet, app logic, shared Firebase config

Data lives in Firestore under `users/{username}/goals/{doc}` and is AES-encrypted in the browser before it is written.
Notes written with the previous version are read from the same documents.

Local preview:

```
npx http-server -p 8082
```
