import { FC } from "react";

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

const containsEmoji = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
      (codePoint >= 0x2600 && codePoint <= 0x27bf)
    );
  });

interface ChartDatum {
  card: string;
  cardValue: number;
  Votes: number;
}

interface VoteLabelProps {
  // Geometry injected by Recharts when this component is used as a Bar shape.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  index?: number;
  data: ChartDatum[];
  max: number;
  uniqueMajority: boolean;
}

/**
 * Draws a complete vote card instead of a conventional solid bar. The card's
 * total height still communicates the tally, while the split face mirrors the
 * wireframe: estimate above, vote details in the filled lower panel.
 */
export const VoteLabel: FC<VoteLabelProps> = ({
  x,
  y,
  width,
  height,
  value,
  index,
  data,
  max,
  uniqueMajority
}) => {
  if (x == null || y == null || width == null || height == null) return null;

  const datum = index == null ? undefined : data[index];
  const card = datum?.card ?? "";
  // `value` is the normalized visual height used by Recharts. Always source
  // the actual tally from the datum so labels and accessibility stay truthful.
  const count = datum?.Votes ?? value ?? 0;
  const isMajority = uniqueMajority && count === max;
  const inset = 1.25;
  const cx = x + width / 2;
  const relativeStrength = max > 0 ? count / max : 0;
  // The wireframe's lower panel rises with the bar's share of the leading
  // tally. A unanimous/leading bar fills roughly three quarters of its frame;
  // a low tally still retains a substantial, readable vote panel.
  const fillRatio = 0.48 + relativeStrength * 0.26;
  const minimumHeaderHeight = isMajority ? 64 : 40;
  const fillHeight = Math.min(
    height - minimumHeaderHeight,
    Math.max(58, height * fillRatio)
  );
  const fillY = y + height - fillHeight - inset;
  const headerHeight = fillY - y;
  const majorityBandHeight = isMajority
    ? clamp(20, headerHeight * 0.32, 25)
    : 0;
  const estimateAreaTop = y + majorityBandHeight;
  const estimateAreaHeight = Math.max(28, headerHeight - majorityBandHeight);
  // Size the estimate from the shared card width, not each bar's variable
  // header height. Every story-point value now carries equal visual weight.
  const cardFont = clamp(14, width * 0.38, 28);
  const isEmoji = containsEmoji(card);
  const isNumericEstimate = Number.isFinite(datum?.cardValue);
  const estimateFont = isEmoji ? cardFont * 0.78 : cardFont;
  const estimateYOffset = isEmoji ? -2 : 0;
  const estimateLabel = isNumericEstimate
    ? width >= 55
      ? "STORY POINTS"
      : "POINTS"
    : "VOTE OPTION";
  const estimateLabelFont = clamp(4.5, width * 0.085, 7);
  const compactFill = fillHeight < 52;
  // Vote totals are consistent across bars as well, but intentionally sit one
  // tier below the estimate so the card's point value reads first.
  const countFont = clamp(11, width * 0.28, 22);
  const labelFont = clamp(3.6, width * 0.095, 8.5);
  const avatarCount = Math.min(Math.max(Math.floor(count), 0), 20);
  const maxAvatarsPerRow = 10;
  const avatarRows = Math.max(1, Math.ceil(avatarCount / maxAvatarsPerRow));
  const widestAvatarRow = Math.min(avatarCount, maxAvatarsPerRow);
  const estimateLabelY = estimateAreaTop + estimateAreaHeight * 0.2;
  const estimateY = estimateAreaTop + estimateAreaHeight * 0.55;
  // Anchor the divider to the rendered estimate, not the variable header
  // height. This preserves the same optical gap below majority values.
  const estimateRuleY = Math.min(
    estimateAreaTop + estimateAreaHeight - 2,
    estimateY + estimateFont * 0.6 + 3
  );
  const compactTextLift = compactFill ? 8 : 0;
  const countY =
    fillY +
    Math.max(
      countFont * (compactFill ? 0.54 : 0.58),
      fillHeight * (compactFill ? 0.24 : 0.35)
    ) -
    compactTextLift;
  // Keep the optical gap between the count and VOTE(S) consistent. Their
  // shared block can move within the fill, but its internal spacing no longer
  // expands and contracts with the bar height.
  const voteY =
    countY + (countFont + labelFont) * 0.62 + (compactFill ? 1.5 : 2.25);
  const avatarZoneTop = voteY + labelFont * 0.5 + 4;
  const avatarBottomInset = compactFill ? 2 : clamp(4, fillHeight * 0.05, 7);
  const avatarZoneBottom = fillY + fillHeight - avatarBottomInset;
  const avatarZoneHeight = Math.max(0, avatarZoneBottom - avatarZoneTop);
  const avatarHeightFactor = 3.07 + (avatarRows - 1) * 3.15;
  const avatarWidthFactor = 2 + Math.max(0, widestAvatarRow - 1) * 2.7;
  const avatarSize = clamp(
    0.8,
    Math.min(
      width * 0.043,
      fillHeight * 0.07,
      (width - inset * 8) / Math.max(3, avatarWidthFactor),
      avatarZoneHeight / avatarHeightFactor
    ),
    3.5
  );
  const avatarGap = avatarSize * 2.7;
  const avatarRowGap = avatarSize * 3.15;
  const avatarWidthScale = avatarCount <= 3 ? 1.25 : 1;
  const avatarBlockHeight = avatarSize * avatarHeightFactor;
  const avatarBlockOffset = Math.max(
    0,
    (avatarZoneHeight - avatarBlockHeight) / 2
  );
  // `avatarY` is the body's center line; 1.82 radii reach its visual top.
  const firstAvatarY = avatarZoneTop + avatarBlockOffset + avatarSize * 1.82;
  const crownSize = clamp(6, width * 0.13, 13);
  const majorityFont = clamp(4.2, width * 0.082, 8.5);
  const majorityGap = clamp(2, width * 0.05, 4);
  const majorityGroupWidth = crownSize + majorityGap + majorityFont * 5.7;
  const crownX = cx - majorityGroupWidth / 2;
  const crownY = y + (majorityBandHeight - crownSize) / 2 - 1;
  const majorityTextX = crownX + crownSize + majorityGap;
  const majorityY = y + majorityBandHeight * 0.5;

  return (
    <g
      pointerEvents="none"
      role="img"
      aria-label={`${card} story points: ${count} ${
        count === 1 ? "vote" : "votes"
      }${isMajority ? ", majority" : ""}`}
      style={{
        transformBox: "fill-box",
        transformOrigin: "50% 100%"
      }}
    >
      <defs>
        <linearGradient
          id={`vote-card-${index ?? 0}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="var(--vote-fill-top)" />
          <stop offset="48%" stopColor="var(--vote-fill-mid)" />
          <stop offset="100%" stopColor="var(--vote-fill-bottom)" />
        </linearGradient>
        <clipPath id={`vote-majority-clip-${index ?? 0}`}>
          <rect
            x={x + inset}
            y={y + inset}
            width={Math.max(0, width - inset * 2)}
            height={Math.max(0, majorityBandHeight - inset)}
          />
        </clipPath>
      </defs>
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        rx={clamp(8, width * 0.12, 14)}
        fill="var(--vote-card-bg)"
        fillOpacity={0.9}
        stroke={isMajority ? "var(--vote-bright)" : "var(--vote-border)"}
        strokeOpacity={isMajority ? 1 : 0.62}
        strokeWidth={isMajority ? 1.8 : 1}
        style={{
          filter: isMajority
            ? "var(--vote-majority-shadow)"
            : "var(--vote-card-shadow)"
        }}
      />

      {fillHeight > 0 && (
        <rect
          x={x + inset * 1.5}
          y={fillY}
          width={Math.max(0, width - inset * 3)}
          height={fillHeight}
          rx={clamp(7, width * 0.11, 12)}
          fill={`url(#vote-card-${index ?? 0})`}
          fillOpacity={1}
          style={{
            filter: "var(--vote-fill-shadow)"
          }}
        />
      )}

      {isMajority && (
        <g clipPath={`url(#vote-majority-clip-${index ?? 0})`}>
          <line
            x1={x + inset}
            x2={x + width - inset}
            y1={y + majorityBandHeight}
            y2={y + majorityBandHeight}
            stroke="var(--vote-neon)"
            strokeOpacity={0.7}
          />
          <g
            transform={`translate(${crownX} ${crownY}) scale(${
              crownSize / 14
            })`}
            fill="var(--vote-bright)"
            stroke="var(--vote-bright)"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: "var(--vote-crown-shadow)"
            }}
          >
            <path d="M1 11 L0 3 L4 6 L7 0 L10 6 L14 3 L13 11 Z" />
            <path d="M1 13 H13" fill="none" strokeWidth={1.8} />
          </g>
          <text
            x={majorityTextX}
            y={majorityY}
            textAnchor="start"
            dominantBaseline="central"
            fill="var(--vote-bright)"
            fontSize={majorityFont}
            fontWeight={800}
            letterSpacing="0.09em"
          >
            MAJORITY
          </text>
        </g>
      )}

      <text
        x={cx}
        y={estimateLabelY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--vote-point-label)"
        fontSize={estimateLabelFont}
        fontWeight={800}
        letterSpacing="0.09em"
      >
        {estimateLabel}
      </text>
      <text
        x={cx}
        y={estimateY + estimateYOffset}
        textAnchor="middle"
        dominantBaseline="central"
        className="tabular-nums"
        fill="var(--vote-point-value)"
        fontSize={estimateFont}
        fontWeight={800}
        style={{
          filter: "var(--vote-point-shadow)"
        }}
      >
        {card}
      </text>
      <line
        x1={cx - clamp(6, width * 0.14, 12)}
        x2={cx + clamp(6, width * 0.14, 12)}
        y1={estimateRuleY}
        y2={estimateRuleY}
        stroke="var(--vote-neon)"
        strokeWidth={clamp(0.8, width * 0.018, 1.5)}
        strokeLinecap="round"
        opacity={0.9}
      />

      <text
        x={cx}
        y={countY}
        textAnchor="middle"
        dominantBaseline="central"
        className="tabular-nums"
        fill="var(--vote-on-fill)"
        fontSize={countFont}
        fontWeight={750}
        style={{
          filter: "var(--vote-count-shadow)"
        }}
      >
        {count}
      </text>
      <text
        x={cx}
        y={voteY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--vote-on-fill)"
        fontSize={labelFont}
        fontWeight={750}
        letterSpacing="0.1em"
        style={{ filter: "brightness(1.7)" }}
      >
        {count === 1 ? "VOTE" : "VOTES"}
      </text>

      {fillHeight >= 26 &&
        Array.from({ length: avatarCount }, (_, avatar) => {
          const row = Math.floor(avatar / maxAvatarsPerRow);
          const firstAvatarInRow = row * maxAvatarsPerRow;
          const rowCount = Math.min(
            maxAvatarsPerRow,
            avatarCount - firstAvatarInRow
          );
          const column = avatar - firstAvatarInRow;
          const rowStart = cx - ((rowCount - 1) * avatarGap) / 2;
          const avatarX = rowStart + column * avatarGap;
          const avatarY = firstAvatarY + row * avatarRowGap;
          return (
            <g
              key={avatar}
              fill="var(--vote-icon-color)"
              stroke="var(--vote-icon-outline)"
              strokeWidth={Math.max(0.15, avatarSize * 0.12)}
              strokeLinejoin="round"
              style={{
                filter: "var(--vote-icon-shadow)"
              }}
            >
              <circle
                cx={avatarX}
                cy={avatarY - avatarSize * 1.1}
                r={avatarSize * 0.72 * avatarWidthScale}
              />
              <path
                d={`M ${avatarX - avatarSize * avatarWidthScale} ${
                  avatarY + avatarSize * 1.25
                } Q ${avatarX - avatarSize * avatarWidthScale} ${
                  avatarY - avatarSize * 0.15
                } ${avatarX} ${avatarY - avatarSize * 0.15} Q ${
                  avatarX + avatarSize * avatarWidthScale
                } ${avatarY - avatarSize * 0.15} ${
                  avatarX + avatarSize * avatarWidthScale
                } ${avatarY + avatarSize * 1.25} Z`}
              />
            </g>
          );
        })}
    </g>
  );
};
