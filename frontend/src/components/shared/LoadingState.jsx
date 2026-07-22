/** Skeleton grid shown while objectives load — matches the real 2×2 layout. */
export default function LoadingState() {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading monitoring objectives">
      {[0, 1, 2, 3].map((i) => (
        <div className="skcard" key={i}>
          <div style={{ display: "flex", gap: 16 }}>
            <div className="sk" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ height: 16, width: "62%" }} />
              <div className="sk" style={{ height: 12, width: "40%", marginTop: 8 }} />
            </div>
          </div>
          <div className="sk" style={{ height: 12, width: "100%" }} />
          <div className="sk" style={{ height: 12, width: "88%" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <div className="sk" style={{ height: 24, width: 84, borderRadius: 999 }} />
            <div className="sk" style={{ height: 24, width: 70, borderRadius: 999 }} />
            <div className="sk" style={{ height: 24, width: 96, borderRadius: 999 }} />
          </div>
          <div className="sk" style={{ height: 58, width: "100%", borderRadius: 12 }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="sk" style={{ height: 14, width: 110 }} />
            <div className="sk" style={{ height: 34, width: 92, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
