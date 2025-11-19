# Firebase Cloud Functions for Aptify

This directory contains Firebase Cloud Functions that handle automated notifications and triggers.

## Functions

1. **onPropertyCreated** - Notifies all admins when a new property is listed
2. **onRentalRequestCreated** - Notifies property owner when a rental request is made
3. **onBuySellRequestCreated** - Notifies property owner when a purchase offer is made
4. **onConstructionRequestCreated** - Notifies provider when a construction request is created
5. **onRenovationRequestCreated** - Notifies provider when a renovation request is created
6. **onConstructionProjectUpdated** - Notifies client when construction project status changes
7. **onRenovationProjectUpdated** - Notifies client when renovation project status changes
8. **onReviewCreated** - Notifies provider when they receive a new review
9. **onSupportMessageCreated** - Notifies all admins when a support message is received
10. **onSupportChatMessageCreated** - Notifies recipient (admin or user) when a chat message is sent

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Deploy functions:
```bash
firebase deploy --only functions
```

3. View logs:
```bash
firebase functions:log
```

## Local Development

Run emulator:
```bash
npm run serve
```

