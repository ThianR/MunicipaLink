import { vi } from 'vitest';

// Mock global supabase object expected by the application
// This simulates the Supabase client library loaded via CDN
global.supabase = {
  createClient: vi.fn(() => ({
    // Basic mock of the Supabase client interface
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    }
  })),
};
