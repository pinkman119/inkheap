## ADDED Requirements

### Requirement: Authenticated image upload
The system SHALL provide a protected endpoint `POST /api/admin/upload` that accepts a single image file field named `file` and stores it on the server's local `files/` directory, returning a publicly accessible URL.

#### Scenario: Successful upload
- **WHEN** an authenticated admin uploads a valid image file via `multipart/form-data` field `file`
- **THEN** the server saves it under `files/<YYYY-MM-DD>/<uuid>.<ext>`, writes a record into the `files` table, and returns `{ id, url: "/files/<YYYY-MM-DD>/<uuid>.<ext>", filename, size }`

#### Scenario: Upload persists DB record
- **WHEN** a file is uploaded successfully
- **THEN** a corresponding row exists in the `files` table capturing filename, url, relativePath, mimeType, size and createdAt

#### Scenario: Unauthenticated upload rejected
- **WHEN** a request without a valid admin JWT token hits `POST /api/admin/upload`
- **THEN** the server responds with 401 Unauthorized and does not store any file

#### Scenario: Non-image rejected
- **WHEN** a non-image file (e.g. `.txt`, `.exe`) is uploaded
- **THEN** the server rejects it (400/415) and does not store the file

#### Scenario: Oversized file rejected
- **WHEN** an image larger than 5MB is uploaded
- **THEN** the server rejects it (413) and does not store the file

### Requirement: Static file serving
The system SHALL serve uploaded files under the `/files/*` route publicly (no authentication required) so they can be used directly as image sources in the frontend.

#### Scenario: Public access to uploaded file
- **WHEN** a browser requests `GET /files/<path>` for an existing uploaded file
- **THEN** the server returns the file bytes with an appropriate `Content-Type` image header

#### Scenario: Missing file returns 404
- **WHEN** a request targets a non-existent path under `/files/`
- **THEN** the server responds with 404

### Requirement: Delete syncs database and disk
The system SHALL provide a protected endpoint `DELETE /api/admin/upload/:id` that removes both the database `files` record and the physical file on disk.

#### Scenario: Successful delete
- **WHEN** an authenticated admin deletes an existing file by `id`
- **THEN** the server removes the physical file under `files/` and deletes the matching `files` table row, responding 200

#### Scenario: Delete missing record
- **WHEN** an admin deletes a non-existent `id`
- **THEN** the server responds 404 and leaves disk state unchanged

#### Scenario: Unauthenticated delete rejected
- **WHEN** a request without a valid admin JWT token hits `DELETE /api/admin/upload/:id`
- **THEN** the server responds with 401 and performs no deletion
