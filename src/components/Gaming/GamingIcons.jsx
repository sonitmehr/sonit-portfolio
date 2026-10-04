import React from "react";
import "./GamingIcons.css";

/**
 * Registry of original gaming artwork and platform branding.
 * Defaults to high-performance local static assets with zero latency,
 * and can be dynamically backed by Firebase Cloud Storage URLs.
 */
export const GAMING_ASSETS = {
  trophies: {
    platinum: "/icons/gaming/trophies/trophy-platinum.png",
    gold: "/icons/gaming/trophies/trophy-gold.png",
    silver: "/icons/gaming/trophies/trophy-silver.png",
    bronze: "/icons/gaming/trophies/trophy-bronze.png",
  },
  platforms: {
    steam: "/icons/gaming/platforms/steam-logo.png",
    psn: "/icons/gaming/platforms/playstation-logo.png",
    psnWhite: "/icons/gaming/platforms/playstation-logo-white.png",
  },
  ribbons: {
    steam100: "/icons/gaming/ribbons/steam-ribbon.png",
  },
  coc: {
    cover: "/icons/gaming/coc/clash-of-clans-cover.jpg",
    base: "/icons/gaming/coc/clash-of-clans-base.png",
  },
};

/**
 * Official PlayStation Trophy Icon (Platinum, Gold, Silver, Bronze)
 */
export function TrophyIcon({
  type = "platinum",
  size = 18,
  className = "",
  style = {},
  alt,
  title,
}) {
  const normType = String(type || "").toLowerCase().trim();
  const src = GAMING_ASSETS.trophies[normType] || GAMING_ASSETS.trophies.platinum;
  const capitalized = normType.charAt(0).toUpperCase() + normType.slice(1);
  const displayTitle = title ?? `${capitalized} Trophy`;

  return (
    <img
      src={src}
      alt={alt ?? displayTitle}
      title={displayTitle}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`gaming-icon-img trophy-icon-${normType} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}

/**
 * Supercell / Clash of Clans Golden Crown Icon
 */
export function SupercellIcon({
  size = 16,
  className = "",
  style = {},
  title = "Supercell",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`gaming-icon-img supercell-icon ${className}`}
      title={title}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    >
      <defs>
        <linearGradient id="cocCrownGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path
        d="M2.5 19.5h19c.6 0 1-.4 1-1 0-.2-.1-.4-.2-.6L19.5 7.5l-4.5 4-3-8.5-3 8.5-4.5-4L1.7 17.9c-.1.2-.2.4-.2.6 0 .6.4 1 1 1z"
        fill="url(#cocCrownGrad)"
        stroke="#78350F"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="15.5" r="1.3" fill="#78350F" />
      <circle cx="7.5" cy="15.5" r="1" fill="#78350F" />
      <circle cx="16.5" cy="15.5" r="1" fill="#78350F" />
    </svg>
  );
}

/**
 * Official Platform Icon (Steam, PlayStation, Supercell)
 */
export function PlatformIcon({
  platform = "steam",
  variant = "default",
  size = 16,
  className = "",
  style = {},
  alt,
  title,
}) {
  const norm = String(platform || "").toLowerCase().trim();
  const isPsn = norm === "psn" || norm === "playstation" || norm === "ps5" || norm === "ps4";
  const isSupercell = norm === "supercell" || norm === "coc" || norm === "clashofclans";

  if (isSupercell) {
    return (
      <SupercellIcon
        size={size}
        className={className}
        style={style}
        title={title ?? "Supercell"}
      />
    );
  }
  
  let src = GAMING_ASSETS.platforms.steam;
  let label = "Steam";

  if (isPsn) {
    label = "PlayStation";
    src = variant === "white" 
      ? GAMING_ASSETS.platforms.psnWhite 
      : GAMING_ASSETS.platforms.psn;
  }

  const displayTitle = title ?? label;

  return (
    <img
      src={src}
      alt={alt ?? displayTitle}
      title={displayTitle}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`gaming-icon-img platform-icon-${isPsn ? "psn" : "steam"} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}

/**
 * Official Steam 100% Perfect Game Ribbon
 */
export function SteamRibbonIcon({
  size = 20,
  className = "",
  style = {},
  alt = "100% Perfect Game Ribbon",
  title = "Steam 100% Perfect Game Completion",
}) {
  return (
    <img
      src={GAMING_ASSETS.ribbons.steam100}
      alt={alt}
      title={title}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`gaming-icon-img steam-ribbon-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}

/**
 * Platform Tag Badge with official logo
 */
export function GamingPlatformTag({ platform, className = "", showText = true }) {
  const norm = String(platform || "").toLowerCase().trim();
  const isPsn = norm === "psn" || norm === "playstation";
  const isSupercell = norm === "supercell" || norm === "coc" || norm === "clashofclans";
  const name = isSupercell ? "Supercell" : isPsn ? "PlayStation" : "Steam";

  return (
    <span className={`gaming-platform-tag platform-${isSupercell ? "supercell" : isPsn ? "psn" : "steam"} ${className}`}>
      <PlatformIcon platform={isSupercell ? "supercell" : isPsn ? "psn" : "steam"} size={13} variant={isPsn ? "white" : "default"} />
      {showText && <span>{name}</span>}
    </span>
  );
}

export default {
  TrophyIcon,
  PlatformIcon,
  SteamRibbonIcon,
  GamingPlatformTag,
  GAMING_ASSETS,
};
