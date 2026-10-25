import { supabase, getCurrentUser } from "./auth.js";

const $ = id => document.getElementById(id);
const uploadButton = $("syncUpload");
const restoreButton = $("syncRestore");
const status = $("syncStatus");

function say(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "var(--red)" : "var(--green)";
}
function setBusy(busy) {
  uploadButton.disabled = busy;
  restoreButton.disabled = busy;
}
function downloadBackup(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "system-backup-local-antes-da-restauracao.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

uploadButton?.addEventListener("click", async () => {
  if (!confirm("Enviar o progresso deste aparelho para a nuvem? Se já existir uma cópia na nuvem, ela será substituída.")) return;
  setBusy(true);
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Entre na sua conta antes de sincronizar.");
    const localState = window.SYSTEM_PROGRESS.getState();
    const { error } = await supabase.from("system_player_state").upsert({
      user_id: user.id,
      state: localState,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) throw error;
    say("Progresso local enviado para a nuvem.");
  } catch (error) {
    say(error.message || "Falha ao enviar o progresso.", true);
  } finally {
    setBusy(false);
  }
});

restoreButton?.addEventListener("click", async () => {
  if (!confirm("Restaurar a cópia da nuvem neste aparelho? O progresso local será substituído, mas um backup JSON será baixado antes.")) return;
  setBusy(true);
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Entre na sua conta antes de restaurar.");
    const { data, error } = await supabase.from("system_player_state")
      .select("state, updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data?.state) throw new Error("Ainda não existe progresso salvo na nuvem para esta conta.");
    const remote = data.state;
    if (!remote || typeof remote !== "object" || Array.isArray(remote) ||
        !Array.isArray(remote.missions) || !Array.isArray(remote.history) ||
        typeof remote.xp !== "number" || !remote.attributes ||
        typeof remote.attributes !== "object" || Array.isArray(remote.attributes)) {
      throw new Error("A cópia da nuvem não passou na validação. Os dados locais não foram alterados.");
    }
    const localState = window.SYSTEM_PROGRESS.getState();
    downloadBackup(localState);
    await window.SYSTEM_PROGRESS.replaceState(remote);
    say("Progresso restaurado. O backup local anterior foi baixado.");
  } catch (error) {
    say(error.message || "Falha ao restaurar o progresso.", true);
  } finally {
    setBusy(false);
  }
});
