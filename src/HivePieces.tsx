// Hive bug icons as reusable SVG symbols (Q/B/G/S/A). Each is drawn white with a
// low-alpha shadow so it reads on either player's tile colour, positioned inside
// a pointy-top hex safe area in a normalised 0 0 100 100 box. Rendered once per
// board; referenced with <use href="#bugX"/>.
export function HivePieceDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      {/* Q · Queen Bee */}
      <symbol id="bugQ" viewBox="0 0 100 100">
        <ellipse cx="50" cy="66" rx="14" ry="17" fill="rgba(0,0,0,.13)" />
        <path d="M39 31 L44 21 L50 28 L56 21 L61 31 Z" fill="#fff" />
        <circle cx="50" cy="41" r="8" fill="#fff" />
        <ellipse cx="50" cy="63" rx="14" ry="17" fill="#fff" />
        <path d="M38 59 H62" stroke="rgba(0,0,0,.16)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M40 69 H60" stroke="rgba(0,0,0,.16)" strokeWidth="3.4" strokeLinecap="round" />
      </symbol>
      {/* B · Beetle */}
      <symbol id="bugB" viewBox="0 0 100 100">
        <ellipse cx="50" cy="65" rx="19" ry="21" fill="rgba(0,0,0,.13)" />
        <path d="M46 27 L42 19" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M54 27 L58 19" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="50" cy="30" rx="7" ry="5" fill="#fff" />
        <ellipse cx="50" cy="41" rx="12" ry="8" fill="#fff" />
        <ellipse cx="50" cy="63" rx="19" ry="21" fill="#fff" />
        <path d="M50 45 V82" stroke="rgba(0,0,0,.16)" strokeWidth="3.4" strokeLinecap="round" />
      </symbol>
      {/* G · Grasshopper */}
      <symbol id="bugG" viewBox="0 0 100 100">
        <ellipse cx="55" cy="54" rx="8" ry="16" fill="rgba(0,0,0,.13)" transform="rotate(-18 55 54)" />
        <path d="M42 36 L32 27" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M45 34 L38 24" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="44" cy="40" r="7" fill="#fff" />
        <ellipse cx="55" cy="52" rx="8" ry="16" fill="#fff" transform="rotate(-18 55 52)" />
        <path d="M48 54 L40 66" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 57 L47 69" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M49 62 L66 48 L69 72" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M53 60 L73 44 L77 70" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      {/* S · Spider */}
      <symbol id="bugS" viewBox="0 0 100 100">
        <ellipse cx="50" cy="62" rx="11" ry="11" fill="rgba(0,0,0,.13)" />
        <path d="M46 44 L28 31 L20 33" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M45 47 L24 44 L16 49" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M46 51 L26 56 L18 64" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M47 55 L30 66 L25 76" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M54 44 L72 31 L80 33" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 47 L76 44 L84 49" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M54 51 L74 56 L82 64" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M53 55 L70 66 L75 76" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="45" r="7" fill="#fff" />
        <circle cx="50" cy="60" r="11" fill="#fff" />
      </symbol>
      {/* A · Soldier Ant */}
      <symbol id="bugA" viewBox="0 0 100 100">
        <ellipse cx="50" cy="68" rx="9" ry="11" fill="rgba(0,0,0,.13)" />
        <path d="M47 27 L40 19 L37 14" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M53 27 L60 19 L63 14" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M45 45 L30 38" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M45 49 L28 50" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M46 54 L31 61" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 45 L70 38" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 49 L72 50" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M54 54 L69 61" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="32" r="7" fill="#fff" />
        <ellipse cx="50" cy="49" rx="6.5" ry="8" fill="#fff" />
        <ellipse cx="50" cy="66" rx="9" ry="11" fill="#fff" />
      </symbol>
    </svg>
  );
}
