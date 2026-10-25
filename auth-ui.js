import { supabase, registerAccount, signIn, signOut, getCurrentUser, getMyProfile, createPlayerProfile } from "./auth.js";

const $ = id => document.getElementById(id);
const form = $("accountForm");
const status = $("accountStatus");
const submit = $("accountSubmit");
const modeButton = $("accountMode");
const logout = $("accountLogout");
const signedPanel = $("signedPanel");
const formPanel = $("accountFormPanel");
let mode = "login";

function message(text, isError = false) {
  status.textContent = text;
  status.style.color = isError ? "var(--red)" : "var(--green)";
}
function setBusy(busy) {
  submit.disabled = busy;
  submit.textContent = busy ? "Aguarde..." : (mode === "login" ? "Entrar" : "Criar conta");
}
function updateMode() {
  $("accountTitle").textContent = mode === "login" ? "Entrar no SYSTEM" : "Criar conta";
  $("accountDisplayWrap").hidden = mode === "login";
  $("accountUsernameWrap").hidden = mode === "login";
  submit.textContent = mode === "login" ? "Entrar" : "Criar conta";
  modeButton.textContent = mode === "login" ? "Ainda não tenho conta" : "Já tenho conta";
  $("accountPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
}
modeButton.addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  message("");
  updateMode();
});

async function showSession(user) {
  formPanel.hidden = true;
  signedPanel.hidden = false;
  logout.hidden = false;
  $("accountEmailText").textContent = user.email || "Conta conectada";
  let profile = await getMyProfile();
  if (!profile && user.user_metadata?.system_username) {
    try {
      profile = await createPlayerProfile(user);
    } catch (err) {
      message(err.message || "Conta conectada, mas não foi possível criar o perfil.", true);
    }
  }
  if (profile) {
    $("accountPlayerText").textContent = "@" + profile.username;
    $("accountPlayerMeta").textContent = "Nível " + String(profile.level).padStart(2, "0") + " · Classe " + profile.rank;
  } else {
    $("accountPlayerText").textContent = "Perfil pendente";
    $("accountPlayerMeta").textContent = "Confirme seu e-mail, se solicitado, e entre novamente.";
  }
}
async function showSignedOut() {
  signedPanel.hidden = true;
  formPanel.hidden = false;
  logout.hidden = true;
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  setBusy(true);
  message("");
  try {
    const email = $("accountEmail").value.trim();
    const password = $("accountPassword").value;
    if (mode === "register") {
      const result = await registerAccount({
        email,
        password,
        username: $("accountUsername").value,
        displayName: $("accountDisplayName").value
      });
      if (result.needsEmailConfirmation) {
        message("Conta criada. Confira seu e-mail para confirmar e depois entre aqui.");
        mode = "login";
        updateMode();
      } else {
        await showSession(result.user);
        message("Conta criada e perfil configurado.");
      }
    } else {
      const result = await signIn(email, password);
      await showSession(result.user);
      message("Login realizado.");
    }
  } catch (err) {
    message(err.message || "Não foi possível concluir. Tente novamente.", true);
  } finally {
    setBusy(false);
  }
});
logout.addEventListener("click", async () => {
  logout.disabled = true;
  try {
    await signOut();
    await showSignedOut();
    message("Você saiu da conta.");
  } catch (err) {
    message(err.message || "Não foi possível sair.", true);
  } finally {
    logout.disabled = false;
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  // Evita chamadas de rede dentro do callback síncrono do Supabase.
  if (session?.user) queueMicrotask(() => showSession(session.user).catch(err => message(err.message, true)));
  else if (_event === "SIGNED_OUT") showSignedOut();
});
getCurrentUser().then(user => user ? showSession(user) : showSignedOut())
  .catch(err => message(err.message || "Não foi possível verificar a sessão.", true));
updateMode();
