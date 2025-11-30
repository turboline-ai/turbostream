const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

export interface CategorySetting {
  key: string;
  label: string;
  scope: 'global' | 'user' | 'organization';
}

export interface UserCategory extends CategorySetting {
  _id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface SettingsResponse<T = any> {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
}

export interface CreateCategoryRequest {
  label: string;
}

export interface UpdateCategoryRequest {
  label: string;
}

class SettingsService {
  /**
   * Fetch all categories
   */
  async getCategories(scope?: string): Promise<CategorySetting[]> {
    try {
      const url = new URL(`${BACKEND_URL}/api/settings/categories`);
      if (scope) {
        url.searchParams.append('scope', scope);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SettingsResponse<CategorySetting[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch categories');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return default categories if API fails
      return [
        { key: 'crypto', label: 'Crypto', scope: 'global' },
        { key: 'stocks', label: 'Stocks', scope: 'global' },
        { key: 'forex', label: 'Forex', scope: 'global' },
        { key: 'commodities', label: 'Commodities', scope: 'global' },
        { key: 'custom', label: 'Custom', scope: 'global' },
      ];
    }
  }

  /**
   * Fetch a specific category by key
   */
  async getCategory(key: string): Promise<CategorySetting | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/categories/${key}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SettingsResponse<CategorySetting> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch category');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }

  /**
   * Fetch all settings collections
   */
  async getAllSettings(): Promise<{ categories: CategorySetting[] }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/all`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SettingsResponse<{ categories: CategorySetting[] }> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch settings');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      // Return default settings if API fails
      return {
        categories: [
          { key: 'crypto', label: 'Crypto', scope: 'global' },
          { key: 'stocks', label: 'Stocks', scope: 'global' },
          { key: 'forex', label: 'Forex', scope: 'global' },
          { key: 'commodities', label: 'Commodities', scope: 'global' },
          { key: 'custom', label: 'Custom', scope: 'global' },
        ],
      };
    }
  }

  /**
   * Get user categories (requires authentication)
   */
  async getUserCategories(token: string): Promise<UserCategory[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/user/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SettingsResponse<UserCategory[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch user categories');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching user categories:', error);
      return [];
    }
  }

  /**
   * Create a new user category
   */
  async createUserCategory(token: string, categoryData: CreateCategoryRequest): Promise<UserCategory> {
    const response = await fetch(`${BACKEND_URL}/api/settings/user/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    });
    
    const result: SettingsResponse<UserCategory> = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to create category');
    }

    return result.data;
  }

  /**
   * Update a user category
   */
  async updateUserCategory(token: string, key: string, updates: UpdateCategoryRequest): Promise<UserCategory> {
    const response = await fetch(`${BACKEND_URL}/api/settings/user/categories/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const result: SettingsResponse<UserCategory> = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to update category');
    }

    return result.data;
  }

  /**
   * Delete a user category
   */
  async deleteUserCategory(token: string, key: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/settings/user/categories/${key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const result: SettingsResponse = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete category');
    }
  }

  /**
   * Check if a category key is available
   */
  async checkCategoryKeyAvailability(token: string, key: string): Promise<{ available: boolean; reason?: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/user/categories/check/${key}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result: SettingsResponse<{ available: boolean; reason?: string }> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to check availability');
      }

      return result.data;
    } catch (error) {
      console.error('Error checking category availability:', error);
      return { available: false, reason: 'Error checking availability' };
    }
  }

  /**
   * Get all categories (global + user) with authentication
   */
  async getAllCategoriesWithAuth(token: string): Promise<{ categories: CategorySetting[]; userCategories: UserCategory[] }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SettingsResponse<{ categories: CategorySetting[]; userCategories: UserCategory[] }> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch categories');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching all categories:', error);
      // Return default categories if API fails
      return {
        categories: [
          { key: 'crypto', label: 'Crypto', scope: 'global' },
          { key: 'stocks', label: 'Stocks', scope: 'global' },
          { key: 'forex', label: 'Forex', scope: 'global' },
          { key: 'commodities', label: 'Commodities', scope: 'global' },
          { key: 'custom', label: 'Custom', scope: 'global' },
        ],
        userCategories: [],
      };
    }
  }

  /**
   * Convert categories to Select options format
   */
  formatCategoriesForSelect(categories: CategorySetting[]) {
    return categories.map(category => ({
      label: category.label,
      value: category.key
    }));
  }

  /**
   * Format both global and user categories for Select options
   */
  formatAllCategoriesForSelect(globalCategories: CategorySetting[], userCategories: UserCategory[]) {
    const globalOptions = globalCategories.map(category => ({
      label: category.label,
      value: category.key,
      type: 'global' as const
    }));

    const userOptions = userCategories.map(category => ({
      label: `${category.label} (Custom)`,
      value: category.key,
      type: 'user' as const
    }));

    return [...globalOptions, ...userOptions];
  }
}

export const settingsService = new SettingsService();
export default settingsService;