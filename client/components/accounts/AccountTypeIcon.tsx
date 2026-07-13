import { getAccountTypeIcon } from "@/lib/finance/accountTypes";

export default function AccountTypeIcon({
  className,
  type,
}: {
  className?: string;
  type: string;
}) {
  const Icon = getAccountTypeIcon(type);
  return (
    <Icon
      aria-hidden="true"
      className={className}
      data-account-type-icon={type}
    />
  );
}
