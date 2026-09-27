import { getCollection, type CollectionEntry } from "astro:content";
import { defaultLocale, type Locale } from "../i18n/config";
import { typeSlugFor } from "./newsTypes";
import { localeFromId, postHref } from "./postRoutes";

export type Post = CollectionEntry<"posts">;

/** Eén taalversie van een werk, zoals de hreflang-links en het taalaanbod ze nodig hebben. */
export interface PostVersion {
  locale: Locale;
  href: string;
  post: Post;
  isOriginal: boolean;
}

const showDrafts = () => process.env.SHOW_DRAFTS === "true";
const isVisible = (post: Post) => showDrafts() || !post.data.draft;

/**
 * Regels over meerdere bestanden heen, die het zod-schema niet kan zien.
 * Gooit bij de eerste build-aanroep, zodat een fout nooit stil een pagina weglaat.
 */
function validate(posts: Post[]): void {
  const byId = new Map(posts.map(post => [post.id, post]));
  const seen = new Map<string, string>();

  for (const post of posts) {
    const where = `src/content/posts/${post.id}.md`;
    const folderLocale = localeFromId(post.id);
    if (post.data.lang !== folderLocale) {
      throw new Error(
        `${where}: lang is "${post.data.lang}", maar het bestand staat in de map voor "${folderLocale}". ` +
        `Standaardtaal (${defaultLocale}) staat direct in src/content/posts/, andere talen in src/content/posts/<lang>/.`,
      );
    }
    if (post.id.startsWith(`${defaultLocale}/`)) {
      throw new Error(`${where}: ${defaultLocale}-posts staan direct in src/content/posts/, zonder taalmap.`);
    }
    if (!typeSlugFor(post.data.type, post.data.lang)) {
      throw new Error(
        `${where}: type "${post.data.type}" heeft geen URL-woord voor "${post.data.lang}" in src/lib/newsTypes.ts.`,
      );
    }

    const originalId = post.data.translation_of;
    if (!originalId) continue;

    const original = byId.get(originalId);
    if (!original) {
      throw new Error(`${where}: translation_of "${originalId}" bestaat niet (verwacht een id zoals "anton-jager-mandel-zoete-wraak").`);
    }
    if (original.data.translation_of) {
      throw new Error(`${where}: translation_of wijst naar "${originalId}", dat zelf een vertaling is. Wijs naar het origineel.`);
    }
    if (original.data.lang === post.data.lang) {
      throw new Error(`${where}: vertaling en origineel hebben dezelfde taal (${post.data.lang}).`);
    }
    if (original.data.type !== post.data.type) {
      throw new Error(`${where}: type "${post.data.type}" verschilt van het origineel ("${original.data.type}").`);
    }
    if (!post.data.draft && original.data.draft) {
      throw new Error(`${where}: gepubliceerde vertaling van een concept ("${originalId}"). Zet draft: true of publiceer het origineel.`);
    }
    const key = `${originalId}|${post.data.lang}`;
    const duplicate = seen.get(key);
    if (duplicate) {
      throw new Error(`${where}: "${duplicate}" is al de ${post.data.lang}-vertaling van "${originalId}".`);
    }
    seen.set(key, post.id);
  }
}

let cache: Promise<Post[]> | undefined;

/** Alle zichtbare posts in alle talen (concepten alleen met SHOW_DRAFTS=true). Voor routes. */
export function getAllPosts(): Promise<Post[]> {
  cache ??= getCollection("posts").then(posts => {
    validate(posts);
    return posts.filter(isVisible);
  });
  return cache;
}

/** Posts in één taal, voor `getStaticPaths` van die taal. */
export async function getPostsInLocale(locale: Locale): Promise<Post[]> {
  return (await getAllPosts()).filter(post => post.data.lang === locale);
}

/**
 * Posts voor overzichten in `locale` (nieuws, type-overzichten, homepage,
 * activiteitpagina's): één item per werk, de versie in `locale` als die er is,
 * anders het origineel. Zo verschijnt een Engels origineel zonder Nederlandse
 * vertaling toch in de Nederlandse overzichten, met een link naar /en/….
 */
export async function getListedPosts(locale: Locale = defaultLocale): Promise<Post[]> {
  const all = await getAllPosts();
  const workId = (post: Post) => post.data.translation_of ?? post.id;
  const byWork = new Map<string, Post[]>();
  for (const post of all) {
    const group = byWork.get(workId(post)) ?? [];
    group.push(post);
    byWork.set(workId(post), group);
  }
  return [...byWork.values()].flatMap(group => {
    const chosen = group.find(post => post.data.lang === locale) ?? group.find(post => !post.data.translation_of);
    return chosen ? [chosen] : [];
  });
}

/** Alle zichtbare taalversies van hetzelfde werk als `post`, origineel eerst. */
export async function getVersions(post: Post): Promise<PostVersion[]> {
  const all = await getAllPosts();
  const originalId = post.data.translation_of ?? post.id;
  return all
    .filter(candidate => candidate.id === originalId || candidate.data.translation_of === originalId)
    .map(candidate => ({
      locale: candidate.data.lang,
      href: postHref(candidate),
      post: candidate,
      isOriginal: !candidate.data.translation_of,
    }))
    .sort((a, b) => Number(b.isOriginal) - Number(a.isOriginal));
}
