import { BadRequestError } from "@/api/errors";
import { db } from "@/db/connection";
import { User, Facility, facilities, users } from "@/db/schema";
import { firstOrUndefined } from "@/utils";
import { eq } from "drizzle-orm";


export type NewFacility = {
    facility: Facility,
    user: User
}
export type AdminUser = Omit<User, "facilityId">;

export async function createFacility(newFacility: Facility, newAdmin: AdminUser): Promise<NewFacility> {
    return await db.transaction(async (tx) => {
        const facilityEntry = await tx
            .insert(facilities)
            .values(newFacility)
            .onConflictDoNothing()
            .returning();

        // lets verify the facility was created
        const facilityObj = firstOrUndefined(facilityEntry);
        if (!facilityObj) {
            throw new BadRequestError("createFacility: Failed to create facility");
        }

        const newAdminUser: User = { ...newAdmin, facilityId: facilityObj.id };

        const userEntry = await tx
            .insert(users)
            .values(newAdminUser)
            .onConflictDoNothing()
            .returning();

        // verify the user was created
        const userObj = firstOrUndefined(userEntry);
        if (!userObj) {
            throw new BadRequestError("createFacility: Failed to create user");
        }

        return { facility: facilityObj, user: userObj };
    });
}

export async function getFacilityByUserId(userId: string) {
    const result = await db
        .select({
            facility: facilities
        })
        .from(facilities)
        .innerJoin(users, eq(users.facilityId, facilities.id))
        .where(eq(users.id, userId));

    return firstOrUndefined(result);
}