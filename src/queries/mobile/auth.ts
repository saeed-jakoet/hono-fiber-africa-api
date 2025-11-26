/**
 * Mobile Auth Queries
 * Database operations for mobile authentication
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get user by ID using admin client
 */
export const getUserById = async (db: SupabaseClient, userId: string) => {
  return db.auth.admin.getUserById(userId);
};

/**
 * Update user password
 */
export const updateUserPassword = async (
  db: SupabaseClient,
  userId: string,
  newPassword: string
) => {
  return db.auth.admin.updateUserById(userId, { password: newPassword });
};
