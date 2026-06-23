function openViaFormTargetBlank(url) {
  const form = document.createElement("form");
  form.method = "GET";
  form.action = url;
  form.target = "_blank";
  form.style.display = "none";
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

function openViaAnchorTargetBlank(url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Ouvre WhatsApp dans un nouvel onglet/fenêtre, puis renvoie la page courante vers la vitrine.
 * @param {string} whatsappLink
 * @param {string} homeUrl
 * @param {Window|null} preOpenedPopup fenêtre pré-ouverte (about:blank) pour éviter le blocage popup
 */
export function openWhatsAppNewTabAndGoHome(whatsappLink, homeUrl, preOpenedPopup = null) {
  if (!whatsappLink || typeof window === "undefined") {
    return;
  }

  let opened = preOpenedPopup;

  if (opened && !opened.closed) {
    try {
      opened.location.href = whatsappLink;
      opened.focus();
    } catch {
      opened = null;
    }
  }

  if (!opened || opened.closed) {
    try {
      opened = window.open(whatsappLink, "_blank", "noopener,noreferrer");
    } catch {
      opened = null;
    }
  }

  if (!opened || opened.closed) {
    try {
      openViaFormTargetBlank(whatsappLink);
    } catch {
      openViaAnchorTargetBlank(whatsappLink);
    }
  }

  if (homeUrl) {
    window.setTimeout(() => {
      window.location.replace(homeUrl);
    }, 900);
  }
}
