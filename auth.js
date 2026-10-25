// SYSTEM — autenticação e perfil de jogador
// Usa a chave publishable do Supabase, própria para o navegador.
// Não coloque aqui a chave service_role nem senhas administrativas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://trqtfpvxnbxaiebaahwm.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pqoPe6UUspba6B6ucpe0RQ_Vqh6sp-V";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

// Cria uma conta. O Supabase pode exigir confirmação por e-mail.
export async function registerAccount({ email, password, username, displayName }) {
  const cleanUsername = normalizeUsername(username);
  if (!validUsername(cleanUsername)) {
    throw new Error("O usuário deve ter de 3 a 20 caracteres: letras sem acento, números ou _.");
  }
  if (!email || !String(email).includes("@")) {
    throw new Error("Digite um e-mail válido.");
  }
  if (!password || String(password).length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim(),
    password: String(password)
  });
  if (error) throw error;

  // Se a confirmação de e-mail estiver ativada, a sessão pode não existir ainda.
  if (!data.user) throw new Error("Não foi possível criar a conta. Tente novamente.");
  if (!data.session) {
    return {
      user: data.user,
      needsEmailConfirmation: true,
      profile: null
    };
  }

  const profile = await createPlayerProfile({
    userId: data.user.id,
    username: cleanUsername,
    displayName: String(displayName || cleanUsername).trim().slice(0, 40) || cleanUsername
  });

  return { user: data.user, needsEmailConfirmation: false, profile };
}

// Cria o perfil associado à conta autenticada.
export async function createPlayerProfile({ userId, username, displayName }) {
  const cleanUsername = normalizeUsername(username);
  if (!validUsername(cleanUsername)) {
    throw new Error("Nome de usuário inválido.");
  }

  const { data, error } = await supabase
    .from("system_profiles")
    .insert({
      user_id: userId,
      username: cleanUsername,
      display_name: String(displayName || cleanUsername).trim().slice(0, 40) || cleanUsername,
      xp: 0,
      level: 1,
      rank: "E",
      share_progress: true
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esse nome de usuário já está sendo usado.");
    }
    throw error;
  }
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password: String(password || "")
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

  const { data, error } = await supabase
    .from("system_profiles")
    .select("user_id, username, display_name, xp, level, rank, share_progress, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
