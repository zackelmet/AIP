const mockSend = jest.fn().mockResolvedValue({ data: { id: "test" } });

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { sendWeeklySignupsDigest } from "@/lib/email/resend";

describe("weekly signup digest", () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.RESEND_API_KEY = "test-key";
  });

  it("renders signups, launched tests, and credit purchases as separate sections", async () => {
    const sent = await sendWeeklySignupsDigest({
      total: 2,
      previousTotal: 1,
      weekLabel: "Nov 16 – Nov 22",
      days: [
        { label: "Mon", count: 1 },
        { label: "Tue", count: 1 },
      ],
      users: [
        {
          email: "new@example.com",
          name: "New User",
          signedUp: "Nov 18",
          launched: true,
        },
      ],
      tests: [
        {
          email: "new@example.com",
          target: "https://example.com",
          type: "Web Application",
          launchedAt: "Nov 19",
        },
      ],
      purchases: [
        {
          email: "new@example.com",
          credits: 3,
          type: "External IP",
          purchasedAt: "Nov 20",
        },
      ],
    });

    expect(sent).toBe(true);
    const message = mockSend.mock.calls[0][0];
    expect(message.subject).toContain("2 signups");
    expect(message.subject).toContain("1 test");
    expect(message.subject).toContain("3 credits");

    const html = String(message.html);
    expect(html).toContain("Sign ups");
    expect(html).toContain("Tests launched");
    expect(html).toContain("Credits purchased");
    expect(html).toContain("new@example.com");
    expect(html).toContain("https://example.com");
    expect(html).toContain("3 &times; External IP");

    const text = String(message.text);
    expect(text).toContain("SIGN UPS (2)");
    expect(text).toContain("TESTS LAUNCHED (1)");
    expect(text).toContain("CREDITS PURCHASED (3)");
  });
});
