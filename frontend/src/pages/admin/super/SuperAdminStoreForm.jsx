import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { Building2, ChevronDown, ChevronUp, Download, Image as ImageIcon, Pencil, Search, Table2, Trash2, Upload, UserPlus, X } from "lucide-react";
import {
  listStores,
  createStore,
  importSuperStoresCsv,
  exportSuperStoresCsv,
  updateStore,
  deleteStore,
  getSuperApplicationSummary,
} from "../../../services/adminSupervisionService";
import ImportStoresSheetModal from "../../../components/admin/ImportStoresSheetModal";
import VitrineTemplatePicker from "../../../components/admin/VitrineTemplatePicker";
import VitrineTemplatePreviewPanel from "../../../components/admin/VitrineTemplatePreviewPanel";
import VitrineAlibabaConfigFields from "../../../components/admin/VitrineAlibabaConfigFields";
import VitrineBrandsamaConfigFields from "../../../components/admin/VitrineBrandsamaConfigFields";
import VitrineClassicConfigFields from "../../../components/admin/VitrineClassicConfigFields";
import { getVitrineTemplateOption, VITRINE_TEMPLATE_DEFAULT } from "../../../config/vitrineTemplates";
import { getClassicTheme, CLASSIC_THEME_DEFAULT } from "../../../config/classicThemes";
import {
  buildVitrineConfigForApi,
  readAlibabaFieldsFromStore,
  readBrandsamaFieldsFromStore,
  readClassicFieldsFromStore,
} from "../../../utils/vitrineConfigPayload";

const glassBtn =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out " +
  "bg-white/35 dark:bg-white/[0.07] hover:bg-white/55 dark:hover:bg-white/12 " +
  "border border-gray-400/35 dark:border-white/18 backdrop-blur-md " +
  "text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md " +
  "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

const card =
  "bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 p-4 sm:p-6";

export default function SuperAdminStoreForm() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [domain, setDomain] = useState("");
  const [vitrineTemplate, setVitrineTemplate] = useState(VITRINE_TEMPLATE_DEFAULT);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [heroCyan, setHeroCyan] = useState("");
  const [classicThemeId, setClassicThemeId] = useState(CLASSIC_THEME_DEFAULT);
  const [classicPrimaryColor, setClassicPrimaryColor] = useState(getClassicTheme(CLASSIC_THEME_DEFAULT).primaryColor);
  const [classicSecondaryColor, setClassicSecondaryColor] = useState(
    getClassicTheme(CLASSIC_THEME_DEFAULT).secondaryColor,
  );
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [defaultStoreCode, setDefaultStoreCode] = useState("");
  const [editingStore, setEditingStore] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editMapsUrl, setEditMapsUrl] = useState("");
  const [editTelegramId, setEditTelegramId] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editVitrineTemplate, setEditVitrineTemplate] = useState(VITRINE_TEMPLATE_DEFAULT);
  const [editHeroTitle, setEditHeroTitle] = useState("");
  const [editHeroSubtitle, setEditHeroSubtitle] = useState("");
  const [editAccentColor, setEditAccentColor] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("");
  const [editHeroCyan, setEditHeroCyan] = useState("");
  const [editClassicThemeId, setEditClassicThemeId] = useState(CLASSIC_THEME_DEFAULT);
  const [editClassicPrimaryColor, setEditClassicPrimaryColor] = useState(
    getClassicTheme(CLASSIC_THEME_DEFAULT).primaryColor,
  );
  const [editClassicSecondaryColor, setEditClassicSecondaryColor] = useState(
    getClassicTheme(CLASSIC_THEME_DEFAULT).secondaryColor,
  );
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);
  const [removeEditLogo, setRemoveEditLogo] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [toggleBusyId, setToggleBusyId] = useState(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listStores();
      setStores(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Impossible de charger les boutiques");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await getSuperApplicationSummary();
        const code = summary?.defaultStoreCode != null ? String(summary.defaultStoreCode).trim().toLowerCase() : "";
        if (!cancelled) setDefaultStoreCode(code);
      } catch {
        if (!cancelled) setDefaultStoreCode("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => {
      const hay = [s.name, s.code, s.phone, s.email, s.domain, s.mapsUrl, s.telegramId, s.logoUrl]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [stores, searchQ]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    return () => {
      if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    };
  }, [editLogoPreview]);

  useEffect(() => {
    if (!editingStore) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") closeEditModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [editingStore]);

  const clearEditLogo = useCallback(() => {
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    setEditLogoPreview(null);
    setEditLogoFile(null);
  }, [editLogoPreview]);

  const openEditModal = (s) => {
    clearEditLogo();
    setRemoveEditLogo(false);
    setEditingStore(s);
    setEditName(s.name || "");
    setEditPhone(s.phone || "");
    setEditContactEmail(s.email || "");
    setEditMapsUrl(s.mapsUrl || "");
    setEditTelegramId(s.telegramId || "");
    setEditDomain(s.domain || "");
    setEditVitrineTemplate(s.vitrineTemplate || VITRINE_TEMPLATE_DEFAULT);
    const ali = readAlibabaFieldsFromStore(s);
    const bs = readBrandsamaFieldsFromStore(s);
    const classic = readClassicFieldsFromStore(s);
    setEditHeroTitle(ali.heroTitle || bs.heroTitle);
    setEditHeroSubtitle(ali.heroSubtitle || bs.heroSubtitle);
    setEditAccentColor(ali.accentColor);
    setEditPrimaryColor(bs.primaryColor);
    setEditHeroCyan(bs.heroCyan);
    setEditClassicThemeId(classic.themeId);
    setEditClassicPrimaryColor(classic.primaryColor);
    setEditClassicSecondaryColor(classic.secondaryColor);
  };

  const applyClassicThemePreset = (themeId, setThemeId, setPrimary, setSecondary) => {
    const preset = getClassicTheme(themeId);
    setThemeId(themeId);
    if (themeId !== "custom") {
      setPrimary(preset.primaryColor);
      setSecondary(preset.secondaryColor);
    }
  };

  const closeEditModal = () => {
    clearEditLogo();
    setEditingStore(null);
    setRemoveEditLogo(false);
  };

  const handleEditLogoChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const okType =
      f.type === "image/jpeg" ||
      f.type === "image/png" ||
      f.type === "image/jpg" ||
      /\.jpe?g$/i.test(f.name) ||
      /\.png$/i.test(f.name);
    if (!okType) {
      toast.error("Logo : fichier JPG ou PNG uniquement.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Logo : fichier trop volumineux (max 2 Mo).");
      return;
    }
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    setRemoveEditLogo(false);
    setEditLogoFile(f);
    setEditLogoPreview(URL.createObjectURL(f));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStore) return;
    setEditSubmitting(true);
    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        mapsUrl: editMapsUrl.trim() || undefined,
        telegramId: editTelegramId.trim() || undefined,
        domain: editDomain.trim() || undefined,
        vitrineTemplate: editVitrineTemplate,
        vitrineConfig: buildVitrineConfigForApi(editVitrineTemplate, {
          heroTitle: editHeroTitle,
          heroSubtitle: editHeroSubtitle,
          accentColor: editAccentColor,
          primaryColor: editVitrineTemplate === "default" ? editClassicPrimaryColor : editPrimaryColor,
          heroCyan: editHeroCyan,
          themeId: editClassicThemeId,
          secondaryColor: editClassicSecondaryColor,
        }),
      };
      if (removeEditLogo && !editLogoFile) {
        payload.logoUrl = "";
      }
      await updateStore(editingStore.id, payload, editLogoFile || undefined);
      toast.success(
        "Boutique mise à jour. Rechargez la vitrine publique (F5) pour voir le nouveau modèle d’affichage.",
      );
      closeEditModal();
      await loadStores();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Échec de la mise à jour";
      toast.error(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteStore = async (s) => {
    const ok = window.confirm(
      `Supprimer définitivement la boutique « ${s.name} » (${s.code}) ?\n\n` +
        "Toutes les commandes, produits, catégories, réglages et comptes managers de cette boutique seront supprimés. Cette action est irréversible.",
    );
    if (!ok) return;
    setDeleteBusyId(s.id);
    try {
      await deleteStore(s.id);
      toast.success("Boutique supprimée");
      await loadStores();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Suppression impossible";
      toast.error(msg);
    } finally {
      setDeleteBusyId(null);
    }
  };

  const isDefaultStore = (s) =>
    defaultStoreCode && String(s.code || "").trim().toLowerCase() === defaultStoreCode;

  const handleToggleActive = async (s) => {
    const isOn = s.active !== false;
    if (isOn && isDefaultStore(s)) {
      toast.info("La boutique par défaut ne peut pas être désactivée.");
      return;
    }
    setToggleBusyId(s.id);
    try {
      await updateStore(s.id, { active: !isOn });
      toast.success(!isOn ? "Boutique activée (vitrine ouverte)." : "Boutique désactivée (vitrine fermée).");
      await loadStores();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Impossible de modifier le statut";
      toast.error(msg);
    } finally {
      setToggleBusyId(null);
    }
  };

  const clearLogo = useCallback(() => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoFile(null);
  }, [logoPreview]);

  const handleLogoChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const okType =
      f.type === "image/jpeg" ||
      f.type === "image/png" ||
      f.type === "image/jpg" ||
      /\.jpe?g$/i.test(f.name) ||
      /\.png$/i.test(f.name);
    if (!okType) {
      toast.error("Logo : fichier JPG ou PNG uniquement.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Logo : fichier trop volumineux (max 2 Mo).");
      return;
    }
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createStore(
        {
          name: name.trim(),
          code: code.trim(),
          phone: phone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          mapsUrl: mapsUrl.trim() || undefined,
          telegramId: telegramId.trim() || undefined,
          domain: domain.trim() || undefined,
          vitrineTemplate,
          vitrineConfig: buildVitrineConfigForApi(vitrineTemplate, {
            heroTitle,
            heroSubtitle,
            accentColor,
            primaryColor: vitrineTemplate === "default" ? classicPrimaryColor : primaryColor,
            heroCyan,
            themeId: classicThemeId,
            secondaryColor: classicSecondaryColor,
          }),
        },
        logoFile || undefined,
      );
      toast.success("Boutique créée");
      setName("");
      setCode("");
      setPhone("");
      setContactEmail("");
      setMapsUrl("");
      setTelegramId("");
      setDomain("");
      setVitrineTemplate(VITRINE_TEMPLATE_DEFAULT);
      setHeroTitle("");
      setHeroSubtitle("");
      setAccentColor("");
      setClassicThemeId(CLASSIC_THEME_DEFAULT);
      setClassicPrimaryColor(getClassicTheme(CLASSIC_THEME_DEFAULT).primaryColor);
      setClassicSecondaryColor(getClassicTheme(CLASSIC_THEME_DEFAULT).secondaryColor);
      clearLogo();
      setCreateOpen(false);
      await loadStores();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Échec création";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = async () => {
    setCsvBusy(true);
    try {
      await exportSuperStoresCsv();
      toast.success("Export CSV lancé");
    } catch {
      toast.error("Export CSV impossible");
    } finally {
      setCsvBusy(false);
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvBusy(true);
    try {
      const summary = await importSuperStoresCsv(file);
      toast.success(
        `Boutiques CSV : ${summary.successCount ?? 0} ligne(s) OK, erreurs ${summary.failureCount ?? 0}`,
      );
      await loadStores();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import boutiques CSV échoué");
    } finally {
      setCsvBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c191a] px-3 py-2 text-sm text-gray-900 dark:text-white";

  return (
    <div className="p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
          <Building2 className="h-7 w-7 text-[#f5ad41] shrink-0" />
          Boutiques
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
          Liste des magasins, création d&apos;une nouvelle boutique, import / export CSV (même format) et import depuis un{" "}
          <strong>Google Sheet</strong> dédié aux fiches boutique (sans modifier la feuille produits en paramètres).
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={csvBusy} onClick={handleExportCsv} className={glassBtn}>
          <Download className="h-4 w-4 shrink-0 opacity-80" />
          Export CSV
        </button>
        <label className={`${glassBtn} cursor-pointer`}>
          <Upload className="h-4 w-4 shrink-0 opacity-80" />
          Import CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} disabled={csvBusy} />
        </label>
        <button type="button" disabled={csvBusy} onClick={() => setSheetOpen(true)} className={glassBtn}>
          <Table2 className="h-4 w-4 shrink-0 opacity-80" />
          Google Sheets
        </button>
      </div>

      <section className={card}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Liste des boutiques</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {loading ? "Chargement…" : `${stores.length} boutique${stores.length !== 1 ? "s" : ""}`}
              {!loading && filtered.length !== stores.length && (
                <span className="text-[#f5ad41]"> · {filtered.length} après filtre</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen((o) => !o)}
            className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg border-2 border-[#f5ad41]/80 bg-[#f5ad41]/10 dark:bg-[#f5ad41]/15 text-[#242021] dark:text-[#f5ad41] px-4 py-2.5 text-sm font-semibold hover:bg-[#f5ad41]/20 dark:hover:bg-[#f5ad41]/25 transition-colors w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            {createOpen ? "Fermer le formulaire" : "Créer une nouvelle boutique"}
            {createOpen ? <ChevronUp className="h-4 w-4 opacity-70" /> : <ChevronDown className="h-4 w-4 opacity-70" />}
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Recherche</label>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Nom, code, email, téléphone…"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {createOpen && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-xl border border-dashed border-[#f5ad41]/40 bg-amber-50/40 dark:bg-[#f5ad41]/[0.06] p-4 sm:p-5 space-y-4"
          >
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Nouvelle boutique
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Le <strong>code</strong> sert au header{" "}
              <code className="text-[10px] bg-white/80 dark:bg-black/30 px-1 rounded">X-Store-Code</code> (minuscules,
              tirets).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom affiché</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code boutique</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="ex. nouvelle-boutique"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email contact</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lien Maps</label>
                <input
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chat ID Telegram (boutique)</label>
                <input
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="Prioritaire sur le chat défaut plateforme"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domaine</label>
                <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="optionnel" className={inputClass} />
              </div>
              {vitrineTemplate === "default" && (
                <VitrineClassicConfigFields
                  themeId={classicThemeId}
                  primaryColor={classicPrimaryColor}
                  secondaryColor={classicSecondaryColor}
                  onThemeIdChange={(id) =>
                    applyClassicThemePreset(id, setClassicThemeId, setClassicPrimaryColor, setClassicSecondaryColor)
                  }
                  onPrimaryColorChange={setClassicPrimaryColor}
                  onSecondaryColorChange={setClassicSecondaryColor}
                />
              )}
              {vitrineTemplate === "alibaba" && (
                <VitrineAlibabaConfigFields
                  heroTitle={heroTitle}
                  heroSubtitle={heroSubtitle}
                  accentColor={accentColor}
                  onHeroTitleChange={setHeroTitle}
                  onHeroSubtitleChange={setHeroSubtitle}
                  onAccentColorChange={setAccentColor}
                />
              )}
              {vitrineTemplate === "brandsama" && (
                <VitrineBrandsamaConfigFields
                  heroTitle={heroTitle}
                  heroSubtitle={heroSubtitle}
                  primaryColor={primaryColor}
                  heroCyan={heroCyan}
                  onHeroTitleChange={setHeroTitle}
                  onHeroSubtitleChange={setHeroSubtitle}
                  onPrimaryColorChange={setPrimaryColor}
                  onHeroCyanChange={setHeroCyan}
                />
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo boutique <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  JPG ou PNG, max 2 Mo — affiché sur la fiche boutique une fois enregistré.
                </p>
                <div className="flex flex-wrap items-start gap-3">
                  <label className="inline-flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1c191a] px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">
                    <ImageIcon className="h-4 w-4 text-[#f5ad41]" />
                    Choisir un fichier
                    <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Aperçu logo"
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover border border-gray-200 dark:border-white/15"
                      />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-gray-800 text-white shadow hover:bg-red-600"
                        title="Retirer le logo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#f5ad41]/20">
              <VitrineTemplatePicker
                value={vitrineTemplate}
                onChange={setVitrineTemplate}
                storeName={name}
                storeCode={code}
                logoUrl={logoPreview}
                heroTitle={heroTitle}
                heroSubtitle={heroSubtitle}
                accentColor={accentColor}
                primaryColor={primaryColor}
                heroCyan={heroCyan}
                classicThemeId={classicThemeId}
                classicPrimaryColor={classicPrimaryColor}
                classicSecondaryColor={classicSecondaryColor}
                layout="side"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  clearLogo();
                  setCreateOpen(false);
                }}
                className="py-2.5 px-4 rounded-lg border border-gray-200 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-5 rounded-lg bg-[#f5ad41] text-[#242021] font-semibold text-sm disabled:opacity-50"
              >
                {submitting ? "Enregistrement…" : "Créer la boutique"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-white/10">
          <table className="w-full text-sm text-left min-w-[1080px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2.5 font-medium w-14">Logo</th>
                <th className="px-3 py-2.5 font-medium">Code</th>
                <th className="px-3 py-2.5 font-medium">Nom</th>
                <th className="px-3 py-2.5 font-medium">Modèle</th>
                <th className="px-3 py-2.5 font-medium w-[88px]">Vitrine</th>
                <th className="px-3 py-2.5 font-medium">Téléphone</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Domaine</th>
                <th className="px-3 py-2.5 font-medium">Telegram</th>
                <th className="px-3 py-2.5 font-medium text-right w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">
                    {stores.length === 0
                      ? "Aucune boutique. Créez-en une ou importez un CSV / Sheet."
                      : "Aucun résultat pour cette recherche."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className={
                      "text-gray-900 dark:text-white hover:bg-gray-50/80 dark:hover:bg-white/[0.04] " +
                      (s.active === false ? "opacity-[0.72]" : "")
                    }
                  >
                    <td className="px-3 py-2.5 align-middle">
                      {s.logoUrl ? (
                        <img
                          src={s.logoUrl}
                          alt=""
                          className="h-9 w-9 rounded-md object-cover border border-gray-100 dark:border-white/10"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 dark:bg-white/5 text-gray-400 text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#f5ad41] font-medium">{s.code}</td>
                    <td className="px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {getVitrineTemplateOption(s.vitrineTemplate).label}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-white/20 dark:bg-[#1c191a]"
                        checked={s.active !== false}
                        disabled={toggleBusyId === s.id || (isDefaultStore(s) && s.active !== false)}
                        title={
                          isDefaultStore(s)
                            ? "Boutique par défaut — toujours active"
                            : s.active === false
                              ? "Activer la vitrine"
                              : "Désactiver la vitrine"
                        }
                        onChange={() => handleToggleActive(s)}
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{s.phone || "—"}</td>
                    <td className="px-3 py-2.5 break-all max-w-[200px]">{s.email || "—"}</td>
                    <td className="px-3 py-2.5 break-all max-w-[160px]">{s.domain || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{s.telegramId || "—"}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-2 rounded-lg border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-[#f5ad41]/15 hover:border-[#f5ad41]/40 transition-colors"
                          title="Modifier la boutique"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={deleteBusyId === s.id || isDefaultStore(s)}
                          onClick={() => handleDeleteStore(s)}
                          className="p-2 rounded-lg border border-gray-200 dark:border-white/15 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                          title={
                            isDefaultStore(s)
                              ? "Boutique par défaut (tenant) — suppression désactivée"
                              : "Supprimer la boutique"
                          }
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

      {editingStore &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-2 sm:p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-store-title"
            onClick={closeEditModal}
          >
            <div
              className="bg-white dark:bg-[#242021] w-full min-w-0 max-w-2xl md:max-w-3xl rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleEditSubmit} className="flex flex-col min-h-0 h-full sm:max-h-[inherit]">
                <div className="shrink-0 flex items-start justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 dark:border-white/10">
                  <div className="min-w-0 flex-1">
                    <h2 id="edit-store-title" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Modifier la boutique
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Code{" "}
                      <span className="font-mono text-[#f5ad41] break-all">{editingStore.code}</span>
                      <span className="hidden sm:inline"> — non modifiable (URLs, X-Store-Code)</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                    aria-label="Fermer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 space-y-5">
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom affiché</label>
                      <input required value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                      <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email contact</label>
                      <input
                        type="email"
                        value={editContactEmail}
                        onChange={(e) => setEditContactEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lien Maps</label>
                      <input value={editMapsUrl} onChange={(e) => setEditMapsUrl(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Chat ID Telegram (boutique)
                      </label>
                      <input
                        value={editTelegramId}
                        onChange={(e) => setEditTelegramId(e.target.value)}
                        placeholder="Prioritaire sur le chat défaut plateforme"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domaine</label>
                      <input value={editDomain} onChange={(e) => setEditDomain(e.target.value)} className={inputClass} />
                    </div>
                    {editVitrineTemplate === "default" && (
                      <VitrineClassicConfigFields
                        themeId={editClassicThemeId}
                        primaryColor={editClassicPrimaryColor}
                        secondaryColor={editClassicSecondaryColor}
                        onThemeIdChange={(id) =>
                          applyClassicThemePreset(
                            id,
                            setEditClassicThemeId,
                            setEditClassicPrimaryColor,
                            setEditClassicSecondaryColor,
                          )
                        }
                        onPrimaryColorChange={setEditClassicPrimaryColor}
                        onSecondaryColorChange={setEditClassicSecondaryColor}
                      />
                    )}
                    {editVitrineTemplate === "alibaba" && (
                      <VitrineAlibabaConfigFields
                        heroTitle={editHeroTitle}
                        heroSubtitle={editHeroSubtitle}
                        accentColor={editAccentColor}
                        onHeroTitleChange={setEditHeroTitle}
                        onHeroSubtitleChange={setEditHeroSubtitle}
                        onAccentColorChange={setEditAccentColor}
                      />
                    )}
                    {editVitrineTemplate === "brandsama" && (
                      <VitrineBrandsamaConfigFields
                        heroTitle={editHeroTitle}
                        heroSubtitle={editHeroSubtitle}
                        primaryColor={editPrimaryColor}
                        heroCyan={editHeroCyan}
                        onHeroTitleChange={setEditHeroTitle}
                        onHeroSubtitleChange={setEditHeroSubtitle}
                        onPrimaryColorChange={setEditPrimaryColor}
                        onHeroCyanChange={setEditHeroCyan}
                      />
                    )}
                    <div className="sm:col-span-2 min-w-0">
                      <VitrineTemplatePicker
                        hidePreview
                        value={editVitrineTemplate}
                        onChange={setEditVitrineTemplate}
                        storeName={editName}
                        storeCode={editingStore?.code}
                        logoUrl={editLogoPreview || editingStore?.logoUrl}
                        heroTitle={editHeroTitle}
                        heroSubtitle={editHeroSubtitle}
                        accentColor={editAccentColor}
                        primaryColor={editPrimaryColor}
                        heroCyan={editHeroCyan}
                        classicThemeId={editClassicThemeId}
                        classicPrimaryColor={editClassicPrimaryColor}
                        classicSecondaryColor={editClassicSecondaryColor}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Logo <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        <label className="inline-flex w-full sm:w-auto items-center justify-center gap-2 cursor-pointer rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1c191a] px-3 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">
                          <ImageIcon className="h-4 w-4 text-[#f5ad41] shrink-0" />
                          <span className="truncate">{editingStore.logoUrl ? "Remplacer le logo" : "Ajouter un logo"}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={handleEditLogoChange}
                          />
                        </label>
                        {editLogoPreview && (
                          <div className="relative shrink-0">
                            <img
                              src={editLogoPreview}
                              alt="Nouveau logo"
                              className="h-14 w-14 rounded-lg object-cover border border-gray-200 dark:border-white/15"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                clearEditLogo();
                                setRemoveEditLogo(false);
                              }}
                              className="absolute -top-1 -right-1 p-1 rounded-full bg-gray-800 text-white shadow hover:bg-red-600"
                              title="Annuler le nouveau fichier"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {!editLogoFile && editingStore.logoUrl && !removeEditLogo && (
                          <div className="flex flex-col items-start gap-1 shrink-0">
                            <img
                              src={editingStore.logoUrl}
                              alt=""
                              className="h-14 w-14 rounded-lg object-cover border border-gray-200 dark:border-white/15"
                            />
                            <button
                              type="button"
                              onClick={() => setRemoveEditLogo(true)}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                              Retirer le logo
                            </button>
                          </div>
                        )}
                        {!editLogoFile && editingStore.logoUrl && removeEditLogo && (
                          <p className="text-xs text-amber-800 dark:text-amber-300 w-full sm:max-w-xs">
                            Le logo sera supprimé à l&apos;enregistrement.{" "}
                            <button
                              type="button"
                              onClick={() => setRemoveEditLogo(false)}
                              className="font-medium text-[#f5ad41] underline-offset-2 hover:underline"
                            >
                              Annuler
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <details className="group rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-black/20 min-w-0">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white flex items-center justify-between gap-2">
                      <span>Aperçu vitrine</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-3 pb-3 min-w-0 max-h-[min(42vh,320px)] overflow-y-auto overflow-x-hidden">
                      <VitrineTemplatePreviewPanel
                        templateId={editVitrineTemplate}
                        storeName={editName}
                        storeCode={editingStore?.code}
                        logoUrl={editLogoPreview || editingStore?.logoUrl}
                        heroTitle={editHeroTitle}
                        heroSubtitle={editHeroSubtitle}
                        accentColor={editAccentColor}
                        primaryColor={editPrimaryColor}
                        heroCyan={editHeroCyan}
                        classicThemeId={editClassicThemeId}
                        classicPrimaryColor={editClassicPrimaryColor}
                        classicSecondaryColor={editClassicSecondaryColor}
                        className="border-0 bg-transparent"
                      />
                    </div>
                  </details>
                </div>

                <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 py-3 sm:px-5 sm:py-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#242021]">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-lg border border-gray-200 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="w-full sm:w-auto py-2.5 px-5 rounded-lg bg-[#f5ad41] text-[#242021] font-semibold text-sm disabled:opacity-50"
                  >
                    {editSubmitting ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ImportStoresSheetModal isOpen={sheetOpen} onClose={() => setSheetOpen(false)} onSuccess={() => loadStores()} />
    </div>
  );
}
