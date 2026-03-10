import { render, screen } from "@testing-library/react";
import { AIScoreGauge } from "@/components/analytics/AIScoreGauge";

describe("AIScoreGauge", () => {
  it("shows the correct score number", () => {
    render(<AIScoreGauge score={82} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it('shows "Execute" label when score >= 70', () => {
    render(<AIScoreGauge score={75} />);
    expect(screen.getByText("Execute")).toBeInTheDocument();
  });

  it('shows "Execute" label at exactly 70', () => {
    render(<AIScoreGauge score={70} />);
    expect(screen.getByText("Execute")).toBeInTheDocument();
  });

  it('shows "Wait" label when score is 40–69', () => {
    render(<AIScoreGauge score={55} />);
    expect(screen.getByText("Wait")).toBeInTheDocument();
  });

  it('shows "Wait" label at exactly 40', () => {
    render(<AIScoreGauge score={40} />);
    expect(screen.getByText("Wait")).toBeInTheDocument();
  });

  it('shows "Avoid" label when score < 40', () => {
    render(<AIScoreGauge score={20} />);
    expect(screen.getByText("Avoid")).toBeInTheDocument();
  });

  it("clamps score to 0 minimum", () => {
    render(<AIScoreGauge score={-10} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Avoid")).toBeInTheDocument();
  });

  it("clamps score to 100 maximum", () => {
    render(<AIScoreGauge score={150} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Execute")).toBeInTheDocument();
  });

  it("uses success color class for high scores", () => {
    const { container } = render(<AIScoreGauge score={85} />);
    const label = screen.getByText("Execute");
    expect(label.className).toContain("text-success");
  });

  it("uses warning color class for medium scores", () => {
    const { container } = render(<AIScoreGauge score={50} />);
    const label = screen.getByText("Wait");
    expect(label.className).toContain("text-warning");
  });

  it("uses danger color class for low scores", () => {
    const { container } = render(<AIScoreGauge score={15} />);
    const label = screen.getByText("Avoid");
    expect(label.className).toContain("text-danger");
  });

  it("renders the SVG gauge", () => {
    const { container } = render(<AIScoreGauge score={60} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Should have two path elements (background + foreground arcs)
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(2);
  });

  it("accepts custom className", () => {
    const { container } = render(
      <AIScoreGauge score={50} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
