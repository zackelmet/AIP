import type { DriveStep } from "driver.js";

// First-run product tour steps for the AIP dashboard.
// Each step targets a `data-tour="..."` anchor rendered in DashboardLayout
// (always present) or the dashboard page (present on /app/dashboard). Steps
// whose element is not in the DOM are filtered out at runtime, so the tour
// degrades gracefully when replayed from another page.
export const tourSteps: DriveStep[] = [
  {
    popover: {
      title: "Welcome to Affordable Pentesting 👋",
      description:
        "Let's take a 60-second tour of how to launch a pentest, track results, and get reports. You can skip anytime.",
      align: "center",
    },
  },
  {
    element: '[data-tour="start-pentest"]',
    popover: {
      title: "Launch a pentest",
      description:
        "Start here. Pick a test type — Web Application, External IP, or Pentest+ (a larger web-app engagement) — enter your target, and launch.",
    },
  },
  {
    element: '[data-tour="credits"]',
    popover: {
      title: "Your credits",
      description:
        "Each pentest uses one credit of its type. These cards show your balance — buy more anytime with the buttons here.",
    },
  },
  {
    element: '[data-tour="nav-new-pentest"]',
    popover: {
      title: "Configure the scope",
      description:
        "On the launch screen you set targets, user roles for credentialed testing, and API endpoints. Pentest+ unlocks higher limits (10 roles, 100 endpoints, 5 domains, 50 IPs).",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-pentests"]',
    popover: {
      title: "Track your tests",
      description:
        "Watch tests run and open finished ones here. You'll also get an email the moment a report is ready.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-scheduling"]',
    popover: {
      title: "Schedule recurring tests",
      description:
        "Set up continuous testing on a recurring cadence so you stay covered between manual engagements.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-manual-pentest"]',
    popover: {
      title: "Need a human?",
      description:
        "Request a manual pentest from our team whenever you want hands-on testing beyond the automated runs.",
      side: "right",
    },
  },
  {
    element: '[data-tour="buy-credits"]',
    popover: {
      title: "Buy credits anytime",
      description:
        "Top up from here whenever you need more pentests. That's it — you're ready to go!",
      side: "right",
    },
  },
];
