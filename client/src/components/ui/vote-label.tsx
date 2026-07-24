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

export interface VoteDatum {
  card: string;
  votes: number;
  previousVotes?: number;
  delta?: number;
  comparisonMaxVotes?: number;
  hasPreviousRound?: boolean;
}

interface VoteLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: VoteDatum;
  max: number;
  uniqueMajority: boolean;
}

export const VoteLabel: FC<VoteLabelProps> = (props) => {
  const { x, width, index, payload, max, uniqueMajority } = props;
  const rawY = props.y;
  const rawHeight = props.height;
  if (x == null || rawY == null || width == null || rawHeight == null) {
    return null;
  }

  const card = payload?.card ?? "";
  const count = payload?.votes ?? 0;
  const previousCount = payload?.previousVotes ?? 0;
  const delta = payload?.delta ?? count - previousCount;
  const hasPreviousRound = payload?.hasPreviousRound ?? false;
  const comparisonMax = Math.max(payload?.comparisonMaxVotes ?? max, 1);
  const maxPairCount = Math.max(count, previousCount);
  const maxPairVisualHeight = 0.56 + (maxPairCount / comparisonMax) * 0.44;
  const currentVisualHeight = 0.56 + (count / comparisonMax) * 0.44;
  const previousVisualHeight = 0.56 + (previousCount / comparisonMax) * 0.44;
  const height = rawHeight * (currentVisualHeight / maxPairVisualHeight);
  const y = rawY + rawHeight - height;
  const previousHeight =
    rawHeight * (previousVisualHeight / maxPairVisualHeight);
  const previousY = rawY + rawHeight - previousHeight;
  const isMajority = uniqueMajority && count === max;
  const inset = 1.25;
  const cx = x + width / 2;
  const relativeStrength = max > 0 ? count / max : 0;
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
  const cardFont = clamp(14, width * 0.38, 28);
  const isEmoji = containsEmoji(card);
  const isNumericEstimate = Number.isFinite(Number(card));
  const estimateFont = isEmoji ? cardFont * 0.78 : cardFont;
  const estimateYOffset = isEmoji ? -2 : 0;
  const estimateLabel = isNumericEstimate
    ? width >= 55
      ? "STORY POINTS"
      : "POINTS"
    : "VOTE OPTION";
  const estimateLabelFont = clamp(4.5, width * 0.085, 7);
  const compactFill = fillHeight < 52;
  const countFont = clamp(11, width * 0.28, 22);
  const labelFont = clamp(3.6, width * 0.095, 8.5);
  const deltaFont = clamp(4.6, width * 0.105, 8);
  const deltaGap = hasPreviousRound ? 2 : 0;
  const avatarCount = Math.min(Math.max(Math.floor(count), 0), 20);
  const maxAvatarsPerRow = 10;
  const avatarRows = Math.max(1, Math.ceil(avatarCount / maxAvatarsPerRow));
  const widestAvatarRow = Math.min(avatarCount, maxAvatarsPerRow);
  const estimateLabelY = estimateAreaTop + estimateAreaHeight * 0.2;
  const estimateY = estimateAreaTop + estimateAreaHeight * 0.55;
  const estimateRuleY = Math.min(
    estimateAreaTop + estimateAreaHeight - 2,
    estimateY + estimateFont * 0.6 + 3
  );
  const fillTopPadding = clamp(2, fillHeight * 0.05, 4);
  const fillBottomPadding = clamp(2, fillHeight * 0.05, 4);
  const countLabelGap = compactFill ? 0 : 0.75;
  const labelAvatarGap = compactFill ? 1.5 : 2.25;
  const avatarHeightFactor = 3.25 + (avatarRows - 1) * 3.15;
  const avatarWidthFactor = 2 + Math.max(0, widestAvatarRow - 1) * 2.7;
  const minimumAvatarSize =
    avatarCount === 1 ? 2.4 : avatarCount <= 3 ? 1.7 : 0.8;
  const availableAvatarHeight = Math.max(
    0,
    fillHeight -
      fillTopPadding -
      fillBottomPadding -
      countFont -
      countLabelGap -
      labelFont -
      (hasPreviousRound ? deltaGap + deltaFont : 0) -
      labelAvatarGap
  );
  const preferredAvatarSize = clamp(
    minimumAvatarSize,
    Math.min(
      width * 0.043,
      fillHeight * 0.07,
      (width - inset * 8) / Math.max(3, avatarWidthFactor)
    ),
    3.5
  );
  const avatarSize = Math.min(
    preferredAvatarSize,
    availableAvatarHeight / avatarHeightFactor
  );
  const avatarGap = avatarSize * 2.7;
  const avatarRowGap = avatarSize * 3.15;
  const avatarWidthScale = avatarCount <= 3 ? 1.25 : 1;
  const avatarBlockHeight = avatarSize * avatarHeightFactor;
  const fillContentHeight =
    countFont +
    countLabelGap +
    labelFont +
    (hasPreviousRound ? deltaGap + deltaFont : 0) +
    labelAvatarGap +
    avatarBlockHeight;
  const fillContentTop =
    fillY + Math.max(fillTopPadding, (fillHeight - fillContentHeight) / 2);
  const countY = fillContentTop + countFont * 0.5;
  const voteY = fillContentTop + countFont + countLabelGap + labelFont * 0.5;
  const deltaY =
    fillContentTop +
    countFont +
    countLabelGap +
    labelFont +
    deltaGap +
    deltaFont * 0.5;
  const firstAvatarY =
    fillContentTop +
    countFont +
    countLabelGap +
    labelFont +
    (hasPreviousRound ? deltaGap + deltaFont : 0) +
    labelAvatarGap +
    avatarSize * 2;
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
      className="vote-bar-motion"
      data-vote-card={card}
      pointerEvents="none"
      role="img"
      aria-label={
        hasPreviousRound
          ? `${card} story points: current ${count}, last round ${previousCount}, change ${
              delta > 0 ? `plus ${delta}` : delta
            }${isMajority ? ", majority" : ""}`
          : `${card} story points: ${count} ${count === 1 ? "vote" : "votes"}${
              isMajority ? ", majority" : ""
            }`
      }
    >
      {hasPreviousRound && (
        <g data-previous-vote-ghost={card} aria-hidden="true" opacity={0.72}>
          <rect
            x={x + 4}
            y={previousY + 1}
            width={Math.max(0, width - 1)}
            height={Math.max(0, previousHeight - 2)}
            rx={clamp(8, width * 0.12, 14)}
            fill="var(--vote-card-bg)"
            fillOpacity={0.28}
            stroke="var(--vote-neon)"
            strokeOpacity={0.62}
            strokeWidth={1.25}
            strokeDasharray="3 3"
            style={{ filter: "var(--vote-card-shadow)" }}
          />
          <text
            data-previous-vote-count="true"
            x={x + width / 2 + 2}
            y={rawY - 11}
            textAnchor="middle"
            fill="var(--vote-point-label)"
            fontSize={clamp(4.8, width * 0.09, 7)}
            fontWeight={800}
            letterSpacing="0.08em"
          >
            <tspan x={x + width / 2 + 2}>LAST ROUND</tspan>
            <tspan x={x + width / 2 + 2} dy={clamp(6.5, width * 0.12, 8)}>
              {previousCount} {previousCount === 1 ? "VOTE" : "VOTES"}
            </tspan>
          </text>
        </g>
      )}
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
        <clipPath id={`vote-fill-clip-${index ?? 0}`}>
          <rect
            x={x + inset * 1.5}
            y={fillY}
            width={Math.max(0, width - inset * 3)}
            height={fillHeight}
            rx={clamp(7, width * 0.11, 12)}
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
        data-vote-count="true"
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
        data-vote-count-label="true"
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

      {hasPreviousRound && (
        <text
          data-vote-delta="true"
          x={cx}
          y={deltaY}
          textAnchor="middle"
          dominantBaseline="central"
          className="tabular-nums"
          fill={
            delta > 0
              ? "hsl(142 71% 55%)"
              : delta < 0
              ? "hsl(350 80% 67%)"
              : "var(--vote-on-fill)"
          }
          fillOpacity={delta === 0 ? 0.72 : 1}
          fontSize={deltaFont}
          fontWeight={850}
          letterSpacing="0.06em"
          style={{ filter: "var(--vote-count-shadow)" }}
        >
          CHANGE {delta > 0 ? `+${delta}` : delta}
        </text>
      )}

      {fillHeight >= 26 && (
        <g clipPath={`url(#vote-fill-clip-${index ?? 0})`}>
          {Array.from({ length: avatarCount }, (_, avatar) => {
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
                data-voter-icon="true"
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
      )}
    </g>
  );
};
