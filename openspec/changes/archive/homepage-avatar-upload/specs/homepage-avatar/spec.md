## ADDED Requirements

### Requirement: HomePage avatar field
The system SHALL store an optional `avatar` field on the `HomePage` configuration containing the URL path (e.g. `/files/...`) of the uploaded avatar image.

#### Scenario: Avatar persisted with config
- **WHEN** an admin saves the home page config with an `avatar` URL via `PUT /api/admin/home-page`
- **THEN** the `avatar` value is persisted and returned by both `GET /api/admin/home-page` and `GET /api/public/home-page`

#### Scenario: Avatar absent returns null/default
- **WHEN** no avatar has been configured
- **THEN** the `avatar` field is `null` (or empty) and the public endpoint does not break

#### Scenario: Replacing avatar deletes the old file
- **WHEN** an admin saves the config with a new `avatar` URL while an old `avatar` (matching a `files` table record) already exists
- **THEN** the system deletes the old file's disk entity and its `files` table record, then persists the new `avatar`

### Requirement: Admin avatar upload UI
The admin "首页管理" page SHALL provide a control to select a local image, upload it, preview it, and save it as the home page avatar.

#### Scenario: Upload and preview in admin
- **WHEN** an admin selects a local image in the upload control
- **THEN** the image is uploaded to `POST /api/admin/upload`, the returned URL is set as the avatar, and the preview card shows the uploaded image immediately

#### Scenario: Remove avatar
- **WHEN** an admin clicks "移除头像"
- **THEN** the avatar field is cleared and the preview reverts to the default placeholder

### Requirement: Frontend avatar echo
The frontend home page (`HomeView`) SHALL display the configured avatar image from the public home page config, falling back to a default placeholder when no avatar is configured or loading fails.

#### Scenario: Echo configured avatar
- **WHEN** the public home page config returns an `avatar` URL
- **THEN** `HomeView` renders that image as the profile avatar instead of the hardcoded placeholder

#### Scenario: Fallback to placeholder
- **WHEN** the public home page config has no `avatar` or the image fails to load
- **THEN** `HomeView` displays the default placeholder image
