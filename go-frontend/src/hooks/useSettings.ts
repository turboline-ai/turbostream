import { useState, useEffect } from 'react';
import { CategorySetting, UserCategory, settingsService } from '@/services/settingsService';

export const useCategories = (scope?: string) => {
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await settingsService.getCategories(scope);
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [scope]);

  const getCategoryOptions = () => {
    return settingsService.formatCategoriesForSelect(categories);
  };

  const getCategoryByKey = (key: string) => {
    return categories.find(cat => cat.key === key);
  };

  return {
    categories,
    loading,
    error,
    getCategoryOptions,
    getCategoryByKey,
    refetch: () => {
      setLoading(true);
      settingsService.getCategories(scope).then(setCategories).finally(() => setLoading(false));
    }
  };
};

export const useSettings = () => {
  const [settings, setSettings] = useState<{ categories: CategorySetting[] }>({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await settingsService.getAllSettings();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    categories: settings.categories,
    refetch: () => {
      setLoading(true);
      settingsService.getAllSettings().then(setSettings).finally(() => setLoading(false));
    }
  };
};

export const useAllCategories = (token?: string) => {
  const [globalCategories, setGlobalCategories] = useState<CategorySetting[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (token) {
          const data = await settingsService.getAllCategoriesWithAuth(token);
          setGlobalCategories(data.categories);
          setUserCategories(data.userCategories);
        } else {
          const data = await settingsService.getCategories();
          setGlobalCategories(data);
          setUserCategories([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCategories();
  }, [token]);

  const getAllOptions = () => {
    return settingsService.formatAllCategoriesForSelect(globalCategories, userCategories);
  };

  const getCategoryByKey = (key: string) => {
    const global = globalCategories.find(cat => cat.key === key);
    if (global) return global;
    return userCategories.find(cat => cat.key === key);
  };

  return {
    globalCategories,
    userCategories,
    allCategories: [...globalCategories, ...userCategories],
    loading,
    error,
    getAllOptions,
    getCategoryByKey,
    refetch: () => {
      setLoading(true);
      if (token) {
        settingsService.getAllCategoriesWithAuth(token)
          .then(data => {
            setGlobalCategories(data.categories);
            setUserCategories(data.userCategories);
          })
          .finally(() => setLoading(false));
      } else {
        settingsService.getCategories()
          .then(setGlobalCategories)
          .finally(() => setLoading(false));
      }
    }
  };
};

export const useUserCategories = (token?: string) => {
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCategories = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getUserCategories(token);
      setUserCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCategories();
  }, [token]);

  const createCategory = async (categoryData: { label: string }) => {
    if (!token) throw new Error('Authentication required');
    
    try {
      const newCategory = await settingsService.createUserCategory(token, categoryData);
      setUserCategories(prev => [newCategory, ...prev]);
      return newCategory;
    } catch (error) {
      throw error;
    }
  };

  const updateCategory = async (key: string, updates: { label: string }) => {
    if (!token) throw new Error('Authentication required');
    
    try {
      const updatedCategory = await settingsService.updateUserCategory(token, key, updates);
      setUserCategories(prev => 
        prev.map(cat => cat.key === key ? updatedCategory : cat)
      );
      return updatedCategory;
    } catch (error) {
      throw error;
    }
  };

  const deleteCategory = async (key: string) => {
    if (!token) throw new Error('Authentication required');
    
    try {
      await settingsService.deleteUserCategory(token, key);
      setUserCategories(prev => prev.filter(cat => cat.key !== key));
    } catch (error) {
      throw error;
    }
  };

  const checkKeyAvailability = async (key: string) => {
    if (!token) return { available: false, reason: 'Authentication required' };
    return settingsService.checkCategoryKeyAvailability(token, key);
  };

  return {
    userCategories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    checkKeyAvailability,
    refetch: fetchUserCategories
  };
};