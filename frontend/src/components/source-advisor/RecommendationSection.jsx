import RecommendationCard from "./RecommendationCard.jsx";

/** AI Source Advisor — recommendations sorted by priority (done in the API). */
export default function RecommendationSection({ recommendations, decisions, onAccept, onReject, onAlternative }) {
  return (
    <section className="adv-section">
      <div className="section-head">
        <h2>AI Source Advisor</h2>
        <span>{recommendations.length} recommendation{recommendations.length === 1 ? "" : "s"}, prioritised for this objective</span>
      </div>

      {recommendations.length > 0 ? (
        <div className="rec-list">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              decision={decisions[rec.id] || null}
              onAccept={() => onAccept(rec.id)}
              onReject={() => onReject(rec.id)}
              onAlternative={() => onAlternative(rec)}
            />
          ))}
        </div>
      ) : (
        <p className="adv-muted">The advisor returned no recommendations for this objective.</p>
      )}
    </section>
  );
}
