import data from "./pokemon.json";

// Add a language here (and regenerate pokemon.json) to support it everywhere
// `names`/`formNames` are read - no other type changes needed.
export type Language = "en" | "de";

export const LANGUAGES: Language[] = ["en", "de"];

// Used wherever a language isn't picked yet (e.g. no toggle wired up). Swap
// this for a piece of UI state once a language toggle exists.
export const DEFAULT_LANGUAGE: Language = "de";

export type Pokemon = {
    id: number;
    // Internal slug (e.g. "charizard-mega-x") - stable across languages, used
    // for lookups/back-compat. Not meant for display.
    name: string;
    url: string;
    // Species-level localized name, shared by every form of this pokemon
    // (e.g. both "charizard" and "charizard-mega-x" have names.en "Charizard").
    names: Record<Language, string>;
    // Exact translated form label (e.g. "Mega Charizard X"). Only set for
    // non-default forms - use for a hover/tooltip, keep `names` as the
    // primary displayed name.
    formNames?: Partial<Record<Language, string>>;
};

export const POKEMON = data as Pokemon[];

// Species name in the given language, falling back to English if missing.
export function pokemonName(p: Pokemon, lang: Language): string {
    return p.names[lang] ?? p.names.en;
}

// Exact form label in the given language (e.g. "Mega Charizard X"), if this
// pokemon is a non-default form and a translation exists.
export function pokemonFormName(p: Pokemon, lang: Language): string | undefined {
    return p.formNames?.[lang] ?? p.formNames?.en;
}
