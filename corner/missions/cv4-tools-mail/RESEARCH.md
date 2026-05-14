# CV4 Tools → Mail — Research

## Gmail API references

- **users.messages.list** — `GET https://gmail.googleapis.com/gmail/v1/users/me/messages` — `q` parameter accepts Gmail search syntax. We use `q=newer_than:1d -from:me -category:promotions -category:social -category:updates -category:forums -label:list -label:notifications`. Cost: ~5 quota units.
- **users.messages.get** — `format=metadata&metadataHeaders=From,Subject,Date,List-Unsubscribe,Auto-Submitted,Precedence` for the list view; `format=full` only when the user clicks an email.
- **users.history.list** — `GET https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=<X>` — returns deltas since X. We use this for the polling refresh: ~1 quota unit, no body needed.
- **users.messages.send** — `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send` body is a raw RFC 822 message base64url-encoded.
- **users.settings.sendAs.list** — `GET https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs` — for the user's signature(s). We use the entry where `isDefault === true`.

## Real-human filter

Headers we look at on each `messages.get` (metadata format):

- `Precedence: bulk` → skip
- `List-Unsubscribe` present → skip
- `Auto-Submitted` is anything other than `no` → skip
- `From` matches `noreply|no-reply|notifications|mailer-daemon|automated|donotreply` → skip

We also skip the Gmail categories `CATEGORY_PROMOTIONS`, `CATEGORY_SOCIAL`, `CATEGORY_UPDATES`, `CATEGORY_FORUMS` from the `labelIds` array on each message — Google's classifier is good and saves us a header round-trip.

## Refresh cadence

Free / low-cost: Gmail API. Costly: model tokens. Our refresh strategy keeps the inbox fresh with Gmail calls only:

| state                 | poll interval |
| --------------------- | ------------- |
| panel visible, focused | 30s           |
| panel visible, blurred | 60s           |
| document hidden        | 5min          |

The poll uses `history.list?startHistoryId=<latest>` — if `history` is empty we don't re-fetch any messages.

## Signature handling

When sending we read the `signature` (HTML) field from the default `sendAs` entry. We append `<br><br>` + the signature inside the HTML body part of a `multipart/alternative` message. The text part is unsigned (most clients render HTML).
