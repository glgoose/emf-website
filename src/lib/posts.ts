import { getCollection } from "astro:content";

/** Alle posts, behalve concepten — tenzij de build concepten toont (SHOW_DRAFTS=true). */
export async function getPosts() {
  const showDrafts = process.env.SHOW_DRAFTS === "true";
  const posts = await getCollection("posts");
  return showDrafts ? posts : posts.filter(post => !post.data.draft);
}
