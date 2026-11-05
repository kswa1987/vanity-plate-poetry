import type { PlateCard as Plate } from "@/lib/plates";

export function PlateCard({
  plate,
  showCrop = false,
  children,
}: {
  plate: Plate;
  showCrop?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/plates/${plate.id}/image`} alt={plate.plate_text ?? "License plate photo"} loading="lazy" />
      <div className="card-body">
        {plate.status === "ready" ? (
          <>
            <p>
              <span className="plate-text">{plate.plate_text}</span>
            </p>
            <p>{plate.interpretation}</p>
            <p className="muted">
              Spotted by {plate.uploader}
              {plate.region ? ` · ${plate.region}` : ""}
            </p>
          </>
        ) : plate.status === "pending" ? (
          <p>
            <span className="badge pending">Waiting to be checked</span>
          </p>
        ) : (
          <p>
            <span className="badge rejected">Not accepted</span> {plate.reject_reason}
          </p>
        )}
        {showCrop && plate.has_crop && (
          <p className="muted">
            What the AI isolated:
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="crop" src={`/api/plates/${plate.id}/crop`} alt="Cropped plate" loading="lazy" />
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
