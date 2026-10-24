import { avatarClass, avatarStyle } from "../cosmetics.js";

// A round avatar with the user's initials, shop background and frame.
export default function Avatar({ initials, background, frame, baseBg, size = 38, className = "" }) {
  const ring = size >= 64 ? 4 : 3;
  return (
    <span
      className={`av ${avatarClass(frame)} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), ...avatarStyle({ background, frame, baseBg, ring }) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
