import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Upload,
  X,
  Image as ImageIcon,
  ArrowLeft,
  Trash2,
  CheckCircle,
  Loader,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RenovatorPortfolio Component
 * Portfolio management for renovation service providers
 * Allows uploading, viewing, and deleting portfolio images
 * Stores URLs in Firestore users/{uid}.portfolio[]
 */
const RenovatorPortfolio = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Fetch portfolio from users collection
  useEffect(() => {
    if (authLoading || !currentUser || !currentUser.uid || !db) {
      if (!authLoading && (!currentUser || !currentUser.uid)) {
        setLoading(false);
        toast.error('Please log in to view your portfolio.');
        navigate('/auth');
      }
      return;
    }

    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, 'users', currentUser.uid);

        // Setup real-time listener for portfolio updates
        unsubscribeRef.current = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data();
              const portfolioImages = userData.portfolio || [];
              setPortfolio(Array.isArray(portfolioImages) ? portfolioImages : []);
            } else {
              setPortfolio([]);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching portfolio:', error);
            toast.error('Failed to load portfolio');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up portfolio listener:', error);
        toast.error('Failed to setup portfolio listener');
        setLoading(false);
      }
    };

    fetchPortfolio();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Clean up preview URLs
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [currentUser, authLoading, navigate]);

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per file.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setNewImages((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      setNewImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove new image from upload queue
  const handleRemoveNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload images to Firebase Storage
  const handleUpload = async () => {
    if (!currentUser || !currentUser.uid || newImages.length === 0 || !db || !storage) {
      return;
    }

    try {
      setUploading(true);
      const uploadedUrls = [];

      for (const file of newImages) {
        try {
          const timestamp = Date.now();
          const fileName = `${timestamp}_portfolio_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const storagePath = `portfolios/renovators/${currentUser.uid}/${fileName}`;
          const storageRef = ref(storage, storagePath);

          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedUrls.push(url);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedUrls.length === 0) {
        toast.error('No images were uploaded');
        return;
      }

      // Update Firestore users/{uid}.portfolio[]
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const existingPortfolio = userData.portfolio || [];
        const updatedPortfolio = [...existingPortfolio, ...uploadedUrls];

        await updateDoc(userRef, {
          portfolio: updatedPortfolio,
          updatedAt: serverTimestamp(),
        });

        toast.success(`Successfully uploaded ${uploadedUrls.length} image(s)`);
      } else {
        // Create user document if it doesn't exist
        await updateDoc(userRef, {
          portfolio: uploadedUrls,
          updatedAt: serverTimestamp(),
        });
        toast.success(`Successfully uploaded ${uploadedUrls.length} image(s)`);
      }

      // Clear upload queue
      setNewImages([]);
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      setNewImagePreviews([]);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete image from portfolio
  const handleDelete = async (imageUrl, index) => {
    if (!currentUser || !currentUser.uid || !db || !storage) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      setDeletingId(imageUrl);

      // Try to delete from Storage (extract path from URL)
      try {
        // Extract storage path from URL
        const urlParts = imageUrl.split('/');
        const pathIndex = urlParts.findIndex((part) => part === 'portfolios');
        if (pathIndex !== -1) {
          const storagePath = urlParts.slice(pathIndex).join('/').split('?')[0];
          const storageRef = ref(storage, decodeURIComponent(storagePath));
          await deleteObject(storageRef);
        }
      } catch (storageError) {
        console.warn('Error deleting from storage (continuing with Firestore update):', storageError);
        // Continue with Firestore update even if Storage delete fails
      }

      // Remove from Firestore portfolio array
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const existingPortfolio = userData.portfolio || [];
        const updatedPortfolio = existingPortfolio.filter((url) => url !== imageUrl);

        await updateDoc(userRef, {
          portfolio: updatedPortfolio,
          updatedAt: serverTimestamp(),
        });

        toast.success('Image deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate('/renovator/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-textMain mb-2">Portfolio</h1>
              <p className="text-textSecondary">Manage your service portfolio images</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-surface rounded-lg border border-borderColor p-6 mb-6">
          <h2 className="text-xl font-semibold text-textMain mb-4">Upload Images</h2>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              id="portfolio-upload"
              disabled={uploading}
            />
            <label
              htmlFor="portfolio-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Select Images'}
            </label>
            <p className="text-sm text-textSecondary">
              Select multiple images to upload. Max 5MB per image. JPG, PNG, or GIF formats.
            </p>

            {/* New Image Previews */}
            {newImagePreviews.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-textMain mb-3">
                  Selected Images ({newImagePreviews.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {newImagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(index)}
                        className="absolute top-2 right-2 bg-error text-white rounded-full p-1.5 hover:bg-error/80"
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || newImagePreviews.length === 0}
                  className="flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Upload {newImagePreviews.length} Image(s)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Gallery */}
        <div className="bg-surface rounded-lg border border-borderColor p-6">
          <h2 className="text-xl font-semibold text-textMain mb-4">
            Portfolio Gallery ({portfolio.length} images)
          </h2>
          {portfolio.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {portfolio.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border border-borderColor group"
                >
                  <img
                    src={imageUrl}
                    alt={`Portfolio ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(imageUrl, index)}
                      disabled={deletingId === imageUrl}
                      className="bg-error text-white rounded-full p-2 hover:bg-error/80 disabled:opacity-50 flex items-center gap-2"
                    >
                      {deletingId === imageUrl ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-lg">
              <ImageIcon className="w-16 h-16 mx-auto text-textSecondary mb-4" />
              <h3 className="text-lg font-semibold text-textMain mb-2">No Portfolio Images</h3>
              <p className="text-textSecondary mb-4">
                Start building your portfolio by uploading service images
              </p>
              <label
                htmlFor="portfolio-upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90"
              >
                <Upload className="w-5 h-5" />
                Upload Your First Image
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenovatorPortfolio;

