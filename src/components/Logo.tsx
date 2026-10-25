export function Logo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <span className="logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} className="logo-img" height={52} />
      </span>
    );
  }
  return (
    <span className="logo">
      <span className="logo-text">{name}</span>
    </span>
  );
}
