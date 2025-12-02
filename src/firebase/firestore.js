import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';

// Product operations
export const getProducts = async (filters = {}, sortBy = 'createdAt', limitCount = 20) => {
  try {
    let q = query(collection(db, 'products'));

    // Apply filters
    if (filters.collectionId) {
      q = query(q, where('collectionId', '==', filters.collectionId));
    }
    if (filters.brandId) {
      q = query(q, where('brandId', '==', filters.brandId));
    }
    if (filters.minPrice) {
      q = query(q, where('price', '>=', filters.minPrice));
    }
    if (filters.maxPrice) {
      q = query(q, where('price', '<=', filters.maxPrice));
    }

    // Apply sorting and limit
    q = query(q, orderBy(sortBy, 'desc'), limit(limitCount));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProduct = async (id) => {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Product not found');
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const addProduct = async (product) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...product,
      brandId: product.brandId || '',
      collectionId: product.collectionId || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stock: product.stock || 0,
      sold: 0,
      rating: 0,
      reviewCount: 0,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...updates,
      brandId: updates.brandId || updates.brandId === '' ? updates.brandId : undefined,
      collectionId:
        updates.collectionId || updates.collectionId === '' ? updates.collectionId : undefined,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Brand operations
export const getBrands = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'brands'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
};

export const getBrand = async (id) => {
  try {
    const docRef = doc(db, 'brands', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Brand not found');
    }
  } catch (error) {
    console.error('Error fetching brand:', error);
    throw error;
  }
};

export const addBrand = async (brand) => {
  try {
    const docRef = await addDoc(collection(db, 'brands'), {
      ...brand,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding brand:', error);
    throw error;
  }
};

export const updateBrand = async (id, updates) => {
  try {
    const docRef = doc(db, 'brands', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
};

export const deleteBrand = async (id) => {
  try {
    await deleteDoc(doc(db, 'brands', id));
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
};

// Collection operations
export const getCollections = async (brandId = null) => {
  try {
    let q = query(collection(db, 'collections'));
    if (brandId) {
      q = query(q, where('brandId', '==', brandId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
};

export const getCollection = async (id) => {
  try {
    const docRef = doc(db, 'collections', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Collection not found');
    }
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};

export const addCollection = async (collectionData) => {
  try {
    const docRef = await addDoc(collection(db, 'collections'), {
      ...collectionData,
      brandId: collectionData.brandId || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding collection:', error);
    throw error;
  }
};

export const updateCollection = async (id, updates) => {
  try {
    const docRef = doc(db, 'collections', id);
    await updateDoc(docRef, {
      ...updates,
      brandId: updates.brandId || updates.brandId === '' ? updates.brandId : undefined,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    throw error;
  }
};

export const deleteCollection = async (id) => {
  try {
    await deleteDoc(doc(db, 'collections', id));
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw error;
  }
};

// Order operations
export const createOrder = async (orderData) => {
  try {
    // Validate orderData
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid orderData: must be a non-null object');
    }

    // Log orderData to identify undefined fields
    console.log('Received orderData:', JSON.stringify(orderData, null, 2));

    // Sanitize orderData to remove undefined values
    const sanitizedOrderData = {};
    Object.keys(orderData).forEach((key) => {
      if (orderData[key] !== undefined) {
        sanitizedOrderData[key] = orderData[key];
      } else {
        console.warn(`Skipping undefined field in orderData: ${key}`);
      }
    });

    // Validate required fields
    const requiredFields = ['userId', 'items', 'total'];
    const missingFields = requiredFields.filter((field) => sanitizedOrderData[field] === undefined);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate items array
    if (!Array.isArray(sanitizedOrderData.items) || sanitizedOrderData.items.length === 0) {
      throw new Error('Invalid items: must be a non-empty array');
    }
    sanitizedOrderData.items.forEach((item, index) => {
      if (!item.productId || item.quantity === undefined || item.quantity <= 0) {
        throw new Error(`Invalid item at index ${index}: missing productId or invalid quantity`);
      }
      // Remove undefined item fields
      Object.keys(item).forEach((key) => {
        if (item[key] === undefined) {
          console.warn(`Removing undefined item field: items[${index}].${key}`);
          delete item[key];
        }
      });
    });

    const batch = writeBatch(db);

    // Create order
    const orderRef = doc(collection(db, 'orders'));
    batch.set(orderRef, {
      ...sanitizedOrderData,
      createdAt: serverTimestamp(),
      status: 'pending',
    });

    // Update product stock and sold count
    sanitizedOrderData.items.forEach((item) => {
      const productRef = doc(db, 'products', item.productId);
      batch.update(productRef, {
        stock: increment(-item.quantity),
        sold: increment(item.quantity),
      });
    });

    // Update user orders
    const userRef = doc(db, 'users', sanitizedOrderData.userId);
    batch.update(userRef, {
      orders: arrayUnion(orderRef.id),
    });

    await batch.commit();
    console.log('Order created successfully:', orderRef.id);

    return orderRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};
export const getOrders = async (userId) => {
  try {
    let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (userId) {
      return orders.filter((order) => order.userId === userId);
    }
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// User operations
export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Wishlist operations
export const addToWishlist = async (userId, productId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const wishlist = userSnap.data().wishlist || [];
      if (!wishlist.includes(productId)) {
        await updateDoc(userRef, {
          wishlist: [...wishlist, productId],
        });
      }
    }
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

export const removeFromWishlist = async (userId, productId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const wishlist = userSnap.data().wishlist || [];
      await updateDoc(userRef, {
        wishlist: wishlist.filter((id) => id !== productId),
      });
    }
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

// Reviews
export const addReview = async (reviewData) => {
  try {
    const docRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      createdAt: serverTimestamp(),
    });

    // Update product rating
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('productId', '==', reviewData.productId)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);

    const reviews = reviewsSnapshot.docs.map((doc) => doc.data());
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await updateDoc(doc(db, 'products', reviewData.productId), {
      rating: avgRating,
      reviewCount: reviews.length,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

export const getReviews = async (productId) => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
};

// Deprecated: Alias getCategories to getCollections for backward compatibility
export const getCategories = async () => {
  console.warn('getCategories is deprecated. Use getCollections instead.');
  return getCollections();
};
