# obsidian-anki

Export your obsidian notes to Anki.

## Prerequisite

-   [Anki Desktop](https://apps.ankiweb.net/)
-   [AnkiConnect](https://ankiweb.net/shared/info/2055492159)

In Anki, configure AnkiConnect (Tools -> Addions -> AnkiConnect -> Configuration) with the following:

```json
{
	"apiKey": null,
	"apiLogPath": null,
	"webBindAddress": "127.0.0.1",
	"webBindPort": 8765,
	"webCorsOrigin": "http://localhost",
	"webCorsOriginList": ["http://localhost", "app://obsidian.md"]
}
```

## Expected format

There's already a lot of Obsidian plugins to export your notes to Anki but I made this one to match my usage specifically.

Currently, it only supports "Basic" card format. Let's say you got this document in `<vault_root>/Some/Subject`:

```md
# Some subject here

Some content about the subject.

#cards

A first question?

---

And a first answer!

---

A second question?

---

And a second answer!
```

When running the **Export** command, this plugin will create a deck named **Some** if it doesn't exist yet and create 2 cards with matching Front and Back.

## Not implemented yet

-   Notes moved between decks will be recreated
-   Renaming a root folder will recreate notes
