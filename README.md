# The Sacred Garden — live wedding invitation (Just For You)

- `index.html` — the invitation guests open (envelope intro → hero → countdown → schedule → location + map → dress code & gifts → RSVP → closing). Fills itself from `assets/sample-data.js` or from `#data=` in the link.
- `edit.html` — form editor with live phone preview. "Create my invitation" packs all details into the link (`#data=`, deflate + base64url, see `assets/jfy-codec.js`), with Copy / WhatsApp / Share buttons. Drafts are kept in localStorage.
- Empty optional fields are hidden automatically. RSVP form opens WhatsApp with the guest's reply.
- Artwork: original illustrations made for Just For You. Fonts: Beau Rivage, Imperial Script, Ovo, Cinzel, Gilda Display, Amiri, Source Sans 3 (SIL Open Font License).
- Music: "Gymnopedie No. 1" (Erik Satie) performed by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
