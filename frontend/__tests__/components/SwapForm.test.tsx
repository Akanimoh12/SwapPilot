import { render, screen, fireEvent } from "@testing-library/react";
import { SwapForm } from "@/components/swap/SwapForm";

// Mock wagmi hooks
const mockUseAccount = jest.fn();
jest.mock("wagmi", () => ({
  useAccount: () => mockUseAccount(),
  useWriteContract: () => ({
    writeContract: jest.fn(),
    data: undefined,
    isPending: false,
    error: null,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}));

// Mock viem parseUnits
jest.mock("viem", () => ({
  parseUnits: (value: string, decimals: number) => {
    const num = parseFloat(value || "0");
    return BigInt(Math.floor(num * 10 ** decimals));
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ArrowDownUp: () => <span data-testid="arrow-icon" />,
  AlertTriangle: () => <span data-testid="alert-icon" />,
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Mock child components
jest.mock("@/components/swap/TokenSelector", () => ({
  TokenSelector: () => <div data-testid="token-selector" />,
}));

jest.mock("@/components/swap/SwapPreview", () => ({
  SwapPreview: ({ willBeQueued }: { willBeQueued: boolean }) => (
    <div data-testid="swap-preview" data-queued={willBeQueued} />
  ),
}));

jest.mock("@/components/swap/SwapButton", () => ({
  SwapButton: ({
    willBeQueued,
    disabled,
  }: {
    willBeQueued: boolean;
    disabled: boolean;
  }) => (
    <button data-testid="swap-button" disabled={disabled}>
      {willBeQueued ? "Queue for Smart Execution" : "Swap"}
    </button>
  ),
}));

// Mock Spinner
jest.mock("@/components/ui/Spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));

describe("SwapForm", () => {
  beforeEach(() => {
    mockUseAccount.mockReturnValue({ isConnected: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders token selectors and amount input", () => {
    render(<SwapForm />);

    // Should have two token selector buttons (ETH and USDC by default)
    expect(screen.getByText("ETH")).toBeInTheDocument();
    expect(screen.getByText("USDC")).toBeInTheDocument();

    // Should have an amount input
    const inputs = screen.getAllByPlaceholderText("0.0");
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    // Should have pay and receive labels
    expect(screen.getByText("You pay")).toBeInTheDocument();
    expect(screen.getByText("You receive")).toBeInTheDocument();
  });

  it('shows "Queue for Smart Execution" when amount exceeds threshold', () => {
    render(<SwapForm />);

    // Enter a large amount (> 10 ETH threshold)
    const input = screen.getAllByPlaceholderText("0.0")[0];
    fireEvent.change(input, { target: { value: "15" } });

    // The SwapButton mock should render "Queue for Smart Execution"
    expect(screen.getByTestId("swap-button")).toHaveTextContent(
      "Queue for Smart Execution",
    );
  });

  it('shows "Swap" for small amounts', () => {
    render(<SwapForm />);

    // Enter a small amount (< 10 ETH threshold)
    const input = screen.getAllByPlaceholderText("0.0")[0];
    fireEvent.change(input, { target: { value: "1" } });

    // The SwapButton mock should render "Swap"
    expect(screen.getByTestId("swap-button")).toHaveTextContent("Swap");
  });

  it("submit button is disabled when amount is empty", () => {
    render(<SwapForm />);

    // No amount entered — button should be disabled
    const button = screen.getByTestId("swap-button");
    expect(button).toBeDisabled();
  });

  it("shows queue warning banner for large amounts", () => {
    render(<SwapForm />);

    const input = screen.getAllByPlaceholderText("0.0")[0];
    fireEvent.change(input, { target: { value: "15" } });

    expect(
      screen.getByText(/will be queued for optimal/i),
    ).toBeInTheDocument();
  });

  it("does not show queue warning for small amounts", () => {
    render(<SwapForm />);

    const input = screen.getAllByPlaceholderText("0.0")[0];
    fireEvent.change(input, { target: { value: "1" } });

    expect(
      screen.queryByText(/will be queued for optimal/i),
    ).not.toBeInTheDocument();
  });

  it("filters non-numeric characters from amount input", () => {
    render(<SwapForm />);

    const input = screen.getAllByPlaceholderText("0.0")[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc12.5xyz" } });

    // Should strip non-numeric (keeps digits and dot)
    expect(input.value).toBe("12.5");
  });

  it("flips tokens when flip button is clicked", () => {
    render(<SwapForm />);

    // Initially ETH → USDC
    const buttons = screen.getAllByRole("button");
    const flipButton = buttons.find((b) =>
      b.querySelector('[data-testid="arrow-icon"]'),
    );

    if (flipButton) {
      fireEvent.click(flipButton);
    }

    // After flip, first token button should be USDC, second should be ETH
    const tokenButtons = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.textContent === "ETH" || b.textContent === "USDC",
      );
    expect(tokenButtons[0]).toHaveTextContent("USDC");
    expect(tokenButtons[1]).toHaveTextContent("ETH");
  });
});
