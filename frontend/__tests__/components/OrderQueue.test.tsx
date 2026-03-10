import { render, screen } from "@testing-library/react";
import { OrderQueue } from "@/components/queue/OrderQueue";

// Mock useOrderQueue hook (used by OrderQueue component)
const mockUseOrderQueue = jest.fn();
jest.mock("@/hooks/useOrderQueue", () => ({
  useOrderQueue: (poolId: string) => mockUseOrderQueue(poolId),
}));

// Mock useSwapPilot hooks (used by child components)
jest.mock("@/hooks/useSwapPilot", () => ({
  useTotalOrdersQueued: () => ({ data: undefined, isLoading: false }),
  useOrder: () => ({ data: undefined, isLoading: false }),
  useExpireOrder: () => ({
    write: jest.fn(),
    isPending: false,
    isConfirmed: false,
    error: null,
  }),
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Inbox: () => <span data-testid="inbox-icon" />,
}));

// Mock Spinner
jest.mock("@/components/ui/Spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));

// Mock Skeleton
jest.mock("@/components/ui/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock OrderCard — render orderIndex for verification
jest.mock("@/components/queue/OrderCard", () => ({
  OrderCard: ({ orderIndex }: { orderIndex: bigint }) => (
    <div data-testid={`order-card-${orderIndex.toString()}`}>
      Order #{orderIndex.toString()}
    </div>
  ),
}));

const POOL_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

describe("OrderQueue", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner when data is loading", () => {
    mockUseOrderQueue.mockReturnValue({
      orderIds: [],
      total: 0,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<OrderQueue poolId={POOL_ID} />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("shows empty state when no orders exist", () => {
    mockUseOrderQueue.mockReturnValue({
      orderIds: [],
      total: 0,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<OrderQueue poolId={POOL_ID} />);
    expect(screen.getByText("No orders in the queue")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-icon")).toBeInTheDocument();
  });

  it("renders correct number of OrderCards", () => {
    mockUseOrderQueue.mockReturnValue({
      orderIds: [2n, 1n, 0n],
      total: 3,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<OrderQueue poolId={POOL_ID} />);

    // Should render 3 OrderCards (ids 2, 1, 0 — newest first)
    expect(screen.getByTestId("order-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-0")).toBeInTheDocument();
  });

  it("orders are sorted newest first", () => {
    mockUseOrderQueue.mockReturnValue({
      orderIds: [4n, 3n, 2n, 1n, 0n],
      total: 5,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<OrderQueue poolId={POOL_ID} />);

    const cards = screen.getAllByText(/Order #/);
    // Newest first: 4, 3, 2, 1, 0
    expect(cards[0]).toHaveTextContent("Order #4");
    expect(cards[1]).toHaveTextContent("Order #3");
    expect(cards[2]).toHaveTextContent("Order #2");
    expect(cards[3]).toHaveTextContent("Order #1");
    expect(cards[4]).toHaveTextContent("Order #0");
  });

  it("shows total order count", () => {
    mockUseOrderQueue.mockReturnValue({
      orderIds: [6n, 5n, 4n, 3n, 2n, 1n, 0n],
      total: 7,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<OrderQueue poolId={POOL_ID} />);
    expect(screen.getByText("7 total order(s)")).toBeInTheDocument();
  });

  it("caps displayed orders at 50", () => {
    // Build 50 order IDs from 99 down to 50
    const ids: bigint[] = [];
    for (let i = 99; i >= 50; i--) ids.push(BigInt(i));

    mockUseOrderQueue.mockReturnValue({
      orderIds: ids,
      total: 100,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<OrderQueue poolId={POOL_ID} />);

    // Should render 50 cards (ids 99 down to 50)
    const cards = screen.getAllByText(/Order #/);
    expect(cards).toHaveLength(50);

    // Newest should be 99, oldest shown should be 50
    expect(cards[0]).toHaveTextContent("Order #99");
    expect(cards[49]).toHaveTextContent("Order #50");
  });
});
