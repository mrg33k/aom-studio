// UI commands for the slash picker — actions the DASHBOARD performs, as opposed to
// the skills in src/data/skills.json which are agent work the text gets handed to.
//
// They live here rather than in skills.json because that file is GENERATED from
// AOM-EA's .claude/skills/INDEX.md by scripts/build-skills-index.js: anything added
// there by hand disappears the next time someone regenerates it.
//
// kind:'modal' is what tells SlashCommandAutocomplete not to insert text — it strips
// the token and calls onModalCommand(name) so the surface can act. A surface that
// does not handle a given command simply ignores it.

export const UI_COMMANDS = [
  {
    name: '/clear',
    alias: null,
    description: 'Start this chat fresh — your history stays in History',
    category: 'corner',
    categoryLabel: 'Corner',
    kind: 'modal',
  },
];

// Merged ahead of the skills list so an exact `/clear` always outranks a fuzzy
// subsequence hit on some skill name that happens to contain c-l-e-a-r.
export function withUiCommands(skills) {
  return [...UI_COMMANDS, ...(skills || [])];
}
