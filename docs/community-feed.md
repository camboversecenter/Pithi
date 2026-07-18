# Community Feed

Route: `/community` · All logged-in roles · File: `pages/SocialFeed.tsx` plus
social functions in `services/dataService.ts`.

The Community feed (`សហគមន៍`) is a knowledge-sharing board where users post
experiences and questions, react, bookmark, and comment.

## Posts

- **Create** (`ចែករំលែក` → modal): title + content (Markdown), with a live word
  counter capped at **600 words**. On submit, the post is run through **AI
  moderation** (`moderateSocialPost`) for spam, rudeness, hate speech, and
  illegal content; if rejected, the AI's Khmer reason is shown and the post is not
  published. On pass, `createSocialPost` stores it.
- **List** — paginated 10/page, with search and a **Saved** toggle to show only
  bookmarked posts. Each card shows author, colored role badge, timestamp,
  title, content, reactions, bookmark count, and the comment section.

## Reactions

Three mutually-exclusive reactions, each with a running count:

| Reaction | Khmer | Meaning |
|----------|-------|---------|
| LIKE | ចូលចិត្ត | Like |
| USEFUL | មានប្រយោជន៍ | Useful |
| FAKE | មិនពិត | Flag as fake/false |

`reactToPost` enforces one reaction per user per post — selecting a new reaction
removes any previous one. Counts are maintained atomically server-side via the
`increment_post_stat` / `decrement_post_stat` Postgres functions.

## Bookmarks

`bookmarkPost` toggles a saved post and adjusts `bookmarksCount` (also via the
atomic stat functions). The **Saved** filter surfaces bookmarked posts.

## Comments (gated)

Comments on a post are **locked until the post has more than 100 "Useful"
reactions**. While locked, the UI shows a progress bar toward the threshold.
Once unlocked, comments load on demand (`getPostComments`) and can be added with
`addPostComment`.

> Implementation note: the code gate is `post.useful > 100`
> (`SocialFeed.tsx`), while the on-screen copy and the User Guide describe it as
> "100 Useful." In practice the 101st Useful unlocks comments.

## Moderation & lifecycle

- **AI moderation** runs *before* publish (see above). If the AI service is
  unavailable, moderation defaults to *allowed* so posting still works offline.
- **Automatic cleanup** (admin-triggered, see [admin-dashboard.md](admin-dashboard.md)):
  posts with ≥ 300 `fakes`, and low-engagement posts older than a year, are
  deleted by `runCleanup`.

## Related functions

Data: `getSocialPosts`, `createSocialPost`, `reactToPost`, `bookmarkPost`,
`getPostComments`, `addPostComment`. AI: `moderateSocialPost`.
</content>
