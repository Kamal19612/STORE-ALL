import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Save, User, Lock, Mail, Shield, Phone } from "lucide-react";
import { toast } from "react-toastify";
import adminUserService from "../../../services/adminUserService";
import Tesseract from "tesseract.js";
import { parseBurkinaCnib } from "../../../utils/cnibOcrParser";
import useAuthStore from "../../../store/authStore";

const AdminUserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = !!id;
  const currentRole = useAuthStore((s) => s.user?.role);
  const canAssignSensitiveRoles = currentRole === "SUPER_ADMIN";
  const scopeStoreId = location.state?.adminScopeStoreId;

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "MANAGER",
    active: true,
    firstName: "",
    lastName: "",
    birthDate: "",
    birthPlace: "",
    gender: "",
    profession: "",
    cnibNationalId: "",
    cnibSerial: "",
    cnibIssueDate: "",
    cnibExpiryDate: "",
    cnibOcrText: "",
  });
  const [phoneData, setPhoneData] = useState({
    code: "+226",
    number: "",
  });
  const [loading, setLoading] = useState(false);
  const [cnibImage, setCnibImage] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState(null);

  useEffect(() => {
    if (scopeStoreId == null) {
      toast.error("Sélectionnez une boutique depuis la liste des utilisateurs.");
      navigate("/admin/users", { replace: true });
      return;
    }
    if (isEditMode && location.state?.user) {
      const u = location.state.user;

      let pCode = "+226";
      let pNum = "";

      if (u.phone) {
        const parts = u.phone.split(" ");
        if (parts.length > 1 && parts[0].startsWith("+")) {
          pCode = parts[0];
          pNum = parts.slice(1).join(" ");
        } else {
          pNum = u.phone;
        }
      }

      setFormData((prev) => ({
        ...prev,
        username: u.username,
        email: u.email,
        role: u.role,
        active: u.active,
        password: "",
        firstName: u.firstName ?? prev.firstName,
        lastName: u.lastName ?? prev.lastName,
        birthDate: u.birthDate ?? prev.birthDate,
        birthPlace: u.birthPlace ?? prev.birthPlace,
        gender: u.gender ?? prev.gender,
        profession: u.profession ?? prev.profession,
        cnibNationalId: u.cnibNationalId ?? prev.cnibNationalId,
        cnibSerial: u.cnibSerial ?? prev.cnibSerial,
        cnibIssueDate: u.cnibIssueDate ?? prev.cnibIssueDate,
        cnibExpiryDate: u.cnibExpiryDate ?? prev.cnibExpiryDate,
        cnibOcrText: u.cnibOcrText ?? prev.cnibOcrText,
      }));
      setPhoneData({ code: pCode, number: pNum });
    }
  }, [isEditMode, location.state, scopeStoreId, navigate]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!isEditMode || scopeStoreId == null) return;
      try {
        const st = await adminUserService.getDeliveryAgentStatus(scopeStoreId, id);
        setSupabaseStatus(st);
      } catch (_) {
        setSupabaseStatus(null);
      }
    };
    loadStatus();
  }, [id, isEditMode, scopeStoreId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const finalPhone = phoneData.number
      ? `${phoneData.code} ${phoneData.number}`
      : "";
    const payload = { ...formData, phone: finalPhone };

    if (scopeStoreId == null) return;

    try {
      if (isEditMode) {
        await adminUserService.updateUser(scopeStoreId, id, payload);
        toast.success("Utilisateur mis à jour");
      } else {
        await adminUserService.createUser(scopeStoreId, payload);
        toast.success("Utilisateur créé");
      }
      navigate("/admin/users");
    } catch (error) {
      console.error("User Form Error:", error);
      console.error("API response:", error.response?.status, error.response?.data);
      const status = error.response?.status;
      const data = error.response?.data;
      const msg =
        (typeof data === "string" ? data : data?.message) ||
        error.message ||
        "Erreur enregistrement";

      if (msg.includes("disconnected port")) {
        toast.error(
          "Erreur Extension Navigateur (Réessayez en navigation privée)",
        );
      } else if (status === 403) {
        toast.error("Permission refusée");
      } else {
        toast.error("Erreur: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDriver = formData.role === "DELIVERY_AGENT";

  const runOcr = async () => {
    if (!cnibImage) return;
    setOcrBusy(true);
    try {
      const { data } = await Tesseract.recognize(cnibImage, "fra");
      const text = (data?.text || "").trim();
      const parsed = parseBurkinaCnib(text);
      setFormData((prev) => ({
        ...prev,
        lastName: parsed.lastName || prev.lastName,
        firstName: parsed.firstNames || prev.firstName,
        birthDate: parsed.birthDate || prev.birthDate,
        birthPlace: parsed.birthPlace || prev.birthPlace,
        gender: parsed.gender || prev.gender,
        profession: parsed.profession || prev.profession,
        cnibNationalId: parsed.nationalIdNumber || prev.cnibNationalId,
        cnibSerial: parsed.cardSerial || prev.cnibSerial,
        cnibIssueDate: parsed.issueDate || prev.cnibIssueDate,
        cnibExpiryDate: parsed.expiryDate || prev.cnibExpiryDate,
        cnibOcrText: text,
      }));
      toast.success("OCR terminé. Vérifiez les champs.");
    } catch (err) {
      console.error(err);
      toast.error("OCR impossible. Essayez une photo plus nette.");
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
        <Link
          to="/admin/users"
          className="p-2 bg-white dark:bg-[#242021] rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? "Modifier Utilisateur" : "Nouvel Utilisateur"}
          </h1>
        </div>
      </div>

      <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="pl-10 w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="pl-10 w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Téléphone
              </label>
              <div className="flex gap-2">
                <div className="w-24 relative">
                  <input
                    type="text"
                    value={phoneData.code}
                    onChange={(e) =>
                      setPhoneData({ ...phoneData, code: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-center outline-none"
                    placeholder="+226"
                  />
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneData.number}
                    onChange={(e) =>
                      setPhoneData({ ...phoneData, number: e.target.value })
                    }
                    className="pl-10 w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="70 12 34 56"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEditMode
                  ? "Mot de passe (Laisser vide pour ne pas changer)"
                  : "Mot de passe"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required={!isEditMode}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pl-10 w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rôle
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="pl-10 w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="MANAGER">Manager (produits / commandes / livraison)</option>
                  <option value="DELIVERY_AGENT">Livreur</option>
                  {canAssignSensitiveRoles && (
                    <option value="SUPER_ADMIN">Super admin (accès total)</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {isDriver && (
            <div className="space-y-4 pt-2">
              {isEditMode && (
                <div
                  className={`p-3 rounded-xl border ${
                    supabaseStatus?.provisioned
                      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-200"
                      : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-200"
                  }`}
                >
                  <div className="font-semibold">
                    Supabase Auth :{" "}
                    {supabaseStatus?.provisioned ? "provisionné" : "non provisionné"}
                  </div>
                  {supabaseStatus?.authUserId && (
                    <div className="text-xs opacity-80 mt-1">
                      auth_user_id: {supabaseStatus.authUserId}
                    </div>
                  )}
                  {!supabaseStatus?.provisioned && (
                    <div className="text-xs opacity-80 mt-1">
                      Astuce: ré-enregistrez le mot de passe et sauvegardez pour relancer le provisionnement.
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <div className="font-semibold text-gray-800 dark:text-white mb-2">
                  CNIB (OCR) — préremplissage
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Importez une photo du recto de la CNIB puis lancez l’OCR. Vérifiez avant d’enregistrer.
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCnibImage(e.target.files?.[0] || null)}
                    className="block w-full text-sm"
                  />
                  <button
                    type="button"
                    onClick={runOcr}
                    disabled={!cnibImage || ocrBusy}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-[#1c191a] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white disabled:opacity-60"
                  >
                    {ocrBusy ? "OCR..." : "Lire CNIB (OCR)"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom (CNIB)
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prénoms (CNIB)
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    N° identifiant national
                  </label>
                  <input
                    type="text"
                    value={formData.cnibNationalId}
                    onChange={(e) => setFormData({ ...formData, cnibNationalId: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    N° série carte
                  </label>
                  <input
                    type="text"
                    value={formData.cnibSerial}
                    onChange={(e) => setFormData({ ...formData, cnibSerial: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Né(e) le
                  </label>
                  <input
                    type="text"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                    placeholder="JJ/MM/AAAA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lieu de naissance
                  </label>
                  <input
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sexe
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  >
                    <option value="">—</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Délivrée le
                  </label>
                  <input
                    type="text"
                    value={formData.cnibIssueDate}
                    onChange={(e) => setFormData({ ...formData, cnibIssueDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                    placeholder="JJ/MM/AAAA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expire le
                  </label>
                  <input
                    type="text"
                    value={formData.cnibExpiryDate}
                    onChange={(e) => setFormData({ ...formData, cnibExpiryDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white"
                    placeholder="JJ/MM/AAAA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Texte OCR brut (debug)
                </label>
                <textarea
                  value={formData.cnibOcrText}
                  onChange={(e) => setFormData({ ...formData, cnibOcrText: e.target.value })}
                  rows={4}
                  className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
              className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label
              htmlFor="active"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Compte Actif
            </label>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2 disabled:opacity-70"
            >
              <Save className="h-5 w-5" />
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUserForm;
