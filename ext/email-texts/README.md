# German email texts

`email-texts.de.json` holds the German texts of the automatic emails: each key of Console's
**Content → Email texts** with `.de` at the end, e.g. `"BookingAcceptedRequest.Title.de"`.

The email templates use them for recipients whose "Preferred language" (private data
`language`) is `de`:

    {{t (concat "KEY." @root.recipient.private-data.language) (t "KEY" "English default" ...) ...}}

When a German key is missing, the email falls back to the English key, then to the English
default of the template. English texts stay as they are.

To change a German text, edit it here and in Console (dev and live): Console's Email texts editor
is the one that counts; paste these keys at the end of its JSON.
