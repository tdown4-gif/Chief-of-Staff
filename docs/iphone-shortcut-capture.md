# iPhone Shortcut Capture

Primary capture path for Ty:

1. Dictate or type text into an iOS Shortcut.
2. Send a `POST` request to `https://<app-host>/api/capture`.
3. Include header `Authorization: Bearer <CAPTURE_API_TOKEN>`.
4. Send JSON body:

```json
{
  "text": "Thought to save"
}
```

The Shortcut should show `Saved` when the API returns success. The API returns after raw source persistence; model extraction runs after the response and must not block capture.

## Token Rotation

Generate a new long random token:

```sh
openssl rand -base64 48
```

Update `CAPTURE_API_TOKEN` in the deployed environment, redeploy or restart the app, then update the iOS Shortcut header to use the new token. After confirming the Shortcut returns `Saved`, discard the old token.
