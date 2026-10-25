import { supabase } from "./auth.js";
import { searchPlayers, sendFriendRequest, respondFriendRequest, removeFriend, listFriendships, getSharedPlayerProfile } from "./friends.js";

const $ = id => document.getElementById(id);
const searchForm = $("friendSearchForm");
const searchInput = $("friendSearchInput");
const searchResults = $("friendSearchResults");
const friendList = $("friendList");
const requestsList = $("friendRequestsList");
const friendStatus = $("friendStatus");
let currentUser = null;
let searchBusy = false;

function status(text, error = false) {
  friendStatus.textContent = text;
  friendStatus.style.color = error ? "var(--red)" : "var(--green)";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function playerCard(p, action = "") {
  const level = p.level == null ? "Progresso privado" : "Nível " + String(p.level).padStart(2, "0") + " · Classe " + escapeHtml(p.rank || "—");
  const button = action ? `<button class="secondary friend-action" data-action="${action}" data-id="${escapeHtml(p.friendship_id || p.user_id)}" data-user="${escapeHtml(p.user_id)}">${action === "add" ? "＋ Adicionar" : action === "accept" ? "Aceitar" : action === "reject" ? "Recusar" : action === "remove" ? "Remover" : "Ver perfil"}</button>` : "";
  return `<article class="friend-card"><span class="account-avatar friend-avatar">S</span><div class="friend-info"><strong>${escapeHtml(p.display_name || p.username)}</strong><small>@${escapeHtml(p.username)}</small><small>${level}</small></div>${button}</article>`;
}
function empty(text) { return `<p class="friend-empty">${escapeHtml(text)}</p>`; }

async function renderFriendships() {
  if (!currentUser) {
    friendList.innerHTML = empty("Entre na sua conta para ver suas amizades.");
    requestsList.innerHTML = empty("As solicitações aparecerão aqui.");
    return;
  }
  const rows = await listFriendships();
  const incoming = rows.filter(x => x.status === "pending" && x.direction === "incoming");
  const outgoing = rows.filter(x => x.status === "pending" && x.direction === "outgoing");
  const accepted = rows.filter(x => x.status === "accepted");
  requestsList.innerHTML = incoming.length ? incoming.map(p => playerCard(p, "accept") + playerCard(p, "reject")).join("") : empty("Nenhuma solicitação recebida.") ;
  // Rebuild requests with one row per player and both buttons in the row.
  requestsList.innerHTML = incoming.length ? incoming.map(p => `<article class="friend-card"><span class="account-avatar friend-avatar">S</span><div class="friend-info"><strong>${escapeHtml(p.display_name || p.username)}</strong><small>@${escapeHtml(p.username)}</small></div><div class="friend-actions"><button class="secondary friend-action" data-action="accept" data-id="${escapeHtml(p.friendship_id)}">Aceitar</button><button class="danger friend-action" data-action="reject" data-id="${escapeHtml(p.friendship_id)}">Recusar</button></div></article>`).join("") : empty("Nenhuma solicitação recebida.");
  if (outgoing.length) {
    requestsList.innerHTML += `<p class="friend-subheading">Enviadas</p>` + outgoing.map(p => playerCard(p, "cancel")).join("");
  }
  friendList.innerHTML = accepted.length ? accepted.map(p => playerCard(p, "profile")).join("") : empty("Você ainda não tem amigos. Procure alguém pelo nome de usuário.");
}
searchForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (searchBusy) return;
  if (!currentUser) { status("Entre na sua conta para procurar jogadores.", true); return; }
  searchBusy = true;
  $("friendSearchButton").disabled = true;
  searchResults.innerHTML = empty("Procurando jogadores…");
  try {
    const rows = await searchPlayers(searchInput.value);
    searchResults.innerHTML = rows.length ? rows.map(p => playerCard(p, p.already_connected ? "" : "add")).join("") : empty("Nenhum jogador encontrado. Confira o nome e tente novamente.");
  } catch (err) {
    searchResults.innerHTML = empty(err.message || "Não foi possível procurar jogadores.");
  } finally {
    searchBusy = false;
    $("friendSearchButton").disabled = false;
  }
});
document.addEventListener("click", async event => {
  const button = event.target.closest(".friend-action");
  if (!button) return;
  if (!currentUser) { status("Entre na sua conta primeiro.", true); return; }
  button.disabled = true;
  try {
    const action = button.dataset.action;
    if (action === "add") {
      await sendFriendRequest(button.dataset.user);
      status("Solicitação enviada.");
      searchForm.dispatchEvent(new Event("submit", { cancelable: true }));
    } else if (action === "accept") {
      await respondFriendRequest(button.dataset.id, true);
      status("Amizade aceita.");
      await renderFriendships();
    } else if (action === "reject" || action === "cancel") {
      if (action === "reject") await respondFriendRequest(button.dataset.id, false);
      else await removeFriend(button.dataset.id);
      status(action === "reject" ? "Solicitação recusada." : "Solicitação cancelada.");
      await renderFriendships();
    } else if (action === "remove") {
      await removeFriend(button.dataset.id);
      status("Amizade removida.");
      await renderFriendships();
    } else if (action === "profile") {
      const p = await getSharedPlayerProfile(button.dataset.user);
      if (!p) throw new Error("Perfil não encontrado.");
      const details = p.level == null ? "Este jogador não compartilha o progresso." : `Nível ${p.level} · Classe ${p.rank} · XP ${p.xp}`;
      window.alert(`${p.display_name} (@${p.username})\n${details}`);
    }
  } catch (err) {
    status(err.message || "Não foi possível concluir a ação.", true);
  } finally {
    button.disabled = false;
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  queueMicrotask(() => renderFriendships().catch(err => status(err.message || "Erro ao carregar amizades.", true)));
});
supabase.auth.getSession().then(({ data }) => {
  currentUser = data.session?.user || null;
  return renderFriendships();
}).catch(err => status(err.message || "Não foi possível carregar as amizades.", true));
