const STORAGE_KEY = "vault_lang";

export function getSavedLanguage(): string {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(STORAGE_KEY) ?? "en";
}

export function setLanguage(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, code);

  // Trigger Google Translate if loaded
  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (select) {
    select.value = code;
    select.dispatchEvent(new Event("change"));
  } else {
    // Fallback: reload with lang param
    const url = new URL(window.location.href);
    url.searchParams.set("hl", code);
    window.location.href = url.toString();
  }
}
