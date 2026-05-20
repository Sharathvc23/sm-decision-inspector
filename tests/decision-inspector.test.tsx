import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecisionInspector } from "../src/decision-inspector";
import { TooltipProvider } from "../src/ui/tooltip";
import { makeDecision } from "./helpers/make-decision";

function renderInspector(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("DecisionInspector", () => {
  it("renders the empty-state when there are no envelopes", () => {
    renderInspector(
      <DecisionInspector envelopes={[]} policy={{ required: 2 }} status="open" />,
    );
    expect(screen.getByTestId("decision-inspector-empty")).toBeInTheDocument();
  });

  it("reverses event order so newest renders first", () => {
    const oldest = makeDecision({ id: "old", ts: "2026-05-19T00:00:00.000Z" });
    const newest = makeDecision({ id: "new", ts: "2026-05-20T00:00:00.000Z" });
    renderInspector(
      <DecisionInspector
        envelopes={[oldest, newest]}
        policy={{ required: 1 }}
        status="open"
      />,
    );
    const rows = screen.getAllByTestId(/^decision-row-/);
    expect(rows[0].dataset.testid ?? rows[0].getAttribute("data-testid")).toBe(
      "decision-row-new",
    );
    expect(rows[1].getAttribute("data-testid")).toBe("decision-row-old");
  });

  it("renders the connection status label", () => {
    renderInspector(
      <DecisionInspector envelopes={[]} policy={{ required: 1 }} status="reconnecting" />,
    );
    expect(screen.getByTestId("inspector-status-label")).toHaveTextContent("reconnecting");
  });

  it("falls back to the default status tone on an unknown status", () => {
    renderInspector(
      <DecisionInspector
        envelopes={[]}
        policy={{ required: 1 }}
        // @ts-expect-error — testing runtime defense
        status="unrecognized"
      />,
    );
    // Should not throw; the empty-state is still shown.
    expect(screen.getByTestId("decision-inspector-empty")).toBeInTheDocument();
  });
});
