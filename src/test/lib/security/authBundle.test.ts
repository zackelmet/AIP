import {
  normalizeAuthRoles,
  encryptAuth,
  decryptAuth,
  toRunnerAuth,
} from "@/lib/security/authBundle";

describe("auth bundle", () => {
  beforeAll(() => {
    process.env.PENTEST_AUTH_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("encrypts and decrypts bearer and cookie roles", () => {
    const roles = normalizeAuthRoles({
      roles: [
        {
          label: "admin",
          kind: "bearer",
          token: "secret-token",
          checkUrl: "https://app.example.com/api/me",
        },
        {
          label: "user",
          kind: "cookie",
          cookie: "session=abc; other=def",
          checkUrl: "https://app.example.com/api/me",
        },
      ],
    });
    const blob = encryptAuth(roles);
    expect(blob).not.toContain("secret-token");
    expect(decryptAuth(blob)).toEqual(roles);
    expect(toRunnerAuth(roles).roles[0]).toMatchObject({
      label: "admin",
      kind: "bearer",
      token: "secret-token",
    });
  });

  it("rejects missing check URLs", () => {
    expect(() =>
      normalizeAuthRoles({
        roles: [{ label: "admin", kind: "bearer", token: "x", checkUrl: "" }],
      }),
    ).toThrow(/check URL/i);
  });
});
