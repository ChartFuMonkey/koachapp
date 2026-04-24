// lib/translate-error.ts
//
// Small helper used by client components to map an error code returned
// by a server action into a localized, user-visible toast message.
//
// Server actions return `{ error: "errorCode" as const }` — callers
// then do `toast.error(translateError(res.error, tNamespace, tCommon))`.
//
// `tNamespace` is the useTranslations() hook instance scoped to the
// feature's `.errors` messages (e.g. useTranslations("coach.meals.errors")).
// `tCommon` is useTranslations("errors") — used for shared codes like
// "unauthenticated".

type Translator = (key: string) => string;

export function translateError(
  code: string | undefined,
  tNamespace: Translator,
  tCommon: Translator
): string {
  if (!code) {
    try {
      return tCommon("unexpectedError");
    } catch {
      return "Error";
    }
  }
  if (code === "unauthenticated") {
    try {
      return tCommon("unauthenticated");
    } catch {
      return code;
    }
  }
  try {
    return tNamespace(code);
  } catch {
    // Last-resort fallback — raw code is better than a render crash.
    return code;
  }
}
