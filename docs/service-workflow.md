# Service Request Workflow Documentation

## Overview

This document describes the complete service request lifecycle for all service types in the Aptify platform, including state machine, notifications, and data structures.

## Service Types

1. **Construction Projects** (`constructionProjects`)
2. **Renovation Projects** (`renovationProjects`)
3. **Rental Requests** (`rentalRequests`)
4. **Buy/Sell Requests** (`buySellRequests`)

## Firestore Structure

### Construction Projects

**Collection:** `constructionProjects`

**Document Fields:**
- `clientId` (string): ID of the client requesting the service
- `userId` (string): Backward compatibility field, same as clientId
- `providerId` (string, nullable): ID of the assigned provider
- `propertyId` (string, nullable): ID of the property (null for new construction)
- `details` (string): Project description
- `description` (string): Backward compatibility field
- `budget` (number): Project budget in PKR
- `timeline` (string): Project timeline (e.g., "3 months")
- `status` (string): Current status (see State Machine below)
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Subcollection:** `projectUpdates`
- `status` (string): Status at time of update
- `updatedBy` (string): UID of user who made the update
- `note` (string): Update note/description
- `createdAt` (timestamp): Update timestamp

### Renovation Projects

**Collection:** `renovationProjects`

Same structure as `constructionProjects`.

### Rental Requests

**Collection:** `rentalRequests`

**Document Fields:**
- `userId` (string): ID of the user requesting rental
- `propertyId` (string): ID of the property
- `startDate` (date): Rental start date
- `endDate` (date): Rental end date
- `message` (string, optional): Additional message for owner
- `status` (string): Current status
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

### Buy/Sell Requests

**Collection:** `buySellRequests`

**Document Fields:**
- `userId` (string): ID of the user making the offer
- `propertyId` (string): ID of the property
- `offerAmount` (number): Purchase offer amount in PKR
- `message` (string, optional): Additional message for owner
- `status` (string): Current status
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

## State Machine

### Construction/Renovation Projects

```
Pending → Accepted → InProgress → Completed
   ↓         ↓
Rejected  Cancelled
```

**Status Transitions:**
1. **Pending**: Initial state when request is created
   - Client can cancel
   - Provider can accept or reject

2. **Accepted**: Provider has accepted the request
   - Provider can update status to InProgress or Completed
   - Client can view updates

3. **InProgress**: Project is actively being worked on
   - Provider can update status to Completed
   - Provider can add project updates

4. **Completed**: Project is finished
   - Final state

5. **Rejected**: Provider has rejected the request
   - Final state

6. **Cancelled**: Client has cancelled the request
   - Only allowed if status is Pending
   - Final state

### Rental/Buy-Sell Requests

```
Pending → Accepted → Completed
   ↓
Rejected
```

**Status Transitions:**
1. **Pending**: Initial state when request is created
   - Property owner can accept or reject

2. **Accepted**: Owner has accepted the request
   - Can be updated to Completed

3. **Rejected**: Owner has rejected the request
   - Final state

4. **Completed**: Request has been fulfilled
   - Final state

## Notification System

### Notification Types

- `service-request`: New service request created
- `status-update`: Status change notification
- `admin`: Admin notifications
- `system`: System notifications

### Notification Triggers

#### Construction/Renovation Projects

1. **Request Created**
   - Notify: Provider
   - Notify: Client (confirmation)
   - Type: `service-request`

2. **Request Accepted**
   - Notify: Client
   - Type: `status-update`

3. **Request Rejected**
   - Notify: Client
   - Type: `status-update`

4. **Status Updated**
   - Notify: Client
   - Type: `status-update`

5. **Project Completed**
   - Notify: Client
   - Type: `status-update`

6. **Project Cancelled**
   - Notify: Provider (if assigned)
   - Type: `status-update`

#### Rental Requests

1. **Request Created**
   - Notify: Property Owner
   - Notify: User (confirmation)
   - Type: `service-request`

2. **Request Accepted/Rejected**
   - Notify: User
   - Type: `status-update`

#### Buy/Sell Requests

1. **Offer Created**
   - Notify: Property Owner
   - Notify: User (confirmation)
   - Type: `service-request`

2. **Offer Accepted/Rejected**
   - Notify: User
   - Type: `status-update`

## User Flows

### Client Flow (Construction/Renovation)

1. **Submit Request**
   - Fill out form: provider, budget, timeline, description
   - Submit → Creates project document with status "Pending"
   - Creates initial project update
   - Notifications sent to provider and client

2. **View Requests**
   - MyAccount → Construction/Renovation tab
   - See all requests with status timeline
   - View project updates
   - Contact provider (if assigned)

3. **Cancel Request**
   - Only if status is "Pending"
   - Updates status to "Cancelled"
   - Creates project update
   - Notifies provider (if assigned)

### Provider Flow (Construction/Renovation)

1. **View Requests**
   - Provider Dashboard shows all requests assigned to them
   - Also shows pending requests without provider

2. **Accept/Reject**
   - Accept: Updates status to "Accepted", sets providerId
   - Reject: Updates status to "Rejected"
   - Creates project update
   - Notifies client

3. **Update Status**
   - Can update to: InProgress, Completed
   - Can add notes
   - Creates project update
   - Notifies client

### Property Owner Flow (Rental/Buy-Sell)

1. **Receive Request**
   - Notification when request is created
   - View request in property detail page

2. **Accept/Reject**
   - Accept: Updates status to "Accepted"
   - Reject: Updates status to "Rejected"
   - Notifies requester

## Security Rules

### Construction/Renovation Projects

- **Read**: Client, assigned provider, or admin
- **Create**: Authenticated users (must be client)
- **Update**: Provider (for assigned projects), client (can cancel if Pending), or admin
- **Delete**: Client or admin

### Project Updates Subcollection

- **Read**: Client, provider, or admin
- **Create**: Provider, client, or admin
- **Update/Delete**: Admin only

### Rental/Buy-Sell Requests

- **Read**: Requester, property owner, or admin
- **Create**: Authenticated users (must be requester)
- **Update**: Property owner or admin
- **Delete**: Requester, property owner, or admin

## API Endpoints / Pages

### Client Pages

- `/request-construction`: Submit construction request
- `/request-renovation`: Submit renovation request
- `/my-account`: View all service requests with timeline

### Provider Pages

- `/constructor-dashboard`: Manage construction projects
- `/renovator-dashboard`: Manage renovation projects

### Property Pages

- `/properties/:id`: View property and submit rental/buy-sell requests

## Testing Checklist

### Construction/Renovation Flow

- [ ] Client submits request → Project created with status "Pending"
- [ ] Provider receives notification
- [ ] Client receives confirmation notification
- [ ] Provider accepts request → Status changes to "Accepted"
- [ ] Client receives acceptance notification
- [ ] Project update created in subcollection
- [ ] Provider updates status to "InProgress"
- [ ] Client receives status update notification
- [ ] Provider updates status to "Completed"
- [ ] Client receives completion notification
- [ ] Client can cancel if status is "Pending"
- [ ] Provider receives cancellation notification if assigned

### Rental/Buy-Sell Flow

- [ ] User submits rental request → Request created
- [ ] Property owner receives notification
- [ ] User receives confirmation notification
- [ ] Owner accepts/rejects request
- [ ] User receives status update notification

### Security

- [ ] Client can only cancel if status is "Pending"
- [ ] Provider can only update assigned projects
- [ ] Property owner can only update requests for their properties
- [ ] Admin can perform all actions

## Error Handling

- Missing Firestore indexes: Fallback to client-side sorting
- Network errors: Toast notifications
- Permission errors: Redirect to login or show access denied
- Invalid status transitions: Validation and error messages

## Future Enhancements

- File attachments for project updates
- Project milestones and deadlines
- Payment integration
- Review system after completion
- Automated status transitions based on dates
- Email notifications in addition to in-app notifications


