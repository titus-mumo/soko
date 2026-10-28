import { api } from "./api";
import type { ApiResponse, UserProfile, Address } from "./types";

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AddressPayload {
  label: string;
  county: string;
  town: string;
  street?: string;
  latitude?: string;
  longitude?: string;
  isDefault?: boolean;
}

export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<ApiResponse<UserProfile>>("/users/me");
  return data.data;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.patch<ApiResponse<UserProfile>>(
    "/users/me",
    payload,
  );
  return data.data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await api.patch("/users/me/password", payload);
}

export async function getUserAddresses(): Promise<Address[]> {
  const { data } = await api.get<ApiResponse<Address[]>>("/users/me/addresses");
  return data.data;
}

export async function addAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post<ApiResponse<Address>>(
    "/users/me/addresses",
    payload,
  );
  return data.data;
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressPayload>,
): Promise<Address> {
  const { data } = await api.patch<ApiResponse<Address>>(
    `/users/me/addresses/${id}`,
    payload,
  );
  return data.data;
}

export async function setDefaultAddress(id: string): Promise<void> {
  await api.patch(`/users/me/addresses/${id}/default`);
}

export async function removeAddress(id: string): Promise<void> {
  await api.delete(`/users/me/addresses/${id}`);
}
