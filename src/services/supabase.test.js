import { describe, it, expect, vi } from 'vitest';

// Mock configuration before importing the module under test
vi.mock('../config.js', () => ({
  APP_CONFIG: {
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_KEY: 'test-anon-key',
  },
}));

describe('Supabase Service Initialization', () => {
  it('should initialize Supabase client with correct config', async () => {
    // Import the module dynamically to trigger the initialization
    const { supabaseClient } = await import('./supabase.js');

    // Verify createClient was called with the mocked configuration
    expect(global.supabase.createClient).toHaveBeenCalledTimes(1);
    expect(global.supabase.createClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'test-anon-key'
    );

    // Verify the client is correctly exported
    expect(supabaseClient).toBeDefined();
  });

});
