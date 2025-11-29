/**
 * Mobile Location Controllers
 * Handles location updates from the mobile app
 */

import { Context } from "hono";
import { updateStaffLocation } from "../../queries/mobile/staff";
import { getAdminClient } from "../../utilities/supabase";

/**
 * Update the current user's location
 * PATCH /mobile/location
 */
export const mobileUpdateLocation = async (c: Context) => {
  try {
    const user = c.get("user") as { id: string; staffId: string | null; email: string; role: string } | undefined;

    if (!user || !user.staffId) {
      return c.json({ status: "error", message: "Not authenticated or no staff record" }, 401);
    }

    const body = await c.req.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return c.json(
        { status: "error", message: "Invalid latitude or longitude" },
        400
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return c.json(
        { status: "error", message: "Latitude must be between -90 and 90" },
        400
      );
    }

    if (longitude < -180 || longitude > 180) {
      return c.json(
        { status: "error", message: "Longitude must be between -180 and 180" },
        400
      );
    }

    const db = getAdminClient();
    const { data, error } = await updateStaffLocation(
      db,
      user.staffId,
      latitude,
      longitude
    );

    if (error) {
      console.error("Error updating location:", error);
      return c.json(
        { status: "error", message: "Failed to update location" },
        500
      );
    }

    return c.json({
      status: "success",
      message: "Location updated",
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        updated_at: data.location_updated_at,
      },
    });
  } catch (error) {
    console.error("Error in mobileUpdateLocation:", error);
    return c.json({ status: "error", message: "Internal server error" }, 500);
  }
};
