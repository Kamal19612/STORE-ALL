import { getSelectableVitrineTemplates, VITRINE_TEMPLATE_DEFAULT } from "../../config/vitrineTemplates";

/**
 * Sélecteur de modèle de vitrine (super-admin).
 */
export default function VitrineTemplateSelect({ value, onChange, className = "", disabled = false }) {
  const options = getSelectableVitrineTemplates();
  const current = value || VITRINE_TEMPLATE_DEFAULT;

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      {options.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
