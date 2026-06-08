/**
 * Extrait l'URL d'image directe (liens proxy Startpage, Google Images, Drive…).
 */
export function unwrapImageProxyUrl(url) {
  if (url == null || String(url).trim() === "") {
    return "";
  }
  let u = String(url).trim();

  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("startpage.com") && parsed.pathname.includes("proxy-image")) {
      const piurl = parsed.searchParams.get("piurl");
      if (piurl) return decodeURIComponent(piurl);
    }

    if (host.includes("duckduckgo.com")) {
      const direct = parsed.searchParams.get("u");
      if (direct) return direct;
    }

    if (host.includes("google.") && !host.includes("drive.google.com")) {
      const imgurl = parsed.searchParams.get("imgurl") || parsed.searchParams.get("url");
      if (imgurl) return decodeURIComponent(imgurl);
    }

    if (host.includes("drive.google.com")) {
      const fileMatch = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
      }
      const id = parsed.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }
  } catch {
    /* URL relative ou invalide */
  }

  return u;
}

/**
 * URL affichable pour l'image principale d'un produit (upload local ou lien externe).
 */
export function resolveProductImageUrl(url) {
  if (url == null || String(url).trim() === "") {
    return "";
  }
  let u = unwrapImageProxyUrl(String(url).trim());

  if (
    (u.startsWith("http://127.0.0.1") || u.startsWith("http://localhost")) &&
    u.includes("/uploads/")
  ) {
    const i = u.indexOf("/uploads/");
    return u.substring(i);
  }

  if (u.startsWith("//")) {
    return `https:${u}`;
  }

  if (!/^https?:\/\//i.test(u) && !u.startsWith("data:") && /^[\w.-]+\.[a-z]{2,}/i.test(u)) {
    return `https://${u}`;
  }

  if (!u.startsWith("http://") && !u.startsWith("https://") && !u.startsWith("data:")) {
    if (!u.startsWith("/")) {
      u = `/${u}`;
    }
    return u;
  }

  return u;
}

/** @param {object | null | undefined} product */
export function getProductMainImageSrc(product) {
  const raw =
    product?.mainImage ?? product?.imageUrl ?? product?.main_image ?? product?.image_url ?? "";
  return resolveProductImageUrl(raw);
}

/** @param {string[] | null | undefined} urls */
export function resolveProductImageList(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.map(resolveProductImageUrl).filter(Boolean);
}

/** Indique si l'URL ressemble à un proxy (à éviter à la saisie). */
export function isLikelyImageProxyUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("startpage.com/av/proxy-image") ||
    lower.includes("google.com/imgres") ||
    (lower.includes("google.") && lower.includes("imgurl="))
  );
}
