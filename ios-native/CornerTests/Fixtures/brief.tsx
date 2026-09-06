export function LaunchHero({ title }: { title: string }) {
  // Bundled fixture source for the native Visual Window code tab.
  // Line pins anchor to these line numbers (1-based).
  const subtitle = "Spring launch deck";
  return (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
