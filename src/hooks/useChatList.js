import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to fetch and listen to chat list for current user
 * @returns {Object} - { chats, loading, error }
 */
export default function useChatList() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userNames, setUserNames] = useState({}); // Cache for user names

  useEffect(() => {
    // FIXED: Added auth check
    if (!currentUser || !currentUser.uid || !db) {
      setLoading(false);
      setChats([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // FIXED: chats collection is blocked by Firestore rules
      // Query chats where current user is a participant
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        chatsQuery,
        async (snapshot) => {
          const chatsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Fetch user names for other participants
          const fetchUserNames = async () => {
            const namePromises = chatsList.map(async (chat) => {
              const otherUid = chat.participants?.find((uid) => uid !== currentUser.uid);
              if (otherUid && !userNames[otherUid]) {
                try {
                  const userDoc = await getDoc(doc(db, 'users', otherUid));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const name =
                      userData.name || userData.displayName || userData.email || 'Unknown';
                    setUserNames((prev) => ({
                      ...prev,
                      [otherUid]: name,
                    }));
                    return { uid: otherUid, name };
                  }
                } catch (err) {
                  console.error(`Error fetching user ${otherUid}:`, err);
                }
              }
              return null;
            });

            await Promise.all(fetchUserNames);
          };

          await fetchUserNames();

          // Add user names to chats
          const chatsWithNames = chatsList.map((chat) => {
            const otherUid = chat.participants?.find((uid) => uid !== currentUser.uid);
            return {
              ...chat,
              otherParticipantId: otherUid,
              otherParticipantName: userNames[otherUid] || 'Unknown',
              unreadCount: chat.unreadFor?.[currentUser.uid] || 0,
            };
          });

          setChats(chatsWithNames);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching chats:', err);
          // Handle permission denied gracefully
          if (err.code === 'permission-denied') {
            console.error('Permission denied accessing chats collection:', err);
            setChats([]);
            setLoading(false);
            return;
          }
          // Fallback without orderBy if index doesn't exist
          if (err.code === 'failed-precondition' || err.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'chats'),
              where('participants', 'array-contains', currentUser.uid)
            );

            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (snapshot) => {
                const chatsList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                // Sort client-side
                chatsList.sort((a, b) => {
                  const aTime = a.updatedAt?.toDate?.() || new Date(0);
                  const bTime = b.updatedAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });

                // Fetch user names
                const fetchUserNames = async () => {
                  const namePromises = chatsList.map(async (chat) => {
                    const otherUid = chat.participants?.find((uid) => uid !== currentUser.uid);
                    if (otherUid && !userNames[otherUid]) {
                      try {
                        const userDoc = await getDoc(doc(db, 'users', otherUid));
                        if (userDoc.exists()) {
                          const userData = userDoc.data();
                          const name =
                            userData.name || userData.displayName || userData.email || 'Unknown';
                          setUserNames((prev) => ({
                            ...prev,
                            [otherUid]: name,
                          }));
                        }
                      } catch (err) {
                        console.error(`Error fetching user ${otherUid}:`, err);
                      }
                    }
                  });

                  await Promise.all(fetchUserNames);
                };

                await fetchUserNames();

                // Add user names to chats
                const chatsWithNames = chatsList.map((chat) => {
                  const otherUid = chat.participants?.find((uid) => uid !== currentUser.uid);
                  return {
                    ...chat,
                    otherParticipantId: otherUid,
                    otherParticipantName: userNames[otherUid] || 'Unknown',
                    unreadCount: chat.unreadFor?.[currentUser.uid] || 0,
                  };
                });

                setChats(chatsWithNames);
                setLoading(false);
              },
              (fallbackErr) => {
                console.error('Error fetching chats (fallback):', fallbackErr);
                // Handle permission denied in fallback
                if (fallbackErr.code === 'permission-denied') {
                  console.error('Permission denied accessing chats collection:', fallbackErr);
                } else {
                  setError(fallbackErr.message);
                }
                setChats([]);
                setLoading(false);
              }
            );

            return () => fallbackUnsubscribe();
          } else {
            setError(err.message || 'Failed to load chats');
            setChats([]);
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up chat list listener:', err);
      setError(err.message || 'Failed to load chats');
      setChats([]);
      setLoading(false);
    }
  }, [currentUser?.uid, db]);

  return { chats, loading, error };
}
