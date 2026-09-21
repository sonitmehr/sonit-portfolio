import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import "./CreditCardShowcase.css";

const NETWORK_COLORS = {
  visa:       "#1a1f71",
  mastercard: "#EB001B",
  amex:       "#007bc1",
  rupay:      "#0d5ea5",
  other:      "#636e72",
};

const NETWORK_LOGOS = {
  visa:       "VISA",
  mastercard: "⬤ ⬤",
  amex:       "AMEX",
  rupay:      "RuPay",
  other:      "CARD",
};

const STATUS_COLORS = {
  active:    "#00b894",
  applied:   "#fdcb6e",
  approved:  "#6c5ce7",
  closed:    "#636e72",
};

export default function CreditCardShowcase() {
  const [cards, setCards]     = useState([]);
  const [flipped, setFlipped] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "creditCards"),
            where("isPublic", "==", true)
          )
        );
        const cardList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cardList.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setCards(cardList);
      } catch (err) {
        console.error("CreditCardShowcase load error:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="ccs-loading">
        <div className="ccs-spinner" />
        <p>Loading cards…</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="ccs-empty">
        <span>💳</span>
        <h2>No cards published yet</h2>
        <p>The admin hasn't published any cards to this showcase.</p>
      </div>
    );
  }

  return (
    <div className="ccs-wrapper">
      <div className="ccs-count-badge">
        💳 {cards.length} card{cards.length !== 1 ? "s" : ""} in wallet
      </div>

      <div className="ccs-grid">
        {cards.map((card, idx) => {
          const network = (card.network || "other").toLowerCase();
          const isFlipped = flipped === card.id;
          const networkColor = NETWORK_COLORS[network] || NETWORK_COLORS.other;

          return (
            <div
              key={card.id}
              className={`ccs-card-scene ${isFlipped ? "flipped" : ""}`}
              style={{ "--anim-delay": `${idx * 0.08}s` }}
              onClick={() => setFlipped(isFlipped ? null : card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setFlipped(isFlipped ? null : card.id)}
              aria-label={`${card.name || "Card"} — tap to see details`}
            >
              <div className="ccs-card-flipper">
                {/* ── Front ── */}
                <div
                  className="ccs-card ccs-card-front"
                  style={{
                    background: card.imageUrl
                      ? `url(${card.imageUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${networkColor}cc, ${networkColor}55)`,
                  }}
                >
                  <div className="ccs-card-overlay" />
                  <div className="ccs-card-content">
                    <div className="ccs-card-top">
                      <span className="ccs-card-issuer">{card.issuer || ""}</span>
                      <span
                        className="ccs-card-network"
                        style={{ color: network === "mastercard" ? "#fff" : "#fff" }}
                      >
                        {NETWORK_LOGOS[network] || NETWORK_LOGOS.other}
                      </span>
                    </div>
                    <div className="ccs-card-chip">▬</div>
                    <div className="ccs-card-number">•••• •••• •••• ••••</div>
                    <div className="ccs-card-bottom">
                      <span className="ccs-card-name">{card.name || "Card"}</span>
                      <span
                        className="ccs-card-status"
                        style={{
                          background: (STATUS_COLORS[card.status] || "#636e72") + "33",
                          color: STATUS_COLORS[card.status] || "#636e72",
                          borderColor: (STATUS_COLORS[card.status] || "#636e72") + "55",
                        }}
                      >
                        {card.status || "active"}
                      </span>
                    </div>
                  </div>
                  <div className="ccs-card-tap-hint">Tap for details ↩</div>
                </div>

                {/* ── Back ── */}
                <div className="ccs-card ccs-card-back">
                  <div className="ccs-card-back-stripe" />
                  <div className="ccs-card-back-content">
                    <h3 className="ccs-detail-name">{card.name}</h3>
                    {card.issuer && (
                      <p className="ccs-detail-row">
                        <span className="ccs-detail-label">Issuer</span>
                        <span>{card.issuer}</span>
                      </p>
                    )}
                    {card.cardType && (
                      <p className="ccs-detail-row">
                        <span className="ccs-detail-label">Type</span>
                        <span>{card.cardType}</span>
                      </p>
                    )}
                    {card.annualFee !== undefined && card.annualFee !== "" && (
                      <p className="ccs-detail-row">
                        <span className="ccs-detail-label">Annual Fee</span>
                        <span>₹{card.annualFee || 0}</span>
                      </p>
                    )}
                    {card.joinedDate && (
                      <p className="ccs-detail-row">
                        <span className="ccs-detail-label">Since</span>
                        <span>
                          {new Date(card.joinedDate).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    )}
                    {card.benefits && card.benefits.length > 0 && (
                      <div className="ccs-benefits">
                        <span className="ccs-detail-label">Key Benefits</span>
                        <ul className="ccs-benefits-list">
                          {(typeof card.benefits === "string"
                            ? card.benefits.split("\n")
                            : card.benefits
                          )
                            .slice(0, 4)
                            .map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                    {card.notes && (
                      <p className="ccs-detail-notes">{card.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
