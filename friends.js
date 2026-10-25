import { supabase } from "./auth.js";

export async function searchPlayers(username) {
  const term = String(username || "").trim().toLowerCase();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres.");
  const { data, error } = await supabase.rpc("system_search_players", { search_term: term });
  if (error) throw error;
  return data || [];
}

export async function sendFriendRequest(targetUserId) {
  const { data, error } = await supabase.rpc("system_send_friend_request", { target_user_id: targetUserId });
  if (error) throw error;
  return data;
}

export async function respondFriendRequest(friendshipId, accept) {
  const { data, error } = await supabase.rpc("system_respond_friend_request", {
    friendship_id: friendshipId,
    accept_request: Boolean(accept)
  });
  if (error) throw error;
  return data;
}

export async function removeFriend(friendshipId) {
  const { data, error } = await supabase.rpc("system_remove_friendship", { friendship_id: friendshipId });
  if (error) throw error;
  return data;
}

export async function listFriendships() {
  const { data, error } = await supabase.rpc("system_list_friendships");
  if (error) throw error;
  return data || [];
}

export async function getSharedPlayerProfile(targetUserId) {
  const { data, error } = await supabase.rpc("system_get_shared_profile", { target_user_id: targetUserId });
  if (error) throw error;
  return data?.[0] || null;
}
