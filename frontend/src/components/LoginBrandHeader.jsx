import { BRAND_NAME, BRAND_LOGO_SRC } from "../config/branding";

export default function LoginBrandHeader({ subtitle }) {
  return (
    <div className="text-center mb-6 sm:mb-8">
      <img
        src={BRAND_LOGO_SRC}
        alt={BRAND_NAME}
        className="h-16 w-16 object-contain mx-auto mb-3 rounded-2xl shadow-md ring-1 ring-black/5"
      />
      <h1
        translate="no"
        className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-1 font-brand-serif tracking-tight"
      >
        {BRAND_NAME}
      </h1>
      {subtitle ? (
        <p className="text-gray-600 dark:text-gray-400 text-sm">{subtitle}</p>
      ) : null}
    </div>
  );
}
