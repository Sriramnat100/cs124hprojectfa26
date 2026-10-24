import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { usePoints } from "../cosmetics.js";
import { AVATAR_COLORS, initialsFor, useSettings } from "../settings.js";
import "./points.css";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Leaderboard / Shop switcher at the top of both Points pages.
export function PointsTabs() {
  const tab = ({ isActive }) => `pc-tab ${isActive ? "on" : ""}`;
  return (
    <nav className="pc-tabs" aria-label="Points">
      <NavLink to="/points" end className={tab}>🏆 Leaderboard</NavLink>
      <NavLink to="/points/shop" className={tab}>🛍️ Shop</NavLink>
    </nav>
  );
}

// "in 1 day 22 h" until the weekly reset. Refreshes every minute.
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return "";
  const mins = Math.max(0, Math.round((new Date(iso) - now) / 60_000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return `${d} ${d === 1 ? "day" : "days"} ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

// The weekly Points competition: last week's top 3, your week, and this week's rankings.
export default function Points() {
  const { user } = useAuth();
  const settings = useSettings(user);
  const me = usePoints(user);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const countdown = useCountdown(board?.week_end);

  useEffect(() => {
    api("/points/leaderboard").then(setBoard).catch((err) => setError(err.message));
  }, []);

  const myBase = AVATAR_COLORS[settings.avatarColor] ?? AVATAR_COLORS.teal;
  const myInitials = initialsFor(user, settings);
  const avatarFor = (row, size) => (
    <Avatar size={size} background={row.background} frame={row.frame}
      initials={row.me ? myInitials : row.name.slice(0, 2).toUpperCase()}
      baseBg={row.me ? myBase : undefined} />
  );
  const onBoard = board?.rows.some((row) => row.me);

  return (
    <main className="page pc-page">
      <header className="pc-head">
        <span className="pc-eyebrow">Points</span>
        <h1>Weekly leaderboard</h1>
        <p className="muted">
          Everyone starts from zero each Monday.
          {countdown && <> Next reset in <b className="pc-countdown">{countdown}</b>.</>}
        </p>
      </header>
      <PointsTabs />

      {error && <p className="error">{error}</p>}

      {board && (
        <section className="pc-champs" aria-labelledby="pc-champs-title">
          <h2 id="pc-champs-title">Last week's top 3</h2>
          {board.last_week_top.length === 0 ? (
            <p className="muted">No one scored last week.</p>
          ) : (
            <ol className="pc-podium">
              {board.last_week_top.map((row, i) => (
                <li key={row.name} className={`pc-step place-${i + 1} ${row.me ? "me" : ""}`}>
                  <span className="pc-step-medal" aria-hidden="true">{MEDALS[row.rank] ?? `#${row.rank}`}</span>
                  {avatarFor(row, i === 0 ? 64 : 52)}
                  <b>{row.name}{row.me && <span className="pc-you-tag">You</span>}</b>
                  <span className="pc-points">{row.points}<small> pts</small></span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {me && (
        <section className="pc-you" aria-label="Your points">
          <div className="pc-score">
            <span className="pc-label">This week</span>
            <span className="pc-big">{me.week_points}</span>
            <span className="pc-rank">
              {me.rank ? <>Rank <b>#{me.rank}</b> of {me.players}</> : "Not ranked yet this week."}
            </span>
            <Link to="/points/shop" className="pc-balance">🛍️ {me.balance} pts to spend</Link>
          </div>

          <ul className="pc-earn" aria-label="How to earn points">
            <li>
              <span className="pc-earn-icon" aria-hidden="true">📸</span>
              <div>
                <b>Report a sighting</b>
                <small className="muted">+{me.per_sighting} each · {me.week_sightings} this week</small>
              </div>
              <Link to="/submit-sighting" className="pc-action">Report</Link>
            </li>
            <li>
              <span className="pc-earn-icon" aria-hidden="true">🛴</span>
              <div>
                <b>Set up My Scooter</b>
                <small className="muted">+{me.scooter_bonus} once, for registering your scooter</small>
              </div>
              {me.scooter_done
                ? <span className="pc-done">✓ Earned</span>
                : <Link to="/register-scooter" className="pc-action">Set up</Link>}
            </li>
          </ul>
        </section>
      )}

      {board && (
        <section className="pc-board" aria-labelledby="pc-board-title">
          <h2 id="pc-board-title">This week</h2>
          {board.rows.length === 0 && <p className="muted">No points yet this week. Report a sighting to take first place!</p>}
          <ol className="pc-list">
            {board.rows.map((row) => <Row key={row.name} row={row} avatar={avatarFor(row, 38)} />)}
            {me?.rank && !onBoard && (
              <>
                <li className="pc-gap" aria-hidden="true">⋯</li>
                <Row
                  row={{ ...me, rank: me.rank, points: me.week_points, sightings: me.week_sightings, scooter_done: false, me: true }}
                  avatar={avatarFor({ ...me, me: true }, 38)}
                />
              </>
            )}
          </ol>
        </section>
      )}
    </main>
  );
}

function Row({ row, avatar }) {
  return (
    <li className={`pc-row ${row.me ? "me" : ""} ${row.rank <= 3 ? "top" : ""}`}>
      <span className="pc-pos">{MEDALS[row.rank] ?? `#${row.rank}`}</span>
      {avatar}
      <div className="pc-who">
        <b>{row.name}{row.me && <span className="pc-you-tag">You</span>}</b>
        <small className="muted">
          {row.sightings} {row.sightings === 1 ? "sighting" : "sightings"}
          {row.scooter_done && " · 🛴 scooter set up"}
        </small>
      </div>
      <span className="pc-points">{row.points}<small> pts</small></span>
    </li>
  );
}
