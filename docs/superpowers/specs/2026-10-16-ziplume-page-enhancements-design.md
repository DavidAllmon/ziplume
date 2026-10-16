# Ziplume hosted-page enhancements

**Requested by David on 2026-10-16.** He asked for every enhancement on the list, in the five releases below. Each release gets its own plan for David to review, then ships live before the next one starts.

## 1. Why

- **Ziplume is completely free,** so large uploads can't be allowed. Video uploads go, and PDF and audio files get size caps.
- **A pasted Video description was cut off with no warning.** Every text box stops at a fixed length and doesn't show it.
- **Pages should offer more,** for example a photo per menu dish, or a choice of how social icons look.

## 2. Decisions David made

| Topic | Decision |
| --- | --- |
| Scope | All 55 enhancements, items 1–55 below |
| Order | 1 fixes and every page; 2 Link list, Contact page, Business; 3 Menu, Coupon, Event; 4 Feedback, PDF, Images, Video, Audio, App; 5 things visitors send back |
| Video | Links only, with no uploads |
| Caps | PDF files up to 10 MB, audio files up to 15 MB |
| The one live uploaded-video page | David's own "Sample: Video". It holds no real file, and shows the link box once uploads are gone. |

## 3. Rules for every release

- **Old pages keep working.**
  - Every new field is optional and has a default.
  - `sanitizePage` fills in what an older page doesn't have, so its look and content stay exactly as they were.
  - The API accepts the new fields, and its docs list them.
- **Storage.**
  - Every new image is resized in the browser before upload: a thumbnail to 256 px, a gallery photo to 1600 px, as each item says.
  - Each kind of file has a cap, checked in the app and, for the overall limit, by the storage bucket.
- **Previews.** The editor's live preview shows each new part. Anything a visitor would tap, such as forms and buttons, stays inert in the preview, as it does today.
- **Accessibility and phones.**
  - New controls follow the editor's rules: visible labels, 44 px targets on phones, no sideways page scroll from 320 px up, and axe clean in light and dark.
  - New page parts use the page's look variables, so the readability guard covers them.
- **Limits are visible.** Every new text box follows item 2.
- **Tests.** Every new field gets:
  - a sanitize test (defaults, bad input, old pages);
  - a validation test where the field has rules;
  - an editor test;
  - a renderer test.
  - Each release adds browser tests for its main flows and puts its new pages into the axe and phone sweep.

## 4. Release 1: fixes, and every page

1. **Video takes links only.**
   - The editor drops the "Video source" choice and shows the link box, for YouTube (Shorts included) and Vimeo.
   - `sanitizePage` treats any saved `source: "upload"` as a link page with no file, and the API does the same.
   - A migration takes the video types out of the `page-media` bucket's allowed types.
2. **Visible character limits.**
   - Every limited text box shows a counter, such as "245 / 1,000". Boxes of several lines show it all the time; one-line boxes show it within 20 characters of the limit.
   - Nothing is cut silently: the box's built-in hard stop goes.
   - Text over the limit stays in the box. The counter turns into an error, "Shorten by 120 characters", and Create or Save is blocked with Show me, like other errors.
   - `sanitizePage` still trims as a last line of defense, for the API.
3. **Roomier text.**
   - Every box of several lines allows at least 1,000 characters. That covers the Video, PDF, Images, Audio and App descriptions, the Menu and Coupon descriptions, the Menu note, the Contact page's About, and the Feedback thank-you message.
   - Two stay short on purpose: the Link list bio at 300, and a dish description at 300.
   - The Business About, Event description and Coupon terms stay at 2,000.
4. **File caps.**
   - PDF files up to 10 MB and audio files up to 15 MB. Images are accepted up to 15 MB and resized as today.
   - The error names the cap, for example "PDFs can be up to 10 MB."
   - Files already saved keep working.
   - The same migration lowers the bucket's size limit from 50 MB to 15 MB.
54. **Clickable links in text.**
    - Web addresses (`https://…`, `www.…`) and email addresses in descriptions, About, notes and terms become links.
    - Links open in a new tab with `rel="noopener noreferrer nofollow ugc"`.
55. **Share button on every page.**
    - A small round button in the page's top corner.
    - On phones it opens the share sheet (`navigator.share`). Elsewhere it copies the link and says "Link copied".
    - It's labeled "Share this page", and stays inert in previews.

## 5. Release 2: Link list, Contact page, Business

**Link list**

5. **Social icon styles,** set in the Look tab's Social icons card and also used on the Contact and Business pages.
   - Style: Outline (today), Filled, Plain icon or Brand colors.
   - Size: Small, Medium or Large.
   - Brand colors draw the network's own color behind a white icon. Every style keeps a 44 px tap target.
6. **An image or icon on each link.**
   - A link to a known site gets that site's icon automatically.
   - The owner can upload an image instead (resized to 256 px) or turn the icon off.
7. **Section headers.** "Add header" adds a text-only row between links, such as "Shop" or "Listen". Headers sort with the links.
8. **Featured link.** One link can be marked Featured: it's drawn taller and in the accent color. No animation, so nothing distracts.
9. **Scheduled links.**
   - A link can show only from a date and time, until one, or both.
   - The times use the owner's time zone, saved with the link.
   - Scheduled links show a "Scheduled" badge in the editor and appear on the page only inside their window.
10. **Email, phone and text-message links.** A link's type can be Website, Email, Phone or Text message. Each gets the right address (`mailto:`, `tel:`, `sms:`) and its own icon.

**Contact page**

11. **Cover photo.** An optional wide image above the header (resized to 1600 px). With a cover, the header uses the Banner layout.
12. **Quick buttons** under the name: Call, Text, Email and WhatsApp.
    - They use the first phone number and first email. WhatsApp uses the first number ticked "WhatsApp".
    - Each button can be turned off.
13. **More details.**
    - Pronouns and department, up to 60 characters each.
    - Up to 4 websites with labels, replacing the single website; an old page's website becomes the first one.
    - All of these go into the saved contact card.
14. **Directions.** The address gets a Directions link that opens maps, as on Business pages.

**Business**

16. **Open now.**
    - The page shows "Open now · closes 5:00 PM", "Closes soon", or "Closed · opens 9:00 AM tomorrow".
    - It's worked out on the visitor's phone from the opening hours, in the business's time zone. The time zone is a new field, defaulting to the owner's when they first edit.
17. **Split hours and closures.**
    - Each day can have two time ranges, such as 9–12 and 1–5.
    - Up to 10 closure dates, each with an optional note ("Thanksgiving"). On a closure date the page says "Closed today" with the note.
18. **Photo gallery.** Up to 6 photos (resized to 1600 px), shown as a row you can swipe.
    - Tapping one opens a full-screen viewer, built in this release: swipe or use the arrow keys, Escape closes it, and the caption shows.
    - Menu dishes (item 21), Images (item 43) and App screenshots (item 52) reuse it.
19. **Ready-made buttons.** "Add button" offers Google review, Yelp, Book now and Order online. They fill in the label and icon; the owner adds the link.
20. **Services.** A list of up to 30, each with a name, price and short description, shown under About.

## 6. Release 3: Menu, Coupon, Event

**Menu**

21. **A photo per dish.** Optional, resized to 800 px, shown as a square thumbnail on the dish row. Tapping it opens the full-size viewer.
22. **Dietary labels.**
    - Ticks with icons: Vegan, Vegetarian, Gluten-free, Dairy-free, Spicy, Contains nuts, Halal and Kosher.
    - They replace the free-text tags. Known words in old tags become ticks, and anything else stays as a short note on the dish.
23. **Dish markers.**
    - **Sold out:** the dish is shown faded with "Sold out".
    - **Hidden:** the dish stays in the editor but not on the page.
    - **Popular:** the dish gets a badge.
24. **Price options.** Up to 4 per dish, each a label and a price, such as "Small 8 · Large 12". A dish with options shows them instead of its single price.
25. **Navigating long menus.**
    - Each section gets an optional description.
    - Menus with 3 or more sections get a jump bar at the top: section names you can tap, which scroll sideways on phones.

**Coupon**

26. **Scan at the till.** The owner chooses how the code shows: as text only (today), plus a QR code, or plus a barcode (Code 128).
27. **Countdown.**
    - From 7 days out: "Ends in 3 days", then "Ends today".
    - After the date, the page still says "This offer has ended".
28. **Discount badge.** Up to 12 characters, such as "20% OFF", shown large at the top of the coupon.

**Event**

30. **Online events and directions.**
    - An "Online event" switch adds a join link. The page shows a Join button that is active from 15 minutes before the start until the end.
    - A physical location gets a Directions link.
    - An event can be both online and at a place.
31. **Agenda.** Up to 30 rows, each a time, a title and an optional note.
32. **Hosts and speakers.** Up to 12, each with a photo (resized to 400 px), a name and a role.
34. **Countdown.**
    - Before the event: "Starts in 3 days 4 hours", updating live.
    - During it: "Happening now". After it: "This event has ended".

## 7. Release 4: Feedback, PDF, Images, Video, Audio, App

**Feedback**

35. **Review link.** The owner adds a Google review link (or another site's). After sending feedback, the thank-you screen offers "Share it on Google" to everyone; see ruling 1.
36. **Rating styles.**
    - Stars (today), faces (5), thumbs up/down, or 0–10.
    - The code page's summary adapts: an average for stars and faces, percent up for thumbs, and an NPS-style score for 0–10.
37. **Up to 3 questions,** each with its own rating style. The comment and contact boxes stay at the end.

**PDF**

39. **Several files.**
    - Up to 10 PDFs, each with a title, shown as a list with View and Download.
    - "Open the PDF straight away" still applies when there's only one file.
40. **First-page preview.** When a PDF is uploaded, the browser draws its first page as an image (800 px). The page shows that image as the file's preview.

**Images**

41. **Captions.** Up to 200 characters per image. A caption is also the image's description for screen readers, and images without one say "Image 2 of 9".
42. **Layouts.** Grid with 2 or 3 columns, one column, or a swipeable carousel with dots.
43. **Full-screen viewer.** Tapping an image opens the viewer from item 18, instead of the raw file in a new tab.
44. **A link per image.** The viewer shows an "Open link" button for an image that has one.

**Video**

45. **More sites.**
    - TikTok, Instagram, Facebook and Loom, as well as YouTube and Vimeo.
    - These four load only after a tap ("Tap to play from TikTok"), so the page stays fast and their trackers stay off until then. YouTube keeps its privacy-friendly player.
46. **Several videos.** Up to 10, each with a title, one below the other.
47. **Start time.** Each video can start at a time, such as 1:23.

**Audio**

48. **Embedded players.** Spotify, SoundCloud and Apple Music or Apple Podcasts links show those sites' own players, not just a button.
49. **"Listen on" buttons.** Up to 8 platform buttons with icons: Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud and Bandcamp.
50. **Tracklist.** Up to 10 tracks, each a title plus an uploaded file (15 MB cap) or a link. They play one at a time.

**App**

51. **Straight to the store.**
    - With "Send phones straight to their store" on, a scan from an iPhone or iPad goes to the App Store link, and Android goes to Google Play.
    - Computers, and phones without their store's link, see the page.
    - Scans are still counted.
52. **Screenshots.** Up to 5 (resized to 1200 px), shown as a row you can swipe that opens in the viewer.
53. **Features.** Up to 6 short bullets, each up to 80 characters.

## 8. Release 5: things visitors send back

These need new database tables, server functions and email.
- Each submission goes through a server function that runs as the database owner, following the feedback pattern:
  - the code must be active and inside its active dates;
  - each visitor is rate limited;
  - there's a hidden-field honeypot.
- The owner and teammates see submissions on the code page, following the teams rules, with CSV export.
- Private codes stay with their maker.

15. **Share your details back** (Contact page).
    - An optional "Share your details" button opens a short form: name, phone, email and note. Name plus a phone or email is required.
    - It's stored in `contact_shares`.
29. **One use per coupon.**
    - An optional "Mark as used" button, meant to be tapped at the till.
    - It's remembered per phone, using a visitor hash like scans, in `coupon_redemptions`. Afterwards the page says "Used on this phone".
    - The owner sees how many were used.
    - Without sign-in this is per phone, not per person; see ruling 7.
33. **RSVP** (Event).
    - An optional form: name, email, number of guests (1–10) and a note. It can have a capacity, and is full once the guest total reaches it.
    - It's stored in `event_rsvps`. The visitor sees "You're on the list".
38. **Email me new responses.**
    - A switch per code: "Email me new responses". It covers feedback, shared details and RSVPs.
    - It sends through Brevo, as invites do: at most one email per response and 50 per account per day.
    - Each email has a link that turns it off.

## 9. Data and server changes

| Release | Migration |
| --- | --- |
| 1 | `page-media`: drop the video types and set `file_size_limit` to 15 MB |
| 2–3 | None. Everything is new page content in `qr_codes.content`. |
| 4 | `feedback_responses` gains `answers jsonb`, and `record_feedback` accepts several answers and rating styles. The old one-rating form keeps working. |
| 5 | `contact_shares`, `coupon_redemptions` and `event_rsvps`, with RLS by code owner and team. Their record functions. A per-code `notify_responses` flag and an email log for the daily cap. |

Every migration follows the usual steps:
- a verified backup from the last 24 hours, after checking the disk has room;
- no backslashes;
- applied through the private SQL bridge before merging;
- recorded in the runbook.

## 10. Rulings for David to check

1. **The review link shows to everyone, not only happy customers.** Google's rules ban asking only satisfied customers for reviews ("review gating"). Doing it risks the business's listing.
2. **No total storage cap per account yet.** Per-file caps and resizing keep pages small; today every page's files add up to 26 MB. Say if you want a total, such as 250 MB per account, shown in Settings.
3. **Larger files already saved keep working.** The caps only apply to new uploads.
4. **The four extra video sites load after a tap,** to keep pages fast and avoid loading their tracking on every visit.
5. **The Link list bio stays at 300 characters,** because it's a short line under your name. Longer text goes in links.
6. **"Open now" is worked out on the visitor's phone,** so it's always current without a server.
7. **"One use per coupon" is per phone.** There's no visitor sign-in, so it stops casual reuse, not someone determined.
8. **Dietary labels replace free-text tags.** Old tags that match a label become ticks, and the rest stay as a short note.

## 11. Out of scope

- Paid plans and storage quotas, except ruling 2 if David wants it.
- Visitor accounts or sign-in.
- Payments, ordering and bookings: the buttons link out to the owner's own tools.
- Uploading video, in any form.
