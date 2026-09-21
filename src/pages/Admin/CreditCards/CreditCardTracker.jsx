import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  calculateLevelInfo,
  evaluateUnlockedBadges,
  DIFFICULTY_XP,
} from "../../../lib/gamification";
import "./CreditCardTracker.css";

const NETWORK_OPTIONS = ["visa", "mastercard", "amex", "rupay", "diners"];
const CARD_TYPE_OPTIONS = ["rewards", "travel", "cashback", "premium", "secured", "business"];
const STATUS_OPTIONS = ["applied", "approved", "active", "closed"];
const DIFFICULTY_OPTIONS = [
  { value: "casual",      label: "Casual",      xp: 50 },
  { value: "moderate",    label: "Moderate",    xp: 100 },
  { value: "challenging", label: "Challenging", xp: 250 },
  { value: "epic",        label: "Epic",        xp: 500 },
];

const STATUS_LABELS = {
  applied:  { label: "Applied",  color: "#FFD93D" },
  approved: { label: "Approved", color: "#A8E6CF" },
  active:   { label: "Active",   color: "#4ECDC4" },
  closed:   { label: "Closed",   color: "rgba(255,255,255,0.3)" },
};

const NETWORK_ICONS = {
  visa:       "V",
  mastercard: "MC",
  amex:       "AMEX",
  rupay:      "RuPay",
  diners:     "Diners",
};

const BLANK_FORM = {
  cardName:       "",
  issuer:         "",
  network:        "visa",
  cardType:       "rewards",
  annualFee:      "",
  creditLimit:    "",
  joiningDate:    "",
  status:         "active",
  benefits:       "",
  rewardPoints:   "",
  cashbackEarned: "",
  cardImageUrl:   "",
  difficulty:     "moderate",
  xpValue:        100,
  isPublic:       false,
  notes:          "",
};

const generateId = () => `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const triggerConfetti = () => {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#FFD93D", "#ffffff", "#4ECDC4"] });
};

const CreditCardTracker = () => {
  const { stats, setStats } = useOutletContext();

  const [cards, setCards]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingCard, setEditingCard]   = useState(null);
  const [formData, setFormData]         = useState(BLANK_FORM);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [xpToast, setXpToast]           = useState(null);
  const [levelUpModal, setLevelUpModal] = useState(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "creditCards"),
      (snap) => {
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        fetched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCards(fetched);
        setLoading(false);
      },
      (err) => {
        console.warn("Credit cards fetch error:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const totalCards    = cards.length;
  const activeCards   = cards.filter((c) => c.status === "active").length;
  const totalRewards  = cards.reduce((sum, c) => sum + (Number(c.rewardPoints) || 0), 0);
  const totalCashback = cards.reduce((sum, c) => sum + (Number(c.cashbackEarned) || 0), 0);

  const filteredCards = activeFilter === "all" ? cards : cards.filter((c) => c.status === activeFilter);

  const openAddModal = () => {
    setEditingCard(null);
    setFormData(BLANK_FORM);
    setImagePreviewError(false);
    setModalOpen(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setFormData({
      cardName:       card.cardName || "",
      issuer:         card.issuer || "",
      network:        card.network || "visa",
      cardType:       card.cardType || "rewards",
      annualFee:      card.annualFee ?? "",
      creditLimit:    card.creditLimit ?? "",
      joiningDate:    card.joiningDate || "",
      status:         card.status || "active",
      benefits:       (card.benefits || []).join(", "),
      rewardPoints:   card.rewardPoints ?? "",
      cashbackEarned: card.cashbackEarned ?? "",
      cardImageUrl:   card.cardImageUrl || "",
      difficulty:     card.difficulty || "moderate",
      xpValue:        card.xpValue ?? 100,
      isPublic:       card.isPublic || false,
      notes:          card.notes || "",
    });
    setImagePreviewError(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCard(null);
    setFormData(BLANK_FORM);
  };

  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "difficulty") {
        updated.xpValue = DIFFICULTY_XP[value] || 100;
      }
      return updated;
    });
  };

  const awardXp = async (card) => {
    try {
      const xpGained  = card.xpValue || DIFFICULTY_XP[card.difficulty] || 100;
      const oldStats  = stats || {};
      const newTotalXp = (oldStats.totalXp || 0) + xpGained;
      const oldLevel  = calculateLevelInfo(oldStats.totalXp || 0).level;
      const newLevel  = calculateLevelInfo(newTotalXp).level;
      const leveled   = newLevel > oldLevel;

      const ccBreakdown = oldStats.categoryBreakdown?.credit_cards || { completed: 0, total: 0 };
      const newCcBreakdown = {
        ...ccBreakdown,
        completed: (ccBreakdown.completed || 0) + 1,
        total:     Math.max((ccBreakdown.total || 0), (ccBreakdown.completed || 0) + 1),
        label:     "Card Collection",
        icon:      "💳",
        color:     "#FFD93D",
      };

      const activityEntry = {
        id:       `act_${Date.now()}`,
        itemId:   card.cardName,
        title:    card.cardName,
        xpGained,
        date:     new Date().toISOString(),
        category: "credit_cards",
        icon:     "💳",
      };

      const updatedStats = {
        ...oldStats,
        totalXp:      newTotalXp,
        currentLevel: newLevel,
        levelTitle:   calculateLevelInfo(newTotalXp).title,
        totalCompleted: (oldStats.totalCompleted || 0) + 1,
        categoryBreakdown: {
          ...(oldStats.categoryBreakdown || {}),
          credit_cards: newCcBreakdown,
        },
        recentActivity: [activityEntry, ...(oldStats.recentActivity || [])].slice(0, 20),
        updatedAt:      serverTimestamp(),
      };

      updatedStats.unlockedBadges = evaluateUnlockedBadges(updatedStats, oldStats.unlockedBadges || []);

      await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      setStats(updatedStats);

      setXpToast({ xp: xpGained, cardName: card.cardName });
      setTimeout(() => setXpToast(null), 3500);

      if (leveled) {
        triggerConfetti();
        setLevelUpModal({ level: newLevel, title: calculateLevelInfo(newTotalXp).title });
      }
    } catch (err) {
      console.warn("XP award error:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.cardName.trim()) return;
    setSaving(true);

    const isNew  = !editingCard;
    const cardId = editingCard?.id || generateId();
    const benefitsArray = formData.benefits.split(",").map((b) => b.trim()).filter(Boolean);

    const payload = {
      cardName:       formData.cardName.trim(),
      issuer:         formData.issuer.trim(),
      network:        formData.network,
      cardType:       formData.cardType,
      annualFee:      Number(formData.annualFee) || 0,
      creditLimit:    Number(formData.creditLimit) || 0,
      joiningDate:    formData.joiningDate,
      status:         formData.status,
      benefits:       benefitsArray,
      rewardPoints:   Number(formData.rewardPoints) || 0,
      cashbackEarned: Number(formData.cashbackEarned) || 0,
      cardImageUrl:   formData.cardImageUrl.trim(),
      difficulty:     formData.difficulty,
      xpValue:        Number(formData.xpValue) || DIFFICULTY_XP[formData.difficulty] || 100,
      isPublic:       formData.isPublic,
      notes:          formData.notes.trim(),
      updatedAt:      serverTimestamp(),
      ...(isNew && { createdAt: serverTimestamp() }),
    };

    try {
      await setDoc(doc(db, "creditCards", cardId), payload, { merge: true });
      if (isNew && ["active", "approved"].includes(formData.status)) {
        await awardXp(payload);
      }
    } catch (err) {
      console.error("Save card error:", err);
    }

    setSaving(false);
    closeModal();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "creditCards", deleteTarget.id));
    } catch (err) {
      console.error("Delete card error:", err);
    }
    setDeleteTarget(null);
  };

  const togglePublic = async (card) => {
    try {
      await updateDoc(doc(db, "creditCards", card.id), { isPublic: !card.isPublic, updatedAt: serverTimestamp() });
    } catch (err) {
      console.warn("Toggle public error:", err);
    }
  };

  const cycleStatus = async (card) => {
    const order = ["applied", "approved", "active", "closed"];
    const next  = order[(order.indexOf(card.status) + 1) % order.length];
    try {
      await updateDoc(doc(db, "creditCards", card.id), { status: next, updatedAt: serverTimestamp() });
      if ((next === "active" || next === "approved") && card.status === "applied") {
        await awardXp({ ...card, status: next });
      }
    } catch (err) {
      console.warn("Status cycle error:", err);
    }
  };

  return (
    <div className="cc-container">

      {xpToast && (
        <div className="cc-xp-toast">
          <span>💳</span>
          <span>
            <strong>{xpToast.cardName}</strong> added! <span className="cc-xp-toast-xp">+{xpToast.xp} XP ⚡</span>
          </span>
        </div>
      )}

      {levelUpModal && (
        <div className="cc-overlay" onClick={() => setLevelUpModal(null)}>
          <div className="cc-levelup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cc-levelup-glow">🎉</div>
            <h2>Level Up!</h2>
            <p>You reached</p>
            <div className="cc-levelup-title">Level {levelUpModal.level} — {levelUpModal.title}</div>
            <button className="cc-btn-primary" onClick={() => setLevelUpModal(null)}>Awesome! 🚀</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="cc-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="cc-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cc-delete-icon">🗑️</div>
            <h3>Delete Card?</h3>
            <p><strong>{deleteTarget.cardName}</strong> will be permanently removed.</p>
            <div className="cc-delete-actions">
              <button className="cc-btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="cc-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="cc-overlay" onClick={closeModal}>
          <div className="cc-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3>{editingCard ? "✏️ Edit Card" : "💳 Add Credit Card"}</h3>
              <button className="cc-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="cc-form" onSubmit={handleSave}>
              <div className="cc-form-row">
                <div className="cc-field">
                  <label>Card Name *</label>
                  <input type="text" name="cardName" value={formData.cardName} onChange={handleField} placeholder="e.g. HDFC Regalia Gold" required />
                </div>
                <div className="cc-field">
                  <label>Issuer</label>
                  <input type="text" name="issuer" value={formData.issuer} onChange={handleField} placeholder="e.g. HDFC Bank" />
                </div>
              </div>
              <div className="cc-form-row">
                <div className="cc-field">
                  <label>Network</label>
                  <select name="network" value={formData.network} onChange={handleField}>
                    {NETWORK_OPTIONS.map((n) => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                  </select>
                </div>
                <div className="cc-field">
                  <label>Card Type</label>
                  <select name="cardType" value={formData.cardType} onChange={handleField}>
                    {CARD_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="cc-form-row">
                <div className="cc-field">
                  <label>Annual Fee (Rs.)</label>
                  <input type="number" name="annualFee" value={formData.annualFee} onChange={handleField} placeholder="0" min="0" />
                </div>
                <div className="cc-field">
                  <label>Credit Limit (Rs.)</label>
                  <input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleField} placeholder="0" min="0" />
                </div>
              </div>
              <div className="cc-form-row">
                <div className="cc-field">
                  <label>Joining Date</label>
                  <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleField} />
                </div>
                <div className="cc-field">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleField}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="cc-form-row">
                <div className="cc-field">
                  <label>Reward Points</label>
                  <input type="number" name="rewardPoints" value={formData.rewardPoints} onChange={handleField} placeholder="0" min="0" />
                </div>
                <div className="cc-field">
                  <label>Cashback Earned (Rs.)</label>
                  <input type="number" name="cashbackEarned" value={formData.cashbackEarned} onChange={handleField} placeholder="0" min="0" />
                </div>
              </div>
              <div className="cc-form-row">
                <div className="cc-field">
                  <label>Difficulty</label>
                  <select name="difficulty" value={formData.difficulty} onChange={handleField}>
                    {DIFFICULTY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.xp} XP)</option>)}
                  </select>
                </div>
                <div className="cc-field">
                  <label>XP Value</label>
                  <input type="number" name="xpValue" value={formData.xpValue} onChange={handleField} min="0" />
                </div>
              </div>
              <div className="cc-field cc-field-full">
                <label>Benefits <span className="cc-label-hint">(comma-separated)</span></label>
                <input type="text" name="benefits" value={formData.benefits} onChange={handleField} placeholder="Lounge access, 2X rewards on dining" />
              </div>
              <div className="cc-field cc-field-full">
                <label>Card Image URL <span className="cc-label-hint">(optional)</span></label>
                <input type="url" name="cardImageUrl" value={formData.cardImageUrl} onChange={handleField} placeholder="https://example.com/card.png" />
                {formData.cardImageUrl && !imagePreviewError && (
                  <img src={formData.cardImageUrl} alt="Card preview" className="cc-img-preview" onError={() => setImagePreviewError(true)} />
                )}
              </div>
              <div className="cc-field cc-field-full">
                <label>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleField} placeholder="Fee waiver call date, best use cases, etc." rows={2} />
              </div>
              <label className="cc-toggle-label">
                <input type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleField} />
                <span className="cc-toggle-track" />
                <span className="cc-toggle-text">Publish to /credit-cards page</span>
              </label>
              <div className="cc-modal-actions">
                <button type="button" className="cc-btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="cc-btn-primary" disabled={saving}>{saving ? "Saving..." : editingCard ? "Save Changes" : "Add Card"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="cc-header-row">
        <div className="cc-header-left">
          <h2>💳 Credit Card Collection</h2>
          <p>Track your wallet, rewards and perks at a glance</p>
        </div>
        <button className="cc-add-btn" onClick={openAddModal}>+ Add Card</button>
      </div>

      <div className="cc-stats-grid">
        <div className="cc-stat-card">
          <div className="cc-stat-icon">💳</div>
          <div className="cc-stat-body">
            <div className="cc-stat-value">{totalCards}</div>
            <div className="cc-stat-label">Total Cards</div>
          </div>
        </div>
        <div className="cc-stat-card">
          <div className="cc-stat-icon">✅</div>
          <div className="cc-stat-body">
            <div className="cc-stat-value">{activeCards}</div>
            <div className="cc-stat-label">Active Cards</div>
          </div>
        </div>
        <div className="cc-stat-card">
          <div className="cc-stat-icon">⭐</div>
          <div className="cc-stat-body">
            <div className="cc-stat-value">{totalRewards.toLocaleString()}</div>
            <div className="cc-stat-label">Reward Points</div>
          </div>
        </div>
        <div className="cc-stat-card">
          <div className="cc-stat-icon">💰</div>
          <div className="cc-stat-body">
            <div className="cc-stat-value">Rs.{totalCashback.toLocaleString()}</div>
            <div className="cc-stat-label">Cashback Earned</div>
          </div>
        </div>
      </div>

      <div className="cc-filter-bar">
        {["all", "active", "approved", "applied", "closed"].map((f) => (
          <button key={f} className={`cc-filter-tab ${activeFilter === f ? "active" : ""}`} onClick={() => setActiveFilter(f)}>
            {f === "all" ? `All (${cards.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${cards.filter((c) => c.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cc-loading">Loading your collection...</div>
      ) : filteredCards.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-icon">💳</div>
          <p>No cards in this view yet.</p>
          <button className="cc-btn-primary" onClick={openAddModal}>Add Your First Card</button>
        </div>
      ) : (
        <div className="cc-gallery">
          {filteredCards.map((card) => {
            const statusStyle = STATUS_LABELS[card.status] || STATUS_LABELS.active;
            const isExpanded  = expandedId === card.id;
            return (
              <div key={card.id} className={`cc-card ${isExpanded ? "expanded" : ""}`}>
                <div className="cc-card-visual" onClick={() => setExpandedId(isExpanded ? null : card.id)}>
                  {card.cardImageUrl ? (
                    <img src={card.cardImageUrl} alt={card.cardName} className="cc-card-img" onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="cc-card-placeholder">
                      <span className="cc-card-network-label">{NETWORK_ICONS[card.network] || "CARD"}</span>
                      <div className="cc-card-chip-dots">● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●</div>
                      <div className="cc-card-name-overlay">{card.cardName}</div>
                    </div>
                  )}
                  <span className="cc-status-badge" style={{ background: statusStyle.color + "22", color: statusStyle.color, border: `1px solid ${statusStyle.color}44` }}>
                    {statusStyle.label}
                  </span>
                  {card.isPublic && <span className="cc-public-badge">🌐</span>}
                </div>

                <div className="cc-card-info">
                  <div className="cc-card-top">
                    <div>
                      <div className="cc-card-name">{card.cardName}</div>
                      <div className="cc-card-issuer">{card.issuer} · {(card.network || "").toUpperCase()} · {card.cardType}</div>
                    </div>
                    <div className="cc-card-xp-tag">+{card.xpValue || 100} XP</div>
                  </div>

                  <div className="cc-card-metrics">
                    <span>Rs.{(card.annualFee || 0).toLocaleString()}/yr</span>
                    {card.rewardPoints > 0 && <span>⭐ {card.rewardPoints.toLocaleString()} pts</span>}
                    {card.cashbackEarned > 0 && <span>💰 Rs.{card.cashbackEarned.toLocaleString()}</span>}
                  </div>

                  {isExpanded && (
                    <div className="cc-card-expanded">
                      {card.joiningDate && (
                        <div className="cc-detail-row"><span>Joined</span><span>{card.joiningDate}</span></div>
                      )}
                      {card.creditLimit > 0 && (
                        <div className="cc-detail-row"><span>Credit Limit</span><span>Rs.{card.creditLimit.toLocaleString()}</span></div>
                      )}
                      {card.benefits?.length > 0 && (
                        <div className="cc-benefits-section">
                          <div className="cc-benefits-title">Perks and Benefits</div>
                          <ul className="cc-benefits-list">
                            {card.benefits.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        </div>
                      )}
                      {card.notes && (
                        <div className="cc-notes-section">
                          <div className="cc-benefits-title">Notes</div>
                          <p>{card.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="cc-card-actions">
                    <button className="cc-action-btn" onClick={() => setExpandedId(isExpanded ? null : card.id)}>{isExpanded ? "▲ Less" : "▼ More"}</button>
                    <button className="cc-action-btn" onClick={() => cycleStatus(card)} style={{ color: statusStyle.color }}>🔄 {statusStyle.label}</button>
                    <button className={`cc-action-btn ${card.isPublic ? "cc-public-active" : ""}`} onClick={() => togglePublic(card)}>{card.isPublic ? "🌐" : "🔒"}</button>
                    <button className="cc-action-btn" onClick={() => openEditModal(card)}>✏️</button>
                    <button className="cc-action-btn cc-delete-btn" onClick={() => setDeleteTarget(card)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CreditCardTracker;
