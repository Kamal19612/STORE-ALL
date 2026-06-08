const reDate = /\b(\d{2}\/\d{2}\/\d{4})\b/g;

function normalize(raw) {
  return String(raw || "")
    .replaceAll("\r", "\n")
    .replaceAll(/\u00A0/g, " ")
    .replaceAll(/ +/g, " ")
    .trim();
}

function clean(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t.slice(0, 200) : null;
}

function extractAllDates(text) {
  const out = [];
  const m = text.matchAll(reDate);
  for (const x of m) out.push(x[1]);
  return out;
}

function extractNationalId(text) {
  const compact = text.replaceAll(/\s/g, "");
  const m1 = compact.match(/(\d{15,20})/);
  if (m1) return m1[1];
  const m2 = text.match(/\b(\d{15,20})\b/);
  return m2 ? m2[1] : null;
}

function extractCardSerial(text) {
  const m = text.toUpperCase().match(/\b([A-Z]\d{6,12})\b/);
  return m ? m[1] : null;
}

function extractBirthDate(text) {
  const m = text.match(/N[ée]\s*\(?e\)?\s*le\s*[:.]?\s*(\d{2}\/\d{2}\/\d{4})/i);
  return m ? m[1] : null;
}

function extractGender(text) {
  const m = text.match(/Sexe\s*[:.]?\s*([MF])\b/i);
  return m ? m[1].toUpperCase() : null;
}

function extractProfession(text) {
  const m = text.match(/Profession\s*[:.]?\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function extractNom(lines, fullText) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toUpperCase() === "NOM" && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next && next.length < 80) return next;
    }
  }
  const m = fullText.match(/(?:^|\n)\s*NOM\s*[:.]?\s*([^\n]+?)(?=\n|PR[ÉE]NOM|Pr[ée]nom|\Z)/i);
  return m ? m[1].trim() : null;
}

function extractPrenoms(lines, fullText) {
  for (let i = 0; i < lines.length; i++) {
    const u = lines[i].trim().toUpperCase();
    if ((u === "PRÉNOMS" || u === "PRENOMS" || u === "PRÉNOM" || u === "PRENOM") && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next && next.length < 120) return next;
    }
  }
  const m = fullText.match(/PR[ÉE]NOMS?\s*[:.]?\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function dateNearKeyword(lines, keywordRe) {
  for (const line of lines) {
    if (!keywordRe.test(line)) continue;
    const m = line.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (m) return m[1];
  }
  return null;
}

export function parseBurkinaCnib(raw) {
  const text = normalize(raw);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const nationalId = extractNationalId(text);
  const cardSerial = extractCardSerial(text);
  const birthDate = extractBirthDate(text);
  const gender = extractGender(text);
  const profession = extractProfession(text);
  const lastName = extractNom(lines, text);
  const firstNames = extractPrenoms(lines, text);

  const issueDate =
    dateNearKeyword(lines, /delivr/i) ||
    dateNearKeyword(lines, /délivr/i) ||
    null;
  const expiryDate = dateNearKeyword(lines, /expir/i) || null;

  // Birth place best-effort: "Né(e) le ... A/À <place>"
  let birthPlace = null;
  for (const line of lines) {
    if (!/N[ée]/i.test(line)) continue;
    if (!/\d{2}\/\d{2}\/\d{4}/.test(line)) continue;
    const m = line.match(
      /N[ée]\s*\(?e\)?\s*le\s*[:.]?\s*\d{2}\/\d{2}\/\d{4}\s+(?:À|A)\s+(.+?)(?=\s+(?:Sexe|SEXE|Taille|Profession)|$)/i,
    );
    if (m) {
      birthPlace = m[1].trim();
      break;
    }
  }

  return {
    lastName: clean(lastName),
    firstNames: clean(firstNames),
    nationalIdNumber: clean(nationalId),
    cardSerial: clean(cardSerial),
    birthDate: clean(birthDate),
    birthPlace: clean(birthPlace),
    gender: clean(gender),
    profession: clean(profession),
    issueDate: clean(issueDate),
    expiryDate: clean(expiryDate),
    rawText: text,
    allDates: extractAllDates(text),
  };
}

