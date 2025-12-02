# Aptify - Chat System Structure

Complete documentation of the chat system architecture, data structures, and workflows.

## Table of Contents

1. [Overview](#overview)
2. [Chat Types](#chat-types)
3. [Data Structures](#data-structures)
4. [User Chats](#user-chats)
5. [Support Chats](#support-chats)
6. [Real-time Updates](#real-time-updates)
7. [Notifications](#notifications)
8. [Security Rules](#security-rules)

---

## Overview

The Aptify platform includes two main chat systems:

1. **User Chats** (`chats` collection) - Communication between users, property owners, and service providers
2. **Support Chats** (`supportChats` collection) - Customer support communication between users and admins

Both systems use Firestore subcollections for messages and implement real-time updates via `onSnapshot`.

---

## Chat Types

### 1. User Chats (`chats`)

**Purpose:** Enable communication between:
- Users and property owners
- Users and service providers
- Property owners and service providers

**Collection Path:** `chats/{chatId}`

### 2. Support Chats (`supportChats`)

**Purpose:** Customer support communication
- Users can initiate support chats
- Admins respond to support requests
- Real-time messaging for quick support

**Collection Path:** `supportChats/{chatId}`

---

## Data Structures

### User Chats Collection

**Path:** `chats/{chatId}`

#### Document Structure

```javascript
{
  participants: string[],        // Array of user UIDs [userId1, userId2]
  type: string,                  // Optional: 'user-to-user', 'user-to-provider', 'user-to-owner'
  createdAt: Timestamp,          // Chat creation timestamp
  updatedAt: Timestamp,         // Last message timestamp
  lastMessage: string,           // Optional: Preview of last message
  lastMessageAt: Timestamp,     // Optional: Last message timestamp
}
```

#### Messages Subcollection

**Path:** `chats/{chatId}/messages/{messageId}`

```javascript
{
  senderId: string,             // UID of message sender
  text: string,                 // Message content
  createdAt: Timestamp,         // Message timestamp
  read: boolean,                // Optional: Read status
  readAt: Timestamp,            // Optional: Read timestamp
}
```

### Support Chats Collection

**Path:** `supportChats/{chatId}`

#### Document Structure

```javascript
{
  userId: string,               // UID of user requesting support
  adminId: string | null,       // UID of assigned admin (null if unassigned)
  status: string,               // 'active', 'resolved', 'closed'
  createdAt: Timestamp,         // Chat creation timestamp
  updatedAt: Timestamp,        // Last update timestamp
  subject: string,              // Optional: Chat subject
}
```

#### Messages Subcollection

**Path:** `supportChats/{chatId}/messages/{messageId}`

```javascript
{
  senderId: string,            // UID of sender (user or admin)
  text: string,                // Message content
  isAdmin: boolean,            // true if sender is admin
  createdAt: Timestamp,        // Message timestamp
  read: boolean,               // Optional: Read status
}
```

---

## User Chats

### Creating a Chat

**Trigger:** User clicks "Contact" or "Start Chat" on:
- Property detail page (contact owner)
- Provider detail page (contact provider)

**Process:**
1. Check if chat already exists between participants
2. If exists, navigate to existing chat
3. If not, create new chat document
4. Initialize with participants array
5. Navigate to chat page

**Code Example:**
```javascript
// Check for existing chat
const existingChat = await findChatByParticipants([userId1, userId2]);

if (existingChat) {
  navigate(`/chats?chatId=${existingChat.id}`);
} else {
  // Create new chat
  const chatRef = await addDoc(collection(db, 'chats'), {
    participants: [userId1, userId2],
    type: 'user-to-provider',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  navigate(`/chats?chatId=${chatRef.id}`);
}
```

### Sending Messages

**Process:**
1. User types message
2. Create message document in subcollection
3. Update chat `updatedAt` and `lastMessage`
4. Real-time listener updates UI immediately
5. Cloud Function notifies receiver

**Code Example:**
```javascript
// Send message
await addDoc(
  collection(db, 'chats', chatId, 'messages'),
  {
    senderId: currentUser.uid,
    text: messageText,
    createdAt: serverTimestamp(),
    read: false,
  }
);

// Update chat metadata
await updateDoc(doc(db, 'chats', chatId), {
  updatedAt: serverTimestamp(),
  lastMessage: messageText.substring(0, 50),
  lastMessageAt: serverTimestamp(),
});
```

### Real-time Message Listener

```javascript
useEffect(() => {
  if (!chatId) return;

  const messagesQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setMessages(messages);
  });

  return () => unsubscribe();
}, [chatId]);
```

---

## Support Chats

### Creating Support Chat

**Trigger:** User navigates to `/chatbot` or clicks "Contact Support"

**Process:**
1. Check if user has active support chat
2. If exists, navigate to existing chat
3. If not, create new support chat
4. Set status to 'active'
5. No admin assigned initially

**Code Example:**
```javascript
// Find existing active chat
const activeChat = await findActiveSupportChat(userId);

if (activeChat) {
  navigate(`/chatbot?chatId=${activeChat.id}`);
} else {
  // Create new support chat
  const chatRef = await addDoc(collection(db, 'supportChats'), {
    userId: currentUser.uid,
    adminId: null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  navigate(`/chatbot?chatId=${chatRef.id}`);
}
```

### Admin Assignment

**Process:**
1. Admin opens support chat in Admin Panel
2. Admin sends first message
3. System assigns admin to chat (`adminId` set)
4. Future messages notify specific admin

**Code Example:**
```javascript
// Admin sends first message
if (!chatData.adminId && isAdmin) {
  await updateDoc(doc(db, 'supportChats', chatId), {
    adminId: currentUser.uid,
    updatedAt: serverTimestamp(),
  });
}
```

### Sending Support Messages

**User Message:**
- Creates message with `isAdmin: false`
- Notifies all admins (if no admin assigned) or specific admin
- Updates chat `updatedAt`

**Admin Message:**
- Creates message with `isAdmin: true`
- Notifies user
- Updates chat `updatedAt`

---

## Real-time Updates

### Implementation

Both chat systems use Firestore `onSnapshot` for real-time updates:

```javascript
// User Chats
const messagesQuery = query(
  collection(db, 'chats', chatId, 'messages'),
  orderBy('createdAt', 'asc')
);

const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
  // Update messages state
  const messages = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  setMessages(messages);
});

// Support Chats
const messagesQuery = query(
  collection(db, 'supportChats', chatId, 'messages'),
  orderBy('createdAt', 'asc')
);

const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
  // Update messages state
  setMessages(snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })));
});
```

### Benefits

- Messages appear instantly without refresh
- Multiple users see updates simultaneously
- No polling required
- Efficient bandwidth usage

---

## Notifications

### User Chat Notifications

**Trigger:** Cloud Function `onChatMessageCreated`

**Process:**
1. Message created in `chats/{chatId}/messages/{messageId}`
2. Function identifies receiver (participant who didn't send)
3. Creates notification for receiver
4. Notification includes sender name and message preview

**Notification Structure:**
```javascript
{
  userId: receiverId,
  title: 'New Chat Message',
  message: 'Sender Name: Message preview...',
  type: 'info',
  link: `/chats?chatId=${chatId}`,
  read: false,
  createdAt: serverTimestamp(),
}
```

### Support Chat Notifications

**Trigger:** Cloud Function `onSupportChatMessageCreated`

**User Message → Admin:**
- Notifies assigned admin (if exists)
- Or notifies all admins (if no admin assigned)

**Admin Message → User:**
- Notifies user who initiated chat

**Notification Structure:**
```javascript
// User message to admin
{
  userId: adminId,
  title: 'New Support Chat Message',
  message: 'You have a new message from a user: ...',
  type: 'info',
  link: '/admin',
  read: false,
  createdAt: serverTimestamp(),
}

// Admin message to user
{
  userId: userId,
  title: 'New Support Chat Message',
  message: 'You have a new message from support: ...',
  type: 'info',
  link: '/chatbot',
  read: false,
  createdAt: serverTimestamp(),
}
```

---

## Security Rules

### User Chats Rules

```javascript
match /chats/{chatId} {
  // Only participants can read/write
  allow read: if request.auth != null && 
                 request.auth.uid in resource.data.participants;
  
  allow create: if request.auth != null && 
                   request.auth.uid in request.resource.data.participants;
  
  allow update: if request.auth != null && 
                   request.auth.uid in resource.data.participants;
  
  match /messages/{messageId} {
    allow read: if request.auth != null && 
                   request.auth.uid in 
                   get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    
    allow create: if request.auth != null && 
                     request.auth.uid == request.resource.data.senderId;
    
    allow update, delete: if request.auth != null && 
                             request.auth.uid == resource.data.senderId;
  }
}
```

### Support Chats Rules

```javascript
match /supportChats/{chatId} {
  allow read: if request.auth != null && 
                 (resource.data.userId == request.auth.uid || 
                  resource.data.adminId == request.auth.uid ||
                  isAdmin());
  
  allow create: if request.auth != null && 
                   (request.resource.data.userId == request.auth.uid || isAdmin());
  
  allow update: if request.auth != null && 
                   (resource.data.userId == request.auth.uid || 
                    resource.data.adminId == request.auth.uid ||
                    isAdmin());
  
  match /messages/{messageId} {
    allow read: if request.auth != null && 
                   (get(/databases/$(database)/documents/supportChats/$(chatId)).data.userId == request.auth.uid || 
                    get(/databases/$(database)/documents/supportChats/$(chatId)).data.adminId == request.auth.uid ||
                    isAdmin());
    
    allow create: if request.auth != null && 
                     (get(/databases/$(database)/documents/supportChats/$(chatId)).data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/supportChats/$(chatId)).data.adminId == request.auth.uid ||
                      isAdmin());
    
    allow update, delete: if request.auth != null && 
                             (resource.data.senderId == request.auth.uid || isAdmin());
  }
}
```

---

## UI Components

### Chat List Component

**Location:** `/chats` or `/UserChatsPage`

**Features:**
- List of all user's chats
- Shows last message preview
- Shows unread count
- Click to open chat

### Chat Window Component

**Location:** `/chat` or `/Chat`

**Features:**
- Message list with scroll
- Message input
- Send button
- Real-time updates
- Typing indicators (optional)

### Support Chatbot Component

**Location:** `/chatbot` or `/Chatbot`

**Features:**
- Chat interface for support
- Admin assignment indicator
- Status indicator (active/resolved)
- Real-time updates

---

## Best Practices

### 1. Chat Creation

- Always check for existing chat before creating new one
- Prevent duplicate chats between same participants
- Initialize chat metadata properly

### 2. Message Handling

- Validate message content (length, content)
- Handle empty messages gracefully
- Show loading states during send
- Handle send failures with retry

### 3. Real-time Listeners

- Always unsubscribe listeners in cleanup
- Handle snapshot errors
- Implement pagination for long chat histories

### 4. Performance

- Limit initial message load (e.g., last 50 messages)
- Implement pagination for older messages
- Optimize image/file sharing
- Cache chat lists

### 5. Security

- Verify user permissions before chat operations
- Validate sender ID matches authenticated user
- Sanitize message content
- Rate limit message sending

---

## Troubleshooting

### Messages Not Appearing

1. Check real-time listener is active
2. Verify Firestore rules allow read
3. Check network connection
4. Verify chat ID is correct

### Notifications Not Received

1. Check Cloud Function executed (logs)
2. Verify user ID exists
3. Check notification collection permissions
4. Verify notification bell component is mounted

### Chat Not Creating

1. Check user authentication
2. Verify Firestore rules allow create
3. Check for existing chat
4. Verify participants array is valid

---

**Last Updated:** [Current Date]  
**Version:** 1.0.0

