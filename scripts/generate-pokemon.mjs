#!/usr/bin/env node
// Regenerates app/lib/pokemon.json from PokeAPI's raw CSV data dump.
//
// Rather than crawling /api/v2/pokemon/{id}, /pokemon-species/{id}, and
// /pokemon-form/{id} for every one of ~1300 pokemon (rate-limited, slow),
// this pulls a handful of small CSV files straight from the PokeAPI GitHub
// repo - the same tables that generate the live REST API - and joins them
// locally. Five small downloads instead of ~1300+ HTTP requests.
//
// Tables used (data/v2/csv/ in PokeAPI/pokeapi):
//   - languages.csv:              identifier -> language id (find each of LANGUAGES)
//   - pokemon.csv:                id, identifier (slug), species_id, is_default
//   - pokemon_species_names.csv:  species-level localized name (shared by all
//                                  forms of a species, e.g. "Charizard"/"Glurak")
//   - pokemon_forms.csv:          maps a pokemon id -> its form id
//   - pokemon_form_names.csv:     form-level localized full name (e.g.
//                                  "Mega Charizard X"), only for non-default forms
//
// Usage: node scripts/generate-pokemon.mjs
//
// To add another language: add its PokeAPI language `identifier` (e.g. "fr",
// "es", "ja") to LANGUAGES below and rerun. app/lib/pokemon.ts's `Language`
// type/LANGUAGES list must be updated to match by hand.

import {writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const CSV_BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const LANGUAGES = ["en", "de"];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "..", "app", "lib", "pokemon.json");

async function fetchCsv(name) {
    const res = await fetch(CSV_BASE + name);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${name}`);
    return parseCsv(await res.text());
}

// Minimal RFC4180 CSV parser: handles quoted fields, escaped quotes ("")
// within quotes, and commas/newlines inside quoted fields.
function parseCsv(text) {
    const rows = [];
    let field = "", row = [], inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ",") {
            row.push(field);
            field = "";
        } else if (c === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (c !== "\r") {
            field += c;
        }
    }
    if (field.length || row.length) {
        row.push(field);
        rows.push(row);
    }
    if (rows.length === 0) return [];
    const header = rows[0];
    return rows.slice(1)
        .filter(r => !(r.length === 1 && r[0] === ""))
        .map(r => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}

function requireColumns(rows, file, columns) {
    if (rows.length === 0) throw new Error(`${file} came back empty`);
    const have = new Set(Object.keys(rows[0]));
    const missing = columns.filter(c => !have.has(c));
    if (missing.length) {
        throw new Error(`${file} is missing expected column(s) ${missing.join(", ")}. ` +
            `Found: ${[...have].join(", ")}. PokeAPI's CSV schema may have changed.`);
    }
}

function titleCaseSlug(slug) {
    return slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

async function main() {
    console.log("Downloading CSV tables...");
    const [languages, pokemon, speciesNames, forms, formNames] = await Promise.all([
        fetchCsv("languages.csv"),
        fetchCsv("pokemon.csv"),
        fetchCsv("pokemon_species_names.csv"),
        fetchCsv("pokemon_forms.csv"),
        fetchCsv("pokemon_form_names.csv"),
    ]);

    requireColumns(languages, "languages.csv", ["id", "identifier"]);
    requireColumns(pokemon, "pokemon.csv", ["id", "identifier", "species_id", "is_default"]);
    requireColumns(speciesNames, "pokemon_species_names.csv", ["pokemon_species_id", "local_language_id", "name"]);
    requireColumns(forms, "pokemon_forms.csv", ["id", "pokemon_id"]);
    requireColumns(formNames, "pokemon_form_names.csv", ["pokemon_form_id", "local_language_id", "pokemon_name"]);

    // language identifier (e.g. "en") -> csv language id
    const languageIds = new Map();
    for (const lang of LANGUAGES) {
        const row = languages.find(l => l.identifier === lang);
        if (!row) throw new Error(`Could not find language '${lang}' in languages.csv`);
        languageIds.set(lang, row.id);
    }

    // lang -> (species_id -> localized name)
    const speciesNameByLang = new Map(LANGUAGES.map(lang => [lang, new Map()]));
    for (const row of speciesNames) {
        for (const lang of LANGUAGES) {
            if (row.local_language_id === languageIds.get(lang)) {
                speciesNameByLang.get(lang).set(row.pokemon_species_id, row.name);
            }
        }
    }

    // pokemon_id -> form id (a pokemon has exactly one form row describing it)
    const formIdByPokemonId = new Map();
    for (const row of forms) {
        if (!formIdByPokemonId.has(row.pokemon_id)) formIdByPokemonId.set(row.pokemon_id, row.id);
    }

    // lang -> (form id -> localized full form name, e.g. "Mega Charizard X")
    const formNameByLang = new Map(LANGUAGES.map(lang => [lang, new Map()]));
    for (const row of formNames) {
        for (const lang of LANGUAGES) {
            if (row.local_language_id === languageIds.get(lang)) {
                formNameByLang.get(lang).set(row.pokemon_form_id, row.pokemon_name);
            }
        }
    }

    const results = pokemon.map(row => {
        const id = Number(row.id);
        const name = row.identifier;
        const names = Object.fromEntries(
            LANGUAGES.map(lang => [lang, speciesNameByLang.get(lang).get(row.species_id) ?? name])
        );

        let formNamesEntry;
        if (row.is_default === "0") {
            const formId = formIdByPokemonId.get(row.id);
            const fallback = titleCaseSlug(name);
            const formNamesObj = Object.fromEntries(
                LANGUAGES.map(lang => [lang, (formId && formNameByLang.get(lang).get(formId)) || fallback])
            );
            formNamesEntry = formNamesObj;
        }

        return {
            id,
            name,
            url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
            names,
            ...(formNamesEntry ? {formNames: formNamesEntry} : {}),
        };
    });

    results.sort((a, b) => a.id - b.id);

    await writeFile(OUT_FILE, JSON.stringify(results, null, 2) + "\n");
    console.log(`Wrote ${results.length} pokemon to ${OUT_FILE}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
