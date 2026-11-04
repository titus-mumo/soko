import Elysia from "elysia";
import {
  GetUserProfile,
  UpdateUserProfile,
  ChangePassword,
} from "./userProfile";
import {
  GetUserAddresses,
  AddAddress,
  UpdateAddress,
  SetDefaultAddress,
  RemoveAddress,
} from "./userAddresses";
import {
  GetAllUsers,
  SearchUsers,
  GetUserByIdAdmin,
  UpdateUserRole,
  VerifyUser,
  DeleteUser,
} from "./adminUsers";

export const userRoutes = new Elysia().group("/users", (app) =>
  app
    // Profile
    .use(GetUserProfile)
    .use(UpdateUserProfile)
    .use(ChangePassword)
    // Addresses
    .use(GetUserAddresses)
    .use(AddAddress)
    .use(UpdateAddress)
    .use(SetDefaultAddress)
    .use(RemoveAddress)
    // Admin
    .use(GetAllUsers)
    // Before /admin/:userId so "search" isn't read as an id.
    .use(SearchUsers)
    .use(GetUserByIdAdmin)
    .use(UpdateUserRole)
    .use(VerifyUser)
    .use(DeleteUser)
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return { success: false, message: error.message };
      }
      if (code === "INTERNAL_SERVER_ERROR") {
        set.status = 500;
        return { success: false, message: "Internal server error." };
      }
    }),
);
