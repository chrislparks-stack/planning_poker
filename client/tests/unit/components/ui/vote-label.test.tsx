import { VoteLabel } from "@/components/ui/vote-label";
import { render } from "@test";

describe("VoteLabel voter icons", () => {
  test("keeps a single voter legible in a narrow result bar", () => {
    const { container } = render(
      <svg>
        <VoteLabel
          x={0}
          y={0}
          width={22}
          height={78}
          index={0}
          payload={{ card: "1", votes: 1 }}
          max={4}
          uniqueMajority={true}
        />
      </svg>
    );

    const voterIcon = container.querySelector('[data-voter-icon="true"]');
    const head = voterIcon?.querySelector("circle");
    const body = voterIcon?.querySelector("path");
    const fillClip = container.querySelector("#vote-fill-clip-0 rect");
    const count = container.querySelector('[data-vote-count="true"]');
    const countLabel = container.querySelector(
      '[data-vote-count-label="true"]'
    );
    const bodyCoordinates = (
      body?.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g) ?? []
    ).map(Number);
    const bodyYCoordinates = bodyCoordinates.filter(
      (_, index) => index % 2 === 1
    );
    const fillBottom =
      Number(fillClip?.getAttribute("y")) +
      Number(fillClip?.getAttribute("height"));
    const countTop =
      Number(count?.getAttribute("y")) -
      Number(count?.getAttribute("font-size")) / 2;
    const countLabelBottom =
      Number(countLabel?.getAttribute("y")) +
      Number(countLabel?.getAttribute("font-size")) / 2;
    const iconTop =
      Number(head?.getAttribute("cy")) - Number(head?.getAttribute("r"));

    expect(voterIcon).toBeInTheDocument();
    expect(Number(head?.getAttribute("r"))).toBeGreaterThanOrEqual(2.1);
    expect(voterIcon?.parentElement).toHaveAttribute(
      "clip-path",
      "url(#vote-fill-clip-0)"
    );
    expect(countTop).toBeGreaterThan(Number(fillClip?.getAttribute("y")));
    expect(iconTop).toBeGreaterThan(countLabelBottom);
    expect(Math.max(...bodyYCoordinates)).toBeLessThan(fillBottom);
  });

  test("allows dense voter groups to retain their compact sizing", () => {
    const { container } = render(
      <svg>
        <VoteLabel
          x={0}
          y={0}
          width={22}
          height={78}
          index={0}
          payload={{ card: "1", votes: 10 }}
          max={10}
          uniqueMajority={false}
        />
      </svg>
    );

    const voterIcons = container.querySelectorAll('[data-voter-icon="true"]');
    const firstHead = voterIcons[0]?.querySelector("circle");

    expect(voterIcons).toHaveLength(10);
    expect(Number(firstHead?.getAttribute("r"))).toBeLessThan(2);
  });
});
