import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { notifyPointsChange } from "../cosmetics.js";
import { AVATAR_COLORS, initialsFor, useSettings } from "../settings.js";
import { PointsTabs } from "./Points.jsx";
import "./points.css";

const SECTIONS = [
  { kind: "background", title: "Avatar backgrounds", hint: "Gradient fills behind your initials." },
  { kind: "frame", title: "Avatar frames", hint: "A ring around your avatar. Some of them glow and spin." },
];

// Points shop: spend points on avatar backgrounds and frames.
export default function Shop() {
  const { user } = useAuth();
  const settings = useSettings(user);
  const [shop, setShop] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState("");
  const [preview, setPreview] = useState(null); // item being hovered, shown on the big avatar
  const confirmTimer = useRef(0);

  useEffect(() => {
    api("/shop").then(setShop).catch((err) => setError(err.message));
    return () => clearTimeout(confirmTimer.current);
  }, []);

  const equipped = (kind) => shop?.items.find((i) => i.kind === kind && i.equipped)?.id ?? null;
  const base = AVATAR_COLORS[settings.avatarColor] ?? AVATAR_COLORS.teal;
  const initials = initialsFor(user, settings);

  // What the avatar looks like with `item` swapped in (and everything else as it is now).
  const lookWith = (item) => ({
    background: item?.kind === "background" ? item.id : equipped("background"),
    frame: item?.kind === "frame" ? item.id : equipped("frame"),
  });

  async function act(path, itemId) {
    setBusy(itemId);
    setError("");
    try {
      setShop(await api(path, { method: "POST" }));
      notifyPointsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
      setConfirming("");
    }
  }

  // Buying takes two clicks, so a stray click never spends points.
  function buy(item) {
    if (confirming !== item.id) {
      setConfirming(item.id);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(""), 4000);
      return;
    }
    act(`/shop/${item.id}/buy`, item.id);
  }

  function button(item) {
    if (item.equipped) {
      return (
        <button type="button" className="pc-shop-btn on" disabled={busy === item.id}
          onClick={() => act(`/shop/unequip/${item.kind}`, item.id)}>✓ Wearing · Take off</button>
      );
    }
    if (item.owned) {
      return <button type="button" className="pc-shop-btn ghost" disabled={busy === item.id} onClick={() => act(`/shop/${item.id}/equip`, item.id)}>Wear</button>;
    }
    const short = item.price - shop.balance;
    if (short > 0) return <button type="button" className="pc-shop-btn" disabled>Need {short} more</button>;
    return (
      <button type="button" className={`pc-shop-btn ${confirming === item.id ? "confirm" : ""}`} disabled={busy === item.id} onClick={() => buy(item)}>
        {confirming === item.id ? `Spend ${item.price} pts?` : "Buy"}
      </button>
    );
  }

  return (
    <main className="page pc-page">
      <header className="pc-head">
        <span className="pc-eyebrow">Points</span>
        <h1>Points shop</h1>
        <p className="muted">Spend your points on a fancier avatar. Spending never lowers your rank.</p>
      </header>
      <PointsTabs />

      {error && <p className="error" role="alert">{error}</p>}
      {!shop && !error && <p className="muted">Loading…</p>}

      {shop && (
        <>
          <section className="pc-you pc-shop-top" aria-label="Your balance">
            <Avatar size={96} initials={initials} baseBg={base} {...lookWith(preview)} />
            <div className="pc-score">
              <span className="pc-label">{preview ? `Trying on: ${preview.name}` : "Your balance"}</span>
              <span className="pc-big">{shop.balance}<small> pts</small></span>
              <span className="pc-rank">Hover or tap an item to try it on. Your look shows on the leaderboard too.</span>
            </div>
          </section>

          {SECTIONS.map(({ kind, title, hint }) => (
            <section key={kind} className="pc-shop-section" aria-labelledby={`shop-${kind}`}>
              <h2 id={`shop-${kind}`}>{title}</h2>
              <p className="muted">{hint}</p>
              <ul className="pc-shop-grid">
                {shop.items.filter((i) => i.kind === kind).map((item) => (
                  <li key={item.id} className={`pc-shop-item ${item.equipped ? "on" : ""}`}
                    onMouseEnter={() => setPreview(item)} onMouseLeave={() => setPreview(null)} onClick={() => setPreview(item)}
                    onFocus={() => setPreview(item)} onBlur={() => setPreview(null)}>
                    <Avatar size={64} initials={initials} baseBg={base} {...lookWith(item)} />
                    <b>{item.name}</b>
                    {item.owned ? <span className="pc-price owned">Owned</span> : <span className="pc-price">{item.price} pts</span>}
                    {button(item)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
