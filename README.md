# Trip Marketplace API

Production-ready MVP backend for the supplied trip marketplace specification. It uses Node.js, Express, MongoDB/Mongoose, JWT access + refresh tokens, RBAC, `multer` and `fs`-backed local uploads.

## Quick start

1. Copy `.env.example` to `.env` and add your MongoDB URI and JWT secrets.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Add sample destinations:

   ```bash
   npm run seed
   ```

4. Create the first admin (admin accounts cannot be publicly registered):

   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=Admin123! npm run admin
   ```

5. Start:

   ```bash
   npm start
   ```

Import `postman_collection.json`, set `baseUrl` if required, and run the requests in the order described in the collection notes.

## Important behavior

- All API routes use the `/api/v1` prefix.
- A public traveler becomes `ACTIVE` immediately. A seller becomes `PENDING` and must be approved by an admin before creating trips.
- In development, registration returns `verificationToken` and forgot-password returns `resetToken`. In production, connect a real email provider before enabling `REQUIRE_EMAIL_VERIFICATION=true`.
- Payment integration is intentionally not included. New bookings have `paymentStatus: "UNPAID"`.
- Seller trip images use `multipart/form-data`: `coverImage` (one image), `galleryImages` (up to 10 images).
- Seller verification documents use `multipart/form-data`: `documents` (up to 5 PDF/image files).
- Files are saved in `server/uploads` using `multer` and are served from `/uploads/<filename>`.
- Seller trip submission requires a cover image and at least one availability date. A booking atomically decrements available seats, preventing ordinary overbooking races.
- Deleting a trip soft-deletes it. A trip with confirmed/completed bookings is archived instead of being permanently removed.

## Endpoint map

### Authentication

| Method | Endpoint                       | Auth   |
| ------ | ------------------------------ | ------ |
| POST   | `/api/v1/auth/register`        | Public |
| POST   | `/api/v1/auth/login`           | Public |
| POST   | `/api/v1/auth/refresh-token`   | Public |
| POST   | `/api/v1/auth/verify-email`    | Public |
| POST   | `/api/v1/auth/forgot-password` | Public |
| POST   | `/api/v1/auth/reset-password`  | Public |
| GET    | `/api/v1/auth/me`              | Bearer |
| PUT    | `/api/v1/auth/change-password` | Bearer |
| POST   | `/api/v1/auth/logout`          | Bearer |

### Traveler

| Method          | Endpoint                                         |
| --------------- | ------------------------------------------------ |
| GET/PUT/DELETE  | `/api/v1/users/me`                               |
| GET             | `/api/v1/trips`                                  |
| GET             | `/api/v1/trips/:id`                              |
| GET/POST/DELETE | `/api/v1/favorites`, `/api/v1/favorites/:tripId` |
| POST            | `/api/v1/trips/:tripId/inquiries`                |
| GET             | `/api/v1/inquiries`, `/api/v1/inquiries/:id`     |
| POST            | `/api/v1/trips/:tripId/bookings`                 |
| GET             | `/api/v1/bookings`, `/api/v1/bookings/:id`       |
| PATCH           | `/api/v1/bookings/:id/cancel`                    |

### Seller

| Method         | Endpoint                                                   |
| -------------- | ---------------------------------------------------------- |
| GET/PUT        | `/api/v1/seller/profile`                                   |
| POST           | `/api/v1/seller/documents`                                 |
| GET            | `/api/v1/seller/dashboard`                                 |
| GET/POST       | `/api/v1/seller/trips`                                     |
| GET/PUT/DELETE | `/api/v1/seller/trips/:id`                                 |
| POST           | `/api/v1/seller/trips/:id/submit`                          |
| GET            | `/api/v1/seller/inquiries`, `/api/v1/seller/inquiries/:id` |
| PATCH          | `/api/v1/seller/inquiries/:id/status`                      |
| GET            | `/api/v1/seller/bookings`, `/api/v1/seller/bookings/:id`   |
| PATCH          | `/api/v1/seller/bookings/:id/status`                       |

### Admin

| Method | Endpoint                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/admin/dashboard`                                                                                |
| GET    | `/api/v1/admin/users`, `/api/v1/admin/users/:id`                                                         |
| PATCH  | `/api/v1/admin/users/:id/status`                                                                         |
| DELETE | `/api/v1/admin/users/:id` (soft deactivation)                                                            |
| GET    | `/api/v1/admin/sellers`, `/api/v1/admin/sellers/:id`                                                     |
| PATCH  | `/api/v1/admin/sellers/:id/approve` or `/reject`                                                         |
| GET    | `/api/v1/admin/posts`, `/api/v1/admin/posts/:id` (also `/api/v1/admin/trips`, `/api/v1/admin/trips/:id`) |
| PATCH  | `/api/v1/admin/trips/:id/approve`, `/reject`, `/unpublish`                                               |
| DELETE | `/api/v1/admin/trips/:id` (archive)                                                                      |
| GET    | `/api/v1/admin/bookings`, `/api/v1/admin/bookings/:id`                                                   |

## JSON examples

Register traveler:

```json
{
  "name": "Ali Khan",
  "email": "ali@example.com",
  "password": "Ali12345!",
  "role": "TRAVELER"
}
```

Register seller:

```json
{
  "name": "Travel Agency",
  "email": "seller@example.com",
  "password": "Seller12345!",
  "role": "SELLER"
}
```

Create/update seller profile:

```json
{
  "agencyName": "Explore Pakistan Tours",
  "description": "Licensed local tour operator",
  "phone": "+92 300 1234567",
  "address": "Lahore, Pakistan"
}
```

Create a trip with `multipart/form-data`:

```text
title=Hunza Valley Explorer
shortDescription=Mountains, lakes and local culture
fullDescription=A complete guided journey through Hunza Valley.
destination=<Destination ObjectId>
country=Pakistan
city=Hunza
category=Adventure
tripType=Group Tour
duration=7
numberOfNights=6
price=850
currency=USD
minimumGroupSize=1
availability=[{"departureDate":"2026-10-10","returnDate":"2026-10-16","totalSeats":20}]
highlights=["Attabad Lake","Khunjerab Pass"]
includedServices=["Hotel","Transport"]
excludedServices=["Flights"]
itinerary=[{"dayNumber":1,"title":"Arrival","description":"Check in and explore Karimabad","location":"Hunza","activities":["Market walk"]}]
coverImage=<image file>
galleryImages=<image file>
```

Create booking:

```json
{ "tripDateId": "<availability subdocument _id>", "travelers": 2 }
```

## Response format

Success responses contain `success`, `message`, and `data`. List endpoints also contain `pagination` with `page`, `limit`, `total`, and `totalPages`. Errors contain `success: false`, `message`, and optional field-level `errors`.

Trip responses include `price` (number, per traveler) and `currency` (`PKR` or `USD`) inside each trip object. Favorites are available at `GET /api/v1/favorites`, `POST/DELETE /api/v1/favorites/:postId`, and `GET /api/v1/favorites/:postId/check`; authenticated users can also list them through `GET /api/v1/users/favorites`. Trip-specific aliases are `POST/DELETE /api/v1/trips/:id/favorites` and `GET /api/v1/trips/:id/favorites/check`.
