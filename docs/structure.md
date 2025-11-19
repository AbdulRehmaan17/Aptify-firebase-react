# Aptify Firestore Database Structure

This document describes the complete Firestore database structure for the Aptify platform, including all collections, subcollections, and their field definitions.

---

## Table of Contents

1. [Users Collection](#users-collection)
2. [Properties Collection](#properties-collection)
3. [Service Providers Collection](#service-providers-collection)
4. [Construction Projects Collection](#construction-projects-collection)
5. [Renovation Projects Collection](#renovation-projects-collection)
6. [Reviews Collection](#reviews-collection)
7. [Notifications Collection](#notifications-collection)
8. [Support Messages Collection](#support-messages-collection)
9. [Support Chats Collection](#support-chats-collection)
10. [Chats Collection](#chats-collection)
11. [Conversations Collection](#conversations-collection-legacy)
12. [Service Requests Collection](#service-requests-collection-legacy)

---

## Users Collection

**Path:** `users/{uid}`

**Description:** Stores user profile information and authentication data.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | Yes | Firebase Auth UID (document ID) |
| `email` | string | Yes | User email address |
| `displayName` | string | No | User's full name |
| `photoURL` | string | No | Profile photo URL |
| `role` | string | Yes | User role: `'customer'`, `'admin'`, `'constructor'`, `'renovator'` |
| `phone` | string | No | Phone number |
| `addresses` | array | No | Array of user addresses |
| `orders` | array | No | Array of order IDs |
| `wishlist` | array | No | Array of property/product IDs |
| `provider` | string | No | Auth provider: `'google'`, `'email'`, etc. |
| `createdAt` | timestamp | Yes | Account creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Example Document

```json
{
  "uid": "abc123xyz",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg",
  "role": "customer",
  "phone": "+92 300 123-4567",
  "addresses": [],
  "orders": [],
  "wishlist": [],
  "provider": "google",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

---

## Properties Collection

**Path:** `properties/{id}`

**Description:** Stores property listings for sale, rent, and renovation services.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Property title |
| `description` | string | Yes | Detailed property description |
| `price` | number | Yes | Property price |
| `currency` | string | No | Currency code (default: `'PKR'`) |
| `type` | string | Yes | Property type: `'sale'`, `'rent'`, `'renovation'` |
| `listingType` | string | Yes | Listing type (same as type, used for filtering) |
| `status` | string | Yes | Status: `'draft'`, `'pending'`, `'published'`, `'sold'`, `'rented'`, `'archived'` |
| `ownerId` | string | Yes | User UID of property owner |
| `ownerName` | string | No | Owner's name |
| `ownerPhone` | string | No | Owner's phone number |
| `address` | object | Yes | Address object (see below) |
| `location` | geopoint | No | Geographic coordinates |
| `bedrooms` | number | No | Number of bedrooms |
| `bathrooms` | number | No | Number of bathrooms |
| `areaSqFt` | number | No | Area in square feet |
| `yearBuilt` | number | No | Year the property was built |
| `furnished` | boolean | No | Whether property is furnished |
| `parking` | boolean | No | Whether parking is available |
| `amenities` | array | No | Array of amenity strings |
| `photos` | array | No | Array of photo URLs |
| `coverImage` | string | No | Main cover image URL |
| `videos` | array | No | Array of video URLs |
| `featured` | boolean | No | Whether property is featured |
| `views` | number | No | View count (default: 0) |
| `favoritesCount` | number | No | Favorites count (default: 0) |
| `createdAt` | timestamp | Yes | Creation timestamp |
| `updatedAt` | timestamp | Yes | Last update timestamp |

### Address Object Structure

```json
{
  "line1": "123 Main Street",
  "line2": "Apartment 4B",
  "city": "Lahore",
  "state": "Punjab",
  "country": "Pakistan",
  "postalCode": "54000"
}
```

### Example Document

```json
{
  "title": "Modern 3-Bedroom Apartment",
  "description": "Beautiful apartment in prime location...",
  "price": 5000000,
  "currency": "PKR",
  "type": "sale",
  "listingType": "sale",
  "status": "published",
  "ownerId": "abc123xyz",
  "ownerName": "John Doe",
  "ownerPhone": "+92 300 123-4567",
  "address": {
    "line1": "123 Main Street",
    "line2": null,
    "city": "Lahore",
    "state": "Punjab",
    "country": "Pakistan",
    "postalCode": "54000"
  },
  "bedrooms": 3,
  "bathrooms": 2,
  "areaSqFt": 1500,
  "yearBuilt": 2020,
  "furnished": true,
  "parking": true,
  "amenities": ["Swimming Pool", "Gym", "Security"],
  "photos": ["https://example.com/photo1.jpg"],
  "coverImage": "https://example.com/cover.jpg",
  "featured": false,
  "views": 150,
  "favoritesCount": 5,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

---

## Service Providers Collection

**Path:** `serviceProviders/{id}`

**Description:** Stores service provider profiles for construction and renovation services.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User UID of the provider |
| `name` | string | Yes | Provider name/company name |
| `serviceType` | string | Yes | Service type: `'Construction'` or `'Renovation'` |
| `expertise` | array | Yes | Array of expertise areas (e.g., `['Painting', 'Flooring']`) |
| `experienceYears` | number | Yes | Years of experience |
| `rating` | number | Yes | Average rating (0-5, default: 0) |
| `phone` | string | Yes | Contact phone number |
| `email` | string | Yes | Contact email |
| `bio` | string | No | Provider description/bio |
| `approved` | boolean | No | Admin approval status (default: `false`) |
| `createdAt` | timestamp | Yes | Registration timestamp |

### Example Document (Construction)

```json
{
  "userId": "abc123xyz",
  "name": "Malik Builders",
  "serviceType": "Construction",
  "expertise": ["House Construction", "Interior Finishing", "Renovation"],
  "experienceYears": 10,
  "rating": 4.5,
  "phone": "+92 300 123-4567",
  "email": "info@malikbuilders.com",
  "bio": "Professional construction services...",
  "approved": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Example Document (Renovation)

```json
{
  "userId": "def456uvw",
  "name": "Ace Renovations",
  "serviceType": "Renovation",
  "expertise": ["Painting", "Flooring", "Kitchen Remodel"],
  "experienceYears": 8,
  "rating": 4.6,
  "phone": "+92 300 111-2222",
  "email": "info@acerenovations.com",
  "bio": "Professional renovation services with over 10 years of experience...",
  "approved": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Construction Projects Collection

**Path:** `constructionProjects/{id}`

**Description:** Stores construction project requests and their status.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Client user UID |
| `propertyId` | string | Yes | Property document ID |
| `projectType` | string | Yes | Type of construction project |
| `description` | string | Yes | Project description |
| `budget` | number | Yes | Project budget |
| `startDate` | string | Yes | Project start date (ISO format) |
| `endDate` | string | Yes | Project end date (ISO format) |
| `status` | string | Yes | Status: `'Pending'`, `'In Progress'`, `'Completed'`, `'Cancelled'` |
| `providerId` | string | No | Assigned provider UID |
| `createdAt` | timestamp | Yes | Request creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Example Document

```json
{
  "userId": "abc123xyz",
  "propertyId": "prop123",
  "projectType": "House Construction",
  "description": "Build a 3-bedroom house with modern amenities",
  "budget": 5000000,
  "startDate": "2024-02-01",
  "endDate": "2024-08-01",
  "status": "Pending",
  "providerId": "provider123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

---

## Renovation Projects Collection

**Path:** `renovationProjects/{id}`

**Description:** Stores renovation project requests and their status.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Client user UID |
| `propertyId` | string | Yes | Property document ID |
| `serviceCategory` | string | Yes | Category of renovation service |
| `detailedDescription` | string | Yes | Detailed project description |
| `budget` | number | Yes | Project budget |
| `preferredDate` | string | Yes | Preferred start date (ISO format) |
| `status` | string | Yes | Status: `'Pending'`, `'In Progress'`, `'Completed'`, `'Cancelled'` |
| `providerId` | string | No | Assigned provider UID |
| `photos` | array | No | Array of photo URLs |
| `createdAt` | timestamp | Yes | Request creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Example Document

```json
{
  "userId": "abc123xyz",
  "propertyId": "prop123",
  "serviceCategory": "Kitchen Remodel",
  "detailedDescription": "Complete kitchen renovation with new cabinets and appliances",
  "budget": 500000,
  "preferredDate": "2024-03-01",
  "status": "Pending",
  "providerId": "provider456",
  "photos": ["https://example.com/photo1.jpg"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

---

## Reviews Collection

**Path:** `reviews/{id}`

**Description:** Stores user reviews and ratings for properties and services.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reviewerId` | string | Yes | User UID of the reviewer |
| `targetId` | string | Yes | ID of the property or service being reviewed |
| `targetType` | string | Yes | Type: `'property'` or `'service'` |
| `rating` | number | Yes | Rating (1-5) |
| `comment` | string | Yes | Review comment (min 10 characters) |
| `createdAt` | timestamp | Yes | Review creation timestamp |

### Example Document

```json
{
  "reviewerId": "abc123xyz",
  "targetId": "prop123",
  "targetType": "property",
  "rating": 5,
  "comment": "Excellent property with great amenities and location!",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Notifications Collection

**Path:** `notifications/{id}`

**Description:** Stores user notifications.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Target user UID |
| `title` | string | Yes | Notification title |
| `message` | string | Yes | Notification message |
| `type` | string | No | Notification type: `'info'`, `'success'`, `'warning'`, `'error'` |
| `read` | boolean | Yes | Read status (default: `false`) |
| `readAt` | timestamp | No | Timestamp when read |
| `link` | string | No | Optional link URL |
| `createdAt` | timestamp | Yes | Notification creation timestamp |

### Example Document

```json
{
  "userId": "abc123xyz",
  "title": "New Message",
  "message": "You have a new message from John Doe",
  "type": "info",
  "read": false,
  "link": "/chat/conv123",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Support Messages Collection

**Path:** `supportMessages/{id}`

**Description:** Stores customer support messages/tickets.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User UID who created the message |
| `subject` | string | Yes | Message subject |
| `message` | string | Yes | Support message content |
| `status` | string | Yes | Status: `'open'`, `'in-progress'`, `'resolved'`, `'closed'` |
| `priority` | string | No | Priority: `'low'`, `'medium'`, `'high'`, `'urgent'` |
| `createdAt` | timestamp | Yes | Message creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Subcollection: Replies

**Path:** `supportMessages/{id}/replies/{replyId}`

**Description:** Stores admin replies to support messages.

### Reply Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | string | Yes | Admin or user UID |
| `message` | string | Yes | Reply message content |
| `isAdmin` | boolean | Yes | Whether sender is admin |
| `createdAt` | timestamp | Yes | Reply creation timestamp |

### Example Document

```json
{
  "userId": "abc123xyz",
  "subject": "Payment Issue",
  "message": "I'm having trouble processing my payment...",
  "status": "open",
  "priority": "high",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## Support Chats Collection

**Path:** `supportChats/{chatId}`

**Description:** Stores real-time support chat sessions between users and admins.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User UID |
| `adminId` | string | No | Assigned admin UID |
| `status` | string | Yes | Status: `'active'`, `'resolved'`, `'closed'` |
| `createdAt` | timestamp | Yes | Chat creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Subcollection: Messages

**Path:** `supportChats/{chatId}/messages/{messageId}`

**Description:** Stores messages in support chat sessions.

### Message Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | string | Yes | Sender UID (user or admin) |
| `text` | string | Yes | Message text |
| `isAdmin` | boolean | Yes | Whether sender is admin |
| `createdAt` | timestamp | Yes | Message creation timestamp |

### Example Document

```json
{
  "userId": "abc123xyz",
  "adminId": "admin123",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

## Chats Collection

**Path:** `chats/{chatId}`

**Description:** Stores chat conversations between users, property owners, and service providers.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participants` | array | Yes | Array of participant UIDs |
| `type` | string | No | Chat type: `'user-to-user'`, `'user-to-provider'`, `'user-to-owner'` |
| `createdAt` | timestamp | Yes | Chat creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Subcollection: Messages

**Path:** `chats/{chatId}/messages/{messageId}`

**Description:** Stores messages in chat conversations.

### Message Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | string | Yes | Sender UID |
| `text` | string | Yes | Message text |
| `createdAt` | timestamp | Yes | Message creation timestamp |

### Example Document

```json
{
  "participants": ["abc123xyz", "def456uvw"],
  "type": "user-to-provider",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

## Conversations Collection (Legacy)

**Path:** `conversations/{conversationId}`

**Description:** Legacy chat system (kept for backward compatibility). Similar structure to `chats` collection.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participants` | array | Yes | Array of participant UIDs |
| `createdAt` | timestamp | Yes | Conversation creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

### Subcollection: Messages

**Path:** `conversations/{conversationId}/messages/{messageId}`

**Description:** Stores messages in legacy conversations.

### Message Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | string | Yes | Sender UID |
| `text` | string | Yes | Message text |
| `createdAt` | timestamp | Yes | Message creation timestamp |

---

## Service Requests Collection (Legacy)

**Path:** `serviceRequests/{requestId}`

**Description:** Legacy collection for renovation service requests (kept for backward compatibility). New projects should use `renovationProjects`.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Client user UID |
| `providerId` | string | No | Assigned provider UID |
| `serviceType` | string | Yes | Type of service |
| `description` | string | Yes | Request description |
| `status` | string | Yes | Status: `'Pending'`, `'In Progress'`, `'Completed'`, `'Cancelled'` |
| `createdAt` | timestamp | Yes | Request creation timestamp |
| `updatedAt` | timestamp | No | Last update timestamp |

---

## Storage Structure

### User Uploads

**Path:** `user_uploads/{uid}/**`

**Description:** Primary storage location for user-uploaded files.

- Users can only upload to their own `{uid}` folder
- Admins have full access
- All authenticated users can read

### Properties Images

**Path:** `properties/{propertyId}/**`

**Description:** Property images and media files.

- Public read access
- Authenticated users can upload

### User Profile Images

**Path:** `users/{userId}/**`

**Description:** User profile photos and avatars.

- Public read access
- Users can manage their own files

### Construction Project Files

**Path:** `construction_photos/{userId}/**`

**Description:** Construction project photos and documents.

- Authenticated users can read
- Owner can write

### Renovation Project Files

**Path:** `renovation_photos/{userId}/**`

**Description:** Renovation project photos and documents.

- Authenticated users can read
- Owner can write

### Rental Photos

**Path:** `rental_photos/{userId}/**`

**Description:** Rental property photos.

- Authenticated users can read
- Owner can write

### Service Provider Files

**Path:** `service_providers/{providerId}/**`

**Description:** Service provider portfolio images and documents.

- Public read access
- Provider or admin can write

---

## Indexes Required

The following composite indexes may be required for efficient queries:

1. **Reviews Collection:**
   - `targetId` (ascending) + `targetType` (ascending) + `createdAt` (descending)

2. **Properties Collection:**
   - `type` (ascending) + `status` (ascending) + `createdAt` (descending)
   - `listingType` (ascending) + `status` (ascending) + `price` (ascending)

3. **Service Providers Collection:**
   - `serviceType` (ascending) + `approved` (ascending) + `rating` (descending)

4. **Construction Projects Collection:**
   - `userId` (ascending) + `status` (ascending) + `createdAt` (descending)
   - `providerId` (ascending) + `status` (ascending) + `createdAt` (descending)

5. **Renovation Projects Collection:**
   - `userId` (ascending) + `status` (ascending) + `createdAt` (descending)
   - `providerId` (ascending) + `status` (ascending) + `createdAt` (descending)

6. **Notifications Collection:**
   - `userId` (ascending) + `read` (ascending) + `createdAt` (descending)

7. **Conversations/Chats Collections:**
   - `participants` (array-contains) + `updatedAt` (descending)

---

## Notes

- All timestamps should use Firestore `serverTimestamp()` for consistency
- All UIDs should match Firebase Auth user IDs
- Arrays should be used for multi-value fields (e.g., `expertise`, `participants`)
- Boolean fields should default to `false` unless specified
- String fields should be trimmed before storage
- Numbers should be validated and converted to proper numeric types
- All collections support real-time listeners via `onSnapshot()`

---

**Last Updated:** 2024-01-20  
**Version:** 1.0.0

