# Project Zeal – API Documentation

## Base URL
- Development: `http://localhost:3001`
- Production: `https://api.zeal.com`

## Authentication
All endpoints (except public ones) require a Clerk JWT token in the `Authorization` header:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

## Endpoints

### Health Check
\`GET /health\`
Returns 200 OK with status.

### Posts

#### Get Feed
\`GET /api/posts/feed\`
Returns feed posts.

#### Create Post
\`POST /api/posts/create\`
Creates a new post. Requires image upload.

### Explore

#### Search
\`GET /api/explore/search?q=<query>\`
Searches consultants, topics, and hashtags.

### Sparks

#### Get Spark Feed
\`GET /api/sparks/feed?filter=<type>\`
Returns spark activities filtered by type.

### Users

#### Get Profile
\`GET /api/users/:userId/profile\`
Returns user profile.

#### Get User Posts
\`GET /api/users/:userId/posts\`
Returns user's posts.

### Payments

#### Create Order
\`POST /api/payments/create-order\`
Creates a Razorpay payment order.

### Bazaar

#### Get Listings
\`GET /api/bazaar/listings?tier=<tier>\`
Returns bazaar listings filtered by tier.

### Quests

#### Get Quests
\`GET /api/quests\`
Returns available quests.

#### Complete Quest
\`POST /api/quests/:questId/complete\`
Completes a quest.

## Error Responses

All errors follow this format:
\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": null
  }
}
\`\`\`

Common error codes:
- `AUTH_ERROR` – Authentication failed
- `VALIDATION_ERROR` – Input validation failed
- `NOT_FOUND` – Resource not found
- `PAYMENT_ERROR` – Payment processing failed
- `INTERNAL_SERVER_ERROR` – Unexpected error
