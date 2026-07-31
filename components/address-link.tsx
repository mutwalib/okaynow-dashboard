import { MapPinned } from "lucide-react";
import { formatAddress, mapsDirectionsUrl, type AddressParts } from "@/lib/maps";

export function AddressLink({
  address,
  className = "",
  multiline = true,
  showDirectionsHint = true,
}: {
  address: AddressParts;
  className?: string;
  multiline?: boolean;
  showDirectionsHint?: boolean;
}) {
  const label = formatAddress(address);
  const href = mapsDirectionsUrl(address);
  if (!label) return null;

  const line = multiline ? (
    <>
      {address.addressLine}
      {address.city || address.state || address.zip ? (
        <>
          <br />
          {[address.city, address.state].filter(Boolean).join(", ")}
          {address.zip ? ` ${address.zip}` : ""}
        </>
      ) : null}
    </>
  ) : (
    label
  );

  if (!href) {
    return <span className={className}>{line}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-accent-deep underline-offset-2 hover:underline ${className}`}
      title="Open in Maps for distance and directions"
    >
      {line}
      {showDirectionsHint ? (
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium no-underline">
          <MapPinned className="h-3.5 w-3.5" aria-hidden />
          Open in Maps · directions
        </span>
      ) : null}
    </a>
  );
}
