# obsidian-flashcards

Export your obsidian notes to Anki.

> [!WARNING]  
> This is currently a work in progress. It covers my needs and I already use it but it has several [limitations](#limitations).

## Motivation

There are many plugins about exporting your Obsidian notes to [Anki](https://apps.ankiweb.net/) flash cards but none suited my needs so I've decided to create this plugin to match my way of thinking.

## Prerequisite

-   [Anki Desktop](https://apps.ankiweb.net/)
-   [AnkiConnect](https://ankiweb.net/shared/info/2055492159)

The first time you'll try to export your notes, Anki will ask you to allow Obsidian to manage your notes. Allow it or this plugin will not be able to create decks and manage their notes.

## Expected format

Write your documents as usual. When you need to include some cards, just add a specific section. By default, the plugin search for a line starting with `#cards` followed by a new line and everything below it will be parsed as notes (with front, back and individual notes separated by `---`) but you can update it to suit your needs.

Currently, it only supports the "Basic" card format. Let's say you got this document in `<vault_root>/Some/Subject`:

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

When running the **Export notes to Anki** command (using the **Obsidian command palette**), this plugin will create a deck named **Some** if it doesn't exist yet and create 2 cards matching the following JSON:

```json
[
	{
		"id": 1, // Determined by Anki
		"front": "A first question?",
		"back": "And a first answer!",
		"tags": ["Some", "Subject", "obsidian:some-subject"]
	},
	{
		"id": 2,
		"front": "A second question?",
		"back": "And a second answer!",
		"tags": ["Some", "Subject", "obsidian:some-subject"]
	}
]
```

To keep track of existing notes, this plugin will update your Obsidian notes to include the note id. For example, the original document will be updated as follow:

```md
# Some subject here

Some content about the subject.

#cards

<!-- id:1 -->

A first question?

---

And a first answer!

---

<!-- id:2 -->

A second question?

---

And a second answer!
```

> [!NOTE]  
> Decks are **never deleted** by this plugin. So if you remove a vault root file or folder, you'll have to manually delete the associated Anki deck.

## Limitations

-   Only support text content (Does not support embedded contents such as images, video and audio)

## Known issues
