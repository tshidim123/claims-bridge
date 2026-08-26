type AccountPageHeaderProps = {
  description: string;
  eyebrow?: string;
  title: string;
};

export function AccountPageHeader({
  description,
  eyebrow = "Client portal",
  title,
}: AccountPageHeaderProps) {
  return (
    <header className="account-page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
