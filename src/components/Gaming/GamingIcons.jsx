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
    supercell: "/icons/gaming/platforms/supercell-logo-white.png",
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
 * Official Supercell Platform Logo (SUP / ERC / ELL)
 */
export function SupercellIcon({
  size = 16,
  className = "",
  style = {},
  alt,
  title = "Supercell",
}) {
  return (
    <img
      src={GAMING_ASSETS.platforms.supercell}
      alt={alt ?? title}
      title={title}
      width={Math.round(size * 1.2)}
      height={size}
      loading="lazy"
      decoding="async"
      className={`gaming-icon-img supercell-icon ${className}`}
      style={{
        height: `${size}px`,
        width: "auto",
        maxWidth: `${Math.round(size * 1.35)}px`,
        display: "inline-block",
        verticalAlign: "middle",
        objectFit: "contain",
        ...style,
      }}
    />
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
