// SYSTEM — autenticação e perfil de jogador
// A chave publishable é pública e pode ser usada no navegador.
// Nunca coloque aqui a chave service_role ou credenciais administrativas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://trqtfpvxnbxaiebaahwm.supabase.co",
  "sb_publishable_pqoPe6UUspba6B6ucpe0RQ_Vqh6sp-V",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

const cleanUsername = value => String(value || "").trim().toLowerCase();
const validUsername = value => /^[a-z0-9_]{3,20}$/.test(value);

export async function registerAccount({ email, password, username, displayName }) {
  const usernameClean = cleanUsername(username);
  const displayClean = String(displayName || usernameClean).trim().slice(0, 40) || usernameClean;
  if (!validUsername(usernameClean)) throw new Error("O usuário deve ter de 3 a 20 caracteres: letras sem acento, números ou _.");
  if (!email || !String(email).includes("@")) throw new Error("Digite um e-mail válido.");
  if (!password || String(password).length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");

  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim(),
    password: String(password),
    options: { data: { system_username: usernameClean, system_display_name: displayClean } }
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar a conta. Tente novamente.");

  if (!data.session) {
    return { user: data.user, needsEmailConfirmation: true, profile: null };
  }

  const profile = await createPlayerProfile(data.user);
  return { user: data.user, needsEmailConfirmation: false, profile };
}

export async function createPlayerProfile(user) {
  if (!user?.id) throw new Error("Entre na sua conta para criar o perfil.");
  const username = cleanUsername(user.user_metadata?.system_username);
  const displayName = String(user.user_metadata?.system_display_name || username).trim().slice(0, 40) || username;
  if (!validUsername(username)) throw new Error("Não encontrei um nome de usuário válido nos dados da conta.");

  const { data, error } = await supabase.from("system_profiles").insert({
    user_id: user.id, username, display_name: displayName, xp: 0, level: 1, rank: "E", share_progress: true
  }).select().single();

  if (error) {
    if (error.code === "23505") throw new Error("Esse nome de usuário já está sendo usado. Se a conta já existia, entre em contato com o suporte.");
    throw error;
  }
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(), password: String(password || "")
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.from("system_profiles")
    .select("user_id, username, display_name, xp, level, rank, share_progress, created_at")
    .eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}
