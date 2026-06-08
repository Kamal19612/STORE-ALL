import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Search,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import {
  listStores,
  listManagerUsers,
  createManagerUser,
  updateManagerUser,
  deleteManagerUser,
} from "../../../services/adminSupervisionService";

const card =
  "bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 p-4 sm:p-6";

export default function SuperAdminManagers() {
  const [stores, setStores] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [storeId, setStoreId] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [filterStore, setFilterStore] = useState("");
  const [filterQ, setFilterQ] = useState("");

  const [editingManager, setEditingManager] = useState(null);
  const [editStoreId, setEditStoreId] = useState("");
  const [editNom, setEditNom] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadManagers = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await listManagerUsers();
      setManagers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Impossible de charger les managers");
      setManagers([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    listStores()
      .then((list) => {
        setStores(list || []);
        if (list?.length && !storeId) setStoreId(String(list[0].id));
      })
      .catch(() => toast.error("Impossible de charger les boutiques"));
  }, []);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const filteredRows = useMemo(() => {
    const sid = filterStore === "" ? null : filterStore;
    const q = filterQ.trim().toLowerCase();
    return managers.filter((m) => {
      if (sid != null && String(m.storeId) !== sid) return false;
      if (!q) return true;
      const hay = [
        m.nom,
        m.username,
        m.email,
        m.phone,
        m.storeName,
        m.storeCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [managers, filterStore, filterQ]);

  const formatDateTime = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("fr-FR");
    } catch {
      return value;
    }
  };

  const closeEditModal = () => {
    setEditingManager(null);
    setEditPassword("");
  };

  const applyManagerToEditForm = (detail) => {
    setEditStoreId(detail.storeId != null ? String(detail.storeId) : "");
    setEditNom(detail.nom || "");
    setEditPhone(detail.phone || "");
    setEditEmail(detail.email || "");
    setEditUsername(detail.username || "");
    setEditActive(detail.active !== false);
    setEditingManager(detail);
  };

  const openEditModal = (managerRow) => {
    setEditPassword("");
    setEditLoading(false);
    applyManagerToEditForm(managerRow);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingManager?.id) return;
    if (!editStoreId) {
      toast.error("Choisissez une boutique");
      return;
    }
    setEditSubmitting(true);
    try {
      await updateManagerUser(editingManager.id, {
        storeId: Number(editStoreId),
        nom: editNom.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim(),
        username: editUsername.trim() || editEmail.trim(),
        password: editPassword.trim() || undefined,
        active: editActive,
      });
      toast.success("Compte manager mis à jour");
      closeEditModal();
      await loadManagers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Échec de la mise à jour");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (managerRow) => {
    const label = managerRow.nom || managerRow.email || `ID ${managerRow.id}`;
    if (
      !window.confirm(
        `Supprimer définitivement le compte manager « ${label} » ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setDeletingId(managerRow.id);
    try {
      await deleteManagerUser(managerRow.id);
      toast.success("Compte manager supprimé");
      if (editingManager?.id === managerRow.id) {
        closeEditModal();
      }
      await loadManagers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeId) {
      toast.error("Choisissez une boutique");
      return;
    }
    setSubmitting(true);
    try {
      await createManagerUser({
        storeId: Number(storeId),
        nom: nom.trim(),
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });
      toast.success("Compte manager créé — connexion avec l’email comme identifiant.");
      setNom("");
      setPhone("");
      setEmail("");
      setPassword("");
      setCreateOpen(false);
      await loadManagers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Échec création");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c191a] px-3 py-2 text-sm text-gray-900 dark:text-white";

  return (
    <div className="p-2 sm:p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-1">
          Managers des boutiques
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
          Liste des comptes <strong>MANAGER</strong> et accès back-office par boutique. Filtrez par
          boutique ou par mot-clé. La connexion se fait avec l’<strong>email</strong> comme
          identifiant.
        </p>
      </header>

      <section className={card}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Liste des managers
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {loadingList
                ? "Chargement…"
                : `${managers.length} compte${managers.length !== 1 ? "s" : ""} au total`}
              {!loadingList && filteredRows.length !== managers.length && (
                <span className="text-[#f5ad41]"> · {filteredRows.length} après filtre</span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => loadManagers()}
              disabled={loadingList}
              className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg border border-gray-200 dark:border-white/15 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen((o) => !o)}
              className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg border-2 border-[#f5ad41]/80 bg-[#f5ad41]/10 dark:bg-[#f5ad41]/15 text-[#242021] dark:text-[#f5ad41] px-4 py-2.5 text-sm font-semibold hover:bg-[#f5ad41]/20 dark:hover:bg-[#f5ad41]/25 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              {createOpen ? "Fermer le formulaire" : "Créer un compte manager"}
              {createOpen ? (
                <ChevronUp className="h-4 w-4 opacity-70" />
              ) : (
                <ChevronDown className="h-4 w-4 opacity-70" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4">
          <div className="min-w-[180px] sm:max-w-[220px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Filtrer par boutique
            </label>
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className={inputClass}
            >
              <option value="">Toutes les boutiques</option>
              {stores.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="Nom, email, téléphone, code boutique…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
        </div>

        {createOpen && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-xl border border-dashed border-[#f5ad41]/40 bg-amber-50/40 dark:bg-[#f5ad41]/[0.06] p-4 sm:p-5 space-y-4"
          >
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Nouveau compte manager
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Boutique
                </label>
                <select
                  required
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Sélectionner —</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom
                </label>
                <input
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom affiché"
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optionnel"
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mot de passe initial
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="py-2.5 px-4 rounded-lg border border-gray-200 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-5 rounded-lg bg-[#f5ad41] text-[#242021] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Création…" : "Créer le manager"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-white/10">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2.5 font-medium">Boutique</th>
                <th className="px-3 py-2.5 font-medium">Nom</th>
                <th className="px-3 py-2.5 font-medium">Téléphone</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Identifiant</th>
                <th className="px-3 py-2.5 font-medium">Statut</th>
                <th className="px-3 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {loadingList ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">
                    Chargement…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">
                    {managers.length === 0
                      ? "Aucun manager pour le moment. Utilisez « Créer un compte manager » pour en ajouter un."
                      : "Aucun résultat pour ces filtres."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((m) => (
                  <tr
                    key={m.id}
                    className="text-gray-900 dark:text-white hover:bg-gray-50/80 dark:hover:bg-white/[0.04]"
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{m.storeName || "—"}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {m.storeCode}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{m.nom || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{m.phone || "—"}</td>
                    <td className="px-3 py-2.5 break-all max-w-[200px]">{m.email}</td>
                    <td className="px-3 py-2.5 break-all max-w-[160px] text-gray-600 dark:text-gray-300">
                      {m.username}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          m.active
                            ? "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300"
                            : "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-400"
                        }
                      >
                        {m.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="inline-flex p-2 rounded-lg text-amber-700 dark:text-[#f5ad41] hover:bg-amber-50 dark:hover:bg-white/5"
                          title="Voir / modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m)}
                          disabled={deletingId === m.id}
                          className="inline-flex p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeEditModal}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-edit-title"
          >
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-100 dark:border-white/10">
              <div>
                <h2
                  id="manager-edit-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Compte manager
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ID {editingManager.id}
                  {editingManager.storeName && (
                    <>
                      {" "}
                      · {editingManager.storeName} ({editingManager.storeCode})
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement…</div>
            ) : (
              <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-white/5 p-3">
                  <div>
                    <span className="block font-medium text-gray-600 dark:text-gray-300">
                      Créé le
                    </span>
                    {formatDateTime(editingManager.createdAt)}
                  </div>
                  <div>
                    <span className="block font-medium text-gray-600 dark:text-gray-300">
                      Dernière connexion
                    </span>
                    {formatDateTime(editingManager.lastLogin)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Boutique
                  </label>
                  <select
                    required
                    value={editStoreId}
                    onChange={(e) => setEditStoreId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Sélectionner —</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom
                  </label>
                  <input
                    required
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Identifiant de connexion
                  </label>
                  <input
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    className={inputClass}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Compte actif
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleDelete(editingManager)}
                    disabled={deletingId === editingManager.id || editSubmitting}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer le compte
                  </button>
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="py-2.5 px-4 rounded-lg border border-gray-200 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="py-2.5 px-5 rounded-lg bg-[#f5ad41] text-[#242021] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {editSubmitting ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
