# App auth contract (sidecar implementer)

Base URL: `https://extynt.com`. All bodies are JSON (`Content-Type: application/json`). All responses
carry `Cache-Control: no-store`. Errors are `{"error": "<code>", ...extra}`.

## 1. Device sign-in

### `POST /api/device/start`

Request:

| field         | type   | required | notes                                                                                                                                                                                            |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `machine_id`  | string | yes      | 64 lowercase hex chars: SHA-256 the app computes from a stable machine identifier. The site stores only this hash (indexed on `devices`), so a future rule can limit a trial to one per machine. |
| `device_name` | string | no       | up to 80 chars, shown on the approval screen                                                                                                                                                     |
| `platform`    | string | no       | e.g. `macOS`, `Windows`                                                                                                                                                                          |
| `app_version` | string | no       |                                                                                                                                                                                                  |

Response 200:

```json
{
  "device_code": "<43-char secret, keep private>",
  "user_code": "ABCD2345",
  "verification_uri": "https://extynt.com/activate",
  "interval": 5,
  "expires_in": 600
}
```

`user_code` is 8 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Show it as `ABCD-2345` and open
`verification_uri?code=ABCD2345` in the browser. Only hashes of both codes are stored.

Errors: `400 invalid_request`, `429 rate_limited` (10 starts per 10 minutes per IP).

### User step

The user signs in on `/activate` (magic link, must be an active tester), checks the device details and
approves or denies.

### `POST /api/device/token`

Request: `{"device_code": "<from start>"}`. Poll no faster than `interval` seconds.

Success 200:

```json
{ "license_token": "<JWS>", "token_type": "license", "expires_at": 1798761599 }
```

The code can be exchanged exactly once.

| HTTP | `error`                 | meaning / action                                                                         |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 400  | `authorization_pending` | keep polling at `interval`                                                               |
| 400  | `slow_down`             | polled too fast; body has the new `interval`, use it                                     |
| 400  | `expired_token`         | code expired (10 min) or already redeemed; restart at `/api/device/start`                |
| 403  | `access_denied`         | user denied, or access ended (`reason`: `revoked`, `expired`, `beta_ended`, `no_tester`) |
| 400  | `invalid_device_code`   | unknown code                                                                             |
| 400  | `invalid_request`       | malformed body                                                                           |
| 429  | `rate_limited`          | 30 polls per minute per IP; back off                                                     |

## 2. License token

Compact JWS (`header.payload.signature`, base64url), algorithm `EdDSA` (Ed25519).

Header: `{"alg":"EdDSA","typ":"JWT","kid":"<key id>"}`.

Claims:

| claim   | type    | meaning                                                                                                                                                        |
| ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iss`   | string  | always `extynt.com`                                                                                                                                            |
| `sub`   | string  | user id                                                                                                                                                        |
| `email` | string  | tester email                                                                                                                                                   |
| `did`   | string  | device id (UUID)                                                                                                                                               |
| `iat`   | integer | issued at, seconds since epoch                                                                                                                                 |
| `exp`   | integer | `min(now + 7 days, access_until, BETA_ENDS_AT)`                                                                                                                |
| `plan`  | string  | enum `beta` \| `trial` \| `license`. Only `beta` is issued today. Clients must reject any other value, including future values they do not know how to honour. |

The server never issues a token whose `exp` is not in the future.

### Public key

`GET /.well-known/extynt-license-key` returns the Ed25519 public key as SPKI PEM
(`application/x-pem-file`), with the key id in the `X-Extynt-Key-Id` header (first 16 hex chars of
SHA-256 over the base64 of the SPKI DER; equals the token's `kid`). **Embed the PEM in the app** and
verify offline; do not fetch it at runtime to decide trust. If the key is ever rotated, a new app
build ships the new key and `kid` selects between embedded keys.

## 3. Refresh

`POST /api/license/refresh` with `Authorization: Bearer <license_token>` and no body. Allowed only
while the token is still valid. Success returns the same shape as `/api/device/token`, with a fresh
`exp` computed by the same rule.

| HTTP | `error`          | meaning                                              |
| ---- | ---------------- | ---------------------------------------------------- |
| 401  | `invalid_token`  | missing, malformed, bad signature, or unknown device |
| 401  | `token_expired`  | past `exp`; repeat the device sign-in                |
| 403  | `device_revoked` | admin revoked this device                            |
| 403  | `access_ended`   | tester revoked or expired or beta over (`reason`)    |
| 429  | `rate_limited`   | 30 per 10 minutes per IP                             |

Refresh around half of the token's remaining life (for example daily), and on app start when online.
Each successful refresh updates the device's `last_seen`.

## 4. Offline behavior

The app trusts a verified token until `exp`. There is no grace period beyond `exp`: once
`now >= exp` the app is locked until a refresh or a new device sign-in succeeds. Do not trust the
system clock alone for long gaps; record the highest `iat` seen and treat a clock earlier than it as
expired.

## 5. Verification steps

1. Split on `.`; require exactly three parts.
2. base64url-decode the header; require `alg == "EdDSA"`. Reject everything else, including `none`.
3. Verify the Ed25519 signature over the ASCII bytes `header + "." + payload` with the embedded key.
4. Decode claims; require `iss == "extynt.com"`, string `sub`, `email`, `did`, integer `iat`, `exp`,
   and `plan` in `{beta, trial, license}` (reject unknown values).
5. Require `now < exp`.
6. Store the token locally (OS keychain/credential store) together with `did`.
